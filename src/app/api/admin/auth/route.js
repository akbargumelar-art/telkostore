// POST /api/admin/auth — Login admin with secret key
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { secret } = await request.json();
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (secret !== adminSecret) {
      return NextResponse.json(
        { success: false, error: "Kunci admin salah" },
        { status: 401 }
      );
    }

    // Set auth cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_token", adminSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Login gagal" },
      { status: 500 }
    );
  }
}
