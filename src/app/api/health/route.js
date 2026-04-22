// GET /api/health — Application health check endpoint
// Used for monitoring, load balancer checks, and deploy verification

import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const start = Date.now();
  const checks = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "0.2.0",
    node: process.version,
    checks: {},
  };

  // Database connectivity check
  try {
    const [result] = await db.execute(sql`SELECT 1 as ping`);
    checks.checks.database = {
      status: "ok",
      latency: `${Date.now() - start}ms`,
    };
  } catch (err) {
    checks.status = "degraded";
    checks.checks.database = {
      status: "error",
      error: err.message,
    };
  }

  // Environment check — verify critical vars exist (don't expose values)
  const requiredEnvVars = [
    "DATABASE_URL",
    "MIDTRANS_SERVER_KEY",
    "ADMIN_SECRET",
    "AUTH_SECRET",
    "NEXT_PUBLIC_BASE_URL",
  ];

  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  checks.checks.environment = {
    status: missingVars.length === 0 ? "ok" : "warning",
    missing: missingVars.length > 0 ? missingVars : undefined,
  };

  checks.responseTime = `${Date.now() - start}ms`;

  const httpStatus = checks.status === "ok" ? 200 : 503;
  return NextResponse.json(checks, { status: httpStatus });
}
