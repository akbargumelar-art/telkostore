// ==============================
// TELKO.STORE - Auth Configuration
// Auth.js v5 (NextAuth) + Google & Facebook
// ==============================

import fs from "node:fs";
import path from "node:path";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import db from "@/db/index.js";
import { users } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadRuntimeEnvFallback() {
  const mode = process.env.NODE_ENV === "production" ? "production" : "development";
  const projectRoot = process.cwd();
  const fileOrder = [
    `.env.${mode}.local`,
    ".env.local",
    `.env.${mode}`,
    ".env",
  ];

  const merged = {};

  for (const fileName of fileOrder) {
    const filePath = path.join(projectRoot, fileName);
    const parsed = parseEnvFile(filePath);

    for (const [key, value] of Object.entries(parsed)) {
      if (!(key in merged)) {
        merged[key] = value;
      }
    }
  }

  return merged;
}

const runtimeEnvFallback = loadRuntimeEnvFallback();

function getEnvValue(name) {
  return process.env[name] || runtimeEnvFallback[name] || "";
}

const canonicalBaseUrl =
  getEnvValue("NEXT_PUBLIC_BASE_URL") ||
  getEnvValue("AUTH_URL") ||
  getEnvValue("NEXTAUTH_URL");

if (canonicalBaseUrl) {
  process.env.AUTH_URL = canonicalBaseUrl;
  process.env.NEXTAUTH_URL = canonicalBaseUrl;
}

if (!process.env.AUTH_TRUST_HOST) {
  process.env.AUTH_TRUST_HOST = getEnvValue("AUTH_TRUST_HOST") || "true";
}

function getProviderCredentials() {
  return {
    googleClientId: getEnvValue("GOOGLE_CLIENT_ID") || getEnvValue("AUTH_GOOGLE_ID"),
    googleClientSecret:
      getEnvValue("GOOGLE_CLIENT_SECRET") || getEnvValue("AUTH_GOOGLE_SECRET"),
    facebookClientId:
      getEnvValue("FACEBOOK_CLIENT_ID") || getEnvValue("AUTH_FACEBOOK_ID"),
    facebookClientSecret:
      getEnvValue("FACEBOOK_CLIENT_SECRET") ||
      getEnvValue("AUTH_FACEBOOK_SECRET"),
  };
}

function logProviderStateOnce(credentials) {
  if (globalThis.__telkoAuthProviderStateLogged) {
    return;
  }

  globalThis.__telkoAuthProviderStateLogged = true;

  console.info("[auth] runtime config", {
    cwd: process.cwd(),
    authUrl: process.env.AUTH_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    hasGoogleClientId: Boolean(credentials.googleClientId),
    hasGoogleClientSecret: Boolean(credentials.googleClientSecret),
    hasFacebookClientId: Boolean(credentials.facebookClientId),
    hasFacebookClientSecret: Boolean(credentials.facebookClientSecret),
  });
}

function buildProviders() {
  const credentials = getProviderCredentials();
  logProviderStateOnce(credentials);

  const providers = [];

  if (credentials.googleClientId && credentials.googleClientSecret) {
    providers.push(
      Google({
        clientId: credentials.googleClientId,
        clientSecret: credentials.googleClientSecret,
      })
    );
  } else if (!globalThis.__telkoGoogleProviderMissingLogged) {
    globalThis.__telkoGoogleProviderMissingLogged = true;
    console.warn("[auth] Google OAuth disabled: missing client ID or secret");
  }

  if (credentials.facebookClientId && credentials.facebookClientSecret) {
    providers.push(
      Facebook({
        clientId: credentials.facebookClientId,
        clientSecret: credentials.facebookClientSecret,
      })
    );
  } else if (!globalThis.__telkoFacebookProviderMissingLogged) {
    globalThis.__telkoFacebookProviderMissingLogged = true;
    console.warn("[auth] Facebook OAuth disabled: missing client ID or secret");
  }

  return providers;
}

export const { handlers, signIn, signOut, auth } = NextAuth(() => ({
  providers: buildProviders(),
  pages: {
    signIn: "/account",
  },
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // On sign in -> upsert user in our database
    async signIn({ user, account }) {
      try {
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(users).values({
            id: `USR-${nanoid(12)}`,
            name: user.name,
            email: user.email,
            image: user.image,
            provider: account.provider,
            providerId: account.providerAccountId,
            createdAt: new Date().toISOString(),
          });
        } else {
          await db
            .update(users)
            .set({
              name: user.name,
              image: user.image,
              provider: account.provider,
              providerId: account.providerAccountId,
            })
            .where(eq(users.email, user.email));
        }
      } catch (err) {
        console.error("Error upserting user:", err);
      }
      return true;
    },

    // Attach our DB user ID to the JWT token
    async jwt({ token, user }) {
      if (user?.email) {
        try {
          const dbUser = await db
            .select()
            .from(users)
            .where(eq(users.email, user.email))
            .limit(1);

          if (dbUser.length > 0) {
            token.userId = dbUser[0].id;
            token.phone = dbUser[0].phone;
            token.role = dbUser[0].role || "user";
          }
        } catch (err) {
          console.error("Error fetching user for JWT:", err);
        }
      }
      return token;
    },

    // Expose user ID and phone in client session
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
      }
      if (token.phone) {
        session.user.phone = token.phone;
      }
      if (token.role) {
        session.user.role = token.role;
      }
      return session;
    },
  },
}));
