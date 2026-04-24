import { NextResponse } from "next/server";

import { clearDownlineAuthCookie } from "@/lib/downline-auth";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logout referral berhasil.",
  });

  clearDownlineAuthCookie(response);
  return response;
}
