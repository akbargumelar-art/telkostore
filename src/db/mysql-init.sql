-- ==============================
-- TELKO.STORE — MySQL Schema Reference
-- Run this manually if needed: mysql -u root -p telkostore < src/db/mysql-init.sql
-- Or use: npm run db:seed (which creates tables automatically)
-- ==============================

CREATE DATABASE IF NOT EXISTS telkostore
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE telkostore;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  image TEXT,
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'user',
  password_hash VARCHAR(255),
  provider VARCHAR(50),
  provider_id VARCHAR(255),
  created_at VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS downline_profiles (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  custom_referral_alias VARCHAR(120) UNIQUE,
  is_custom_referral_active BOOLEAN DEFAULT FALSE,
  display_name VARCHAR(255) NOT NULL,
  margin_per_transaction DOUBLE NOT NULL DEFAULT 0,
  is_referral_active BOOLEAN DEFAULT TRUE,
  banner_title VARCHAR(255),
  banner_subtitle TEXT,
  banner_image_url TEXT,
  theme_key VARCHAR(40) NOT NULL DEFAULT 'sunrise',
  promo_redirect_path VARCHAR(255) NOT NULL DEFAULT '/',
  created_at VARCHAR(50),
  updated_at VARCHAR(50),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_downline_active (is_referral_active),
  INDEX idx_downline_theme (theme_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  downline_user_id VARCHAR(100),
  downline_profile_id VARCHAR(100),
  downline_slug VARCHAR(120),
  downline_custom_alias VARCHAR(120),
  downline_display_name VARCHAR(255),
  downline_margin_snapshot DOUBLE,
  referral_source VARCHAR(40),
  referral_attributed_at VARCHAR(50),
  created_at VARCHAR(50),
  updated_at VARCHAR(50),
  paid_at VARCHAR(50),
  completed_at VARCHAR(50),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (downline_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (downline_profile_id) REFERENCES downline_profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_orders_status (status),
  INDEX idx_orders_created (created_at),
  INDEX idx_orders_phone (guest_phone),
  INDEX idx_orders_midtrans (midtrans_order_id),
  INDEX idx_orders_downline_profile (downline_profile_id),
  INDEX idx_orders_referral_source (referral_source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_payments_order (order_id),
  INDEX idx_payments_txn (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_voucher_product (product_id),
  INDEX idx_voucher_status (status),
  INDEX idx_voucher_order (order_id),
  INDEX idx_voucher_provider (provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_digiflazz_ref (ref_id),
  INDEX idx_digiflazz_order (order_id),
  INDEX idx_digiflazz_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referral_commissions (
  id VARCHAR(100) PRIMARY KEY,
  order_id VARCHAR(100) NOT NULL UNIQUE,
  downline_user_id VARCHAR(100) NOT NULL,
  downline_profile_id VARCHAR(100) NOT NULL,
  downline_slug_snapshot VARCHAR(120) NOT NULL,
  downline_custom_alias_snapshot VARCHAR(120),
  downline_display_name_snapshot VARCHAR(255),
  commission_amount DOUBLE NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  status_reason TEXT,
  tracked_at VARCHAR(50),
  approved_at VARCHAR(50),
  paid_at VARCHAR(50),
  created_at VARCHAR(50),
  updated_at VARCHAR(50),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (downline_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (downline_profile_id) REFERENCES downline_profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_referral_commissions_profile_status (downline_profile_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referral_clicks (
  id VARCHAR(100) PRIMARY KEY,
  downline_profile_id VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  custom_alias VARCHAR(120),
  ip_hash VARCHAR(128) NOT NULL,
  user_agent TEXT,
  landing_path VARCHAR(255),
  created_at VARCHAR(50),
  FOREIGN KEY (downline_profile_id) REFERENCES downline_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_referral_clicks_profile_created (downline_profile_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
