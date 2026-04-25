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
  role: varchar("role", { length: 20 }).default("user"), // user, admin, downline
  passwordHash: varchar("password_hash", { length: 255 }),
  activationToken: varchar("activation_token", { length: 255 }),
  activationTokenExpiresAt: varchar("activation_token_expires_at", { length: 50 }),
  emailVerified: boolean("email_verified").default(false),
  provider: varchar("provider", { length: 50 }), // google, facebook
  providerId: varchar("provider_id", { length: 255 }),
  createdAt: varchar("created_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
});

// ===== DOWNLINE PROFILES =====
export const downlineProfiles = mysqlTable("downline_profiles", {
  id: varchar("id", { length: 100 }).primaryKey(),
  userId: varchar("user_id", { length: 100 }).references(() => users.id).notNull().unique(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  customReferralAlias: varchar("custom_referral_alias", { length: 120 }).unique(),
  isCustomReferralActive: boolean("is_custom_referral_active").default(false),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  marginPerTransaction: double("margin_per_transaction").default(0).notNull(),
  isReferralActive: boolean("is_referral_active").default(true),
  bannerTitle: varchar("banner_title", { length: 255 }),
  bannerSubtitle: text("banner_subtitle"),
  bannerImageUrl: text("banner_image_url"),
  themeKey: varchar("theme_key", { length: 40 }).default("sunrise").notNull(),
  promoRedirectPath: varchar("promo_redirect_path", { length: 255 }).default("/").notNull(),
  bankName: varchar("bank_name", { length: 100 }),
  bankAccountNumber: varchar("bank_account_number", { length: 100 }),
  bankAccountName: varchar("bank_account_name", { length: 255 }),
  createdAt: varchar("created_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar("updated_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
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
  supplierName: varchar("supplier_name", { length: 50 }),
  supplierSkuCode: varchar("supplier_sku_code", { length: 100 }),
  isDigiflazzEnabled: boolean("is_digiflazz_enabled").default(false),
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
  downlineUserId: varchar("downline_user_id", { length: 100 }).references(() => users.id),
  downlineProfileId: varchar("downline_profile_id", { length: 100 }).references(() => downlineProfiles.id),
  downlineSlug: varchar("downline_slug", { length: 120 }),
  downlineCustomAlias: varchar("downline_custom_alias", { length: 120 }),
  downlineDisplayName: varchar("downline_display_name", { length: 255 }),
  downlineMarginSnapshot: double("downline_margin_snapshot"),
  referralSource: varchar("referral_source", { length: 40 }),
  referralAttributedAt: varchar("referral_attributed_at", { length: 50 }),
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

// ===== DIGIFLAZZ TRANSACTIONS =====
export const digiflazzTransactions = mysqlTable("digiflazz_transactions", {
  id: varchar("id", { length: 100 }).primaryKey(),
  orderId: varchar("order_id", { length: 100 }).references(() => orders.id).notNull(),
  refId: varchar("ref_id", { length: 100 }).notNull(),
  buyerSkuCode: varchar("buyer_sku_code", { length: 100 }).notNull(),
  customerNo: varchar("customer_no", { length: 255 }).notNull(),
  status: varchar("status", { length: 30 }).notNull(), // pending, success, failed
  message: text("message"),
  sn: text("sn"),
  buyerLastSaldo: double("buyer_last_saldo"),
  rawRequest: text("raw_request"),
  rawResponse: text("raw_response"),
  createdAt: varchar("created_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar("updated_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
});

// ===== REFERRAL COMMISSIONS =====
export const referralCommissions = mysqlTable("referral_commissions", {
  id: varchar("id", { length: 100 }).primaryKey(),
  orderId: varchar("order_id", { length: 100 }).references(() => orders.id).notNull().unique(),
  downlineUserId: varchar("downline_user_id", { length: 100 }).references(() => users.id).notNull(),
  downlineProfileId: varchar("downline_profile_id", { length: 100 }).references(() => downlineProfiles.id).notNull(),
  downlineSlugSnapshot: varchar("downline_slug_snapshot", { length: 120 }).notNull(),
  downlineCustomAliasSnapshot: varchar("downline_custom_alias_snapshot", { length: 120 }),
  downlineDisplayNameSnapshot: varchar("downline_display_name_snapshot", { length: 255 }),
  commissionAmount: double("commission_amount").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, approved, void, paid, processing
  statusReason: text("status_reason"),
  trackedAt: varchar("tracked_at", { length: 50 }),
  approvedAt: varchar("approved_at", { length: 50 }),
  paidAt: varchar("paid_at", { length: 50 }),
  withdrawalId: varchar("withdrawal_id", { length: 100 }), // null unless being withdrawn
  createdAt: varchar("created_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar("updated_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
});

// ===== REFERRAL WITHDRAWALS =====
export const referralWithdrawals = mysqlTable("referral_withdrawals", {
  id: varchar("id", { length: 100 }).primaryKey(),
  downlineProfileId: varchar("downline_profile_id", { length: 100 }).references(() => downlineProfiles.id).notNull(),
  amount: double("amount").notNull(),
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  accountNumber: varchar("account_number", { length: 100 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, processing, completed, rejected
  adminNotes: text("admin_notes"),
  processedAt: varchar("processed_at", { length: 50 }),
  createdAt: varchar("created_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar("updated_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
});

// ===== REFERRAL CLICKS =====
export const referralClicks = mysqlTable("referral_clicks", {
  id: varchar("id", { length: 100 }).primaryKey(),
  downlineProfileId: varchar("downline_profile_id", { length: 100 }).references(() => downlineProfiles.id).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  customAlias: varchar("custom_alias", { length: 120 }),
  ipHash: varchar("ip_hash", { length: 128 }).notNull(),
  userAgent: text("user_agent"),
  landingPath: varchar("landing_path", { length: 255 }),
  createdAt: varchar("created_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
});

// ===== SITE BANNERS =====
export const siteBanners = mysqlTable("site_banners", {
  id: varchar("id", { length: 100 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  subtitle: text("subtitle"),
  ctaText: varchar("cta_text", { length: 100 }).notNull(),
  ctaType: varchar("cta_type", { length: 20 }).default("link"),
  ctaLink: varchar("cta_link", { length: 500 }),
  categoryId: varchar("category_id", { length: 100 }),
  backgroundStyle: text("background_style"),
  sortOrder: int("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: varchar("created_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar("updated_at", { length: 50 }).$defaultFn(() => new Date().toISOString()),
});
