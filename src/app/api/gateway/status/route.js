// GET /api/gateway/status — Check which payment gateway is ACTIVE
// Public endpoint (no auth required) — returns the active gateway name
//
// Only ONE payment gateway can be active at a time.
// Admin controls which gateway is active via the settings page.
// Customers are automatically routed to the active gateway.

import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { gatewaySettings } from "@/db/schema.js";

/**
 * Determine the active payment gateway.
 * Priority: check which gateway has isActive=true AND has usable keys.
 * If multiple are active, pick the first one found in order: midtrans > pakasir > doku.
 * If none is explicitly active, fallback to midtrans.
 */
export async function getActiveGateway() {
  try {
    const allSettings = await db.select().from(gatewaySettings);

    // Filter to payment gateways only (exclude waha etc.)
    const paymentGateways = ["midtrans", "pakasir", "doku"];
    const gateways = allSettings.filter((s) => paymentGateways.includes(s.providerName));

    function hasUsableKey(value) {
      if (!value) return false;
      return !["YOUR_SERVER_KEY", "YOUR_CLIENT_KEY", "YOUR_API_KEY", "YOUR_SECRET_KEY", "YOUR_CLIENT_ID"].includes(value) && !value.includes("XXXX");
    }

    function isSettingActive(s) {
      const active = s.isActive === true || s.isActive === 1 || s.isActive === "true";
      return active && hasUsableKey(s.serverKey) && hasUsableKey(s.clientKey);
    }

    // Find the active gateway (only one should be active)
    for (const name of paymentGateways) {
      const gw = gateways.find((g) => g.providerName === name);
      if (gw && isSettingActive(gw)) {
        return {
          activeGateway: name,
          label: name === "midtrans" ? "Midtrans" : name === "pakasir" ? "Pakasir" : "DOKU",
        };
      }
    }

    // Fallback: check env vars for midtrans
    if (process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY) {
      return { activeGateway: "midtrans", label: "Midtrans" };
    }

    return { activeGateway: "midtrans", label: "Midtrans" }; // ultimate fallback
  } catch (error) {
    console.error("getActiveGateway error:", error.message);
    return { activeGateway: "midtrans", label: "Midtrans" };
  }
}

export async function GET() {
  try {
    const { activeGateway, label } = await getActiveGateway();

    return NextResponse.json({
      activeGateway,
      label,
    });
  } catch {
    return NextResponse.json({
      activeGateway: "midtrans",
      label: "Midtrans",
    });
  }
}
