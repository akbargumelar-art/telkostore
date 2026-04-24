# Blueprint Sistem Referral Downline

## Ringkasan

Dokumen ini menjadi blueprint implementasi sistem referral downline satu level untuk Telko.Store dengan aturan bisnis yang sudah dipilih:

1. Harga produk tetap global.
2. Downline didaftarkan oleh superadmin.
3. Margin downline diatur oleh superadmin dalam nominal tetap per transaksi, misalnya Rp50.
4. Downline memiliki login khusus untuk melihat transaksi referral, profit, link referral, dan banner promo.
5. Setiap downline memiliki link publik unik dengan format `https://telko.store/dl-xxx`.

Model ini lebih tepat disebut sistem referral downline satu level, bukan MLM bertingkat. Fokusnya adalah tracking atribusi order, komisi tetap, dan dashboard profit.

## Tujuan

- Menyediakan akun downline yang dibuat dan dikelola superadmin.
- Menyediakan link referral unik per downline.
- Menandai order yang berasal dari link referral downline.
- Menghitung komisi tetap per transaksi sesuai pengaturan downline.
- Menyediakan dashboard transaksi dan profit untuk tiap downline.
- Menyediakan dashboard superadmin untuk melihat performa semua downline.

## Di Luar Scope Versi Awal

- Multi level commission.
- Harga produk berbeda per downline.
- Registrasi downline mandiri.
- Payout otomatis ke bank atau e-wallet.
- Komisi berbeda per produk.
- CMS banner promo yang sangat kompleks.

## Kondisi Sistem Saat Ini

Fondasi yang sudah ada dan bisa dipakai:

- Next.js App Router.
- Database MySQL + Drizzle ORM.
- Auth user umum via Auth.js.
- Login admin/control panel terpisah dengan JWT cookie.
- Order, payment log, status order, dan dashboard admin sudah tersedia.
- Superadmin restriction sudah ada pada beberapa halaman `/control`.

Gap utama yang perlu ditutup:

- Belum ada role khusus `downline`.
- Belum ada data slug referral, margin per transaksi, atau status aktif referral.
- Checkout masih guest-first dan belum menyimpan attribution referral.
- Belum ada ledger komisi.
- Belum ada dashboard khusus downline.

## Keputusan Desain Utama

### 1. Role dan Area Akses

Gunakan pemisahan area agar hak akses rapi:

- `/control/*` tetap khusus admin dan superadmin.
- `/mitra/*` menjadi area login dan dashboard downline.
- `/dl-xxx` menjadi public referral entrypoint.

Catatan:

- Downline tidak disarankan masuk ke `/control`.
- Downline tidak perlu memakai Auth.js OAuth.
- Downline memakai login manual username/email + password.

### 2. Bentuk Komisi

Komisi menggunakan nominal tetap per transaksi:

- Contoh: downline A = Rp50 per transaksi sukses.
- Nilai komisi di-snapshot ke order saat order dibuat atau saat order pertama kali attributed.
- Jika margin downline diubah setelahnya, order lama tidak ikut berubah.

### 3. Status Profit

Agar dashboard jelas, profit dibagi menjadi:

- `tracked`: order sudah teratribusikan ke downline, tapi belum dibayar.
- `pending`: order sudah `paid` atau `processing`, tapi belum final.
- `approved`: order `completed`, komisi sah.
- `void`: order gagal, expired, cancel, atau attribution dibatalkan.
- `paid`: komisi sudah dibayarkan manual oleh superadmin.

Rekomendasi versi awal:

- Komisi dianggap final saat status order `completed`.
- Dashboard downline tetap boleh menampilkan estimasi profit dari order `paid` atau `processing`.

## Rekomendasi Struktur Data

## Opsi yang Direkomendasikan

Gunakan kombinasi:

- Tambahan field di tabel `users` untuk identitas dasar downline.
- Tabel profil khusus downline untuk konfigurasi bisnis.
- Tambahan field attribution di tabel `orders`.
- Tabel ledger komisi terpisah.

Ini lebih aman daripada menaruh semua hal di `users` atau `gateway_settings`.

## Perubahan Tabel `users`

Tambahkan field berikut:

- `username` varchar unique nullable
- `role` diperluas menjadi: `user`, `admin`, `downline`
- `isActive` boolean default true

Catatan:

- Downline dibuat manual oleh superadmin.
- Downline memakai `passwordHash` yang sudah ada.
- `username` penting agar login tidak tergantung email saja.

## Tabel Baru `downline_profiles`

Tujuan: menyimpan konfigurasi khusus downline tanpa membuat tabel `users` terlalu penuh.

Kolom yang direkomendasikan:

- `id`
- `userId` unique, FK ke `users.id`
- `slug` unique, contoh `dl-joko`, `dl-cirebon01`
- `displayName`
- `marginPerTransaction` double not null default 0
- `isReferralActive` boolean default true
- `bannerTitle` varchar nullable
- `bannerSubtitle` varchar nullable
- `bannerImageUrl` text nullable
- `createdAt`
- `updatedAt`

Catatan:

- `slug` dipakai untuk URL publik `telko.store/dl-xxx`.
- Format slug wajib prefix `dl-` agar aman dari bentrok route publik lain.

## Perubahan Tabel `orders`

Tambahkan field snapshot attribution:

- `downlineUserId` nullable
- `downlineProfileId` nullable
- `downlineSlug` nullable
- `downlineMarginSnapshot` double nullable
- `referralSource` varchar nullable
- `referralAttributedAt` varchar nullable

Tujuan:

- Order tetap punya jejak attribution walaupun profil downline nanti berubah.
- Report bisa dibuat cepat tanpa join berat.

## Tabel Baru `referral_commissions`

Ledger komisi wajib dipisah dari `orders`.

Kolom yang direkomendasikan:

- `id`
- `orderId` unique, FK ke `orders.id`
- `downlineUserId`
- `downlineProfileId`
- `downlineSlugSnapshot`
- `commissionAmount`
- `status` enum string: `pending`, `approved`, `void`, `paid`
- `statusReason` nullable
- `trackedAt`
- `approvedAt` nullable
- `voidedAt` nullable
- `paidAt` nullable
- `paidBatchId` nullable
- `createdAt`
- `updatedAt`

Alasan:

- Satu order maksimal satu komisi.
- Mudah dipakai untuk dashboard, rekap payout, dan audit.

## Tabel Opsional `referral_clicks`

Tidak wajib untuk versi pertama, tapi bagus bila ingin analytics:

- `id`
- `downlineProfileId`
- `slug`
- `ipHash`
- `userAgent`
- `landingPath`
- `createdAt`

Jika ingin cepat rilis, tabel ini bisa ditunda.

## Rekomendasi Routing

### Public Referral Link

Format link:

- `https://telko.store/dl-xxx`

Implementasi yang direkomendasikan:

- Buat dynamic route top-level untuk slug downline.
- Validasi bahwa slug dimulai dengan `dl-`.
- Jika slug valid dan aktif, set cookie referral lalu redirect ke homepage atau halaman tujuan.

Rekomendasi teknis:

- Gunakan `src/app/[downlineSlug]/route.js`
- Route handler akan:
  - cek slug
  - set cookie referral
  - redirect ke `/`

Kenapa route handler:

- Bisa set cookie dan redirect langsung.
- Tidak perlu landing page terpisah untuk versi awal.

### Downline Dashboard

Rute yang direkomendasikan:

- `/mitra/login`
- `/mitra`
- `/mitra/transaksi`
- `/mitra/profit`
- `/mitra/promo`
- `/mitra/profil`

### Superadmin Dashboard

Rute tambahan di area control:

- `/control/downline`
- `/control/downline/[id]`
- `/control/downline/payout`

## Mekanisme Attribution Referral

## Cookie Referral

Saat user membuka link `telko.store/dl-xxx`, sistem set cookie seperti:

- `ref_slug`
- `ref_downline_user_id`
- `ref_set_at`

Rekomendasi TTL:

- 30 hari

Rekomendasi aturan overwrite:

- Last click wins
- Jika user membuka link downline lain, cookie referral diperbarui

## Saat Checkout

Flow checkout yang direkomendasikan:

1. User datang dari `dl-xxx`
2. Cookie referral tersimpan
3. User browse dan checkout seperti biasa
4. API checkout membaca cookie referral
5. Jika slug valid dan active:
   - isi field snapshot referral di order
   - simpan `downlineMarginSnapshot`
6. Jika slug tidak valid atau downline nonaktif:
   - abaikan attribution

Catatan:

- Buyer tidak wajib login.
- Referral tetap jalan untuk guest checkout.
- Ini penting karena checkout Telko.Store saat ini masih dominan model guest-first.

## Validasi Attribution

Sebelum attribution diterima:

- slug harus ditemukan
- downline harus aktif
- user role harus `downline`
- margin per transaksi harus >= 0

Jika salah satu gagal:

- order tetap dibuat normal
- order tidak diberi attribution

## Lifecycle Komisi

## Saat Order Dibuat

Yang dilakukan:

- order menyimpan snapshot referral
- komisi belum final

Versi aman:

- belum insert ke `referral_commissions`
- cukup simpan attribution di `orders`

## Saat Payment Sukses

Pada transisi order ke `paid`:

- insert row ke `referral_commissions` jika belum ada
- status komisi = `pending`

Alasan:

- hanya transaksi yang benar-benar dibayar yang masuk estimasi profit
- abandoned pending checkout tidak mengotori ledger

## Saat Order Completed

Pada transisi ke `completed`:

- update commission status menjadi `approved`
- isi `approvedAt`

## Saat Order Failed / Cancel / Expired

Jika order attributed tapi gagal:

- jika komisi belum ada, tidak perlu insert
- jika komisi sudah ada, ubah menjadi `void`

## Saat Payout Manual

Superadmin bisa memilih komisi approved dan menandainya sebagai paid:

- update status jadi `paid`
- isi `paidAt`
- opsional isi `paidBatchId`

## Hak Akses dan Keamanan

### Superadmin

Boleh:

- membuat akun downline
- mengubah username, password, slug, margin
- menonaktifkan downline
- melihat semua transaksi referral
- memproses payout manual

### Downline

Boleh:

- login ke area `/mitra`
- melihat transaksi referral miliknya sendiri
- melihat estimasi dan profit final
- melihat link referral
- melihat banner promo

Tidak boleh:

- melihat data downline lain
- melihat control panel admin
- melihat full customer sensitive data
- mengubah margin

### Data Sensitif yang Harus Dimasking di Dashboard Downline

Jangan tampilkan penuh:

- `guestToken`
- full nomor HP customer
- full target data bila sensitif
- raw payment response
- voucher codes

Rekomendasi tampilan:

- nomor HP buyer dimasking, contoh `0812****5557`
- target data dimasking sebagian bila perlu

## Blueprint Dashboard Superadmin

## Halaman `/control/downline`

Fitur:

- statistik total downline aktif
- total transaksi referral
- total komisi pending
- total komisi approved
- total komisi paid
- list downline dengan search dan filter status
- tombol tambah downline

Kolom list:

- nama downline
- username
- slug referral
- margin per transaksi
- jumlah transaksi
- profit pending
- profit approved
- status aktif

## Form Create / Edit Downline

Field minimum:

- nama
- username
- email opsional
- password
- nomor HP
- slug `dl-xxx`
- margin per transaksi
- status aktif
- banner title
- banner subtitle
- banner image URL

Validasi:

- slug unique
- username unique
- password minimal 8 karakter
- margin tidak boleh negatif

## Detail Downline `/control/downline/[id]`

Fitur:

- profil downline
- link referral copy button
- statistik transaksi
- tabel order referral
- tabel ledger komisi
- action reset password
- action nonaktifkan link referral

## Halaman Payout `/control/downline/payout`

Versi awal cukup sederhana:

- filter komisi status `approved`
- checklist beberapa komisi
- tandai paid secara manual
- simpan catatan payout batch

## Blueprint Dashboard Downline

## Halaman `/mitra`

Stat card:

- total transaksi referral
- transaksi pending
- profit estimasi
- profit approved
- profit paid

Widget:

- link referral utama
- tombol copy
- banner promo
- daftar transaksi terbaru

## Halaman `/mitra/transaksi`

Isi tabel:

- tanggal
- invoice
- produk
- nominal order
- status order
- komisi
- status komisi

Filter:

- status order
- status komisi
- tanggal
- search invoice

## Halaman `/mitra/profit`

Ringkasan:

- total pending
- total approved
- total paid

Tabel:

- invoice
- komisi
- status
- tanggal tracked
- tanggal approved
- tanggal paid

## Halaman `/mitra/promo`

Versi awal:

- banner promo dari profil downline
- daftar link produk atau homepage dengan attribution aktif
- tombol copy link

Versi lanjutan:

- beberapa banner aset
- deep link ke kategori tertentu

## Blueprint API

## API Public

### `GET /[downlineSlug]`

Tugas:

- validasi slug
- set cookie referral
- redirect ke `/`

### `POST /api/checkout`

Tambahan perilaku:

- baca cookie referral
- validasi downline aktif
- simpan snapshot downline di order

### `POST /api/webhook/*` dan flow update order

Tambahan perilaku:

- pada order attributed, sinkronkan ledger komisi saat status berubah

Catatan:

- logic komisi sebaiknya dipusatkan di helper shared
- jangan duplikasi di tiap webhook

## API Superadmin

### `GET /api/admin/downline`

List downline + summary performa

### `POST /api/admin/downline`

Buat akun downline baru

### `GET /api/admin/downline/[id]`

Detail downline + transaksi + komisi

### `PUT /api/admin/downline/[id]`

Update profil, slug, margin, status aktif, banner

### `POST /api/admin/downline/[id]/reset-password`

Reset password downline

### `GET /api/admin/downline/payout`

List komisi approved

### `POST /api/admin/downline/payout`

Tandai komisi menjadi paid

## API Downline

### `POST /api/mitra/auth/login`

Login downline via username/email + password

### `POST /api/mitra/auth/logout`

Logout downline

### `GET /api/mitra/me`

Ambil profil downline aktif

### `GET /api/mitra/stats`

Ringkasan transaksi dan profit

### `GET /api/mitra/orders`

List transaksi referral milik downline

### `GET /api/mitra/commissions`

List komisi referral milik downline

### `GET /api/mitra/promo`

Data banner promo dan link share

## Rekomendasi Helper Shared

Buat helper khusus agar logic tidak menyebar:

- `src/lib/referral.js`
- `src/lib/downline-auth.js`
- `src/lib/referral-commission.js`

Tanggung jawab helper:

- resolve slug referral
- set / clear referral cookie
- attach referral snapshot ke order
- insert / update ledger komisi
- masking data untuk dashboard downline

## Rekomendasi Perubahan File

Kemungkinan file yang akan terdampak:

- `src/db/schema.js`
- `src/db/mysql-init.sql`
- `src/app/api/checkout/route.js`
- `src/app/api/admin/*`
- `src/app/api/webhook/*`
- `src/app/api/orders/[id]/check/route.js`
- `src/middleware.js`
- `src/lib/*`
- `src/app/control/*`

File baru yang sangat mungkin dibuat:

- `src/app/[downlineSlug]/route.js`
- `src/app/mitra/login/page.js`
- `src/app/mitra/page.js`
- `src/app/mitra/transaksi/page.js`
- `src/app/mitra/profit/page.js`
- `src/app/mitra/promo/page.js`
- `src/app/api/admin/downline/...`
- `src/app/api/mitra/...`

## Rekomendasi Auth Downline

Karena sistem saat ini punya:

- Auth.js untuk user umum
- JWT custom untuk admin `/control`

Maka untuk downline, rekomendasi paling aman versi awal:

- buat auth manual terpisah untuk `/mitra`
- cookie khusus, misalnya `partner_token`
- payload token memuat:
  - `role: downline`
  - `userId`
  - `downlineProfileId`

Keuntungan:

- tidak mengganggu flow `/account`
- tidak mengganggu admin `/control`
- middleware lebih mudah dibatasi

## Middleware yang Direkomendasikan

Tambahkan proteksi:

- `/mitra/*` hanya untuk token downline valid
- `/api/mitra/*` hanya untuk token downline valid

Pastikan:

- admin token tidak otomatis berlaku di `/mitra`
- downline token tidak boleh masuk `/control`

## Aturan Bisnis Detail

### Aturan Slug

- wajib prefix `dl-`
- hanya huruf kecil, angka, dan dash
- unique

Contoh valid:

- `dl-joko`
- `dl-cirebon01`
- `dl-voucherku`

### Aturan Margin

- nominal integer atau double
- minimal 0
- default 0
- perubahan margin hanya berlaku untuk transaksi baru

### Aturan Komisi

- satu order hanya boleh punya satu attribution downline
- satu order hanya boleh punya satu ledger komisi
- komisi mengikuti `downlineMarginSnapshot`, bukan nilai margin terbaru

### Aturan Status Order

Mapping sederhana:

- `pending` -> belum ada komisi final
- `paid` -> komisi `pending`
- `processing` -> komisi tetap `pending`
- `completed` -> komisi `approved`
- `failed` -> komisi `void`

## Reporting yang Dibutuhkan

## Untuk Superadmin

- total downline aktif
- total order referral
- total approved commission
- total paid commission
- top performing downline
- recent referral orders

## Untuk Downline

- total transaksi attributed
- total profit estimasi
- total profit approved
- total profit paid
- daftar transaksi terbaru
- daftar komisi terbaru

## Fase Implementasi

## Fase 1 - Fondasi Data dan Attribution

Target:

- schema baru
- slug referral aktif
- cookie attribution
- order snapshot downline

Checklist:

- tambah role downline
- tambah tabel `downline_profiles`
- tambah field attribution di `orders`
- buat route publik `/dl-xxx`
- update checkout agar membaca referral cookie

## Fase 2 - Ledger Komisi

Target:

- komisi tercatat otomatis

Checklist:

- buat tabel `referral_commissions`
- helper insert / update komisi
- integrasi ke webhook dan update status order
- pastikan idempotent

## Fase 3 - Superadmin Management

Target:

- superadmin bisa kelola downline penuh

Checklist:

- halaman `/control/downline`
- CRUD downline
- reset password
- toggle active
- detail downline

## Fase 4 - Dashboard Downline

Target:

- downline bisa login dan melihat hasil referral

Checklist:

- auth `/mitra/login`
- dashboard `/mitra`
- transaksi `/mitra/transaksi`
- profit `/mitra/profit`
- promo `/mitra/promo`

## Fase 5 - Payout dan Rekap

Target:

- superadmin bisa menandai profit sudah dibayar

Checklist:

- payout list
- bulk mark paid
- batch note

## Risiko dan Mitigasi

### Risiko 1: Route `/[downlineSlug]` bentrok dengan halaman publik lain

Mitigasi:

- paksa semua slug prefix `dl-`
- static route existing seperti `/promo`, `/faq`, `/contact` tetap aman

### Risiko 2: Duplicate commission karena webhook lebih dari sekali

Mitigasi:

- tabel `referral_commissions.orderId` dibuat unique
- semua insert komisi cek existing dulu

### Risiko 3: Downline melihat data customer terlalu detail

Mitigasi:

- masking phone
- jangan tampilkan `guestToken`
- jangan tampilkan `targetData` penuh jika tidak perlu

### Risiko 4: Margin order lama berubah saat margin profil diubah

Mitigasi:

- gunakan `downlineMarginSnapshot` di order
- komisi ledger membaca nilai snapshot, bukan nilai profile terbaru

### Risiko 5: Referral cookie tidak terbaca pada checkout

Mitigasi:

- standardisasi set cookie di entry route
- buat helper baca cookie di API checkout
- tambahkan testing end to end untuk flow ini

## Testing yang Wajib

## Unit / Helper

- resolve slug valid / invalid
- create commission once only
- update commission status on order lifecycle
- mask data helper

## Integration

- buka `/dl-xxx` -> cookie tersimpan -> checkout -> order attributed
- order paid -> commission pending
- order completed -> commission approved
- order failed -> commission void

## Access Control

- downline tidak bisa masuk `/control`
- admin tidak otomatis masuk `/mitra` tanpa token yang benar
- non superadmin tidak bisa kelola downline bila diatur demikian

## Acceptance Criteria Versi Pertama

- Superadmin bisa membuat akun downline lengkap dengan slug dan margin.
- Link `telko.store/dl-xxx` bisa menyimpan attribution referral.
- Checkout dari link referral membuat order dengan snapshot downline.
- Order yang sukses membentuk ledger komisi tanpa duplikasi.
- Downline bisa login ke dashboard khusus.
- Downline bisa melihat transaksi referral dan profit miliknya sendiri.
- Superadmin bisa melihat performa semua downline dan menandai payout manual.

## Rekomendasi Implementasi Pertama

Urutan build paling aman:

1. Schema dan migration.
2. Public referral route `dl-xxx`.
3. Attribution di checkout dan order snapshot.
4. Ledger komisi.
5. CRUD downline di superadmin.
6. Login dan dashboard downline.
7. Payout manual.

## Catatan Akhir

Dengan kebutuhan yang dipilih sekarang, implementasi ini realistis dan cocok dengan arsitektur Telko.Store saat ini. Kunci keberhasilannya ada pada tiga hal:

- attribution referral yang stabil untuk guest checkout
- snapshot margin per order
- ledger komisi yang terpisah dari order

Jika ketiga fondasi ini dibangun dengan rapi, fitur dashboard transaksi, profit, link referral, dan pengelolaan downline akan jauh lebih mudah dikembangkan di tahap berikutnya.
