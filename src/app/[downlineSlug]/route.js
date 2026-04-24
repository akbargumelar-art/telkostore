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
  const response = NextResponse.redirect(new URL(landingTarget, request.url));

  applyReferralCookies(response, referral, "slug");
  await recordReferralClick(referral, request, "slug", landingTarget);

  return response;
}
