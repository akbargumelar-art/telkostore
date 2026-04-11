// ==============================
// TELKO.STORE — Database Seed Script (Full)
// Run: npm run db:seed
// Includes: categories, products, dummy orders, payments, gateway settings
// ==============================

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../telko.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

console.log("🔧 Creating tables...");

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    image TEXT,
    phone TEXT,
    provider TEXT,
    provider_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'virtual',
    description TEXT,
    nominal INTEGER,
    price REAL NOT NULL,
    original_price REAL,
    stock INTEGER DEFAULT 999,
    validity TEXT,
    quota TEXT,
    game_name TEXT,
    game_icon TEXT,
    is_promo INTEGER DEFAULT 0,
    is_flash_sale INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    product_id TEXT NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    product_price REAL NOT NULL,
    guest_phone TEXT NOT NULL,
    guest_token TEXT NOT NULL UNIQUE,
    target_data TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    snap_token TEXT,
    snap_redirect_url TEXT,
    midtrans_order_id TEXT,
    whatsapp_sent INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    paid_at TEXT,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    gateway TEXT DEFAULT 'midtrans',
    payment_type TEXT,
    transaction_id TEXT,
    transaction_status TEXT,
    gross_amount REAL,
    fraud_status TEXT,
    raw_response TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS gateway_settings (
    id TEXT PRIMARY KEY,
    provider_name TEXT NOT NULL,
    server_key TEXT,
    client_key TEXT,
    api_url TEXT,
    is_production INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log("✅ Tables created!");

// ===== SEED CATEGORIES =====
console.log("📦 Seeding categories...");

const categories = [
  { id: "pulsa", name: "Pulsa", icon: "📱", description: "Isi pulsa semua operator", color: "#ED0226", sort_order: 1 },
  { id: "paket-data", name: "Paket Data", icon: "📶", description: "Paket internet semua operator", color: "#007BFF", sort_order: 2 },
  { id: "voucher-internet", name: "Voucher Internet", icon: "🌐", description: "Voucher data internet murah", color: "#28A745", sort_order: 3 },
  { id: "voucher-game", name: "Voucher Game", icon: "🎮", description: "Top up game favorit kamu", color: "#FFB800", sort_order: 4 },
];

const insertCategory = sqlite.prepare(`
  INSERT OR REPLACE INTO categories (id, name, icon, description, color, sort_order, is_active)
  VALUES (?, ?, ?, ?, ?, ?, 1)
`);

for (const cat of categories) {
  insertCategory.run(cat.id, cat.name, cat.icon, cat.description, cat.color, cat.sort_order);
}

console.log(`✅ ${categories.length} categories seeded!`);

// ===== SEED PRODUCTS =====
console.log("📦 Seeding products...");

const productData = [
  // PULSA
  { id: "pulsa-5k", categoryId: "pulsa", name: "Pulsa 5.000", nominal: 5000, price: 6500, originalPrice: 7000, description: "Pulsa All Operator Rp5.000", isPromo: 0, isFlashSale: 0, stock: 999 },
  { id: "pulsa-10k", categoryId: "pulsa", name: "Pulsa 10.000", nominal: 10000, price: 11500, originalPrice: 12000, description: "Pulsa All Operator Rp10.000", isPromo: 0, isFlashSale: 0, stock: 999 },
  { id: "pulsa-15k", categoryId: "pulsa", name: "Pulsa 15.000", nominal: 15000, price: 16000, originalPrice: 17000, description: "Pulsa All Operator Rp15.000", isPromo: 0, isFlashSale: 0, stock: 999 },
  { id: "pulsa-20k", categoryId: "pulsa", name: "Pulsa 20.000", nominal: 20000, price: 21000, originalPrice: 22000, description: "Pulsa All Operator Rp20.000", isPromo: 1, isFlashSale: 0, stock: 999 },
  { id: "pulsa-25k", categoryId: "pulsa", name: "Pulsa 25.000", nominal: 25000, price: 26000, originalPrice: 27500, description: "Pulsa All Operator Rp25.000", isPromo: 0, isFlashSale: 0, stock: 999 },
  { id: "pulsa-50k", categoryId: "pulsa", name: "Pulsa 50.000", nominal: 50000, price: 50500, originalPrice: 52000, description: "Pulsa All Operator Rp50.000", isPromo: 1, isFlashSale: 1, stock: 50 },
  { id: "pulsa-100k", categoryId: "pulsa", name: "Pulsa 100.000", nominal: 100000, price: 99000, originalPrice: 102000, description: "Pulsa All Operator Rp100.000", isPromo: 1, isFlashSale: 1, stock: 25 },
  // PAKET DATA
  { id: "data-combo-7d", categoryId: "paket-data", name: "Combo Sakti 12GB", price: 45000, originalPrice: 55000, description: "12GB (5GB Utama + 5GB OMG! + 2GB Video) + 60 Menit + 100 SMS, 7 hari", validity: "7 Hari", quota: "12GB", isPromo: 1, isFlashSale: 0, stock: 200 },
  { id: "data-combo-30d", categoryId: "paket-data", name: "Combo Sakti 30GB", price: 85000, originalPrice: 100000, description: "30GB (15GB Utama + 10GB OMG! + 5GB Video) + 120 Menit + 200 SMS, 30 hari", validity: "30 Hari", quota: "30GB", isPromo: 1, isFlashSale: 1, stock: 100 },
  { id: "data-omg-2gb", categoryId: "paket-data", name: "OMG! 2GB", price: 15000, originalPrice: 18000, description: "Kuota OMG! 2GB untuk semua aplikasi, 7 hari", validity: "7 Hari", quota: "2GB", isPromo: 0, isFlashSale: 0, stock: 500 },
  { id: "data-omg-6gb", categoryId: "paket-data", name: "OMG! 6GB", price: 35000, originalPrice: 42000, description: "Kuota OMG! 6GB untuk semua aplikasi, 30 hari", validity: "30 Hari", quota: "6GB", isPromo: 0, isFlashSale: 0, stock: 350 },
  { id: "data-keluarga-50gb", categoryId: "paket-data", name: "Keluarga 50GB", price: 120000, originalPrice: 150000, description: "50GB kuota berbagi untuk 5 anggota keluarga, 30 hari", validity: "30 Hari", quota: "50GB", isPromo: 1, isFlashSale: 0, stock: 80 },
  { id: "data-orbit-15gb", categoryId: "paket-data", name: "Orbit 15GB", price: 50000, originalPrice: 60000, description: "Paket data khusus Orbit 15GB, 30 hari", validity: "30 Hari", quota: "15GB", isPromo: 0, isFlashSale: 0, stock: 150 },
  // VOUCHER INTERNET
  { id: "voucher-1gb", categoryId: "voucher-internet", name: "Voucher 1GB", price: 8000, originalPrice: 10000, description: "Voucher data 1GB masa aktif 3 hari", validity: "3 Hari", quota: "1GB", isPromo: 0, isFlashSale: 0, stock: 999 },
  { id: "voucher-3gb", categoryId: "voucher-internet", name: "Voucher 3GB", price: 18000, originalPrice: 22000, description: "Voucher data 3GB masa aktif 7 hari", validity: "7 Hari", quota: "3GB", isPromo: 0, isFlashSale: 0, stock: 999 },
  { id: "voucher-5gb", categoryId: "voucher-internet", name: "Voucher 5GB", price: 27000, originalPrice: 35000, description: "Voucher data 5GB masa aktif 15 hari", validity: "15 Hari", quota: "5GB", isPromo: 1, isFlashSale: 1, stock: 150 },
  { id: "voucher-10gb", categoryId: "voucher-internet", name: "Voucher 10GB", price: 45000, originalPrice: 55000, description: "Voucher data 10GB masa aktif 30 hari", validity: "30 Hari", quota: "10GB", isPromo: 1, isFlashSale: 0, stock: 300 },
  { id: "voucher-15gb", categoryId: "voucher-internet", name: "Voucher 15GB", price: 60000, originalPrice: 75000, description: "Voucher data 15GB masa aktif 30 hari", validity: "30 Hari", quota: "15GB", isPromo: 0, isFlashSale: 0, stock: 200 },
  { id: "voucher-25gb", categoryId: "voucher-internet", name: "Voucher 25GB", price: 85000, originalPrice: 100000, description: "Voucher data 25GB masa aktif 30 hari", validity: "30 Hari", quota: "25GB", isPromo: 1, isFlashSale: 1, stock: 75 },
  // VOUCHER GAME
  { id: "game-ml-86", categoryId: "voucher-game", name: "86 Diamonds", nominal: 86, price: 19000, originalPrice: 22000, description: "Mobile Legends: Bang Bang — 86 Diamonds", gameName: "Mobile Legends", gameIcon: "🎯", isPromo: 0, isFlashSale: 0, stock: 500 },
  { id: "game-ml-172", categoryId: "voucher-game", name: "172 Diamonds", nominal: 172, price: 36000, originalPrice: 42000, description: "Mobile Legends: Bang Bang — 172 Diamonds", gameName: "Mobile Legends", gameIcon: "🎯", isPromo: 1, isFlashSale: 0, stock: 300 },
  { id: "game-ml-344", categoryId: "voucher-game", name: "344 Diamonds", nominal: 344, price: 69000, originalPrice: 80000, description: "Mobile Legends: Bang Bang — 344 Diamonds", gameName: "Mobile Legends", gameIcon: "🎯", isPromo: 1, isFlashSale: 1, stock: 100 },
  { id: "game-ff-100", categoryId: "voucher-game", name: "100 Diamonds", nominal: 100, price: 15000, originalPrice: 18000, description: "Free Fire — 100 Diamonds", gameName: "Free Fire", gameIcon: "🔥", isPromo: 0, isFlashSale: 0, stock: 400 },
  { id: "game-ff-310", categoryId: "voucher-game", name: "310 Diamonds", nominal: 310, price: 45000, originalPrice: 52000, description: "Free Fire — 310 Diamonds", gameName: "Free Fire", gameIcon: "🔥", isPromo: 0, isFlashSale: 0, stock: 250 },
  { id: "game-ff-520", categoryId: "voucher-game", name: "520 Diamonds", nominal: 520, price: 72000, originalPrice: 85000, description: "Free Fire — 520 Diamonds", gameName: "Free Fire", gameIcon: "🔥", isPromo: 1, isFlashSale: 1, stock: 80 },
  { id: "game-pubg-60", categoryId: "voucher-game", name: "60 UC", nominal: 60, price: 15000, originalPrice: 16000, description: "PUBG Mobile — 60 UC", gameName: "PUBG Mobile", gameIcon: "🎖️", isPromo: 0, isFlashSale: 0, stock: 350 },
  { id: "game-pubg-325", categoryId: "voucher-game", name: "325 UC", nominal: 325, price: 75000, originalPrice: 85000, description: "PUBG Mobile — 325 UC", gameName: "PUBG Mobile", gameIcon: "🎖️", isPromo: 1, isFlashSale: 0, stock: 180 },
  { id: "game-genshin-60", categoryId: "voucher-game", name: "60 Genesis Crystals", nominal: 60, price: 16000, originalPrice: 18000, description: "Genshin Impact — 60 Genesis Crystals", gameName: "Genshin Impact", gameIcon: "⚔️", isPromo: 0, isFlashSale: 0, stock: 300 },
  { id: "game-genshin-330", categoryId: "voucher-game", name: "330 Genesis Crystals", nominal: 330, price: 79000, originalPrice: 90000, description: "Genshin Impact — 330 Genesis Crystals", gameName: "Genshin Impact", gameIcon: "⚔️", isPromo: 1, isFlashSale: 1, stock: 50 },
];

const insertProduct = sqlite.prepare(`
  INSERT OR REPLACE INTO products (id, category_id, name, type, description, nominal, price, original_price, stock, validity, quota, game_name, game_icon, is_promo, is_flash_sale, is_active)
  VALUES (?, ?, ?, 'virtual', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
`);

for (const p of productData) {
  insertProduct.run(
    p.id, p.categoryId, p.name, p.description,
    p.nominal || null, p.price, p.originalPrice || null, p.stock,
    p.validity || null, p.quota || null, p.gameName || null, p.gameIcon || null,
    p.isPromo, p.isFlashSale
  );
}

console.log(`✅ ${productData.length} products seeded!`);

// ===== SEED DUMMY ORDERS =====
console.log("📦 Seeding dummy orders...");

function randomToken(len) {
  return crypto.randomBytes(len).toString("hex").slice(0, len);
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const dummyOrders = [
  {
    id: "INV-20260410-DEMO0001",
    productId: "pulsa-50k",
    productName: "Pulsa 50.000",
    productPrice: 50500,
    guestPhone: "081234567890",
    guestToken: randomToken(32),
    targetData: "081234567890",
    status: "completed",
    paymentMethod: "qris",
    midtransOrderId: "TELKO-INV-20260410-DEMO0001",
    whatsappSent: 1,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
    paidAt: daysAgo(2),
    completedAt: daysAgo(2),
  },
  {
    id: "INV-20260410-DEMO0002",
    productId: "data-combo-30d",
    productName: "Combo Sakti 30GB",
    productPrice: 85000,
    guestPhone: "085678901234",
    guestToken: randomToken(32),
    targetData: "085678901234",
    status: "completed",
    paymentMethod: "gopay",
    midtransOrderId: "TELKO-INV-20260410-DEMO0002",
    whatsappSent: 1,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
    paidAt: daysAgo(2),
    completedAt: daysAgo(2),
  },
  {
    id: "INV-20260411-DEMO0003",
    productId: "game-ml-344",
    productName: "344 Diamonds",
    productPrice: 69000,
    guestPhone: "087812345678",
    guestToken: randomToken(32),
    targetData: "087812345678",
    status: "completed",
    paymentMethod: "va-bca",
    midtransOrderId: "TELKO-INV-20260411-DEMO0003",
    whatsappSent: 1,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    paidAt: daysAgo(1),
    completedAt: daysAgo(1),
  },
  {
    id: "INV-20260411-DEMO0004",
    productId: "voucher-25gb",
    productName: "Voucher 25GB",
    productPrice: 85000,
    guestPhone: "082198765432",
    guestToken: randomToken(32),
    targetData: "082198765432",
    status: "paid",
    paymentMethod: "dana",
    midtransOrderId: "TELKO-INV-20260411-DEMO0004",
    whatsappSent: 0,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    paidAt: daysAgo(1),
    completedAt: null,
  },
  {
    id: "INV-20260412-DEMO0005",
    productId: "pulsa-100k",
    productName: "Pulsa 100.000",
    productPrice: 99000,
    guestPhone: "081345678901",
    guestToken: randomToken(32),
    targetData: "081345678901",
    status: "pending",
    paymentMethod: "qris",
    midtransOrderId: "TELKO-INV-20260412-DEMO0005",
    whatsappSent: 0,
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
    paidAt: null,
    completedAt: null,
  },
  {
    id: "INV-20260412-DEMO0006",
    productId: "data-combo-7d",
    productName: "Combo Sakti 12GB",
    productPrice: 45000,
    guestPhone: "085712345678",
    guestToken: randomToken(32),
    targetData: "085712345678",
    status: "pending",
    paymentMethod: "shopeepay",
    midtransOrderId: "TELKO-INV-20260412-DEMO0006",
    whatsappSent: 0,
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
    paidAt: null,
    completedAt: null,
  },
  {
    id: "INV-20260411-DEMO0007",
    productId: "game-ff-520",
    productName: "520 Diamonds",
    productPrice: 72000,
    guestPhone: "089912345678",
    guestToken: randomToken(32),
    targetData: "089912345678",
    status: "failed",
    paymentMethod: "va-bni",
    midtransOrderId: "TELKO-INV-20260411-DEMO0007",
    whatsappSent: 1,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    paidAt: null,
    completedAt: null,
  },
  {
    id: "INV-20260412-DEMO0008",
    productId: "voucher-10gb",
    productName: "Voucher 10GB",
    productPrice: 45000,
    guestPhone: "081567890123",
    guestToken: randomToken(32),
    targetData: "081567890123",
    status: "processing",
    paymentMethod: "ovo",
    midtransOrderId: "TELKO-INV-20260412-DEMO0008",
    whatsappSent: 0,
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
    paidAt: daysAgo(0),
    completedAt: null,
  },
  {
    id: "INV-20260410-DEMO0009",
    productId: "pulsa-20k",
    productName: "Pulsa 20.000",
    productPrice: 21000,
    guestPhone: "085298765432",
    guestToken: randomToken(32),
    targetData: "085298765432",
    status: "completed",
    paymentMethod: "qris",
    midtransOrderId: "TELKO-INV-20260410-DEMO0009",
    whatsappSent: 1,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
    paidAt: daysAgo(3),
    completedAt: daysAgo(3),
  },
  {
    id: "INV-20260412-DEMO0010",
    productId: "game-pubg-325",
    productName: "325 UC",
    productPrice: 75000,
    guestPhone: "087711112222",
    guestToken: randomToken(32),
    targetData: "087711112222",
    status: "completed",
    paymentMethod: "gopay",
    midtransOrderId: "TELKO-INV-20260412-DEMO0010",
    whatsappSent: 1,
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
    paidAt: daysAgo(0),
    completedAt: daysAgo(0),
  },
];

// Clear existing dummy orders
sqlite.exec(`DELETE FROM payments WHERE order_id LIKE 'INV-%-DEMO%'`);
sqlite.exec(`DELETE FROM orders WHERE id LIKE 'INV-%-DEMO%'`);

const insertOrder = sqlite.prepare(`
  INSERT OR REPLACE INTO orders (id, product_id, product_name, product_price, guest_phone, guest_token, target_data, status, payment_method, midtrans_order_id, whatsapp_sent, created_at, updated_at, paid_at, completed_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const o of dummyOrders) {
  insertOrder.run(
    o.id, o.productId, o.productName, o.productPrice,
    o.guestPhone, o.guestToken, o.targetData, o.status,
    o.paymentMethod, o.midtransOrderId, o.whatsappSent ? 1 : 0,
    o.createdAt, o.updatedAt, o.paidAt, o.completedAt
  );
}

console.log(`✅ ${dummyOrders.length} dummy orders seeded!`);

// ===== SEED DUMMY PAYMENTS =====
console.log("📦 Seeding dummy payments...");

const dummyPayments = dummyOrders
  .filter((o) => o.status !== "pending")
  .map((o, i) => ({
    id: `PAY-DEMO-${String(i + 1).padStart(4, "0")}`,
    orderId: o.id,
    gateway: "midtrans",
    paymentType: o.paymentMethod,
    transactionId: `MT-${randomToken(12)}`,
    transactionStatus: o.status === "failed" ? "expire" : "settlement",
    grossAmount: o.productPrice,
    fraudStatus: o.status === "failed" ? null : "accept",
    rawResponse: JSON.stringify({ demo: true }),
    createdAt: o.paidAt || o.updatedAt,
  }));

const insertPayment = sqlite.prepare(`
  INSERT OR REPLACE INTO payments (id, order_id, gateway, payment_type, transaction_id, transaction_status, gross_amount, fraud_status, raw_response, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const p of dummyPayments) {
  insertPayment.run(
    p.id, p.orderId, p.gateway, p.paymentType, p.transactionId,
    p.transactionStatus, p.grossAmount, p.fraudStatus, p.rawResponse, p.createdAt
  );
}

console.log(`✅ ${dummyPayments.length} dummy payments seeded!`);

// ===== SEED GATEWAY SETTINGS =====
console.log("📦 Seeding gateway settings...");

sqlite.exec(`INSERT OR REPLACE INTO gateway_settings (id, provider_name, server_key, client_key, api_url, is_production, is_active) 
  VALUES ('gw-midtrans', 'midtrans', '${process.env.MIDTRANS_SERVER_KEY || "YOUR_SERVER_KEY"}', '${process.env.MIDTRANS_CLIENT_KEY || "YOUR_CLIENT_KEY"}', 'https://app.sandbox.midtrans.com', 0, 1)`);
sqlite.exec(`INSERT OR REPLACE INTO gateway_settings (id, provider_name, server_key, client_key, api_url, is_production, is_active) 
  VALUES ('gw-waha', 'waha', '', '', 'http://localhost:3002', 0, 1)`);

console.log(`✅ Gateway settings seeded!`);

// ===== SUMMARY =====
const countProducts = sqlite.prepare("SELECT COUNT(*) as count FROM products").get();
const countCategories = sqlite.prepare("SELECT COUNT(*) as count FROM categories").get();
const countOrders = sqlite.prepare("SELECT COUNT(*) as count FROM orders").get();
const countPayments = sqlite.prepare("SELECT COUNT(*) as count FROM payments").get();
const countSettings = sqlite.prepare("SELECT COUNT(*) as count FROM gateway_settings").get();

console.log(`\n📊 Database summary:`);
console.log(`   Categories: ${countCategories.count}`);
console.log(`   Products: ${countProducts.count}`);
console.log(`   Orders: ${countOrders.count}`);
console.log(`   Payments: ${countPayments.count}`);
console.log(`   Gateway Settings: ${countSettings.count}`);
console.log(`   Database: ${DB_PATH}`);
console.log(`\n🎉 Full seed complete!`);

sqlite.close();
