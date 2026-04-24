// GET /api/products — List products with filtering
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { products } from "@/db/schema.js";
import { and, eq, like, or } from "drizzle-orm";
import { withComputedVoucherStocks } from "@/lib/product-stock";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const flashSale = searchParams.get("flash_sale");
    const promo = searchParams.get("promo");

    let conditions = [eq(products.isActive, true)];

    if (category && category !== "all") {
      conditions.push(eq(products.categoryId, category));
    }
    if (flashSale === "true") {
      conditions.push(eq(products.isFlashSale, true));
    }
    if (promo === "true") {
      conditions.push(eq(products.isPromo, true));
    }
    if (search) {
      conditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.description, `%${search}%`),
          like(products.quota, `%${search}%`),
          like(products.validity, `%${search}%`),
          like(products.gameName, `%${search}%`)
        )
      );
    }

    const result = await db
      .select()
      .from(products)
      .where(and(...conditions));

    const data = await withComputedVoucherStocks(result);

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
