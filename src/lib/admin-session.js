import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/jwt";

export function normalizeAdminType(tokenData) {
  return tokenData?.adminType === "admin" ? "admin" : "superadmin";
}

export function getAdminPermissions(adminType = "superadmin") {
  const isSuperadmin = adminType !== "admin";

  return {
    viewDashboard: true,
    viewProducts: true,
    manageProducts: isSuperadmin,
    viewOrders: true,
    updateOrders: true,
    deleteOrders: isSuperadmin,
    viewVouchers: true,
    addVoucherCodes: true,
    manageVoucherActions: isSuperadmin,
    deleteVoucherCodes: isSuperadmin,
    manageUsers: isSuperadmin,
    manageSettings: isSuperadmin,
    manageBanners: isSuperadmin,
    manageDownline: isSuperadmin,
    manageReferralPayout: isSuperadmin,
    editProfile: adminType === "admin",
  };
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_token")?.value;
  const tokenData = verifyAdminToken(adminToken);

  if (!tokenData) {
    return null;
  }

  const adminType = normalizeAdminType(tokenData);

  return {
    tokenData,
    adminType,
    permissions: getAdminPermissions(adminType),
  };
}

export async function requireAdminSession(options = {}) {
  const {
    allowedAdminTypes = ["superadmin", "admin"],
    forbiddenMessage = "Akses ditolak.",
  } = options;

  const session = await getAdminSession();

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (!allowedAdminTypes.includes(session.adminType)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: forbiddenMessage },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    ...session,
  };
}
