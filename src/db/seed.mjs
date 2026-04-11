// ==============================
// TELKO.STORE — Database Seed Script
// Run: npm run db:seed
// ==============================

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../telko.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

console.log("🔧 Creating tables...");

// Create tables
sqlite.exec(`
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

// Seed categories
console.log("📦 Seeding categories...");

const categories = [
  { id: "pulsa", name: "Pulsa", icon: "📱", description: "Isi pulsa Telkomsel reguler", color: "#ED0226", sort_order: 1 },
  { id: "paket-data", name: "Paket Data", icon: "📶", description: "Paket internet Telkomsel terbaik", color: "#007BFF", sort_order: 2 },
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

// Seed products
console.log("📦 Seeding products...");

const productData = [
  // PULSA
  { id: "pulsa-5k", categoryId: "pulsa", name: "Pulsa 5.000", nominal: 5000, price: 6500, originalPrice: 7000, description: "Pulsa Telkomsel Rp5.000", isPromo: 0, isFlashSale: 0, stock: 999 },
  { id: "pulsa-10k", categoryId: "pulsa", name: "Pulsa 10.000", nominal: 10000, price: 11500, originalPrice: 12000, description: "Pulsa Telkomsel Rp10.000", isPromo: 0, isFlashSale: 0, stock: 999 },
  { id: "pulsa-15k", categoryId: "pulsa", name: "Pulsa 15.000", nominal: 15000, price: 16000, originalPrice: 17000, description: "Pulsa Telkomsel Rp15.000", isPromo: 0, isFlashSale: 0, stock: 999 },
  { id: "pulsa-20k", categoryId: "pulsa", name: "Pulsa 20.000", nominal: 20000, price: 21000, originalPrice: 22000, description: "Pulsa Telkomsel Rp20.000", isPromo: 1, isFlashSale: 0, stock: 999 },
  { id: "pulsa-25k", categoryId: "pulsa", name: "Pulsa 25.000", nominal: 25000, price: 26000, originalPrice: 27500, description: "Pulsa Telkomsel Rp25.000", isPromo: 0, isFlashSale: 0, stock: 999 },
  { id: "pulsa-50k", categoryId: "pulsa", name: "Pulsa 50.000", nominal: 50000, price: 50500, originalPrice: 52000, description: "Pulsa Telkomsel Rp50.000", isPromo: 1, isFlashSale: 1, stock: 50 },
  { id: "pulsa-100k", categoryId: "pulsa", name: "Pulsa 100.000", nominal: 100000, price: 99000, originalPrice: 102000, description: "Pulsa Telkomsel Rp100.000", isPromo: 1, isFlashSale: 1, stock: 25 },
  // PAKET DATA
  { id: "data-combo-7d", categoryId: "paket-data", name: "Combo Sakti 12GB", price: 45000, originalPrice: 55000, description: "12GB + 60 Menit + 100 SMS, 7 hari", validity: "7 Hari", quota: "12GB", isPromo: 1, isFlashSale: 0, stock: 200 },
  { id: "data-combo-30d", categoryId: "paket-data", name: "Combo Sakti 30GB", price: 85000, originalPrice: 100000, description: "30GB + 120 Menit + 200 SMS, 30 hari", validity: "30 Hari", quota: "30GB", isPromo: 1, isFlashSale: 1, stock: 100 },
  { id: "data-omg-2gb", categoryId: "paket-data", name: "OMG! 2GB", price: 15000, originalPrice: 18000, description: "Kuota OMG! 2GB, 7 hari", validity: "7 Hari", quota: "2GB", isPromo: 0, isFlashSale: 0, stock: 500 },
  { id: "data-omg-6gb", categoryId: "paket-data", name: "OMG! 6GB", price: 35000, originalPrice: 42000, description: "Kuota OMG! 6GB, 30 hari", validity: "30 Hari", quota: "6GB", isPromo: 0, isFlashSale: 0, stock: 350 },
  { id: "data-keluarga-50gb", categoryId: "paket-data", name: "Keluarga 50GB", price: 120000, originalPrice: 150000, description: "50GB berbagi 5 anggota, 30 hari", validity: "30 Hari", quota: "50GB", isPromo: 1, isFlashSale: 0, stock: 80 },
  { id: "data-orbit-15gb", categoryId: "paket-data", name: "Orbit 15GB", price: 50000, originalPrice: 60000, description: "Orbit 15GB, 30 hari", validity: "30 Hari", quota: "15GB", isPromo: 0, isFlashSale: 0, stock: 150 },
  // VOUCHER INTERNET
  { id: "voucher-1gb", categoryId: "voucher-internet", name: "Voucher 1GB", price: 8000, originalPrice: 10000, description: "Voucher data 1GB, 3 hari", validity: "3 Hari", quota: "1GB", isPromo: 0, isFlashSale: 0, stock: 999 },
  { id: "voucher-3gb", categoryId: "voucher-internet", name: "Voucher 3GB", price: 18000, originalPrice: 22000, description: "Voucher data 3GB, 7 hari", validity: "7 Hari", quota: "3GB", isPromo: 0, isFlashSale: 0, stock: 999 },
  { id: "voucher-5gb", categoryId: "voucher-internet", name: "Voucher 5GB", price: 27000, originalPrice: 35000, description: "Voucher data 5GB, 15 hari", validity: "15 Hari", quota: "5GB", isPromo: 1, isFlashSale: 1, stock: 150 },
  { id: "voucher-10gb", categoryId: "voucher-internet", name: "Voucher 10GB", price: 45000, originalPrice: 55000, description: "Voucher data 10GB, 30 hari", validity: "30 Hari", quota: "10GB", isPromo: 1, isFlashSale: 0, stock: 300 },
  { id: "voucher-15gb", categoryId: "voucher-internet", name: "Voucher 15GB", price: 60000, originalPrice: 75000, description: "Voucher data 15GB, 30 hari", validity: "30 Hari", quota: "15GB", isPromo: 0, isFlashSale: 0, stock: 200 },
  { id: "voucher-25gb", categoryId: "voucher-internet", name: "Voucher 25GB", price: 85000, originalPrice: 100000, description: "Voucher data 25GB, 30 hari", validity: "30 Hari", quota: "25GB", isPromo: 1, isFlashSale: 1, stock: 75 },
  // VOUCHER GAME
  { id: "game-ml-86", categoryId: "voucher-game", name: "86 Diamonds", nominal: 86, price: 19000, originalPrice: 22000, description: "Mobile Legends — 86 Diamonds", gameName: "Mobile Legends", gameIcon: "🎯", isPromo: 0, isFlashSale: 0, stock: 500 },
  { id: "game-ml-172", categoryId: "voucher-game", name: "172 Diamonds", nominal: 172, price: 36000, originalPrice: 42000, description: "Mobile Legends — 172 Diamonds", gameName: "Mobile Legends", gameIcon: "🎯", isPromo: 1, isFlashSale: 0, stock: 300 },
  { id: "game-ml-344", categoryId: "voucher-game", name: "344 Diamonds", nominal: 344, price: 69000, originalPrice: 80000, description: "Mobile Legends — 344 Diamonds", gameName: "Mobile Legends", gameIcon: "🎯", isPromo: 1, isFlashSale: 1, stock: 100 },
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

// Verify
const countProducts = sqlite.prepare("SELECT COUNT(*) as count FROM products").get();
const countCategories = sqlite.prepare("SELECT COUNT(*) as count FROM categories").get();
console.log(`\n📊 Database summary:`);
console.log(`   Categories: ${countCategories.count}`);
console.log(`   Products: ${countProducts.count}`);
console.log(`   Database: ${DB_PATH}`);
console.log(`\n🎉 Seed complete!`);

sqlite.close();
