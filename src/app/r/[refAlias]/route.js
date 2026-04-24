import { NextResponse } from "next/server";

import {
  applyReferralCookies,
  recordReferralClick,
  resolveReferralByAlias,
  resolveReferralRedirectTarget,
} from "@/lib/referral";

export async function GET(request, { params }) {
  const { refAlias } = await params;
  const referral = await resolveReferralByAlias(refAlias);

  if (!referral) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const landingTarget = resolveReferralRedirectTarget(request.url, referral);
  
  // Use NEXT_PUBLIC_BASE_URL to construct the absolute redirect URL
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://telko.store").replace(/\/+$/, "");
  const absoluteRedirectUrl = baseUrl + landingTarget;

  const response = NextResponse.redirect(absoluteRedirectUrl);

  applyReferralCookies(response, referral, "custom_alias");
  await recordReferralClick(referral, request, "custom_alias", landingTarget);

  return response;
}
