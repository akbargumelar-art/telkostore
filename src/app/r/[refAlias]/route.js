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
  const response = NextResponse.redirect(new URL(landingTarget, request.url));

  applyReferralCookies(response, referral, "custom_alias");
  await recordReferralClick(referral, request, "custom_alias", landingTarget);

  return response;
}
