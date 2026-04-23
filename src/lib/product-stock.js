import { and, count, eq, inArray, isNull } from "drizzle-orm";

import db from "@/db/index.js";
import { orders, products, voucherCodes } from "@/db/schema.js";

const HELD_VOUCHER_ORDER_STATUSES = ["pending", "paid"];

function toNumber(value) {
  return Number(value || 0);
}

export function usesVoucherCodeStock(productOrCategory) {
  const categoryId =
    typeof productOrCategory === "string"
      ? productOrCategory
      : productOrCategory?.categoryId;

  return categoryId === "voucher-internet";
}

export async function getVoucherStockBreakdown(productId, executor = db) {
  const [availableRow] = await executor
    .select({ count: count() })
    .from(voucherCodes)
    .where(
      and(
        eq(voucherCodes.productId, productId),
        eq(voucherCodes.status, "available")
      )
    );

  const [heldRow] = await executor
    .select({ count: count() })
    .from(orders)
    .leftJoin(voucherCodes, eq(voucherCodes.orderId, orders.id))
    .where(
      and(
        eq(orders.productId, productId),
        inArray(orders.status, HELD_VOUCHER_ORDER_STATUSES),
        isNull(voucherCodes.id)
      )
    );

  const available = toNumber(availableRow?.count);
  const held = toNumber(heldRow?.count);

  return {
    available,
    held,
    stock: Math.max(available - held, 0),
  };
}

export async function withComputedVoucherStocks(productList, executor = db) {
  if (!Array.isArray(productList) || productList.length === 0) {
    return Array.isArray(productList) ? productList : [];
  }

  const voucherProductIds = [
    ...new Set(
      productList
        .filter((product) => usesVoucherCodeStock(product))
        .map((product) => product.id)
    ),
  ];

  if (voucherProductIds.length === 0) {
    return productList.map((product) => ({
      ...product,
      stockMode: "manual",
    }));
  }

  const availableRows = await executor
    .select({
      productId: voucherCodes.productId,
      count: count(),
    })
    .from(voucherCodes)
    .where(
      and(
        inArray(voucherCodes.productId, voucherProductIds),
        eq(voucherCodes.status, "available")
      )
    )
    .groupBy(voucherCodes.productId);

  const heldRows = await executor
    .select({
      productId: orders.productId,
      count: count(),
    })
    .from(orders)
    .leftJoin(voucherCodes, eq(voucherCodes.orderId, orders.id))
    .where(
      and(
        inArray(orders.productId, voucherProductIds),
        inArray(orders.status, HELD_VOUCHER_ORDER_STATUSES),
        isNull(voucherCodes.id)
      )
    )
    .groupBy(orders.productId);

  const availableMap = new Map(
    availableRows.map((row) => [row.productId, toNumber(row.count)])
  );
  const heldMap = new Map(
    heldRows.map((row) => [row.productId, toNumber(row.count)])
  );

  return productList.map((product) => {
    if (!usesVoucherCodeStock(product)) {
      return {
        ...product,
        stockMode: "manual",
      };
    }

    const voucherAvailableCount = availableMap.get(product.id) || 0;
    const voucherHeldCount = heldMap.get(product.id) || 0;

    return {
      ...product,
      stock: Math.max(voucherAvailableCount - voucherHeldCount, 0),
      stockMode: "voucher-codes",
      voucherAvailableCount,
      voucherHeldCount,
    };
  });
}

export async function syncVoucherProductStock(productId, executor = db) {
  if (!productId) return null;

  const [product] = await executor
    .select({
      id: products.id,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!usesVoucherCodeStock(product)) {
    return null;
  }

  const breakdown = await getVoucherStockBreakdown(productId, executor);

  await executor
    .update(products)
    .set({
      stock: breakdown.stock,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, productId));

  return breakdown;
}
