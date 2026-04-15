// GET/PUT /api/admin/settings — Gateway settings management
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { gatewaySettings } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET — Fetch all gateway settings
export async function GET() {
  try {
    const result = await db.select().from(gatewaySettings);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("GET /api/admin/settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT — Update or create gateway settings
export async function PUT(request) {
  try {
    const body = await request.json();
    const { providerName, serverKey, clientKey, apiUrl, sessionName, isProduction, isActive } = body;

    if (!providerName) {
      return NextResponse.json(
        { success: false, error: "providerName wajib diisi" },
        { status: 400 }
      );
    }

    // Check if provider already exists
    const existing = await db
      .select()
      .from(gatewaySettings)
      .where(eq(gatewaySettings.providerName, providerName))
      .limit(1);

    const now = new Date().toISOString();

    if (existing.length > 0) {
      // Update existing
      const updateData = {};
      if (serverKey !== undefined) updateData.serverKey = serverKey;
      if (clientKey !== undefined) updateData.clientKey = clientKey;
      if (apiUrl !== undefined) updateData.apiUrl = apiUrl;
      if (sessionName !== undefined) updateData.sessionName = sessionName;
      if (isProduction !== undefined) updateData.isProduction = isProduction;
      if (isActive !== undefined) updateData.isActive = isActive;

      await db
        .update(gatewaySettings)
        .set(updateData)
        .where(eq(gatewaySettings.id, existing[0].id));

      return NextResponse.json({
        success: true,
        message: `Setting ${providerName} berhasil diperbarui`,
      });
    } else {
      // Create new
      await db.insert(gatewaySettings).values({
        id: `gw-${nanoid(8)}`,
        providerName,
        serverKey: serverKey || null,
        clientKey: clientKey || null,
        apiUrl: apiUrl || null,
        sessionName: sessionName || null,
        isProduction: isProduction || false,
        isActive: isActive ?? true,
        createdAt: now,
      });

      return NextResponse.json({
        success: true,
        message: `Setting ${providerName} berhasil ditambahkan`,
      });
    }
  } catch (error) {
    console.error("PUT /api/admin/settings error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan pengaturan" },
      { status: 500 }
    );
  }
}
