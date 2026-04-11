// GET/POST /api/admin/products — List all products (admin) / Create product
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { products, categories } from "@/db/schema.js";
import { eq, like, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET — List all products (including inactive) for admin
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const activeOnly = searchParams.get("active");

    let query = db.select().from(products);

    const conditions = [];
    if (category && category !== "all") {
      conditions.push(eq(products.categoryId, category));
    }
    if (activeOnly === "true") {
      conditions.push(eq(products.isActive, true));
    }
    if (search) {
      conditions.push(like(products.name, `%${search}%`));
    }

    if (conditions.length > 0) {
      query = query.where(sql`${conditions.map((c, i) => i === 0 ? c : sql` AND ${c}`).reduce((a, b) => sql`${a}${b}`)}`);
    }

    const result = await query.orderBy(sql`${products.createdAt} DESC`);

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error("GET /api/admin/products error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST — Create a new product
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name, categoryId, type, description, nominal,
      price, originalPrice, stock, validity, quota,
      gameName, gameIcon, isPromo, isFlashSale,
    } = body;

    if (!name || !categoryId || !price) {
      return NextResponse.json(
        { success: false, error: "name, categoryId, dan price wajib diisi" },
        { status: 400 }
      );
    }

    // Verify category exists
    const catCheck = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
    if (catCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Kategori tidak ditemukan" },
        { status: 400 }
      );
    }

    const id = `${categoryId}-${nanoid(8).toLowerCase()}`;
    const now = new Date().toISOString();

    await db.insert(products).values({
      id,
      categoryId,
      name,
      type: type || "virtual",
      description: description || null,
      nominal: nominal || null,
      price,
      originalPrice: originalPrice || null,
      stock: stock ?? 999,
      validity: validity || null,
      quota: quota || null,
      gameName: gameName || null,
      gameIcon: gameIcon || null,
      isPromo: isPromo || false,
      isFlashSale: isFlashSale || false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      data: { id },
      message: "Produk berhasil ditambahkan",
    });
  } catch (error) {
    console.error("POST /api/admin/products error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menambah produk" },
      { status: 500 }
    );
  }
}
