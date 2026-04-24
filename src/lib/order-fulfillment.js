import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import db from "@/db/index.js";
import { digiflazzTransactions, orders, products } from "@/db/schema.js";
import {
  buildDigiflazzRefId,
  createDigiflazzTransaction,
  isDigiflazzEnabledProduct,
  mapDigiflazzStatusToOrderStatus,
  normalizeDigiflazzStatus,
} from "@/lib/digiflazz";
import {
  buildOrderCompletedMsg,
  buildOrderProcessingMsg,
  formatRupiahServer,
} from "@/lib/whatsapp";
import { ensureVoucherFulfillment, isVoucherProduct } from "@/lib/voucher";
import { syncReferralCommissionForOrder } from "@/lib/referral-commission";

function serializePayload(value) {
  if (value == null) return null;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function getProductForOrder(order, providedProduct) {
  if (providedProduct) return providedProduct;

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, order.productId))
    .limit(1);

  return product || null;
}

async function getLatestDigiflazzTransaction(orderId) {
  const result = await db
    .select()
    .from(digiflazzTransactions)
    .where(eq(digiflazzTransactions.orderId, orderId))
    .orderBy(desc(digiflazzTransactions.createdAt))
    .limit(1);

  return result[0] || null;
}

async function getDigiflazzTransactionByRefId(refId) {
  const result = await db
    .select()
    .from(digiflazzTransactions)
    .where(eq(digiflazzTransactions.refId, refId))
    .limit(1);

  return result[0] || null;
}

async function upsertDigiflazzTransaction(order, digiflazzData, rawRequest, rawResponse, existingTx) {
  const now = new Date().toISOString();
  const normalizedStatus = normalizeDigiflazzStatus(digiflazzData?.status);
  const values = {
    orderId: order.id,
    refId: digiflazzData.ref_id || existingTx?.refId || buildDigiflazzRefId(order.id),
    buyerSkuCode: digiflazzData.buyer_sku_code || existingTx?.buyerSkuCode || "",
    customerNo:
      digiflazzData.customer_no ||
      existingTx?.customerNo ||
      order.targetData ||
      order.guestPhone,
    status: normalizedStatus,
    message: digiflazzData?.message || existingTx?.message || null,
    sn: digiflazzData?.sn || existingTx?.sn || null,
    buyerLastSaldo:
      digiflazzData?.buyer_last_saldo != null
        ? Number(digiflazzData.buyer_last_saldo)
        : (existingTx?.buyerLastSaldo ?? null),
    rawRequest: rawRequest ? serializePayload(rawRequest) : (existingTx?.rawRequest ?? null),
    rawResponse: rawResponse ? serializePayload(rawResponse) : (existingTx?.rawResponse ?? null),
    updatedAt: now,
  };

  if (existingTx) {
    await db
      .update(digiflazzTransactions)
      .set(values)
      .where(eq(digiflazzTransactions.id, existingTx.id));

    return { ...existingTx, ...values };
  }

  const created = {
    id: `DFZ-${nanoid(10)}`,
    ...values,
    createdAt: now,
  };

  await db.insert(digiflazzTransactions).values(created);
  return created;
}

async function notifyDigiflazzOrderUpdate(previousOrder, nextOrder, digiflazzData, callbacks = {}) {
  const { sendWA, sendGroup } = callbacks;
  const previousStatus = previousOrder.status;
  const nextStatus = nextOrder.status;
  const supplierMessage = digiflazzData?.message || "Tanpa pesan";
  const serialNumber = digiflazzData?.sn ? `\nSN: ${digiflazzData.sn}` : "";

  if (nextStatus === previousStatus) return;

  if (nextStatus === "processing") {
    if (sendWA) {
      try {
        await sendWA(previousOrder.guestPhone, buildOrderProcessingMsg(nextOrder));
      } catch (error) {
        console.error("WA Digiflazz processing notification failed:", error.message);
      }
    }

    if (sendGroup) {
      try {
        await sendGroup(
          `*[DIGIFLAZZ] Pesanan Diproses - Telko.Store*\n\n` +
          `Invoice: ${previousOrder.id}\n` +
          `Produk: ${previousOrder.productName}\n` +
          `Tujuan: ${previousOrder.targetData}\n` +
          `Supplier: Digiflazz\n` +
          `Status: ${supplierMessage}${serialNumber}`
        );
      } catch (error) {
        console.error("WA Digiflazz processing group notification failed:", error.message);
      }
    }

    return;
  }

  if (nextStatus === "completed") {
    if (sendWA) {
      try {
        await sendWA(previousOrder.guestPhone, buildOrderCompletedMsg(nextOrder));
      } catch (error) {
        console.error("WA Digiflazz completed notification failed:", error.message);
      }
    }

    if (sendGroup) {
      try {
        await sendGroup(
          `*[DIGIFLAZZ] Transaksi Berhasil - Telko.Store*\n\n` +
          `Invoice: ${previousOrder.id}\n` +
          `Produk: ${previousOrder.productName}\n` +
          `Total: ${formatRupiahServer(previousOrder.productPrice)}\n` +
          `Pembeli: ${previousOrder.guestPhone}\n` +
          `Tujuan: ${previousOrder.targetData}\n` +
          `Status: ${supplierMessage}${serialNumber}`
        );
      } catch (error) {
        console.error("WA Digiflazz completed group notification failed:", error.message);
      }
    }

    return;
  }

  if (nextStatus === "failed") {
    if (sendWA) {
      try {
        await sendWA(
          previousOrder.guestPhone,
          `*Pesanan Gagal Diproses - Telko.Store*\n\n` +
            `Invoice: ${previousOrder.id}\n` +
            `Produk: ${previousOrder.productName}\n` +
            `Tujuan: ${previousOrder.targetData}\n\n` +
            `Supplier kami melaporkan kendala: ${supplierMessage}.\n` +
            `Tim kami akan melakukan pengecekan lanjutan. Jika perlu bantuan cepat, silakan hubungi CS.\n\n` +
            `Lacak pesanan:\n${process.env.NEXT_PUBLIC_BASE_URL}/order/${previousOrder.id}?token=${previousOrder.guestToken}`
        );
      } catch (error) {
        console.error("WA Digiflazz failed notification failed:", error.message);
      }
    }

    if (sendGroup) {
      try {
        await sendGroup(
          `*[DIGIFLAZZ] Transaksi Gagal - Telko.Store*\n\n` +
          `Invoice: ${previousOrder.id}\n` +
          `Produk: ${previousOrder.productName}\n` +
          `Total: ${formatRupiahServer(previousOrder.productPrice)}\n` +
          `Pembeli: ${previousOrder.guestPhone}\n` +
          `Tujuan: ${previousOrder.targetData}\n` +
          `Status: ${supplierMessage}${serialNumber}\n\n` +
          `Perlu follow-up admin di dashboard pesanan.`
        );
      } catch (error) {
        console.error("WA Digiflazz failed group notification failed:", error.message);
      }
    }
  }
}

async function applyDigiflazzResultToOrder(order, digiflazzData, callbacks = {}) {
  const normalizedStatus = normalizeDigiflazzStatus(digiflazzData?.status);
  let nextStatus = order.status;

  if (normalizedStatus === "success") {
    nextStatus = "completed";
  } else if (normalizedStatus === "failed" && order.status !== "completed") {
    nextStatus = "failed";
  } else if (normalizedStatus === "pending" && order.status !== "completed") {
    nextStatus = "processing";
  }

  const now = new Date().toISOString();
  const updateData = { updatedAt: now };

  if (nextStatus !== order.status) {
    updateData.status = nextStatus;
  }
  if (nextStatus === "completed" && !order.completedAt) {
    updateData.completedAt = now;
  }

  if (Object.keys(updateData).length > 1) {
    await db.update(orders).set(updateData).where(eq(orders.id, order.id));
  }

  const nextOrder = {
    ...order,
    ...updateData,
    status: nextStatus,
  };

  await syncReferralCommissionForOrder(nextOrder);

  await notifyDigiflazzOrderUpdate(order, nextOrder, digiflazzData, callbacks);

  return {
    normalizedStatus,
    orderStatus: nextStatus || mapDigiflazzStatusToOrderStatus(normalizedStatus),
    order: nextOrder,
  };
}

export async function ensureDigiflazzFulfillment(order, callbacks = {}, options = {}) {
  const product = await getProductForOrder(order, options.product);

  if (!isDigiflazzEnabledProduct(product)) {
    return {
      type: "manual",
      manualActionRequired: true,
      skippedReason: "product_not_digiflazz",
      order,
      product,
    };
  }

  const existingTx = await getLatestDigiflazzTransaction(order.id);
  if (existingTx) {
    const syncResult = await applyDigiflazzResultToOrder(
      order,
      {
        status: existingTx.status,
        message: existingTx.message,
        sn: existingTx.sn,
      },
      callbacks
    );

    return {
      type: "digiflazz",
      manualActionRequired: false,
      skippedReason: "already_requested",
      transaction: existingTx,
      orderStatus: syncResult.orderStatus,
      order: syncResult.order,
      product,
    };
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/digiflazz`;
  const result = await createDigiflazzTransaction({
    buyerSkuCode: product.supplierSkuCode,
    customerNo: order.targetData,
    refId: buildDigiflazzRefId(order.id),
    callbackUrl,
    maxPrice: order.productPrice,
  });

  const digiflazzData = result.payload || {};
  const transaction = await upsertDigiflazzTransaction(
    order,
    digiflazzData,
    result.rawRequest,
    result.rawResponse,
    null
  );
  const syncResult = await applyDigiflazzResultToOrder(order, digiflazzData, callbacks);

  return {
    type: "digiflazz",
    manualActionRequired: false,
    transaction,
    orderStatus: syncResult.orderStatus,
    order: syncResult.order,
    product,
  };
}

export async function syncDigiflazzWebhookFulfillment(payload, callbacks = {}) {
  const digiflazzData = payload?.data || payload;
  const refId = digiflazzData?.ref_id;

  if (!refId) {
    return {
      found: false,
      skippedReason: "missing_ref_id",
    };
  }

  const existingTx = await getDigiflazzTransactionByRefId(refId);
  if (!existingTx) {
    return {
      found: false,
      skippedReason: "transaction_not_found",
      refId,
    };
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, existingTx.orderId))
    .limit(1);

  if (!order) {
    return {
      found: false,
      skippedReason: "order_not_found",
      refId,
    };
  }

  const transaction = await upsertDigiflazzTransaction(
    order,
    digiflazzData,
    null,
    payload,
    existingTx
  );
  const syncResult = await applyDigiflazzResultToOrder(order, digiflazzData, callbacks);

  return {
    found: true,
    type: "digiflazz",
    transaction,
    orderStatus: syncResult.orderStatus,
    order: syncResult.order,
  };
}

export async function ensurePostPaymentFulfillment(order, callbacks = {}, options = {}) {
  if (await isVoucherProduct(order.productId)) {
    const voucherResult = await ensureVoucherFulfillment(order, callbacks, options);
    return {
      type: "voucher",
      manualActionRequired: false,
      ...voucherResult,
    };
  }

  return ensureDigiflazzFulfillment(order, callbacks, options);
}
