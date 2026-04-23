// ==============================
// TELKO.STORE — JWT Utility
// Secure admin session management
// ==============================

import crypto from "crypto";

const ALG = "HS256";
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ===== Base64URL helpers =====
function base64UrlEncode(data) {
  return Buffer.from(data).toString("base64url");
}

function base64UrlDecode(str) {
  return Buffer.from(str, "base64url");
}

// ===== HMAC signature =====
function sign(input, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(input)
    .digest("base64url");
}

// ===== Get signing secret (derives from ADMIN_SECRET for simplicity) =====
function getSigningSecret() {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) throw new Error("ADMIN_SECRET not configured");
  // Derive a separate key so the JWT signing key != the login password
  return crypto
    .createHmac("sha256", "telko-jwt-signing-key")
    .update(adminSecret)
    .digest("hex");
}

/**
 * Create a signed JWT token for admin session.
 * Payload: { role: "admin", adminType: "superadmin"|"admin", sub, iat, exp }
 * @param {"superadmin"|"admin"} [adminType="superadmin"] - The admin type level
 * @param {string} [identifier] - The admin's user ID (DB) or username (env)
 */
export function createAdminToken(adminType = "superadmin", identifier = "") {
  const secret = getSigningSecret();
  const now = Math.floor(Date.now() / 1000);

  const header = base64UrlEncode(JSON.stringify({ alg: ALG, typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      role: "admin",
      adminType: adminType || "superadmin",
      sub: identifier || "",
      iat: now,
      exp: now + TOKEN_EXPIRY_SECONDS,
    })
  );

  const signature = sign(`${header}.${payload}`, secret);
  return `${header}.${payload}.${signature}`;
}

/**
 * Verify a JWT token and return the payload if valid.
 * Returns null if invalid or expired.
 */
export function verifyAdminToken(token) {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const secret = getSigningSecret();

    // Verify signature using timing-safe comparison
    const expectedSig = sign(`${header}.${payload}`, secret);
    const sigBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSig, "utf8");

    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    // Decode and validate payload
    const data = JSON.parse(base64UrlDecode(payload).toString("utf8"));

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (data.exp && data.exp < now) return null;

    // Check role
    if (data.role !== "admin") return null;

    return data;
  } catch {
    return null;
  }
}
