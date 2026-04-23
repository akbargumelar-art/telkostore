import { NextResponse } from "next/server";
import { getAdminCredentialsConfig } from "@/lib/admin-auth";

// GET /api/admin/profile
export async function GET() {
  const config = getAdminCredentialsConfig();

  return NextResponse.json({
    success: true,
    data: {
      loginPath: "/control/login",
      username: config.username,
      hasEmailIdentity: config.hasEmailIdentity,
      hasDedicatedPassword: config.hasDedicatedPassword,
      oauthAdminEnabled: true,
    },
  });
}

// PUT /api/admin/profile
export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Kredensial control panel sekarang diatur lewat .env.local dan deploy ulang.",
    },
    { status: 405 }
  );
}
