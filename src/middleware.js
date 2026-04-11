// ==============================
// TELKO.STORE — Middleware
// Protect admin routes with simple key auth
// ==============================

import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only protect /admin/* and /api/admin/* routes
  const isAdminPage = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  // Check for admin auth cookie
  const adminToken = request.cookies.get("admin_token")?.value;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    console.error("❌ ADMIN_SECRET not set in environment");
    if (isAdminApi) {
      return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (adminToken !== adminSecret) {
    if (isAdminApi) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
