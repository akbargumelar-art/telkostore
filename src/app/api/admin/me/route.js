// GET /api/admin/me — Return current admin session info + profile data
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { users } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import { getAdminCredentialsConfig } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/admin-session";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { tokenData, adminType, permissions } = session;
    const sub = tokenData.sub || "";

    // For DB-based admin users, fetch their profile from the database
    if (adminType === "admin" && sub) {
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          phone: users.phone,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, sub))
        .limit(1);

      const user = rows[0];
      if (user) {
        return NextResponse.json({
          success: true,
          adminType,
          permissions,
          profile: {
            id: user.id,
            name: user.name || "",
            email: user.email || "",
            image: user.image || "",
            phone: user.phone || "",
            canEditProfile: permissions.editProfile,
          },
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: "Akun admin tidak ditemukan lagi. Silakan login ulang.",
        },
        { status: 401 }
      );
    }

    // For superadmin (env-configured), return env config info
    const config = getAdminCredentialsConfig();
    return NextResponse.json({
      success: true,
      adminType,
      permissions,
      profile: {
        id: sub || "superadmin",
        name: config.username || "Superadmin",
        email: config.email || "",
        image: "",
        phone: "",
        canEditProfile: permissions.editProfile,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
