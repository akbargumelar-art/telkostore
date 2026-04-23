// GET /api/products/[id] — Product detail by ID
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { products } from "@/db/schema.js";
import { eq, and } from "drizzle-orm";
import { withComputedVoucherStocks } from "@/lib/product-stock";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const result = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.isActive, true)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const [product] = await withComputedVoucherStocks(result);

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
