// POST /api/admin/auth — Login control panel with admin credentials
import { NextResponse } from "next/server";
import { createAdminToken } from "@/lib/jwt";
import { adminLoginLimiter } from "@/lib/rate-limit";
import {
  hasAdminCredentialsConfigured,
  isValidAdminCredentials,
} from "@/lib/admin-auth";

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

    const body = await request.json();
    const identifier = String(
      body.identifier || body.username || body.email || ""
    ).trim();
    const password = String(body.password || "").trim();

    if (!hasAdminCredentialsConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Kredensial admin belum dikonfigurasi di server",
        },
        { status: 500 }
      );
    }

    if (!identifier || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Username/email dan password admin wajib diisi",
        },
        { status: 400 }
      );
    }

    if (!isValidAdminCredentials(identifier, password)) {
      return NextResponse.json(
        { success: false, error: "Username/email atau password admin salah" },
        { status: 401 }
      );
    }

    const token = createAdminToken();

    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Login gagal" },
      { status: 500 }
    );
  }
}
