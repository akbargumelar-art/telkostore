// ==============================
// TELKO.STORE - Auth Configuration
// Auth.js v5 (NextAuth) + Google & Facebook
// ==============================

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { loadEnvConfig } from "@next/env";
import db from "@/db/index.js";
import { users } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

loadEnvConfig(process.cwd());

if (!process.env.AUTH_URL && process.env.NEXT_PUBLIC_BASE_URL) {
  process.env.AUTH_URL = process.env.NEXT_PUBLIC_BASE_URL;
}

if (!process.env.NEXTAUTH_URL && process.env.NEXT_PUBLIC_BASE_URL) {
  process.env.NEXTAUTH_URL = process.env.NEXT_PUBLIC_BASE_URL;
}

if (!process.env.AUTH_TRUST_HOST) {
  process.env.AUTH_TRUST_HOST = "true";
}

function getProviderCredentials() {
  return {
    googleClientId:
      process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "",
    googleClientSecret:
      process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || "",
    facebookClientId:
      process.env.FACEBOOK_CLIENT_ID || process.env.AUTH_FACEBOOK_ID || "",
    facebookClientSecret:
      process.env.FACEBOOK_CLIENT_SECRET ||
      process.env.AUTH_FACEBOOK_SECRET ||
      "",
  };
}

function buildProviders() {
  const {
    googleClientId,
    googleClientSecret,
    facebookClientId,
    facebookClientSecret,
  } = getProviderCredentials();

  const providers = [];

  if (googleClientId && googleClientSecret) {
    providers.push(
      Google({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      })
    );
  } else {
    console.warn("[auth] Google OAuth disabled: missing client ID or secret");
  }

  if (facebookClientId && facebookClientSecret) {
    providers.push(
      Facebook({
        clientId: facebookClientId,
        clientSecret: facebookClientSecret,
      })
    );
  } else {
    console.warn("[auth] Facebook OAuth disabled: missing client ID or secret");
  }

  return providers;
}

export const { handlers, signIn, signOut, auth } = NextAuth(() => ({
  providers: buildProviders(),
  pages: {
    signIn: "/account",
  },
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
