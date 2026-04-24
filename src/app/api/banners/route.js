import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import db from "@/db/index.js";
import { siteBanners } from "@/db/schema.js";
import {
  cloneDefaultSiteBanners,
  normalizeBannerRecord,
} from "@/lib/site-banners";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(siteBanners)
      .where(eq(siteBanners.isActive, true))
      .orderBy(asc(siteBanners.sortOrder), asc(siteBanners.createdAt));

    return NextResponse.json(
      {
        success: true,
        data: rows.map(normalizeBannerRecord),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/banners error:", error);

    return NextResponse.json(
      {
        success: true,
        data: cloneDefaultSiteBanners(),
        fallback: true,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
