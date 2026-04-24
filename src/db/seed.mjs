// ==============================
// TELKO.STORE — Database Seed Script (MySQL)
// Run: npm run db:seed
// Includes: categories, products, dummy orders, payments, gateway settings
// ==============================

import mysql from "mysql2/promise";
import crypto from "crypto";
import { DEFAULT_SITE_BANNERS } from "../lib/site-banners.js";

const DATABASE_URL = process.env.DATABASE_URL || "mysql://root:password@localhost:3306/telkostore";

async function seed() {
  const connection = await mysql.createConnection(DATABASE_URL);

  console.log("🔧 Creating tables...");

  // Create tables
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) UNIQUE,
      image TEXT,
      phone VARCHAR(20),
      role VARCHAR(20) DEFAULT 'user',
      provider VARCHAR(50),
      provider_id VARCHAR(255),
      created_at VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      icon VARCHAR(50),
      description TEXT,
      color VARCHAR(20),
      sort_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(100) PRIMARY KEY,
      category_id VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(20) DEFAULT 'virtual',
      description TEXT,
      nominal INT,
      price DOUBLE NOT NULL,
      original_price DOUBLE,
      stock INT DEFAULT 999,
      validity VARCHAR(50),
      quota VARCHAR(50),
      game_name VARCHAR(100),
      game_icon VARCHAR(50),
      supplier_name VARCHAR(50),
      supplier_sku_code VARCHAR(100),
      is_digiflazz_enabled BOOLEAN DEFAULT FALSE,
      is_promo BOOLEAN DEFAULT FALSE,
      is_flash_sale BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at VARCHAR(50),
      updated_at VARCHAR(50),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(100) PRIMARY KEY,
      user_id VARCHAR(100),
      product_id VARCHAR(100) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      product_price DOUBLE NOT NULL,
      guest_phone VARCHAR(20) NOT NULL,
      guest_token VARCHAR(100) NOT NULL UNIQUE,
      target_data VARCHAR(500) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      payment_method VARCHAR(50),
      payment_gateway VARCHAR(50) DEFAULT 'midtrans',
      snap_token VARCHAR(255),
      snap_redirect_url TEXT,
      midtrans_order_id VARCHAR(100),
      whatsapp_sent BOOLEAN DEFAULT FALSE,
      notes TEXT,
      created_at VARCHAR(50),
      updated_at VARCHAR(50),
      paid_at VARCHAR(50),
      completed_at VARCHAR(50),
      FOREIGN KEY (product_id) REFERENCES products(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(100) PRIMARY KEY,
      order_id VARCHAR(100) NOT NULL,
      gateway VARCHAR(50) DEFAULT 'midtrans',
      payment_type VARCHAR(50),
      transaction_id VARCHAR(255),
      transaction_status VARCHAR(50),
      gross_amount DOUBLE,
      fraud_status VARCHAR(50),
      raw_response TEXT,
      created_at VARCHAR(50),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS gateway_settings (
      id VARCHAR(100) PRIMARY KEY,
      provider_name VARCHAR(50) NOT NULL,
      server_key VARCHAR(500),
      client_key VARCHAR(500),
      api_url VARCHAR(500),
      session_name VARCHAR(100),
      is_production BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS voucher_codes (
      id VARCHAR(100) PRIMARY KEY,
      product_id VARCHAR(100) NOT NULL,
      code VARCHAR(255) NOT NULL,
      provider VARCHAR(50),
      status VARCHAR(20) DEFAULT 'available',
      order_id VARCHAR(100),
      customer_phone VARCHAR(20),
      redeemed_at VARCHAR(50),
      redeem_response TEXT,
      created_at VARCHAR(50),
      updated_at VARCHAR(50),
      FOREIGN KEY (product_id) REFERENCES products(id),
      INDEX idx_voucher_product (product_id),
      INDEX idx_voucher_status (status),
      INDEX idx_voucher_order (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS digiflazz_transactions (
      id VARCHAR(100) PRIMARY KEY,
      order_id VARCHAR(100) NOT NULL,
      ref_id VARCHAR(100) NOT NULL,
      buyer_sku_code VARCHAR(100) NOT NULL,
      customer_no VARCHAR(255) NOT NULL,
      status VARCHAR(30) NOT NULL,
      message TEXT,
      sn TEXT,
      buyer_last_saldo DOUBLE,
      raw_request TEXT,
      raw_response TEXT,
      created_at VARCHAR(50),
      updated_at VARCHAR(50),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      UNIQUE KEY uq_digiflazz_ref (ref_id),
      INDEX idx_digiflazz_order (order_id),
      INDEX idx_digiflazz_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS site_banners (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      subtitle TEXT,
      cta_text VARCHAR(100) NOT NULL,
      cta_type VARCHAR(20) DEFAULT 'link',
      cta_link VARCHAR(500),
      category_id VARCHAR(100),
      background_style TEXT,
      sort_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at VARCHAR(50),
      updated_at VARCHAR(50),
      INDEX idx_site_banners_active_order (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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

  for (const cat of categories) {
    await connection.execute(
      `INSERT INTO categories (id, name, icon, description, color, sort_order, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())
       ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), description=VALUES(description), color=VALUES(color), sort_order=VALUES(sort_order)`,
      [cat.id, cat.name, cat.icon, cat.description, cat.color, cat.sort_order]
    );
  }

  console.log(`✅ ${categories.length} categories seeded!`);

  // ===== SEED PRODUCTS =====
  console.log("📦 Seeding products...");

  const productData = [
    { id: "pulsa-5k", categoryId: "pulsa", name: "Pulsa 5.000", nominal: 5000, price: 6500, originalPrice: 7000, description: "Pulsa All Operator Rp5.000", isPromo: false, isFlashSale: false, stock: 999 },
    { id: "pulsa-10k", categoryId: "pulsa", name: "Pulsa 10.000", nominal: 10000, price: 11500, originalPrice: 12000, description: "Pulsa All Operator Rp10.000", isPromo: false, isFlashSale: false, stock: 999 },
    { id: "pulsa-15k", categoryId: "pulsa", name: "Pulsa 15.000", nominal: 15000, price: 16000, originalPrice: 17000, description: "Pulsa All Operator Rp15.000", isPromo: false, isFlashSale: false, stock: 999 },
    { id: "pulsa-20k", categoryId: "pulsa", name: "Pulsa 20.000", nominal: 20000, price: 21000, originalPrice: 22000, description: "Pulsa All Operator Rp20.000", isPromo: true, isFlashSale: false, stock: 999 },
    { id: "pulsa-25k", categoryId: "pulsa", name: "Pulsa 25.000", nominal: 25000, price: 26000, originalPrice: 27500, description: "Pulsa All Operator Rp25.000", isPromo: false, isFlashSale: false, stock: 999 },
    { id: "pulsa-50k", categoryId: "pulsa", name: "Pulsa 50.000", nominal: 50000, price: 50500, originalPrice: 52000, description: "Pulsa All Operator Rp50.000", isPromo: true, isFlashSale: true, stock: 50 },
    { id: "pulsa-100k", categoryId: "pulsa", name: "Pulsa 100.000", nominal: 100000, price: 99000, originalPrice: 102000, description: "Pulsa All Operator Rp100.000", isPromo: true, isFlashSale: true, stock: 25 },
    { id: "data-combo-7d", categoryId: "paket-data", name: "Combo Sakti 12GB", price: 45000, originalPrice: 55000, description: "12GB (5GB Utama + 5GB OMG! + 2GB Video) + 60 Menit + 100 SMS, 7 hari", validity: "7 Hari", quota: "12GB", isPromo: true, isFlashSale: false, stock: 200 },
    { id: "data-combo-30d", categoryId: "paket-data", name: "Combo Sakti 30GB", price: 85000, originalPrice: 100000, description: "30GB (15GB Utama + 10GB OMG! + 5GB Video) + 120 Menit + 200 SMS, 30 hari", validity: "30 Hari", quota: "30GB", isPromo: true, isFlashSale: true, stock: 100 },
    { id: "data-omg-2gb", categoryId: "paket-data", name: "OMG! 2GB", price: 15000, originalPrice: 18000, description: "Kuota OMG! 2GB untuk semua aplikasi, 7 hari", validity: "7 Hari", quota: "2GB", isPromo: false, isFlashSale: false, stock: 500 },
    { id: "data-omg-6gb", categoryId: "paket-data", name: "OMG! 6GB", price: 35000, originalPrice: 42000, description: "Kuota OMG! 6GB untuk semua aplikasi, 30 hari", validity: "30 Hari", quota: "6GB", isPromo: false, isFlashSale: false, stock: 350 },
    { id: "data-keluarga-50gb", categoryId: "paket-data", name: "Keluarga 50GB", price: 120000, originalPrice: 150000, description: "50GB kuota berbagi untuk 5 anggota keluarga, 30 hari", validity: "30 Hari", quota: "50GB", isPromo: true, isFlashSale: false, stock: 80 },
    { id: "data-orbit-15gb", categoryId: "paket-data", name: "Orbit 15GB", price: 50000, originalPrice: 60000, description: "Paket data khusus Orbit 15GB, 30 hari", validity: "30 Hari", quota: "15GB", isPromo: false, isFlashSale: false, stock: 150 },
    { id: "voucher-1gb", categoryId: "voucher-internet", name: "Voucher 1GB", price: 8000, originalPrice: 10000, description: "Voucher data 1GB masa aktif 3 hari", validity: "3 Hari", quota: "1GB", isPromo: false, isFlashSale: false, stock: 999 },
    { id: "voucher-3gb", categoryId: "voucher-internet", name: "Voucher 3GB", price: 18000, originalPrice: 22000, description: "Voucher data 3GB masa aktif 7 hari", validity: "7 Hari", quota: "3GB", isPromo: false, isFlashSale: false, stock: 999 },
    { id: "voucher-5gb", categoryId: "voucher-internet", name: "Voucher 5GB", price: 27000, originalPrice: 35000, description: "Voucher data 5GB masa aktif 15 hari", validity: "15 Hari", quota: "5GB", isPromo: true, isFlashSale: true, stock: 150 },
    { id: "voucher-10gb", categoryId: "voucher-internet", name: "Voucher 10GB", price: 45000, originalPrice: 55000, description: "Voucher data 10GB masa aktif 30 hari", validity: "30 Hari", quota: "10GB", isPromo: true, isFlashSale: false, stock: 300 },
    { id: "voucher-15gb", categoryId: "voucher-internet", name: "Voucher 15GB", price: 60000, originalPrice: 75000, description: "Voucher data 15GB masa aktif 30 hari", validity: "30 Hari", quota: "15GB", isPromo: false, isFlashSale: false, stock: 200 },
    { id: "voucher-25gb", categoryId: "voucher-internet", name: "Voucher 25GB", price: 85000, originalPrice: 100000, description: "Voucher data 25GB masa aktif 30 hari", validity: "30 Hari", quota: "25GB", isPromo: true, isFlashSale: true, stock: 75 },
    { id: "game-ml-86", categoryId: "voucher-game", name: "86 Diamonds", nominal: 86, price: 19000, originalPrice: 22000, description: "Mobile Legends: Bang Bang — 86 Diamonds", gameName: "Mobile Legends", gameIcon: "🎯", isPromo: false, isFlashSale: false, stock: 500 },
    { id: "game-ml-172", categoryId: "voucher-game", name: "172 Diamonds", nominal: 172, price: 36000, originalPrice: 42000, description: "Mobile Legends: Bang Bang — 172 Diamonds", gameName: "Mobile Legends", gameIcon: "🎯", isPromo: true, isFlashSale: false, stock: 300 },
    { id: "game-ml-344", categoryId: "voucher-game", name: "344 Diamonds", nominal: 344, price: 69000, originalPrice: 80000, description: "Mobile Legends: Bang Bang — 344 Diamonds", gameName: "Mobile Legends", gameIcon: "🎯", isPromo: true, isFlashSale: true, stock: 100 },
    { id: "game-ff-100", categoryId: "voucher-game", name: "100 Diamonds", nominal: 100, price: 15000, originalPrice: 18000, description: "Free Fire — 100 Diamonds", gameName: "Free Fire", gameIcon: "🔥", isPromo: false, isFlashSale: false, stock: 400 },
    { id: "game-ff-310", categoryId: "voucher-game", name: "310 Diamonds", nominal: 310, price: 45000, originalPrice: 52000, description: "Free Fire — 310 Diamonds", gameName: "Free Fire", gameIcon: "🔥", isPromo: false, isFlashSale: false, stock: 250 },
    { id: "game-ff-520", categoryId: "voucher-game", name: "520 Diamonds", nominal: 520, price: 72000, originalPrice: 85000, description: "Free Fire — 520 Diamonds", gameName: "Free Fire", gameIcon: "🔥", isPromo: true, isFlashSale: true, stock: 80 },
    { id: "game-pubg-60", categoryId: "voucher-game", name: "60 UC", nominal: 60, price: 15000, originalPrice: 16000, description: "PUBG Mobile — 60 UC", gameName: "PUBG Mobile", gameIcon: "🎖️", isPromo: false, isFlashSale: false, stock: 350 },
    { id: "game-pubg-325", categoryId: "voucher-game", name: "325 UC", nominal: 325, price: 75000, originalPrice: 85000, description: "PUBG Mobile — 325 UC", gameName: "PUBG Mobile", gameIcon: "🎖️", isPromo: true, isFlashSale: false, stock: 180 },
    { id: "game-genshin-60", categoryId: "voucher-game", name: "60 Genesis Crystals", nominal: 60, price: 16000, originalPrice: 18000, description: "Genshin Impact — 60 Genesis Crystals", gameName: "Genshin Impact", gameIcon: "⚔️", isPromo: false, isFlashSale: false, stock: 300 },
    { id: "game-genshin-330", categoryId: "voucher-game", name: "330 Genesis Crystals", nominal: 330, price: 79000, originalPrice: 90000, description: "Genshin Impact — 330 Genesis Crystals", gameName: "Genshin Impact", gameIcon: "⚔️", isPromo: true, isFlashSale: true, stock: 50 },
  ];

  const now = new Date().toISOString();
  for (const p of productData) {
    await connection.execute(
      `INSERT INTO products (id, category_id, name, type, description, nominal, price, original_price, stock, validity, quota, game_name, game_icon, is_promo, is_flash_sale, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 'virtual', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), original_price=VALUES(original_price), stock=VALUES(stock), is_promo=VALUES(is_promo), is_flash_sale=VALUES(is_flash_sale)`,
      [p.id, p.categoryId, p.name, p.description, p.nominal || null, p.price, p.originalPrice || null, p.stock, p.validity || null, p.quota || null, p.gameName || null, p.gameIcon || null, p.isPromo, p.isFlashSale, now, now]
    );
  }

  console.log(`✅ ${productData.length} products seeded!`);

  // ===== SEED GATEWAY SETTINGS =====
  console.log("📦 Seeding gateway settings...");

  const gateways = [
    { id: "gw-midtrans", providerName: "midtrans", serverKey: process.env.MIDTRANS_SERVER_KEY || "YOUR_SERVER_KEY", clientKey: process.env.MIDTRANS_CLIENT_KEY || "YOUR_CLIENT_KEY", apiUrl: "https://app.sandbox.midtrans.com", isProduction: false, isActive: true },
    { id: "gw-pakasir", providerName: "pakasir", serverKey: process.env.PAKASIR_API_KEY || "", clientKey: process.env.PAKASIR_PROJECT_SLUG || "", apiUrl: "https://app.pakasir.com", isProduction: false, isActive: false },
    { id: "gw-waha", providerName: "waha", serverKey: "", clientKey: "", apiUrl: "http://localhost:3002", isProduction: false, isActive: true },
  ];

  for (const gw of gateways) {
    await connection.execute(
      `INSERT INTO gateway_settings (id, provider_name, server_key, client_key, api_url, is_production, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE server_key=VALUES(server_key), client_key=VALUES(client_key), api_url=VALUES(api_url)`,
      [gw.id, gw.providerName, gw.serverKey, gw.clientKey, gw.apiUrl, gw.isProduction, gw.isActive]
    );
  }

  console.log("✅ Gateway settings seeded!");

  // ===== SEED SITE BANNERS =====
  console.log("📦 Seeding site banners...");

  for (const banner of DEFAULT_SITE_BANNERS) {
    await connection.execute(
      `INSERT INTO site_banners (id, title, subtitle, cta_text, cta_type, cta_link, category_id, background_style, sort_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title=VALUES(title),
         subtitle=VALUES(subtitle),
         cta_text=VALUES(cta_text),
         cta_type=VALUES(cta_type),
         cta_link=VALUES(cta_link),
         category_id=VALUES(category_id),
         background_style=VALUES(background_style),
         sort_order=VALUES(sort_order),
         is_active=VALUES(is_active),
         updated_at=VALUES(updated_at)`,
      [
        banner.id,
        banner.title,
        banner.subtitle,
        banner.ctaText,
        banner.ctaType,
        banner.ctaLink || null,
        banner.categoryId || null,
        banner.backgroundStyle,
        banner.sortOrder,
        banner.isActive,
        now,
        now,
      ]
    );
  }

  console.log(`✅ ${DEFAULT_SITE_BANNERS.length} site banners seeded!`);

  // ===== SUMMARY =====
  const [[{ count: pCount }]] = await connection.execute("SELECT COUNT(*) as count FROM products");
  const [[{ count: cCount }]] = await connection.execute("SELECT COUNT(*) as count FROM categories");
  const [[{ count: oCount }]] = await connection.execute("SELECT COUNT(*) as count FROM orders");
  const [[{ count: payCount }]] = await connection.execute("SELECT COUNT(*) as count FROM payments");
  const [[{ count: gwCount }]] = await connection.execute("SELECT COUNT(*) as count FROM gateway_settings");
  const [[{ count: bannerCount }]] = await connection.execute("SELECT COUNT(*) as count FROM site_banners");

  console.log(`\n📊 Database summary:`);
  console.log(`   Categories: ${cCount}`);
  console.log(`   Products: ${pCount}`);
  console.log(`   Orders: ${oCount}`);
  console.log(`   Payments: ${payCount}`);
  console.log(`   Gateway Settings: ${gwCount}`);
  console.log(`   Site Banners: ${bannerCount}`);
  console.log(`\n🎉 MySQL seed complete!`);

  await connection.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
