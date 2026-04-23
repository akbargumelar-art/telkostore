import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import db from "@/db/index.js";
import { users } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import { hashAdminUserPassword } from "@/lib/admin-user-password";

// PUT /api/admin/profile — Update admin profile (name, image, password)
export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_token")?.value;

    if (!adminToken) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const tokenData = verifyAdminToken(adminToken);

    if (!tokenData || tokenData.adminType !== "admin" || !tokenData.sub) {
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
      .where(eq(users.id, tokenData.sub));

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
