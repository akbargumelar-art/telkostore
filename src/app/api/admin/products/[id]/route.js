// PUT/DELETE /api/admin/products/[id] — Update/Delete product
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { products } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import { syncVoucherProductStock, usesVoucherCodeStock } from "@/lib/product-stock";

// PUT — Update product
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check product exists
    const existing = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const currentProduct = existing[0];
    const targetCategoryId = body.categoryId ?? currentProduct.categoryId;
    const managedByVoucherCodes = usesVoucherCodeStock(targetCategoryId);

    const updateData = {};
    const allowedFields = [
      "name", "categoryId", "type", "description", "nominal",
      "price", "originalPrice", "stock", "validity", "quota",
      "gameName", "gameIcon", "isPromo", "isFlashSale", "isActive",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "stock" && managedByVoucherCodes) continue;
        updateData[field] = body[field];
      }
    }

    updateData.updatedAt = new Date().toISOString();

    await db.update(products).set(updateData).where(eq(products.id, id));

    if (managedByVoucherCodes) {
      await syncVoucherProductStock(id);
    }

    return NextResponse.json({
      success: true,
      message: "Produk berhasil diperbarui",
    });
  } catch (error) {
    console.error("PUT /api/admin/products/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui produk" },
      { status: 500 }
    );
  }
}

// DELETE — Soft-delete product (set isActive = false)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const existing = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(products.id, id));

    return NextResponse.json({
      success: true,
      message: "Produk berhasil dinonaktifkan",
    });
  } catch (error) {
    console.error("DELETE /api/admin/products/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menonaktifkan produk" },
      { status: 500 }
    );
  }
}
