// Admin Profile API — change admin secret key
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { gatewaySettings } from "@/db/schema.js";
import { eq } from "drizzle-orm";

// GET /api/admin/profile
export async function GET() {
  return NextResponse.json({
    success: true,
    data: { role: "superadmin", name: "Admin" },
  });
}

// PUT /api/admin/profile — Change admin secret key
export async function PUT(request) {
  try {
    const { oldKey, newKey } = await request.json();

    if (!oldKey || !newKey) {
      return NextResponse.json(
        { success: false, error: "Old key dan new key wajib diisi" },
        { status: 400 }
      );
    }

    // Validate old key against current ADMIN_SECRET
    const adminSecret = process.env.ADMIN_SECRET;
    if (oldKey !== adminSecret) {
      return NextResponse.json(
        { success: false, error: "Kunci saat ini tidak cocok" },
        { status: 403 }
      );
    }

    if (newKey.length < 8) {
      return NextResponse.json(
        { success: false, error: "Kunci baru minimal 8 karakter" },
        { status: 400 }
      );
    }

    // Store new key in gateway_settings for runtime use
    // Note: this doesn't change .env.local, but the middleware will check this first
    const existing = await db
      .select()
      .from(gatewaySettings)
      .where(eq(gatewaySettings.id, "admin-secret"))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(gatewaySettings).values({
        id: "admin-secret",
        providerName: "admin",
        serverKey: newKey,
        createdAt: new Date().toISOString(),
      });
    } else {
      await db
        .update(gatewaySettings)
        .set({ serverKey: newKey })
        .where(eq(gatewaySettings.id, "admin-secret"));
    }

    // Update the environment variable in memory for this process
    process.env.ADMIN_SECRET = newKey;

    return NextResponse.json({
      success: true,
      message: "Kunci admin berhasil diubah",
    });
  } catch (error) {
    console.error("PUT /api/admin/profile error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update" },
      { status: 500 }
    );
  }
}
