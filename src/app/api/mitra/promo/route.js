import { NextResponse } from "next/server";

import { requireDownlineSession } from "@/lib/downline-auth";
import { getDownlineByProfileId } from "@/lib/referral-service";
import {
  PROMO_VISUAL_VARIANTS,
  REFERRAL_THEME_OPTIONS,
} from "@/lib/referral-config";

export async function GET() {
  const auth = await requireDownlineSession();
  if (!auth.ok) return auth.response;

  try {
    const profile = await getDownlineByProfileId(auth.profile.profileId);

    return NextResponse.json({
      success: true,
      data: {
        profile,
        visualVariants: PROMO_VISUAL_VARIANTS,
        themeOptions: REFERRAL_THEME_OPTIONS,
      },
    });
  } catch (error) {
    console.error("GET /api/mitra/promo error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil aset promo mitra." },
      { status: 500 }
    );
  }
}
