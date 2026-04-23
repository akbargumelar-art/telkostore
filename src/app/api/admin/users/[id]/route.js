// GET/PUT/DELETE /api/admin/users/[id]
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { users, orders } from "@/db/schema.js";
import { eq, desc } from "drizzle-orm";
import {
  getDefaultAdminUserPassword,
  hashAdminUserPassword,
} from "@/lib/admin-user-password";

const userDetailSelect = {
  id: users.id,
  name: users.name,
  email: users.email,
  image: users.image,
  phone: users.phone,
  role: users.role,
  provider: users.provider,
  providerId: users.providerId,
  createdAt: users.createdAt,
};

// GET — User detail + orders
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const [user] = await db
      .select(userDetailSelect)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get user's orders
    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, id))
      .orderBy(desc(orders.createdAt))
      .limit(20);

    return NextResponse.json({
      success: true,
      data: { ...user, orders: userOrders },
    });
  } catch (error) {
    console.error("GET /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT — Update user (role, phone, etc.)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check user exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    const updateData = {};
    const allowedFields = ["role", "phone", "name"];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Validate role
    if (updateData.role && !["user", "admin"].includes(updateData.role)) {
      return NextResponse.json(
        { success: false, error: "Role harus 'user' atau 'admin'" },
        { status: 400 }
      );
    }

    if (
      updateData.role === "admin" &&
      existing.role !== "admin" &&
      !existing.passwordHash
    ) {
      updateData.passwordHash = hashAdminUserPassword(
        getDefaultAdminUserPassword()
      );
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "Tidak ada data yang diperbarui" },
        { status: 400 }
      );
    }

    await db.update(users).set(updateData).where(eq(users.id, id));

    return NextResponse.json({
      success: true,
      message:
        updateData.role === "admin" && existing.role !== "admin"
          ? `User berhasil dijadikan admin. Password default: ${getDefaultAdminUserPassword()}`
          : "User berhasil diperbarui",
    });
  } catch (error) {
    console.error("PUT /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui user" },
      { status: 500 }
    );
  }
}

// DELETE — Remove user
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({
      success: true,
      message: "User deleted",
    });
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
