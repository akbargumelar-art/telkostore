// ==============================
// TELKO.STORE — Database Schema
// Drizzle ORM + SQLite
// ==============================

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ===== USERS (OAuth accounts) =====
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  image: text("image"),
  phone: text("phone"),
  provider: text("provider"), // google, facebook
  providerId: text("provider_id"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ===== CATEGORIES =====
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
  description: text("description"),
  color: text("color"),
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ===== PRODUCTS =====
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").references(() => categories.id).notNull(),
  name: text("name").notNull(),
  type: text("type").default("virtual"), // virtual | fisik
  description: text("description"),
  nominal: integer("nominal"), // for pulsa (5000, 10000, etc)
  price: real("price").notNull(),
  originalPrice: real("original_price"),
  stock: integer("stock").default(999),
  validity: text("validity"), // "7 Hari", "30 Hari"
  quota: text("quota"), // "12GB", "5GB"
  gameName: text("game_name"),
  gameIcon: text("game_icon"),
  isPromo: integer("is_promo", { mode: "boolean" }).default(false),
  isFlashSale: integer("is_flash_sale", { mode: "boolean" }).default(false),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ===== ORDERS =====
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), // INV-xxxx format
  userId: text("user_id"), // null for guest checkout
  productId: text("product_id").references(() => products.id).notNull(),
  productName: text("product_name").notNull(), // snapshot of product name
  productPrice: real("product_price").notNull(), // snapshot of price at purchase
  guestPhone: text("guest_phone").notNull(), // buyer phone for WA notification
  guestToken: text("guest_token").notNull().unique(), // unique guest access token
  targetData: text("target_data").notNull(), // target phone number / game account
  status: text("status").default("pending"), // pending, paid, processing, completed, failed
  paymentMethod: text("payment_method"),
  snapToken: text("snap_token"), // Midtrans Snap Token
  snapRedirectUrl: text("snap_redirect_url"), // Midtrans redirect URL
  midtransOrderId: text("midtrans_order_id"), // Midtrans order_id
  whatsappSent: integer("whatsapp_sent", { mode: "boolean" }).default(false),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
  paidAt: text("paid_at"),
  completedAt: text("completed_at"),
});

// ===== PAYMENTS (Midtrans transaction log) =====
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => orders.id).notNull(),
  gateway: text("gateway").default("midtrans"),
  paymentType: text("payment_type"), // qris, bank_transfer, gopay, etc
  transactionId: text("transaction_id"), // Midtrans transaction_id
  transactionStatus: text("transaction_status"), // capture, settlement, pending, deny, cancel, expire
  grossAmount: real("gross_amount"),
  fraudStatus: text("fraud_status"),
  rawResponse: text("raw_response"), // full JSON response from Midtrans
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ===== GATEWAY SETTINGS =====
export const gatewaySettings = sqliteTable("gateway_settings", {
  id: text("id").primaryKey(),
  providerName: text("provider_name").notNull(), // midtrans, waha
  serverKey: text("server_key"),
  clientKey: text("client_key"),
  apiUrl: text("api_url"),
  isProduction: integer("is_production", { mode: "boolean" }).default(false),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});
