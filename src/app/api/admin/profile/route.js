// Admin Profile API — change admin secret key
import { NextResponse } from "next/server";
import { createAdminToken } from "@/lib/jwt";

// GET /api/admin/profile
export async function GET() {
  return NextResponse.json({
    success: true,
    data: { role: "superadmin", name: "Admin" },
  });
}

// PUT /api/admin/profile — Change admin secret key
export async function PUT(request) {
  try {
    const { oldKey, newKey } = await request.json();

    if (!oldKey || !newKey) {
      return NextResponse.json(
        { success: false, error: "Old key dan new key wajib diisi" },
        { status: 400 }
      );
    }

    // Validate old key against current ADMIN_SECRET
    const adminSecret = process.env.ADMIN_SECRET;
    if (oldKey !== adminSecret) {
      return NextResponse.json(
        { success: false, error: "Kunci saat ini tidak cocok" },
        { status: 403 }
      );
    }

    if (newKey.length < 12) {
      return NextResponse.json(
        { success: false, error: "Kunci baru minimal 12 karakter" },
        { status: 400 }
      );
    }

    // Check complexity: must contain letters and numbers
    if (!/[a-zA-Z]/.test(newKey) || !/[0-9]/.test(newKey)) {
      return NextResponse.json(
        { success: false, error: "Kunci baru harus mengandung huruf dan angka" },
        { status: 400 }
      );
    }

    // Update environment variable in memory for this process
    // NOTE: This change persists until server restart. For permanent change,
    // update .env.local on the server manually.
    process.env.ADMIN_SECRET = newKey;

    // Issue a new JWT signed with the new secret so the current session stays valid
    const newToken = createAdminToken();

    const response = NextResponse.json({
      success: true,
      message: "Kunci admin berhasil diubah. Perubahan berlaku sampai server restart. Update .env.local untuk perubahan permanen.",
    });

    // Update cookie with new JWT (signed with new secret)
    response.cookies.set("admin_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("PUT /api/admin/profile error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengubah kunci admin" },
      { status: 500 }
    );
  }
}
