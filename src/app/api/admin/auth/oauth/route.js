import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminToken } from "@/lib/jwt";

export const POST = auth(async (request) => {
  const session = request.auth;

  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Belum login dengan Google/Facebook" },
      { status: 401 }
    );
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Akun ini belum punya akses admin" },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", createAdminToken("admin"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
});
