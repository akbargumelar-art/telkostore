// ==============================
// TELKO.STORE - Middleware
// Protect control panel routes with JWT auth
// ==============================

import { NextResponse } from "next/server";

/**
 * Lightweight JWT verification for Edge Runtime (middleware).
 * We cannot import Node.js crypto here, so we use the Web Crypto API.
 * Returns the JWT payload if valid, or null if invalid.
 */
async function verifyJwtEdge(token, adminSecret) {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

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
    if (signature.length !== expectedSig.length) return null;
    let mismatch = 0;
    for (let i = 0; i < signature.length; i++) {
      mismatch |= signature.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    if (mismatch !== 0) return null;

    // Decode payload and check expiry
    const data = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    const now = Math.floor(Date.now() / 1000);
    if (data.exp && data.exp < now) return null;
    if (data.role !== "admin") return null;

    return data;
  } catch {
    return null;
  }
}

// Routes restricted to superadmin only
const SUPERADMIN_ONLY_PAGES = ["/control/users", "/control/pengaturan"];
const SUPERADMIN_ONLY_API = ["/api/admin/users", "/api/admin/settings"];

function isSuperadminOnlyRoute(pathname) {
  return (
    SUPERADMIN_ONLY_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    SUPERADMIN_ONLY_API.some((p) => pathname === p || pathname.startsWith(p + "/"))
  );
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect /control/* and /api/admin/* routes (exclude login + auth endpoints)
  const isAdminPage =
    pathname.startsWith("/control") && !pathname.startsWith("/control/login");
  const isAdminApi =
    pathname.startsWith("/api/admin") &&
    !pathname.startsWith("/api/admin/auth");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const adminToken = request.cookies.get("admin_token")?.value;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    console.error("ADMIN_SECRET not set in environment");
    if (isAdminApi) {
      return NextResponse.json(
        { success: false, error: "Server error" },
        { status: 500 }
      );
    }
    return NextResponse.redirect(new URL("/control/login", request.url));
  }

  const tokenData = await verifyJwtEdge(adminToken, adminSecret);

  if (!tokenData) {
    if (isAdminApi) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/control/login", request.url));
  }

  // Check superadmin-only routes
  const adminType = tokenData.adminType || "superadmin"; // legacy tokens default to superadmin
  if (adminType !== "superadmin" && isSuperadminOnlyRoute(pathname)) {
    if (isAdminApi) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Hanya superadmin yang dapat mengakses fitur ini." },
        { status: 403 }
      );
    }
    // Redirect non-superadmin to dashboard when trying to access restricted pages
    return NextResponse.redirect(new URL("/control", request.url));
  }

  // Pass adminType to pages via response header
  const response = NextResponse.next();
  response.headers.set("x-admin-type", adminType);
  return response;
}

export const config = {
  matcher: ["/control/:path*", "/api/admin/:path*"],
};

