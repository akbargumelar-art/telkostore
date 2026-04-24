import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { users } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import { hashAdminUserPassword } from "@/lib/admin-user-password";
import { getAdminSession } from "@/lib/admin-session";

// PUT /api/admin/profile — Update admin profile (name, image, password)
export async function PUT(request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (
      session.adminType !== "admin" ||
      !session.permissions.editProfile ||
      !session.tokenData.sub
    ) {
      return NextResponse.json(
        { success: false, error: "Hanya admin dari database yang bisa mengubah profil" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, image, password } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (image !== undefined) updateData.image = image;
    if (password) updateData.passwordHash = hashAdminUserPassword(password);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, message: "Tidak ada perubahan" });
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.tokenData.sub));

    return NextResponse.json({
      success: true,
      message: "Profil berhasil diperbarui",
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan saat memperbarui profil" },
      { status: 500 }
    );
  }
}
