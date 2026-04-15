// ==============================
// TELKO.STORE — Middleware
// Protect admin routes with JWT auth
// ==============================

import { NextResponse } from "next/server";

/**
 * Lightweight JWT verification for Edge Runtime (middleware).
 * We cannot import Node.js crypto here, so we use the Web Crypto API.
 */
async function verifyJwtEdge(token, adminSecret) {
  if (!token || typeof token !== "string") return false;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const [header, payload, signature] = parts;

    // Derive signing key from ADMIN_SECRET (must match src/lib/jwt.js)
    const encoder = new TextEncoder();
    const derivationKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("telko-jwt-signing-key"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const derivedBytes = await crypto.subtle.sign(
      "HMAC",
      derivationKey,
      encoder.encode(adminSecret)
    );
    const derivedHex = Array.from(new Uint8Array(derivedBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Sign header.payload with derived key
    const signingKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(derivedHex),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expectedSigBytes = await crypto.subtle.sign(
      "HMAC",
      signingKey,
      encoder.encode(`${header}.${payload}`)
    );

    // Convert to base64url for comparison
    const expectedSig = btoa(
      String.fromCharCode(...new Uint8Array(expectedSigBytes))
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Constant-time comparison
    if (signature.length !== expectedSig.length) return false;
    let mismatch = 0;
    for (let i = 0; i < signature.length; i++) {
      mismatch |= signature.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    if (mismatch !== 0) return false;

    // Decode payload and check expiry
    const data = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    const now = Math.floor(Date.now() / 1000);
    if (data.exp && data.exp < now) return false;
    if (data.role !== "admin") return false;

    return true;
  } catch {
    return false;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only protect /admin/* and /api/admin/* routes (exclude login + auth endpoints)
  const isAdminPage = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const isAdminApi = pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/auth");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  // Check for admin auth cookie (JWT)
  const adminToken = request.cookies.get("admin_token")?.value;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    console.error("❌ ADMIN_SECRET not set in environment");
    if (isAdminApi) {
      return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Verify JWT token
  const isValid = await verifyJwtEdge(adminToken, adminSecret);

  if (!isValid) {
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
