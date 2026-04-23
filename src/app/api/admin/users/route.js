// GET /api/admin/users — List users + search
// POST /api/admin/users — Create a new user (admin-created)
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { users } from "@/db/schema.js";
import { like, or, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = db.select().from(users);

    if (search) {
      query = query.where(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }

    const result = await query.orderBy(desc(users.createdAt)).limit(100);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST — Create a new user (manually from admin panel)
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, phone, role } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama wajib diisi" },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Email wajib diisi" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "Email sudah terdaftar" },
        { status: 409 }
      );
    }

    const validRoles = ["user", "admin"];
    const userRole = validRoles.includes(role) ? role : "user";

    const userId = `USR-${nanoid(12)}`;
    const now = new Date().toISOString();

    await db.insert(users).values({
      id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      role: userRole,
      provider: "manual",
      providerId: null,
      image: null,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      message: `User ${name} berhasil dibuat sebagai ${userRole}`,
      data: { id: userId, name: name.trim(), email: email.trim().toLowerCase(), role: userRole },
    });
  } catch (error) {
    console.error("POST /api/admin/users error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat user" },
      { status: 500 }
    );
  }
}
