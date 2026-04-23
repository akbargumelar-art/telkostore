// ==============================
// TELKO.STORE — Database Schema
// Drizzle ORM + MySQL
// ==============================

import { mysqlTable, varchar, int, double, boolean, text } from "drizzle-orm/mysql-core";

// ===== USERS (OAuth accounts) =====
export const users = mysqlTable("users", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique(),
  image: text("image"),
  phone: varchar("phone", { length: 20 }),
  role: varchar("role", { length: 20 }).default("user"), // user, admin
  passwordHash: varchar("password_hash", { length: 255 }),
  provider: varchar("provider", { length: 50 }), // google, facebook
  providerId: varchar("provider_id", { length: 255 }),
  createdAt: varchar("created_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
});

// ===== CATEGORIES =====
export const categories = mysqlTable("categories", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  description: text("description"),
  color: varchar("color", { length: 20 }),
  sortOrder: int("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: varchar("created_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
});

// ===== PRODUCTS =====
export const products = mysqlTable("products", {
  id: varchar("id", { length: 100 }).primaryKey(),
  categoryId: varchar("category_id", { length: 100 }).references(() => categories.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).default("virtual"), // virtual | fisik
  description: text("description"),
  nominal: int("nominal"), // for pulsa (5000, 10000, etc)
  price: double("price").notNull(),
  originalPrice: double("original_price"),
  stock: int("stock").default(999),
  validity: varchar("validity", { length: 50 }), // "7 Hari", "30 Hari"
  quota: varchar("quota", { length: 50 }), // "12GB", "5GB"
  gameName: varchar("game_name", { length: 100 }),
  gameIcon: varchar("game_icon", { length: 50 }),
  isPromo: boolean("is_promo").default(false),
  isFlashSale: boolean("is_flash_sale").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: varchar("created_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar("updated_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
});

// ===== ORDERS =====
export const orders = mysqlTable("orders", {
  id: varchar("id", { length: 100 }).primaryKey(), // INV-xxxx format
  userId: varchar("user_id", { length: 100 }), // null for guest checkout
  productId: varchar("product_id", { length: 100 }).references(() => products.id).notNull(),
  productName: varchar("product_name", { length: 255 }).notNull(), // snapshot of product name
  productPrice: double("product_price").notNull(), // snapshot of price at purchase
  guestPhone: varchar("guest_phone", { length: 20 }).notNull(), // buyer phone for WA notification
  guestToken: varchar("guest_token", { length: 100 }).notNull().unique(), // unique guest access token
  targetData: varchar("target_data", { length: 500 }).notNull(), // target phone number / game account
  status: varchar("status", { length: 20 }).default("pending"), // pending, paid, processing, completed, failed
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentGateway: varchar("payment_gateway", { length: 50 }).default("midtrans"), // midtrans, pakasir
  snapToken: varchar("snap_token", { length: 255 }), // Midtrans Snap Token
  snapRedirectUrl: text("snap_redirect_url"), // Midtrans redirect URL
  midtransOrderId: varchar("midtrans_order_id", { length: 100 }), // Midtrans order_id
  whatsappSent: boolean("whatsapp_sent").default(false),
  notes: text("notes"),
  createdAt: varchar("created_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar("updated_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
  paidAt: varchar("paid_at", { length: 50 }),
  completedAt: varchar("completed_at", { length: 50 }),
});

// ===== PAYMENTS (transaction log) =====
export const payments = mysqlTable("payments", {
  id: varchar("id", { length: 100 }).primaryKey(),
  orderId: varchar("order_id", { length: 100 }).references(() => orders.id).notNull(),
  gateway: varchar("gateway", { length: 50 }).default("midtrans"), // midtrans, pakasir
  paymentType: varchar("payment_type", { length: 50 }), // qris, bank_transfer, gopay, etc
  transactionId: varchar("transaction_id", { length: 255 }), // gateway transaction_id
  transactionStatus: varchar("transaction_status", { length: 50 }), // capture, settlement, pending, deny, cancel, expire, completed
  grossAmount: double("gross_amount"),
  fraudStatus: varchar("fraud_status", { length: 50 }),
  rawResponse: text("raw_response"), // full JSON response from gateway
  createdAt: varchar("created_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
});

// ===== GATEWAY SETTINGS =====
export const gatewaySettings = mysqlTable("gateway_settings", {
  id: varchar("id", { length: 100 }).primaryKey(),
  providerName: varchar("provider_name", { length: 50 }).notNull(), // midtrans, waha, pakasir
  serverKey: varchar("server_key", { length: 500 }),
  clientKey: varchar("client_key", { length: 500 }),
  apiUrl: varchar("api_url", { length: 500 }),
  sessionName: varchar("session_name", { length: 100 }), // WAHA session name
  isProduction: boolean("is_production").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: varchar("created_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
});

// ===== VOUCHER CODES =====
export const voucherCodes = mysqlTable("voucher_codes", {
  id: varchar("id", { length: 100 }).primaryKey(),
  productId: varchar("product_id", { length: 100 }).notNull(),
  code: varchar("code", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 50 }), // simpati, byu
  status: varchar("status", { length: 20 }).default("available"), // available, reserved, redeemed, failed
  orderId: varchar("order_id", { length: 100 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  redeemedAt: varchar("redeemed_at", { length: 50 }),
  redeemResponse: text("redeem_response"),
  createdAt: varchar("created_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar("updated_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
});
