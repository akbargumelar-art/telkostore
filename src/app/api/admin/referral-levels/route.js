import { inArray, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import db from "@/db/index.js";
import { referralLevelRules } from "@/db/schema.js";
import { requireAdminSession } from "@/lib/admin-session";
import {
  listReferralLevelRules,
  validateReferralLevelRules,
} from "@/lib/referral-levels";

function buildSummary(rules) {
  const activeRules = rules.filter((rule) => rule.isActive);

  return {
    totalRules: rules.length,
    activeRules: activeRules.length,
    fallbackToLegacy: activeRules.length === 0,
  };
}

export async function GET() {
  const auth = await requireAdminSession({
    allowedAdminTypes: ["superadmin"],
    forbiddenMessage: "Hanya superadmin yang dapat mengakses rule referral.",
  });
  if (!auth.ok) return auth.response;

  try {
    const rules = await listReferralLevelRules(db);

    return NextResponse.json({
      success: true,
      data: rules,
      summary: buildSummary(rules),
    });
  } catch (error) {
    console.error("GET /api/admin/referral-levels error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil rule referral." },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const auth = await requireAdminSession({
    allowedAdminTypes: ["superadmin"],
    forbiddenMessage: "Hanya superadmin yang dapat mengubah rule referral.",
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const incomingRules = Array.isArray(body.rules) ? body.rules : [];
    const validatedRules = validateReferralLevelRules(incomingRules);
    const existingRules = await listReferralLevelRules(db);
    const existingIds = new Set(existingRules.map((rule) => rule.id));
    const submittedExistingIds = new Set(
      validatedRules.filter((rule) => rule.id && existingIds.has(rule.id)).map((rule) => rule.id)
    );
    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      for (let index = 0; index < validatedRules.length; index += 1) {
        const rule = validatedRules[index];
        const payload = {
          name: rule.name,
          minTransactions: rule.minTransactions,
          maxTransactions: rule.maxTransactions,
          commissionAmount: rule.commissionAmount,
          sortOrder: index + 1,
          isActive: rule.isActive,
          updatedAt: now,
        };

        if (rule.id && existingIds.has(rule.id)) {
          await tx
            .update(referralLevelRules)
            .set(payload)
            .where(eq(referralLevelRules.id, rule.id));
          continue;
        }

        await tx.insert(referralLevelRules).values({
          id: `RLR-${nanoid(10)}`,
          ...payload,
          createdAt: now,
        });
      }

      const omittedRuleIds = existingRules
        .filter((rule) => !submittedExistingIds.has(rule.id))
        .map((rule) => rule.id);

      if (omittedRuleIds.length > 0) {
        await tx
          .update(referralLevelRules)
          .set({
            isActive: false,
            updatedAt: now,
          })
          .where(inArray(referralLevelRules.id, omittedRuleIds));
      }
    });

    const rules = await listReferralLevelRules(db);

    return NextResponse.json({
      success: true,
      message: "Rule referral berhasil diperbarui.",
      data: rules,
      summary: buildSummary(rules),
    });
  } catch (error) {
    console.error("PUT /api/admin/referral-levels error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menyimpan rule referral." },
      { status: 400 }
    );
  }
}
