// GET/PUT /api/admin/settings — Gateway settings management
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { gatewaySettings } from "@/db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { clearMidtransCache } from "@/lib/midtrans";
import { clearPakasirCache } from "@/lib/pakasir";
import { clearDokuCache } from "@/lib/doku";
import { clearDuitkuCache } from "@/lib/duitku";

const PAYMENT_GATEWAY_PROVIDERS = ["midtrans", "pakasir", "doku", "duitku"];

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === 1 || value === "true";
}

function clearGatewayCaches() {
  clearMidtransCache();
  clearPakasirCache();
  clearDokuCache();
  clearDuitkuCache();
}

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
    const isPaymentGateway = PAYMENT_GATEWAY_PROVIDERS.includes(providerName);
    const normalizedProduction = parseBoolean(isProduction, false);
    const normalizedActive = parseBoolean(
      isActive,
      isPaymentGateway ? false : true
    );

    await db.transaction(async (tx) => {
      if (isPaymentGateway && isActive !== undefined && normalizedActive) {
        await tx
          .update(gatewaySettings)
          .set({ isActive: false })
          .where(
            inArray(gatewaySettings.providerName, PAYMENT_GATEWAY_PROVIDERS)
          );
      }

      if (existing.length > 0) {
        const updateData = {};
        if (serverKey !== undefined) updateData.serverKey = serverKey;
        if (clientKey !== undefined) updateData.clientKey = clientKey;
        if (apiUrl !== undefined) updateData.apiUrl = apiUrl;
        if (sessionName !== undefined) updateData.sessionName = sessionName;
        if (isProduction !== undefined) updateData.isProduction = normalizedProduction;
        if (isActive !== undefined) updateData.isActive = normalizedActive;

        await tx
          .update(gatewaySettings)
          .set(updateData)
          .where(eq(gatewaySettings.id, existing[0].id));
        return;
      }

      await tx.insert(gatewaySettings).values({
        id: `gw-${nanoid(8)}`,
        providerName,
        serverKey: serverKey || null,
        clientKey: clientKey || null,
        apiUrl: apiUrl || null,
        sessionName: sessionName || null,
        isProduction: isProduction !== undefined ? normalizedProduction : false,
        isActive: isActive !== undefined ? normalizedActive : (isPaymentGateway ? false : true),
        createdAt: now,
      });
    });

    if (isPaymentGateway) {
      clearGatewayCaches();
    }

    return NextResponse.json({
      success: true,
      message: existing.length > 0
        ? `Setting ${providerName} berhasil diperbarui`
        : `Setting ${providerName} berhasil ditambahkan`,
    });
  } catch (error) {
    console.error("PUT /api/admin/settings error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan pengaturan" },
      { status: 500 }
    );
  }
}
