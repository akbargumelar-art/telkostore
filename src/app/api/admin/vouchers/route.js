// GET/POST /api/admin/vouchers — List vouchers / Add voucher codes
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { voucherCodes, products } from "@/db/schema.js";
import { eq, and, like, sql, count, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getVoucherStats } from "@/lib/voucher";
import { syncVoucherProductStock } from "@/lib/product-stock";
import { requireAdminSession } from "@/lib/admin-session";

// GET — List all voucher codes with filters + stats
export async function GET(request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const provider = searchParams.get("provider");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const statsOnly = searchParams.get("statsOnly");

    // Stats mode — return aggregate counts
    if (statsOnly === "true") {
      const stats = await getVoucherStats(productId || null);

      // Also get per-product stats
      const productStats = await db
        .select({
          productId: voucherCodes.productId,
          productName: products.name,
          provider: voucherCodes.provider,
          status: voucherCodes.status,
          count: count(),
        })
        .from(voucherCodes)
        .leftJoin(products, eq(voucherCodes.productId, products.id))
        .groupBy(voucherCodes.productId, products.name, voucherCodes.provider, voucherCodes.status);

      return NextResponse.json({ success: true, stats, productStats });
    }

    // List mode
    const conditions = [];
    if (productId) conditions.push(eq(voucherCodes.productId, productId));
    if (provider && provider !== "all") conditions.push(eq(voucherCodes.provider, provider));
    if (status && status !== "all") conditions.push(eq(voucherCodes.status, status));
    if (search) conditions.push(like(voucherCodes.code, `%${search}%`));

    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: voucherCodes.id,
        productId: voucherCodes.productId,
        productName: products.name,
        code: voucherCodes.code,
        provider: voucherCodes.provider,
        status: voucherCodes.status,
        orderId: voucherCodes.orderId,
        customerPhone: voucherCodes.customerPhone,
        redeemedAt: voucherCodes.redeemedAt,
        redeemResponse: voucherCodes.redeemResponse,
        createdAt: voucherCodes.createdAt,
        updatedAt: voucherCodes.updatedAt,
      })
      .from(voucherCodes)
      .leftJoin(products, eq(voucherCodes.productId, products.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const data = await query
      .orderBy(desc(voucherCodes.createdAt))
      .limit(limit)
      .offset(offset);

    // Total count
    let countQuery = db.select({ c: count() }).from(voucherCodes);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [{ c: total }] = await countQuery;

    return NextResponse.json({
      success: true,
      data,
      total: Number(total),
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /api/admin/vouchers error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data voucher" },
      { status: 500 }
    );
  }
}

// POST — Add voucher code(s)
export async function POST(request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  if (!auth.permissions.addVoucherCodes) {
    return NextResponse.json(
      {
        success: false,
        error: "Akses ditolak. Akun ini tidak dapat menambah kode voucher.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { productId, provider, codes } = body;

    if (!productId || !codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json(
        { success: false, error: "productId dan codes[] wajib diisi" },
        { status: 400 }
      );
    }

    // Verify product exists
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    let inserted = 0;
    let duplicates = 0;

    for (const code of codes) {
      const trimmed = code.trim();
      if (!trimmed) continue;

      // Check if code already exists for this product
      const [existing] = await db
        .select({ id: voucherCodes.id })
        .from(voucherCodes)
        .where(and(eq(voucherCodes.code, trimmed), eq(voucherCodes.productId, productId)))
        .limit(1);

      if (existing) {
        duplicates++;
        continue;
      }

      await db.insert(voucherCodes).values({
        id: `VC-${nanoid(12)}`,
        productId,
        code: trimmed,
        provider: provider || null,
        status: "available",
        createdAt: now,
        updatedAt: now,
      });
      inserted++;
    }

    await syncVoucherProductStock(productId);

    return NextResponse.json({
      success: true,
      message: `${inserted} kode voucher ditambahkan${duplicates > 0 ? `, ${duplicates} duplikat dilewati` : ""}`,
      inserted,
      duplicates,
    });
  } catch (error) {
    console.error("POST /api/admin/vouchers error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menambah voucher" },
      { status: 500 }
    );
  }
}
