import { NextResponse } from "next/server";

import {
  applyReferralCookies,
  recordReferralClick,
  resolveReferralBySlug,
  resolveReferralRedirectTarget,
} from "@/lib/referral";

export async function GET(request, { params }) {
  const { downlineSlug } = await params;
  const referral = await resolveReferralBySlug(downlineSlug);

  if (!referral) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const landingTarget = resolveReferralRedirectTarget(request.url, referral);
  
  // Use NEXT_PUBLIC_BASE_URL to construct the absolute redirect URL
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://telko.store").replace(/\/+$/, "");
  const absoluteRedirectUrl = baseUrl + landingTarget;

  const response = NextResponse.redirect(absoluteRedirectUrl);

  applyReferralCookies(response, referral, "slug");
  await recordReferralClick(referral, request, "slug", landingTarget);

  return response;
}
