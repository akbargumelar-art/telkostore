# Telko.Store — Progress Report

**Log Terakhir:** 23 April 2026

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

### 12. Perbaikan & Fitur Baru (12 April 2026) ✨

#### a. Fix Validasi Nomor HP
- **Sebelumnya**: Nomor HP harus 12 digit agar bisa proceed checkout — padahal nomor valid Indonesia bisa 10–13 digit.
- **Sesudah**: Validasi minimum **10 digit**, checkout bisa dilakukan saat nomor valid. Auto-scroll ke summary tetap trigger di 12 digit agar UX tetap smooth.
- **Konstanta**: `MIN_PHONE_LENGTH = 10` (proceed checkout) + `AUTO_SCROLL_LENGTH = 12` (trigger auto-scroll).

#### b. Fix Hyperlink Banner CTA
- Banner slider item "Top Up Sekarang" (voucher game) dan "Lihat Voucher" (voucher internet) sebelumnya hanya navigasi ke query string yang tidak mengubah state kategori.
- **Sesudah**: BannerSlider menerima prop `onCategoryChange` dari HomePage → CTA category langsung mengubah state kategori + scroll ke section produk `#beli`.

#### c. Halaman FAQ (`/faq`)
- Halaman FAQ lengkap dengan accordion expandable, dikelompokkan per kategori: Cara Pembelian, Pembayaran, Voucher Game, Refund & Masalah, Keamanan & Privasi.
- 16 pertanyaan umum lengkap dengan jawaban.
- CTA ke halaman Contact dan WhatsApp di bagian bawah.

#### d. Halaman Contact (`/contact`)
- Contact form (Nama, Email, Subjek, Pesan) dengan validasi.
- Info kontak: WhatsApp, Email, Instagram — dengan hover effect dan external link.
- Jam operasional: Senin–Jumat, Sabtu, Minggu.
- Link ke halaman FAQ.

#### e. Halaman Redirect Midtrans (`/payment/finish`)
- Landing page setelah user selesai bayar di Midtrans.
- Membaca query params: `order_id`, `status_code`, `transaction_status` → tampilkan status sukses/pending/gagal.
- Auto-check status via API `/api/orders/[id]/check`.
- Auto-redirect ke `/order/[id]?token=xxx` setelah 5 detik dengan countdown.
- Checkout API (`/api/checkout`) callback URL diupdate ke `/payment/finish`.

#### f. Form Game ID untuk Voucher Game
- Saat checkout produk voucher game, Step 2 menampilkan form **Game ID** sesuai game:
  - **Mobile Legends**: User ID + Server ID (Zone ID)
  - **Free Fire**: Player ID
  - **PUBG Mobile**: Player ID
  - **Genshin Impact**: UID + Server (dropdown: Asia/America/Europe/TW)
- Validasi: semua field game wajib diisi + nomor HP tetap wajib (untuk notif WA).
- Hint info cara menemukan Game ID di tiap game.
- `targetData` dikirim sebagai `"User ID: xxx | Server ID: yyy"` ke API.
- Data game disimpan di kolom `notes` order (format JSON).

#### g. Link FAQ & Contact di Navigasi
- **Desktop Header**: Link "FAQ" dan "Hubungi Kami" ditambahkan di top bar.
- **Desktop Sidebar**: Quick links FAQ & Contact di bawah section Express Checkout.

### 13. Audit & Fix Midtrans Payment Gateway (14 April 2026) 🔒

#### a. Redirect URL Lengkap
- **Sebelumnya**: Hanya `finish` callback URL yang dikirim ke Midtrans saat create transaction.
- **Sesudah**: Tiga callback URL lengkap — `finish`, `error`, dan `unfinish` — semuanya mengarah ke `/payment/finish` dengan parameter `status` berbeda.
- Halaman `/payment/finish` ditambahkan status `unfinish` (UI kuning, pesan "Pembayaran Belum Selesai").

#### b. Payment Expiry 24 Jam
- Ditambahkan `expiry: { unit: "hours", duration: 24 }` pada `snap.createTransaction()`.
- Transaksi pending yang tidak dibayar dalam 24 jam akan otomatis expired/dibatalkan oleh Midtrans.

#### c. Webhook Idempotency
- **Sebelumnya**: Webhook bisa memproses `transaction_id` yang sama berkali-kali → duplikasi payment record & WA notifikasi ganda.
- **Sesudah**: Pengecekan `transaction_id` di tabel `payments` sebelum memproses. Jika sudah ada, webhook langsung return `{ success: true, message: "Already processed" }`.

#### d. Stock Rollback
- **Sebelumnya**: Stock dikurangi saat checkout, tapi tidak dikembalikan jika pembayaran gagal/expired.
- **Sesudah**: Saat status `deny`, `cancel`, atau `expire` diterima (via webhook ATAU polling `/api/orders/[id]/check`), stock produk otomatis +1. Guard mencegah double rollback.

#### e. Environment Production
- `NEXT_PUBLIC_BASE_URL` diubah dari `http://localhost:3000` ke `https://telko.store` di `.env.local` dan `.env.example`.

#### f. Update Informasi Kontak
- **WhatsApp**: `0812 857 55557` → `wa.me/6281285755557` (contact page + FAQ page)
- **Email**: `hq@telko.store` (sebelumnya `cs@telko.store`)
- **Alamat**: Ditambahkan card baru — Jl. Pemuda Raya No. 21A, Kota Cirebon (dengan link Google Maps)

### 14. Migrasi Database ke MySQL (22 April 2026) 🚀
- **Perubahan Platform**: Memigrasikan database dari **SQLite** (`better-sqlite3`) ke **MySQL** (`mysql2`).
- **Update Drizzle**: Mengubah konfigurasi `drizzle.config.js` dan skema ke `mysql-core`. Menyesuaikan tipe data (misalnya `text` menjadi `varchar`, boolean, default timestamps).
- **Asynchronous Transaction**: Merombak fitur checkout yang sebelumnya menggunakan synchronous SQLite transaction (`db.transaction`) menjadi asynchronous MySQL transaction.
- **Data Migration Script**: Membuat script khusus `src/db/migrate-sqlite-to-mysql.mjs` untuk memindahkan data lama dengan aman tanpa downtime, serta `mysql-init.sql` untuk referensi skema manual.
- **Seed Script Baru**: Menulis ulang `src/db/seed.mjs` dengan query MySQL murni dan pola `ON DUPLICATE KEY UPDATE` agar *idempotent*.

### 15. Integrasi Pakasir Payment Gateway (22 April 2026) 💳
- **Opsi Multi-Gateway**: Menambahkan [Pakasir](https://pakasir.com/) sebagai metode pembayaran alternatif selain Midtrans.
- **Helper Baru**: Dibuat `src/lib/pakasir.js` untuk membuat transaksi link pembayaran, mengecek status, membatalkan transaksi, dan simulasi sandbox.
- **Webhook Pakasir**: Endpoint `POST /api/webhook/pakasir` ditambahkan dengan fitur lengkap setara Midtrans (idempotency, stock rollback, WA notification update).
- **Pengaturan Admin**: Menambahkan tab konfigurasi Pakasir di `/admin/pengaturan` untuk admin, termasuk *Project Slug* dan *API Key*.
- **Dynamic Checkout**: API checkout disesuaikan agar bisa menerima pilihan gateway dan merespons dengan URL *redirect* yang sesuai.

### 16. Audit & Perbaikan Menyeluruh (22 April 2026) 🔒

#### a. Fix Pakasir API — Sesuai Dokumentasi Resmi
- **Sebelumnya**: `src/lib/pakasir.js` menggunakan endpoint `POST /api/transaction` dengan `Authorization: Bearer` header yang **tidak sesuai** dengan [dokumentasi resmi Pakasir](https://pakasir.com/p/docs).
- **Sesudah**: Rewrite total — menggunakan **URL-Based payment flow** (`/pay/{slug}/{amount}?order_id=xxx&redirect=xxx`) yang direkomendasikan Pakasir. Semua endpoint API lain (transactioncreate, transactiondetail, transactioncancel, paymentsimulation) diperbaiki menggunakan `api_key` di body JSON.
- **Tambahan**: Fungsi `createPakasirTransactionAPI()` untuk opsi advanced (render QR/VA sendiri). Fungsi `clearPakasirCache()` untuk invalidasi cache setelah admin update settings.

#### b. Fix Webhook Pakasir — Validasi Amount
- **Sebelumnya**: Webhook Pakasir tidak memvalidasi `amount` terhadap `order.productPrice`.
- **Sesudah**: Validasi amount wajib (toleransi Rp1 untuk pembulatan). Request dengan amount tidak cocok langsung ditolak `400 Bad Request`. Ini sesuai dengan peringatan di dokumentasi Pakasir: *"Pastikan amount dan order_id sesuai dengan transaksi di sistem Anda."*

#### c. Fix Order Check API — Support Dual Gateway
- **Sebelumnya**: `/api/orders/[id]/check` hanya memanggil Midtrans Core API.
- **Sesudah**: Routing berdasarkan `order.paymentGateway` — Midtrans → `core.transaction.status()`, Pakasir → `checkPakasirTransaction()`. Shared helper `applyStatusUpdate()` untuk mengurangi duplikasi kode.

#### d. Frontend Gateway Selection UI
- **Sebelumnya**: User tidak bisa memilih gateway — semua order otomatis Midtrans.
- **Sesudah**: Di Step 3 checkout, tampil **2 tombol pilihan** (Midtrans / Pakasir) — hanya muncul jika Pakasir aktif di admin. Pengecekan via API baru `GET /api/gateway/status`. Dialog konfirmasi juga menampilkan gateway yang dipilih.

#### e. Fix Payment Finish Page — Dynamic Gateway Text
- **Sebelumnya**: Hardcoded "Transaksi aman & terenkripsi via Midtrans".
- **Sesudah**: Dinamis berdasarkan query param `gateway`. Juga menambahkan mapping status khusus Pakasir (`completed`, `expired`, `cancelled`).

#### f. Fix MySQL Pool — Error Handling & Reconnect
- **Sebelumnya**: Pool MySQL singleton tanpa error handling — jika MySQL disconnect, koneksi stale.
- **Sesudah**: Menambahkan `pool.on("error")` handler yang force-reset koneksi, dan `enableKeepAlive` untuk mencegah idle disconnect.

#### g. Callback URL Consistency
- Semua callback URL (Midtrans finish/error/unfinish, Pakasir redirect) sekarang menyertakan `&gateway=midtrans` atau `&gateway=pakasir` agar halaman `/payment/finish` selalu tahu gateway yang digunakan.

### 17. Manajemen Voucher Internet — Simpati & byU (22 April 2026) 🎫

#### Fase 1: Database & Helper Library
- **Tabel Baru `voucher_codes`**: Menyimpan kode voucher per produk dengan tracking status (available, reserved, redeemed, failed), provider (simpati/byu), dan assignment ke order.
- **Helper `src/lib/voucher.js`**: Fungsi `assignVoucherToOrder()` dengan race-condition guard, `detectProviderFromPhone()` untuk auto-detect Simpati vs byU, `getRedeemInstructions()` dengan panduan spesifik per provider, **kini dilengkapi opsi redeem via website maupun dial UMB *133***.

#### Fase 2: Auto-Assign Setelah Bayar
- Kedua webhook (Midtrans & Pakasir) otomatis:
  1. Detect provider dari nomor HP pembeli
  2. Assign kode voucher yang tersedia
  3. Kirim kode + **cara redeem (Website & Dial UMB *133*)** via WhatsApp ke pembeli
  4. Kirim notifikasi ke grup admin untuk semi-auto redeem
  5. Jika stok habis → alert ke grup admin
- Jika pembayaran gagal/expire → kode voucher otomatis **dikembalikan** ke status tersedia

#### Fase 3: Semi-Auto Redeem (1-Click Admin)
- Halaman `/admin/voucher` dengan dashboard lengkap:
  - **Stats cards**: total, tersedia, dipesan, redeemed, gagal
  - **Low-stock alert**: peringatan jika stok ≤ 5
  - **Needs-redeem banner**: daftar voucher yang perlu di-redeem
  - **1-Click Redeem**: salin kode ke clipboard + buka situs redeem provider (Telkomsel/byU) di tab baru
  - **Mark Redeemed**: tandai berhasil → order auto-complete + WA notifikasi ke pembeli
  - **Mark Failed**: tandai gagal → kode bisa di-reset

#### Fase 4: Laporan & CRUD
- **Filter multi-dimensi**: produk, provider, status, pencarian kode
- **Tambah kode**: input 1-per-1 atau bulk (pisah baris/koma)
- **Hapus**: hanya kode dengan status "available"
- **Reset**: kembalikan kode gagal ke tersedia
- **API Endpoints**:
  - `GET/POST /api/admin/vouchers` (list + stats + add)
  - `PUT/DELETE /api/admin/vouchers/[id]` (redeem, fail, release, delete)

### 18. Audit & Hardening Pra-Deploy (22 April 2026) 🛡️

#### a. Fix Database Reconnect — Proxy Pattern
- **Sebelumnya**: `export const db = getConnection()` → jika MySQL pool error dan `_db` di-reset ke `null`, semua module yang sudah import `db` tetap merujuk ke koneksi stale.
- **Sesudah**: `db` diekspor sebagai **Proxy** yang selalu mendelegasikan ke `getConnection()` pada setiap property access. Ini memastikan auto-reconnect benar-benar bekerja setelah pool error.

#### b. Fix Voucher Race Condition — SELECT FOR UPDATE
- **Sebelumnya**: Fungsi `assignVoucherToOrder()` menggunakan pola SELECT → UPDATE → re-SELECT yang rentan race condition (dua request concurrent bisa ambil voucher sama).
- **Sesudah**: Menggunakan **MySQL transaction** dengan `SELECT ... FOR UPDATE` untuk mengunci row voucher sebelum update. Ditambahkan:
  - Depth-limited retry (max 3) untuk mencegah infinite recursion
  - Deadlock handling otomatis (retry pada `ER_LOCK_DEADLOCK`)
  - Drizzle `sql` template literal untuk parameterized queries (bukan `sql.raw`)

#### c. Fix Pakasir Webhook Security — API Verification
- **Sebelumnya**: Webhook Pakasir tidak memvalidasi signature — siapa saja bisa mengirim POST palsu dengan `status: "completed"` dan order langsung di-mark paid.
- **Sesudah**: Setiap webhook dengan status `completed`/`paid` diverifikasi dengan memanggil `checkPakasirTransaction()` langsung ke API Pakasir. Jika API menunjukkan status berbeda, webhook ditolak `403`.
- Seluruh downstream logic (payment record, order status, WA notifikasi) menggunakan `verifiedStatus` bukan raw webhook status.

#### d. Infrastructure Improvements
- **Health Check Endpoint**: `GET /api/health` — memeriksa konektivitas database dan keberadaan environment variables kritis. Mengembalikan JSON terstruktur dengan latency metrics.
- **SEO Files**: Ditambahkan `robots.txt` (block `/admin`, `/api`, `/payment`) dan `sitemap.xml` (6 halaman publik).
- **Node.js Version Lock**: Ditambahkan `.nvmrc` (Node 18) dan `engines` field di `package.json` (`>=18.0.0`).
- **Cleanup**: Dihapus `better-sqlite3` dari devDependencies (tidak lagi dibutuhkan setelah migrasi MySQL).
- **Fix WAHA_GROUP_ID**: Ditambahkan variable `WAHA_GROUP_ID` ke `.env.local` yang sebelumnya hilang (menyebabkan group notification di-skip silent).

### 19. Integrasi DOKU Payment Gateway + Auto-Routing Checkout (23 April 2026) 💳

#### a. DOKU Payment Gateway — Gateway ke-3
- **Library Baru `src/lib/doku.js`**: Integrasi DOKU Checkout API v1 dengan autentikasi HMAC-SHA256 signature. Fungsi: `createDokuTransaction()`, `verifyDokuWebhookSignature()`, `isDokuAvailable()`, `clearDokuCache()`.
- **Webhook DOKU**: Endpoint `POST /api/webhook/doku` dengan fitur lengkap setara Midtrans dan Pakasir (verifikasi signature, validasi amount, idempotency, stock rollback, voucher auto-assign, WA notifikasi).
- **Status Mapping**: DOKU `SUCCESS`/`COMPLETED` → paid, `FAILED`/`EXPIRED`/`DENIED` → failed.

#### b. Auto-Routing Checkout (Pelanggan Tidak Pilih Gateway)
- **Sebelumnya**: Pelanggan harus memilih antara Midtrans dan Pakasir di halaman checkout.
- **Sesudah**: Gateway ditentukan 100% oleh admin. Pelanggan hanya melihat tombol "Bayar Sekarang" dan otomatis diarahkan ke gateway yang aktif.
- **`getActiveGateway()`**: Fungsi helper di `GET /api/gateway/status` yang menentukan gateway aktif dari database `gateway_settings`. Digunakan oleh checkout API dan frontend.
- **Mutual Exclusivity**: Hanya 1 gateway aktif pada satu waktu. Saat admin mengaktifkan satu gateway, yang lain otomatis nonaktif.

#### c. Admin Pengaturan — 3 Gateway + Banner Aktif
- **Halaman Pengaturan Diperbarui**: Sekarang menampilkan 3 card gateway (Midtrans, Pakasir, DOKU) + card WAHA.
- **Banner Gateway Aktif**: Di atas halaman, banner gradient menampilkan gateway mana yang sedang aktif.
- **DOKU Config**: Client ID + Secret Key, toggle Sandbox/Production, info Notification URL.
- **Simpan dengan Exclusivity**: Saat simpan gateway aktif, otomatis nonaktifkan 2 gateway lainnya.

#### d. Frontend Cleanup
- **Hapus UI Pilih Gateway**: Tidak ada lagi tombol "Midtrans" / "Pakasir" di Step 3 checkout.
- **Label Dinamis**: Security badge dan konfirmasi modal menampilkan label gateway aktif ("Transaksi aman & terenkripsi via DOKU").
- **Payment Finish Page**: Support status DOKU (`SUCCESS`, `FAILED`, `EXPIRED`, `DENIED`) + helper `getGatewayLabel()`.

#### e. Fix Order Status Check — Routing 3 Gateway
- **Sebelumnya**: `/api/orders/[id]/check` hanya routing ke Midtrans atau Pakasir — order DOKU menyebabkan error "Midtrans dinonaktifkan".
- **Sesudah**: Routing berdasarkan `order.paymentGateway` — `midtrans` → Midtrans Core API, `pakasir` → Pakasir API, `doku` → return cached status (DOKU tidak support status polling, update via webhook saja).

#### f. Catatan DOKU
- DOKU **tidak menyediakan API untuk cek status manual** seperti Midtrans/Pakasir. Update status hanya via HTTP Notification (webhook).
- Webhook URL perlu diset di **DOKU Back Office → Settings → Payment Settings → Configure** per metode pembayaran.
- Akun DOKU harus **verified** sebelum fitur notification aktif.

---


## 🛠️ Langkah Lanjutan

1. **Konfigurasi Webhook URLs** (PENTING):
   - **Midtrans**: Notification URL → `https://telko.store/api/webhook/midtrans`
   - **Pakasir**: Webhook URL → `https://telko.store/api/webhook/pakasir`
   - **DOKU**: Notification URL → `https://telko.store/api/webhook/doku` (setelah akun verified)

2. **Verifikasi Akun DOKU**:
   - Klik "Update Now" di banner kuning DOKU Dashboard untuk menyelesaikan onboarding.
   - Setelah verified, set notification URL per payment method di Settings → Payment Settings.

3. **Buat OAuth App Google & Facebook**:
   - Google: [Google Cloud Console](https://console.cloud.google.com/) → Credentials → OAuth 2.0 Client ID. Redirect URI: `https://telko.store/api/auth/callback/google`.
   - Facebook: [Facebook Developers](https://developers.facebook.com/) → Facebook Login. Redirect URI: `https://telko.store/api/auth/callback/facebook`.

4. **Perluasan Katalog Produk**:
   Melengkapi data produk tambahan (paket spesifik Telkomsel, Indosat, XL, dll) melalui admin dashboard.

5. **Integrasi Fulfillment API**:
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
│   │   ├── midtrans.js                # Shared Midtrans helper
│   │   ├── pakasir.js                 # Pakasir payment gateway helper
│   │   ├── doku.js                    # DOKU payment gateway helper (HMAC-SHA256)
│   │   ├── voucher.js                 # Voucher auto-assign + redeem helper
│   │   ├── jwt.js                     # Admin JWT token management
│   │   ├── rate-limit.js              # In-memory rate limiter
│   │   └── notification-scheduler.js  # Delayed WA notification scheduler
│   ├── db/
│   │   ├── schema.js                  # Drizzle ORM schema (MySQL)
│   │   ├── index.js                   # DB connection pool (mysql2 + Proxy reconnect)
│   │   ├── seed.mjs                   # MySQL seed data
│   │   ├── mysql-init.sql             # SQL schema reference
│   │   └── migrate-sqlite-to-mysql.mjs # Script migrasi data
│   ├── data/
│   │   └── products.js                # Legacy mock data
│   ├── auth.js                        # Auth.js v5 config (Google + Facebook)
│   ├── components/                    # 10 komponen UI (+ AuthProvider)
│   ├── app/
│   │   ├── page.js                    # Homepage (API-driven)
│   │   ├── product/[id]/page.js       # Product detail + 3-step checkout
│   │   ├── promo/page.js              # Promo page
│   │   ├── history/page.js            # Order search
│   │   ├── account/page.js            # Login + Profil
│   │   ├── order/[id]/page.js         # Order tracking
│   │   ├── faq/page.js                # FAQ
│   │   ├── contact/page.js            # Contact
│   │   ├── payment/finish/page.js     # Gateway redirect sukses/gagal
│   │   ├── admin/                     # Admin dashboard
│   │   │   ├── layout.js
│   │   │   ├── page.js                # Dashboard overview
│   │   │   ├── login/page.js
│   │   │   ├── produk/page.js         # CRUD produk
│   │   │   ├── pesanan/page.js        # Manajemen pesanan
│   │   │   ├── pengaturan/page.js     # Gateway settings (Midtrans, Pakasir, DOKU, WAHA)
│   │   │   ├── voucher/page.js        # Voucher management (CRUD + 1-click redeem)
│   │   │   ├── profil/page.js         # Admin profile (ubah kunci)
│   │   │   └── users/page.js          # User management
│   │   └── api/
│   │       ├── health/route.js        # Health check endpoint
│   │       ├── checkout/route.js      # Checkout + Auto-routing (3 gateways)
│   │       ├── gateway/
│   │       │   └── status/route.js    # Active gateway check + getActiveGateway()
│   │       ├── webhook/
│   │       │   ├── midtrans/route.js  # Midtrans webhook (signature verified)
│   │       │   ├── pakasir/route.js   # Pakasir webhook (API-verified)
│   │       │   └── doku/route.js      # DOKU webhook (HMAC-SHA256 verified)
│   │       ├── contact/route.js       # Contact form → WA group
│   │       ├── products/route.js
│   │       ├── categories/route.js
│   │       ├── orders/[id]/route.js
│   │       ├── orders/[id]/check/route.js
│   │       ├── orders/search/route.js
│   │       ├── auth/[...nextauth]/route.js
│   │       ├── user/orders/route.js
│   │       └── admin/                 # Admin API (vouchers, stats, dll)
├── public/
│   ├── favicon/                       # Favicon + Web manifest
│   ├── robots.txt                     # SEO — block admin/api routes
│   └── sitemap.xml                    # SEO — public pages sitemap
├── .env.local                         # Environment variables
├── .nvmrc                             # Node.js version lock (18)
├── deploy.sh                          # VPS deploy script
└── telko.db                           # Backup SQLite database lama
```
