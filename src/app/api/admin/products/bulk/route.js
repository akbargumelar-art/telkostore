// POST /api/admin/products/bulk — Bulk operations on products
// Supports: import, delete, toggle-active, update-price, update-stock
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { products, categories, orders, voucherCodes } from "@/db/schema.js";
import { count, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { usesVoucherCodeStock, withComputedVoucherStocks } from "@/lib/product-stock";

function toNumber(value) {
  return Number(value || 0);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, ids, data } = body;

    switch (action) {
      // ===== BULK IMPORT (CSV/JSON) =====
      case "import": {
        if (!Array.isArray(data) || data.length === 0) {
          return NextResponse.json(
            { success: false, error: "Data produk kosong" },
            { status: 400 }
          );
        }

        // Validate max 500 items per batch
        if (data.length > 500) {
          return NextResponse.json(
            { success: false, error: "Maksimal 500 produk per import" },
            { status: 400 }
          );
        }

        // Fetch existing categories for validation
        const existingCategories = await db.select({ id: categories.id }).from(categories);
        const categoryIds = new Set(existingCategories.map((c) => c.id));

        const now = new Date().toISOString();
        const results = { imported: 0, skipped: 0, errors: [] };

        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          const row = i + 1;

          // Validate required fields
          if (!item.name || !item.categoryId || !item.price) {
            results.errors.push(`Baris ${row}: name, categoryId, dan price wajib diisi`);
            results.skipped++;
            continue;
          }

          // Validate category exists
          if (!categoryIds.has(item.categoryId)) {
            results.errors.push(`Baris ${row}: Kategori "${item.categoryId}" tidak ditemukan`);
            results.skipped++;
            continue;
          }

          // Validate price is a number
          const price = Number(item.price);
          if (isNaN(price) || price <= 0) {
            results.errors.push(`Baris ${row}: Harga tidak valid`);
            results.skipped++;
            continue;
          }

          try {
            const id = item.id || `${item.categoryId}-${nanoid(8).toLowerCase()}`;

            await db.insert(products).values({
              id,
              categoryId: item.categoryId,
              name: item.name,
              type: item.type || "virtual",
              description: item.description || null,
              nominal: item.nominal ? Number(item.nominal) : null,
              price,
              originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
              stock: usesVoucherCodeStock(item.categoryId)
                ? 0
                : (item.stock != null ? Number(item.stock) : 999),
              validity: item.validity || null,
              quota: item.quota || null,
              gameName: item.gameName || null,
              gameIcon: item.gameIcon || null,
              isPromo: item.isPromo === true || item.isPromo === "true",
              isFlashSale: item.isFlashSale === true || item.isFlashSale === "true",
              isActive: item.isActive !== false && item.isActive !== "false",
              createdAt: now,
              updatedAt: now,
            });

            results.imported++;
          } catch (err) {
            if (err.code === "ER_DUP_ENTRY") {
              results.errors.push(`Baris ${row}: ID "${item.id}" sudah ada`);
            } else {
              results.errors.push(`Baris ${row}: ${err.message}`);
            }
            results.skipped++;
          }
        }

        return NextResponse.json({
          success: true,
          message: `${results.imported} produk berhasil diimport, ${results.skipped} dilewati`,
          data: results,
        });
      }

      // ===== BULK DELETE (soft) =====
      case "delete": {
        if (!Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json(
            { success: false, error: "Pilih minimal 1 produk" },
            { status: 400 }
          );
        }

        const now = new Date().toISOString();
        await db
          .update(products)
          .set({ isActive: false, updatedAt: now })
          .where(inArray(products.id, ids));

        return NextResponse.json({
          success: true,
          message: `${ids.length} produk berhasil dinonaktifkan`,
        });
      }

      // ===== BULK HARD DELETE =====
      case "hard-delete": {
        if (!Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json(
            { success: false, error: "Pilih minimal 1 produk" },
            { status: 400 }
          );
        }

        const [orderRefs] = await db
          .select({ total: count() })
          .from(orders)
          .where(inArray(orders.productId, ids));

        const [voucherRefs] = await db
          .select({ total: count() })
          .from(voucherCodes)
          .where(inArray(voucherCodes.productId, ids));

        const orderCount = toNumber(orderRefs?.total);
        const voucherCount = toNumber(voucherRefs?.total);

        if (orderCount > 0 || voucherCount > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Tidak bisa hapus permanen karena masih dipakai ${orderCount} pesanan dan ${voucherCount} kode voucher. Nonaktifkan produk agar hilang dari toko tanpa menghapus histori.`,
            },
            { status: 409 }
          );
        }

        await db.delete(products).where(inArray(products.id, ids));

        return NextResponse.json({
          success: true,
          message: `${ids.length} produk berhasil dihapus permanen`,
        });
      }

      // ===== BULK TOGGLE ACTIVE =====
      case "toggle-active": {
        if (!Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json(
            { success: false, error: "Pilih minimal 1 produk" },
            { status: 400 }
          );
        }

        const isActive = data?.isActive ?? true;
        const now2 = new Date().toISOString();

        await db
          .update(products)
          .set({ isActive, updatedAt: now2 })
          .where(inArray(products.id, ids));

        return NextResponse.json({
          success: true,
          message: `${ids.length} produk berhasil di${isActive ? "aktifkan" : "nonaktifkan"}`,
        });
      }

      // ===== BULK UPDATE PRICE =====
      case "update-price": {
        if (!Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json(
            { success: false, error: "Pilih minimal 1 produk" },
            { status: 400 }
          );
        }

        const { adjustType, adjustValue } = data || {};
        if (!adjustType || adjustValue == null) {
          return NextResponse.json(
            { success: false, error: "adjustType dan adjustValue wajib diisi" },
            { status: 400 }
          );
        }

        // Fetch selected products
        const selectedProducts = await db
          .select()
          .from(products)
          .where(inArray(products.id, ids));

        let updated = 0;
        const now3 = new Date().toISOString();

        for (const product of selectedProducts) {
          let newPrice = product.price;

          if (adjustType === "fixed") {
            newPrice = Number(adjustValue);
          } else if (adjustType === "increase") {
            newPrice = product.price + Number(adjustValue);
          } else if (adjustType === "decrease") {
            newPrice = product.price - Number(adjustValue);
          } else if (adjustType === "percent-increase") {
            newPrice = Math.round(product.price * (1 + Number(adjustValue) / 100));
          } else if (adjustType === "percent-decrease") {
            newPrice = Math.round(product.price * (1 - Number(adjustValue) / 100));
          }

          if (newPrice < 0) newPrice = 0;

          await db
            .update(products)
            .set({ price: newPrice, updatedAt: now3 })
            .where(eq(products.id, product.id));

          updated++;
        }

        return NextResponse.json({
          success: true,
          message: `Harga ${updated} produk berhasil diperbarui`,
        });
      }

      // ===== BULK UPDATE STOCK =====
      case "update-stock": {
        if (!Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json(
            { success: false, error: "Pilih minimal 1 produk" },
            { status: 400 }
          );
        }

        const stockValue = Number(data?.stock);
        if (isNaN(stockValue) || stockValue < 0) {
          return NextResponse.json(
            { success: false, error: "Nilai stok tidak valid" },
            { status: 400 }
          );
        }

        const selectedProducts = await db
          .select({
            id: products.id,
            categoryId: products.categoryId,
          })
          .from(products)
          .where(inArray(products.id, ids));

        const manualStockIds = selectedProducts
          .filter((product) => !usesVoucherCodeStock(product))
          .map((product) => product.id);
        const managedCount = selectedProducts.length - manualStockIds.length;

        if (manualStockIds.length > 0) {
          const now4 = new Date().toISOString();
          await db
            .update(products)
            .set({ stock: stockValue, updatedAt: now4 })
            .where(inArray(products.id, manualStockIds));
        }

        return NextResponse.json({
          success: true,
          message:
            managedCount > 0
              ? `Stok ${manualStockIds.length} produk manual diubah menjadi ${stockValue}. ${managedCount} voucher internet dilewati karena stok dihitung otomatis dari kode voucher.`
              : `Stok ${manualStockIds.length} produk diubah menjadi ${stockValue}`,
        });
      }

      // ===== BULK TOGGLE PROMO =====
      case "toggle-promo": {
        if (!Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json(
            { success: false, error: "Pilih minimal 1 produk" },
            { status: 400 }
          );
        }

        const isPromo = data?.isPromo ?? true;
        const now5 = new Date().toISOString();

        await db
          .update(products)
          .set({ isPromo, updatedAt: now5 })
          .where(inArray(products.id, ids));

        return NextResponse.json({
          success: true,
          message: `${ids.length} produk ${isPromo ? "dijadikan promo" : "dihapus dari promo"}`,
        });
      }

      // ===== EXPORT =====
      case "export": {
        const allProducts = await db.select().from(products);
        const exportedProducts = await withComputedVoucherStocks(allProducts);
        return NextResponse.json({
          success: true,
          data: exportedProducts,
          count: exportedProducts.length,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Aksi '${action}' tidak dikenali` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("POST /api/admin/products/bulk error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memproses bulk action" },
      { status: 500 }
    );
  }
}
