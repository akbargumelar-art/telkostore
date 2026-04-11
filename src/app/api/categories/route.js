// GET /api/categories — List all categories
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { categories } from "@/db/schema.js";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder));

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
