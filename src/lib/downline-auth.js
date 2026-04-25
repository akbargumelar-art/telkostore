import crypto from "crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import db from "@/db/index.js";
import { users } from "@/db/schema.js";
import {
  evaluateReferralActivation,
} from "@/lib/referral-activation.mjs";
import { getDownlineProfileByUserId } from "@/lib/referral";

const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
export const DOWNLINE_COOKIE_NAME = "mitra_token";

function base64UrlEncode(data) {
  return Buffer.from(data).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url");
}

function sign(input, secret) {
  return crypto.createHmac("sha256", secret).update(input).digest("base64url");
}

function getSigningSecret() {
  const baseSecret = process.env.AUTH_SECRET || process.env.ADMIN_SECRET || "";
  if (!baseSecret) {
    throw new Error("AUTH_SECRET atau ADMIN_SECRET harus tersedia untuk auth mitra.");
  }

  return crypto
    .createHmac("sha256", "telko-downline-signing-key")
    .update(baseSecret)
    .digest("hex");
}

export function createDownlineToken({ userId, downlineProfileId, email = "" }) {
  const secret = getSigningSecret();
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      role: "downline",
      sub: userId,
      downlineProfileId,
      email,
      iat: now,
      exp: now + TOKEN_EXPIRY_SECONDS,
    })
  );
  const signature = sign(`${header}.${payload}`, secret);
  return `${header}.${payload}.${signature}`;
}

export function verifyDownlineToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [header, payload, signature] = parts;
    const secret = getSigningSecret();
    const expectedSignature = sign(`${header}.${payload}`, secret);

    const actualBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    if (actualBuffer.length !== expectedBuffer.length) {
      return null;
    }
    if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      return null;
    }

    const data = JSON.parse(base64UrlDecode(payload).toString("utf8"));
    const now = Math.floor(Date.now() / 1000);

    if (data.role !== "downline" || (data.exp && data.exp < now)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_EXPIRY_SECONDS,
  };
}

export function applyDownlineAuthCookie(response, token) {
  response.cookies.set(DOWNLINE_COOKIE_NAME, token, getCookieOptions());
}

export function clearDownlineAuthCookie(response) {
  response.cookies.set(DOWNLINE_COOKIE_NAME, "", {
    ...getCookieOptions(),
    maxAge: 0,
  });
}

export async function getDownlineSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DOWNLINE_COOKIE_NAME)?.value;
  const tokenData = verifyDownlineToken(token);

  if (!tokenData?.sub) {
    return null;
  }

  const [user] = await db
    .select({
      emailVerified: users.emailVerified,
      activationToken: users.activationToken,
      activationTokenExpiresAt: users.activationTokenExpiresAt,
    })
    .from(users)
    .where(eq(users.id, tokenData.sub))
    .limit(1);

  const activationStatus = evaluateReferralActivation(user || {});
  if (!activationStatus.canLogin) {
    return null;
  }

  const profile = await getDownlineProfileByUserId(tokenData.sub);
  if (!profile || profile.role !== "downline" || !profile.isReferralActive) {
    return null;
  }

  return {
    tokenData,
    profile,
  };
}

export async function requireDownlineSession() {
  const session = await getDownlineSession();

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return {
    ok: true,
    ...session,
  };
}
