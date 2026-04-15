// POST /api/admin/auth — Login admin with secret key (JWT-based)
import { NextResponse } from "next/server";
import { createAdminToken } from "@/lib/jwt";
import { adminLoginLimiter } from "@/lib/rate-limit";

export async function POST(request) {
  try {
    // Rate limiting — extract IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    const rateCheck = adminLoginLimiter.check(ip);

    if (!rateCheck.allowed) {
      const retryAfter = Math.ceil(rateCheck.resetIn / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(retryAfter / 60)} menit.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

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

    // Generate signed JWT token (NOT the plain-text secret)
    const token = createAdminToken();

    // Set auth cookie with JWT
    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_token", token, {
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
