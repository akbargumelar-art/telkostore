# Telko.Store — Progress Report

**Log Terakhir:** 12 April 2026

## ✅ Apa yang sudah selesai dilakukan

### 1. Sistem Desain & Layout (Frontend)
- **Tema & Warna**: Menggunakan sistem warna kustom (`tred`, `navy`, `success`, `gold`) terintegrasi penuh pada Tailwind v4.
- **Responsivitas**: Tampilan Mobile-first (mirip aplikasi) dengan *sticky header* dan *floating bottom nav*, serta tampilan Desktop dua kolom pada halaman utama.
- **Perbaikan CSS**: Penghapusan kelas dynamic Tailwind pada `BannerSlider` dengan inline styles. Penambahan `overflow-x-hidden` untuk membatasi pergeseran horizontal layar mobile.
- **Favicon Terpasang**: Konfigurasi `public/favicon/` dengan `favicon.svg` dan manifest Web/PWA.
- **Animasi Tambahan**: `slide-right` keyframe untuk admin mobile sidebar.

### 2. Peningkatan Flow & Rebranding All-Operator (Frontend)
- **Rebranding Operator**: Mengubah kalimat "Pulsa Telkomsel" menjadi "Semua Operator". Form checkout membaca Provider secara otomatis dari 10-13 digit nomor HP.
- **Auto-Scroll UX**: Gulir otomatis (via `useRef`) antara Input Produk → Nomor Tujuan pada layar mobile.
- **Tab Kategori Mobile**: Dipindahkan ke section Semua Produk, tepat di bawah banner Promo Spesial Bulan Ini.
- **Deteksi Provider**: Keterangan provider tampil setelah nomor valid (Telkomsel, byU, XL, Indosat, Smartfren, Three, Axis).
- **Logo SVG Metode Bayar**: Komponen terpisah `PaymentLogos.js` untuk render logo SVG (QRIS, GoPay, OVO, DANA, ShopeePay).

### 3. Komponen & Halaman (Frontend)
- **Komponen Utama**: `ProductCard`, `Header`, `BottomNav`, `CategoryTabs`, `BannerSlider`, `FlashSaleBanner`, `Sidebar`, `PaymentLogos`.
- **Daftar Halaman Selesai**:
  - `HomePage` (/) — data dari API database
  - `ProductPage` (/product/[id]) — data dari API database, 3-step checkout
  - `PromoPage` (/promo) — data dari API database
  - `HistoryPage` (/history) — pencarian pesanan via API
  - `AccountPage` (/account) — placeholder (belum fungsional)
  - `Order Tracking` (/order/[id]) — auto-check status Midtrans

### 4. Setup Database (Backend)
- Stack: **SQLite** via `better-sqlite3` dengan **Drizzle ORM**. WAL mode untuk concurrency.
- **Schema**: `categories`, `products`, `orders`, `payments`, `gateway_settings`.
- **Seed Script**: `src/db/seed.mjs` — 4 kategori, 29 produk, 10 dummy orders, 8 dummy payments, 2 gateway settings.
- Konfigurasi `serverExternalPackages` pada `next.config.mjs` untuk `better-sqlite3`.

### 5. API Routes & Automation (Public)
- **Produk & Kategori**: `GET /api/products` (filter: category, promo, flash_sale) dan `GET /api/categories`.
- **Checkout**: `POST /api/checkout` — buat order + Midtrans Snap Token (multi-operator, tanpa pilih metode bayar).
- **Webhook Midtrans**: `POST /api/webhook/midtrans` — callback status pembayaran otomatis + WA notifikasi.
- **Cek Status Midtrans**: `POST /api/orders/[id]/check` — langsung query Midtrans API untuk sinkronisasi status (solusi untuk webhook unreachable di localhost).
- **Order**: `GET /api/orders/[id]` (detail pesanan) dan `GET /api/orders/search` (cari via invoice/HP).
- **Notifikasi WA**: Terintegrasi WAHA (WhatsApp API) — notif otomatis saat pesanan dibuat dan saat pembayaran berhasil.
- **Deploy Script VPS**: `deploy.sh` (git fetch → install → build → pm2 restart).

### 6. Admin Dashboard (12 April 2026) ✨
- **Admin Auth**: Middleware (`src/middleware.js`) proteksi `/admin/*` dan `/api/admin/*` via cookie. Login dengan secret key (`ADMIN_SECRET`).
- **Admin Login**: `/admin/login` — form input kunci admin.
- **Dashboard**: `/admin` — total produk, total pesanan, revenue, pesanan hari ini, recent orders.
- **Kelola Produk**: `/admin/produk` — tabel CRUD, modal form tambah/edit, search, filter kategori, toggle aktif/nonaktif, soft-delete.
- **Kelola Pesanan**: `/admin/pesanan` — daftar orders expandable, filter status (pending/paid/processing/completed/failed), update status inline + WA notifikasi otomatis.
- **Pengaturan**: `/admin/pengaturan` — konfigurasi Midtrans (server key, client key, sandbox/production toggle), konfigurasi WAHA (API URL, API key).

### 7. Admin API Routes (12 April 2026) ✨
| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/admin/auth` | POST | Login admin (set cookie) |
| `/api/admin/stats` | GET | Dashboard statistics |
| `/api/admin/products` | GET, POST | List/Create produk |
| `/api/admin/products/[id]` | PUT, DELETE | Update/Soft-delete produk |
| `/api/admin/orders` | GET | List orders + pagination + filter |
| `/api/admin/orders/[id]` | GET, PUT | Detail/Update status pesanan |
| `/api/admin/settings` | GET, PUT | Gateway settings (upsert) |

### 8. Shared Backend Helpers (12 April 2026) ✨
- **`src/lib/whatsapp.js`**: `sendWhatsAppNotification()` + `formatRupiahServer()` — terpusat, digunakan oleh checkout, webhook, dan admin order update.
- **`src/lib/midtrans.js`**: `createSnapClient()` + `verifySignature()` — terpusat untuk semua Midtrans API calls.

### 9. Frontend Migrasi ke Database API (12 April 2026) ✨
- **HomePage** (`/`) — sebelumnya import dari `@/data/products.js` (mock data), sekarang `fetch("/api/products")` + `fetch("/api/categories")`. Loading skeleton ditambahkan.
- **ProductPage** (`/product/[id]`) — sebelumnya `getProductById()` dari mock, sekarang `fetch("/api/products/${id}")`. Checkout disederhanakan menjadi **3 langkah** (Produk → No. HP → Konfirmasi). Pilihan metode bayar dihapus karena Midtrans Snap sudah handle.
- **PromoPage** (`/promo`) — sebelumnya `getPromoProducts()` dari mock, sekarang `fetch("/api/products?promo=true")`.
- **Order Page** (`/order/[id]`) — ditambahkan auto-check Midtrans status saat user kembali dari pembayaran + tombol "Sudah Bayar? Cek Status".

### 10. Login Google & Facebook — OAuth (12 April 2026) ✨
- **Stack**: Auth.js v5 (`next-auth@beta`) dengan JWT strategy.
- **Provider**: Google OAuth 2.0 + Facebook Login. Credential diisi via `.env.local` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`).
- **Auth Config**: `src/auth.js` — upsert user ke tabel `users` saat pertama kali login, attach user ID ke JWT token.
- **API Route**: `src/app/api/auth/[...nextauth]/route.js` — handler NextAuth (signin, signout, callback).
- **Session Provider**: `src/components/AuthProvider.js` — wrapper `SessionProvider` di root layout agar `useSession` berfungsi di semua halaman.
- **Account Page**: `/account` — dua tampilan:
  - **Belum login**: Tombol "Masuk dengan Google" & "Masuk dengan Facebook" + akses tamu (tracking link).
  - **Sudah login**: Profil user (foto, nama, email), menu navigasi, daftar pesanan terakhir, tombol logout dengan konfirmasi.
- **User Orders API**: `GET /api/user/orders` — menampilkan pesanan milik user yang login (berdasarkan `userId`).
- **Database**: Tabel `users` baru (id, name, email, image, phone, provider, provider_id, created_at).
- **Env Vars Baru**: `AUTH_SECRET`, `AUTH_TRUST_HOST`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`.

### 11. Fitur Lanjutan — UX & Admin (12 April 2026) ✨
- **Scroll-to-Top**: Komponen global `ScrollToTop.js` — otomatis scroll ke atas setiap halaman baru. Auto-scroll checkout (pilih produk → isi nomor → bayar) tetap berjalan normal.
- **Sticky Category Tabs**: Tab kategori sekarang floating sticky di bawah header mobile (`top-14 z-40 backdrop-blur`), selalu terlihat saat scroll.
- **Bell Notification**: Icon lonceng di header sekarang fungsional — klik menampilkan dropdown notifikasi (promo aktif, info produk). Badge counter hilang setelah dibuka. Tersedia di mobile dan desktop.
- **Filter Masa Aktif (Subkategori)**: Saat memilih kategori yang memiliki produk dengan `validity` (Paket Data, Voucher Internet), chip filter "Masa Aktif" muncul otomatis (3 Hari, 7 Hari, 14 Hari, dst). Auto-detect dari data produk. Tersedia di mobile (di bawah category tabs) dan desktop (di atas produk grid).
- **Bulk Action Pesanan**: Di admin `/admin/pesanan`, tersedia checkbox per row dan "Select All". Toolbar bulk action muncul saat ada pesanan dipilih — pilih status target → "Terapkan" untuk update massal.
- **Profil Admin**: Halaman `/admin/profil` — form ubah kunci admin (validasi old key, min 8 karakter, konfirmasi). Perubahan disimpan di database + `process.env` sehingga berlaku tanpa restart.
- **Manajemen User**: Halaman `/admin/users` — tabel user OAuth (Google/Facebook) dengan search. Expandable detail menampilkan info user + daftar pesanan. Tombol hapus user dengan konfirmasi modal.

---

## 🛠️ Langkah Lanjutan

1. **Buat OAuth App Google & Facebook**:
   - Google: [Google Cloud Console](https://console.cloud.google.com/) → Credentials → OAuth 2.0 Client ID. Redirect URI: `https://telko.store/api/auth/callback/google`.
   - Facebook: [Facebook Developers](https://developers.facebook.com/) → Facebook Login. Redirect URI: `https://telko.store/api/auth/callback/facebook`.
   - Isi Client ID & Secret di `.env.local` dan `.env.local` di VPS.

2. **Webhook Midtrans Production**:
   Pastikan webhook URL production (`https://telko.store/api/webhook/midtrans`) terdaftar di Midtrans Dashboard.

3. **Perluasan Katalog Produk**:
   Melengkapi data produk tambahan (paket spesifik Telkomsel, Indosat, XL, dll) melalui admin dashboard.

4. **Integrasi Fulfillment API**:
   Menghubungkan dengan provider (Digipos / API reseller) untuk pengiriman pulsa & paket data otomatis setelah pembayaran berhasil.

---

## 📁 Struktur File Utama

```
telko.store/
├── src/
│   ├── middleware.js                  # Admin auth middleware
│   ├── lib/
│   │   ├── utils.js                   # formatRupiah, operator detection
│   │   ├── whatsapp.js                # Shared WA notification helper
│   │   └── midtrans.js                # Shared Midtrans helper
│   ├── db/
│   │   ├── schema.js                  # Drizzle ORM schema
│   │   ├── index.js                   # DB connection singleton
│   │   └── seed.mjs                   # Full seed (products + dummy orders)
│   ├── data/
│   │   └── products.js                # Legacy mock data (tidak lagi diimport)
│   ├── auth.js                        # Auth.js v5 config (Google + Facebook)
│   ├── components/                    # 9 komponen UI (+ AuthProvider)
│   ├── app/
│   │   ├── page.js                    # Homepage (API-driven)
│   │   ├── product/[id]/page.js       # Product detail + 3-step checkout
│   │   ├── promo/page.js              # Promo page (API-driven)
│   │   ├── history/page.js            # Order search
│   │   ├── account/page.js            # Login Google/Facebook + Profil
│   │   ├── order/[id]/page.js         # Order tracking + Midtrans check
│   │   ├── admin/                     # Admin dashboard (5 pages)
│   │   │   ├── layout.js
│   │   │   ├── page.js                # Dashboard overview
│   │   │   ├── login/page.js
│   │   │   ├── produk/page.js         # CRUD produk
│   │   │   ├── pesanan/page.js        # Manajemen pesanan
│   │   │   └── pengaturan/page.js     # Gateway settings
│   │   └── api/
│   │       ├── checkout/route.js
│   │       ├── webhook/midtrans/route.js
│   │       ├── products/route.js
│   │       ├── categories/route.js
│   │       ├── orders/[id]/route.js
│   │       ├── orders/[id]/check/route.js
│   │       ├── orders/search/route.js
│   │       ├── auth/[...nextauth]/route.js  # NextAuth handler
│   │       ├── user/orders/route.js   # User's orders
│   │       └── admin/                 # Admin API (7 routes)
├── .env.local                         # Environment variables
├── deploy.sh                          # VPS deploy script
└── telko.db                           # SQLite database
```
