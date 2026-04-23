// GET /api/admin/me — Return current admin session info + profile data
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import db from "@/db/index.js";
import { users } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import { getAdminCredentialsConfig } from "@/lib/admin-auth";

export async function GET() {
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

    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const adminType = tokenData.adminType || "superadmin";
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
          profile: {
            id: user.id,
            name: user.name || "",
            email: user.email || "",
            image: user.image || "",
            phone: user.phone || "",
            canEditProfile: true,
          },
        });
      }
    }

    // For superadmin (env-configured), return env config info
    const config = getAdminCredentialsConfig();
    return NextResponse.json({
      success: true,
      adminType,
      profile: {
        id: sub || "superadmin",
        name: config.username || "Superadmin",
        email: config.email || "",
        image: "",
        phone: "",
        canEditProfile: false, // superadmin profile is managed via .env
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
