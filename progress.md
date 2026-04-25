# Telko.Store — Progress Report

**Log Terakhir:** 25 April 2026

## ✅ Apa yang sudah selesai dilakukan

### 27. Duitku Popup Native + Referral Multi-Level Bulanan (25 April 2026)

#### a. Popup asli `duitku.js` tanpa mengubah single active gateway
- Integrasi Duitku di frontend ditingkatkan dari redirect-style menjadi popup native `duitku.js` sesuai flow POP. Checkout produk sekarang mencoba membuka popup memakai `reference` Duitku, dengan fallback aman ke `paymentUrl` lama bila script popup gagal dimuat.
- Halaman tracking order `/order/[id]` juga ikut mendukung relaunch popup Duitku untuk order `pending`, jadi user tidak lagi dipaksa kembali ke redirect full-page hanya untuk melanjutkan pembayaran.
- Callback popup Duitku dipakai hanya untuk UX redirect ke `/payment/finish`; source of truth status pembayaran tetap webhook Duitku dan sinkronisasi order server-side.
- File utama yang ditambahkan/diubah untuk flow ini:
  - `src/lib/duitku-client.js`
  - `src/app/api/checkout/route.js`
  - `src/app/product/[id]/page.js`
  - `src/app/order/[id]/page.js`
  - `src/app/api/orders/[id]/route.js`

#### b. Referral multi-level berdasarkan performa bulan sebelumnya
- Ditambahkan tabel baru:
  - `referral_level_rules` untuk rule level yang bisa diatur superadmin
  - `referral_monthly_levels` untuk snapshot operasional level aktif per mitra per bulan
- Ditambahkan helper `src/lib/referral-levels.js` untuk menghitung level aktif bulan berjalan berdasarkan **jumlah transaksi referral sukses bulan sebelumnya**.
- Definisi transaksi yang dihitung dibuat eksplisit: status `paid`, `processing`, dan `completed`, memakai waktu sukses pembayaran (`paidAt`/`completedAt`) dengan boundary bulan **Asia/Jakarta**, agar rollover bulanan lebih sesuai operasional Indonesia.
- Komisi order baru sekarang tidak lagi langsung mengambil `marginPerTransaction` flat. Saat checkout, sistem menghitung level aktif mitra lalu menyimpan nominal komisi aktif itu ke `orders.downline_margin_snapshot`.
- Histori lama tetap aman karena ledger komisi tetap bersumber dari snapshot per-order; perubahan rule level di admin tidak mengubah nominal komisi order yang sudah pernah dibuat.

#### c. Dashboard admin & mitra untuk level referral
- Superadmin sekarang bisa mengelola rule level referral via endpoint baru `GET/PUT /api/admin/referral-levels` dan UI di `/control/downline`.
- Halaman admin referral menampilkan rule level aktif, mode fallback legacy, serta ringkasan level aktif tiap mitra (level aktif, komisi aktif, transaksi sukses bulan lalu, dan progres bulan ini).
- Halaman detail mitra `/control/downline/[id]` dan dashboard mitra `/mitra` diperluas agar menampilkan:
  - level aktif saat ini
  - komisi aktif per transaksi
  - total transaksi sukses bulan lalu
  - total transaksi sukses bulan ini
  - target ke level berikutnya
- Field `marginPerTransaction` tetap dipertahankan sebagai **komisi fallback legacy** untuk kompatibilitas dan skenario saat rule level nonaktif/tidak cocok.

#### d. Migration, seed, dan deploy
- Ditambahkan migration baru `src/db/migrate-add-referral-levels.mjs` yang aman dan idempotent.
- `deploy.sh` sekarang ikut menjalankan migration referral level agar VPS langsung siap tanpa langkah SQL manual tambahan.
- `src/db/seed.mjs` diperluas untuk membuat tabel referral level dan menanamkan default rule:
  - Bronze: `0-20` transaksi -> `100`
  - Silver: `21-50` transaksi -> `150`
  - Gold: `51+` transaksi -> `200`

#### e. Verifikasi
- `npm run build` lolos setelah seluruh perubahan Duitku popup + referral level digabungkan.

### 26. Integrasi Duitku POP, Finalisasi Aktivasi Mitra, dan Sinkronisasi Voucher Gagal (25 April 2026)

#### a. Integrasi Duitku POP sebagai Payment Gateway ke-4
- Ditambahkan provider baru `duitku` ke arsitektur payment existing tanpa mengubah pola **single active gateway**. Customer tetap tidak memilih gateway; checkout otomatis mengikuti gateway aktif dari admin settings.
- Ditambahkan helper `src/lib/duitku.js` untuk membaca konfigurasi admin/env, membentuk signature request `Create Invoice`, dan memverifikasi signature callback Duitku.
- Ditambahkan endpoint webhook `POST /api/webhook/duitku` dengan parsing `x-www-form-urlencoded`, validasi amount, update status order/payment, dan pola idempotent yang konsisten dengan gateway lain.
- Checkout sekarang mengenali gateway `duitku` melalui `src/app/api/checkout/route.js`, sedangkan halaman finish payment tetap memakai webhook/callback server-to-server sebagai source of truth, bukan redirect client-side.
- Admin settings dan resolver gateway aktif diperluas agar mengenali `duitku`, tetap menjaga hanya satu gateway aktif pada satu waktu.
- Env baru yang dipakai:
  - `DUITKU_MERCHANT_CODE`
  - `DUITKU_API_KEY`
  - `DUITKU_IS_PRODUCTION`
- Callback publik yang perlu didaftarkan di dashboard Duitku: `/api/webhook/duitku`

#### b. Finalisasi Aktivasi Mandiri Mitra
- Ditambahkan helper terpusat `src/lib/referral-activation.mjs` untuk menyatukan aturan aktivasi referral: expiry link, status login, notifikasi sukses/expired, dan ringkasan pengiriman aktivasi.
- Schema `users` diperluas dengan kolom `activation_token_expires_at`, beserta pembaruan migrasi `src/db/migrate-add-user-activation.mjs`.
- Saat admin membuat akun mitra, sistem sekarang menyimpan masa berlaku token aktivasi, mengirim status kirim Email/WhatsApp yang lebih jelas, dan mencegah email role internal tertentu dipakai ulang sebagai referral.
- Login mitra sekarang otomatis ditolak jika akun belum diaktivasi atau token aktivasi sudah kedaluwarsa. Halaman `/mitra/aktivasi` dan `/mitra/login` juga menampilkan state yang lebih jelas untuk kasus sukses, expired, atau redirect ke login.
- Build lokal untuk rangkaian perubahan aktivasi berhasil lolos dan patch dipush dengan commit `63b8cf7`.

#### c. Konsistensi Status Gagal Payment dan Release Voucher Internet
- Webhook Midtrans, Pakasir, DOKU, dan Duitku sudah lebih dulu menyamakan perilaku: jika payment gateway mengirim status gagal/batal/expired, maka order internal Telko.Store ikut berubah menjadi `failed`.
- Untuk produk kategori `voucher-internet`, kode voucher yang sebelumnya `reserved` akan otomatis dilepas kembali ke status `available` melalui helper `releaseVoucher(orderId)`.
- Celah pada jalur manual `POST /api/orders/[id]/check` kini sudah ditutup. Jika user menekan "cek status" dan gateway terbaca `failed`, voucher internet juga ikut dilepas kembali ke stok tersedia.
- Patch konsistensi ini dipush dengan commit `9360096`.

#### d. Catatan Deploy VPS 25 April 2026
- Deploy produksi dilakukan aman melalui workflow GitHub -> VPS tanpa mengubah port, bind, PM2 name, atau konfigurasi runtime existing.
- Di VPS, perubahan lokal lama sempat menghalangi `git pull`, lalu diamankan terlebih dahulu memakai `git stash --include-untracked` sebelum menjalankan `bash deploy.sh`.
- Deploy berhasil menjalankan `npm install --legacy-peer-deps`, seluruh migrasi runtime, `npm run build`, restart PM2 `telkostore`, dan health check `https://telko.store/api/health`.
- Commit yang terdeploy pada rangkaian update 25 April 2026:
  - `88dcb68` - integrasi Duitku POP
  - `63b8cf7` - finalisasi aktivasi mitra
  - `9360096` - release voucher saat status check gagal

### 25. Sistem Komisi Referral (Mitra) & Penyempurnaan UI (24 April 2026)

#### a. Arsitektur & Pelacakan Referral
- Dibuat skema database lengkap untuk referral: `downline_profiles` (profil mitra), `referral_clicks` (log klik), `referral_commissions` (komisi per transaksi), dan `referral_withdrawals` (pencairan komisi).
- Sistem pelacakan cerdas via cookies (masa aktif 30 hari). Link referral (`/r/alias` atau `/dl-slug`) menggunakan *Clean Redirect* — URL dikembalikan menjadi `telko.store` polos setelah cookies berhasil disuntikkan ke browser pembeli.
- Setiap checkout otomatis mengunci snapshot profil mitra dan margin saat transaksi dibuat.
- Sinkronisasi pembayaran (Midtrans, Pakasir, DOKU) otomatis memperbarui status komisi: transaksi sukses (`paid`) membuat komisi berstatus `approved`; transaksi batal/gagal membatalkan komisi.

#### b. Dashboard Mitra (`/mitra`)
- **Login Otentikasi**: Dibangun halaman login khusus `/mitra/login` untuk masuk sebagai Mitra menggunakan email dan password.
- **Dashboard Utama**: Menampilkan summary performa (total order, klik, profit pending, profit paid) dan riwayat transaksi/klik terbaru. Desain dibuat *mobile-first* dengan grid dinamis.
- **Manajemen Promo & Profil**: Mitra bisa mengatur custom URL alias (contoh: `/r/namatoko`), margin tambahan per transaksi, dan tema visual promosi.
- **Withdraw Komisi**: Fitur pencairan komisi mandiri. Mitra bisa meminta pencairan saldo `approved` dengan mengisi catatan rekening tujuan.
- **UI Responsif**: Dashboard `/mitra` dan `/control` kini secara otomatis menyembunyikan *Header* dan *BottomNav* global untuk memberikan tampilan *full-screen* yang premium. Sidebar layout `/mitra` juga memiliki opsi *collapse/expand*.
- **Download QR Code**: Ditambahkan fitur pembuatan dan pengunduhan QR Code referral secara instan di halaman Promo Mitra untuk mempermudah promosi offline.

#### d. Sistem Aktivasi & Keamanan Mandiri (Self-Service)
- **Alur Aktivasi Baru**: Saat admin membuat akun mitra, sistem tidak lagi memberikan password statis. Sebaliknya, sistem mengirimkan **Link Aktivasi** unik via WhatsApp dan Email.
- **Notifikasi Multi-Channel**:
  - **WhatsApp**: Pesan otomatis berisi data login, link referral, dan link download QR Code.
  - **Email HTML (Nodemailer)**: Email berdesain premium yang memuat data profil, link referral, dan gambar QR Code yang tertanam langsung di dalam badan email.
- **Set Password Mandiri**: Mitra diarahkan ke halaman `/mitra/aktivasi` untuk membuat password mereka sendiri secara aman. Setelah password disimpan, status akun otomatis berubah menjadi **Verified**.
- **Session Bypass**: Halaman aktivasi ini tidak dibatasi oleh session proteksi *dashboard*, sehingga bisa langsung diakses tanpa perlu login.
- **Pengecekan Token Cerdas**: Halaman aktivasi otomatis memverifikasi token saat dimuat (`GET /api/mitra/auth/activate?token=...`). Jika token sudah pernah digunakan, layar otomatis menampilkan status "Sudah Diverifikasi" beserta tombol pintasan langsung menuju portal login.
- **Indikator Verified**: Admin dapat memantau status aktivasi mitra (Verified/Belum Aktivasi) langsung dari daftar downline di dashboard control.

#### e. Pembaruan Teknis & Infrastruktur
- **Nodemailer Integration**: Mengintegrasikan `nodemailer` (versi terbaru) untuk pengiriman email SMTP via mail server VPS (`info@telko.store`).
- **Skrip Migrasi**: Penambahan `src/db/migrate-add-user-activation.mjs` dan integrasinya ke dalam `deploy.sh` untuk pembaruan schema otomatis di VPS.
- **Dependency Fix**: Resolving konflik peer dependency antara `next-auth` dan `nodemailer` dengan menggunakan `"nodemailer": "latest"` dan flag `--legacy-peer-deps`.

#### c. Manajemen Referral oleh Superadmin (`/control/downline`)
- Dibuat panel khusus di dashboard Admin untuk mengelola semua akun Mitra. Fitur ini dilindungi hak akses khusus `superadminOnly`.
- **Buat Akun Mitra**: Superadmin bisa membuat akun mitra baru. Jika email sudah ada di sistem (baik user biasa atau admin sekalipun), sistem akan otomatis mengupgrade peran/mengaitkan profil Mitra ke akun tersebut tanpa memunculkan error duplikat.
- **Edit & Hapus Mitra**: Dari halaman detail tiap mitra (`/control/downline/[id]`), Superadmin dapat mengubah data mitra (nama, email, no WA, dsb) jika terjadi kesalahan input. Jika diperlukan, Superadmin juga dapat menghapus akun mitra secara permanen (`DELETE` method), yang otomatis membersihkan data user terkait.
- **Approval Pencairan (Payout)**: Superadmin dapat melihat riwayat *withdrawal* dan mengubah statusnya (`pending` -> `processing` -> `completed/rejected`).
- **Real-time Statistics**: Superadmin dapat melihat data agregat performa seluruh mitra (Total Profit Approved, Paid, dll).

### 24. Integrasi Digiflazz, Perbaikan Admin Control, dan Stabilitas Deploy VPS (24 April 2026)

#### a. Export Produk Admin ke Excel
- Tombol export di halaman `/control/produk` diubah dari JSON menjadi file Excel `.xlsx`.
- Backend bulk export sekarang membuat workbook Excel dengan sheet `Produk`, header kolom yang lebih rapi, dan response download attachment.
- Frontend export di halaman admin produk diubah agar mengunduh blob Excel langsung dengan nama file bertanggal.
- Dependency `xlsx` ditambahkan ke project dan build lokal lolos.

#### b. Perbaikan Hapus Permanen Produk dan Riwayat Pesanan
- Flow hapus permanen produk diperbaiki agar alasan kegagalan tampil jelas di UI, terutama jika produk masih terkait `orders` atau `voucher_codes`.
- Guard backend untuk hard-delete tetap dipertahankan agar histori transaksi dan relasi voucher tidak rusak.
- Fitur hapus riwayat pesanan yang sebelumnya terasa tidak jalan untuk akun admin diperbaiki pada jalur API dan UI operasional.
- Perubahan ini dipush ke GitHub dengan commit `3c60c55`.

#### c. Perbaikan Logout Admin dan Proteksi `/control`
- Ditemukan bahwa logout lama mencoba menghapus cookie `admin_token` via JavaScript, padahal cookie login diset sebagai `httpOnly`.
- Ditambahkan endpoint logout server-side `POST /api/admin/auth/logout` untuk menghapus cookie dengan atribut yang benar.
- Tombol logout di layout admin diubah agar memanggil endpoint logout tersebut.
- Setelah deploy bersih, akses ulang ke `/control` kembali diarahkan ke `/control/login` jika belum login.
- Perubahan ini dipush ke GitHub dengan commit `a3e247b`.

#### d. Integrasi Supplier Fulfillment Digiflazz
- Ditambahkan helper baru `src/lib/digiflazz.js` untuk konfigurasi, signature, normalisasi status, request transaksi, dan verifikasi webhook Digiflazz.
- Ditambahkan orchestrator `src/lib/order-fulfillment.js` untuk menyatukan jalur fulfillment pasca-pembayaran: voucher internal, Digiflazz, atau manual.
- Ditambahkan endpoint webhook `POST /api/webhook/digiflazz`.
- Tabel `products` diperluas dengan kolom `supplier_name`, `supplier_sku_code`, dan `is_digiflazz_enabled`.
- Ditambahkan tabel baru `digiflazz_transactions` untuk menyimpan jejak transaksi supplier.
- Ditambahkan script migrasi `npm run db:migrate-digiflazz`.
- Admin produk sekarang bisa menandai produk memakai Digiflazz dan mengisi SKU supplier dari dashboard.
- Integrasi ini tidak melakukan import katalog otomatis dari Digiflazz. Produk tetap dikelola di database lokal, lalu fulfillment diarahkan ke Digiflazz per produk.
- Kategori `voucher-internet` sengaja tetap memakai flow voucher internal dan diblok agar tidak memakai Digiflazz.
- Perubahan integrasi Digiflazz dipush ke GitHub dengan commit `1eec2fb`.

#### e. Debugging Deploy VPS dan Insiden Produksi
- Setelah deploy, sempat terjadi tampilan rusak karena browser memuat aset/chunk lama yang tidak cocok dengan build baru.
- Ditemukan proses PM2 lama/orphan masih menahan port lama sehingga domain tetap melayani instance Next.js lama.
- Dilakukan cleanup proses PM2, rebuild bersih, dan penyesuaian start command agar Next.js berjalan stabil di bawah PM2.
- Nginx akhirnya diarahkan ke instance aktif Telko.Store di port `3100`.
- Verifikasi akhir menunjukkan `https://telko.store/control` merespons `307` ke `/control/login`, menandakan proteksi admin sudah aktif.

#### f. Root Cause Produk Kosong Setelah Deploy
- Setelah styling pulih, daftar produk sempat kosong walau aplikasi hidup normal.
- Penyebab utamanya adalah **schema mismatch**: kode baru sudah membaca kolom Digiflazz di tabel `products`, tetapi migrasi database di VPS belum dijalankan.
- Setelah `npm run db:migrate-digiflazz` dijalankan, endpoint `GET /api/products` kembali normal dan data produk muncul lagi.
- Kesimpulan operasional:
  - koneksi database aplikasi valid via `DATABASE_URL`
  - masalah produk kosong bukan karena route `/config`
  - route admin settings yang benar tetap `/control/pengaturan`
  - masalah murni berasal dari migrasi schema yang belum diterapkan di VPS

#### g. Catatan Deploy 24 April 2026
- Urutan update aman untuk perubahan Digiflazz:
  ```bash
  cd /var/www/telkostore
  git pull origin main
  npm install
  npm run db:migrate-digiflazz
  npm run build
  pm2 restart telkostore --update-env
  ```
- Jika terjadi mismatch aset/build di production, lakukan rebuild bersih dan pastikan tidak ada proses Next.js lama yang masih memegang port lama.
- Commit terkait rangkaian update 24 April:
  - `e28637e`
  - `3c60c55`
  - `a3e247b`
  - `1eec2fb`

### 23. Update Operasional Produk, Stok Voucher, dan Cleanup Sandbox (23 April 2026)

#### a. Manajemen Produk: Nonaktif vs Hapus Permanen
- Aksi hapus produk di `/control/produk` diperjelas menjadi **Nonaktifkan** untuk soft-delete (`is_active = false`), sehingga produk hilang dari toko tanpa merusak histori transaksi.
- Daftar produk admin sekarang default menampilkan **Aktif saja**, dengan filter tambahan **Non-aktif saja** dan **Semua status**.
- Ditambahkan aksi **Hapus Permanen** per produk dan bulk untuk kasus salah input produk.
- Hapus permanen produk dilindungi guard: produk yang masih dipakai `orders` atau `voucher_codes` akan ditolak agar histori transaksi/kode voucher tidak rusak.
- Pesan API/UI diubah agar tidak lagi menampilkan "berhasil dihapus" untuk aksi yang sebenarnya hanya menonaktifkan produk.

#### b. Stok Voucher Internet Berbasis Kode Voucher
- Ditambahkan helper `src/lib/product-stock.js` untuk menghitung stok voucher internet dari jumlah kode `available` dikurangi pesanan pending/paid yang belum mendapat kode.
- API publik `GET /api/products` dan `GET /api/products/[id]` kini mengembalikan stok voucher internet hasil perhitungan, bukan stok manual di tabel produk.
- Admin produk menampilkan badge `Auto` untuk produk voucher internet dan input stok manual dinonaktifkan pada kategori tersebut.
- Penambahan, penghapusan, redeem, fail, dan release kode voucher otomatis menyinkronkan stok produk terkait.
- Checkout voucher internet memakai perhitungan stok kode voucher dan transaction guard agar stok tidak minus saat transaksi bersamaan.

#### c. Hapus Riwayat Pesanan Khusus Superadmin
- Ditambahkan `DELETE /api/admin/orders` untuk menghapus riwayat pesanan, hanya bisa diakses oleh token `adminType = superadmin`.
- Halaman `/control/pesanan` kini menampilkan tombol **Hapus Terpilih** untuk superadmin saat ada pesanan dicentang.
- Superadmin juga dapat memakai **Hapus Hasil Filter** untuk cleanup transaksi sandbox berdasarkan filter status/search saat ini.
- Aksi hapus hasil filter wajib mengetik `HAPUS PESANAN` sebagai pengaman, terutama jika filter sedang `Semua`.
- Saat pesanan dihapus, data `payments` terkait ikut dibersihkan, voucher `reserved` dilepas kembali ke `available`, relasi order pada voucher selesai/gagal dibersihkan, dan stok voucher disinkronkan ulang.

#### d. Filter Tanggal Pesanan
- Halaman `/control/pesanan` ditambahkan filter tanggal **Dari** dan **Sampai** untuk membatasi riwayat berdasarkan `created_at`.
- API `GET /api/admin/orders` menerima query `createdFrom` dan `createdTo`, sehingga filter status/search/tanggal berjalan konsisten.
- Aksi superadmin **Hapus Hasil Filter** ikut memakai rentang tanggal aktif, cocok untuk membersihkan transaksi sandbox pada periode tertentu.
- Ditambahkan validasi UI agar tanggal mulai tidak lebih besar dari tanggal akhir, serta tombol **Reset Tanggal** saat filter tanggal aktif.

#### e. Verifikasi dan Deploy
- `npm run build` sudah dijalankan dan lolos setelah perubahan produk, cleanup pesanan, dan filter tanggal.
- Perubahan sudah dipush ke GitHub `main`.
- Commit tambahan: `fdedd60`, `44693dd`, `73bd855`.

### 22. Update Lengkap 23 April 2026 - Auth, Control Panel, Payment Sync, dan Auto-Redeem

#### a. Payment Gateway dan Sinkronisasi Status
- Menyelesaikan integrasi 3 gateway: Midtrans, Pakasir, dan DOKU dengan auto-routing checkout.
- Memperbaiki DOKU checkout, response parsing, debug logging, dan webhook-only status handling agar tidak spam error dari polling API yang tidak didukung.
- Menambahkan fallback payment reconciliation untuk order `pending`, termasuk script `npm run payments:reconcile`.
- Sinkronisasi payment sekarang dapat melepas voucher yang sudah `reserved` jika payment berubah ke status gagal/cancel/expired.
- Deploy script diperbaiki agar health check membaca `PORT` / `NEXT_PUBLIC_BASE_URL` dari env, bukan hardcoded ke port app lain.

#### b. Auth User, Admin, dan Control Panel
- Login admin via Google/Facebook diaktifkan dan diarahkan agar hanya email dengan role `admin` yang bisa masuk control panel.
- Perbaikan runtime env Auth.js di VPS: membaca env OAuth saat runtime, mendukung `.env.local`, dan memaksa canonical URL ke `https://telko.store`.
- Header publik sekarang menyesuaikan status login: user login melihat state akun, bukan tombol `Masuk` berulang.
- Jalur admin dipindahkan dari `/admin` ke `/control` agar lebih tidak umum, dengan middleware proteksi tetap aktif.
- Login `/control/login` ditambah mode username/email + password khusus admin.
- Admin yang dibuat dari halaman user bisa login memakai email admin dan password default.
- Password default admin baru diset ke `telko.store@2026` dan disimpan sebagai hash, bukan plaintext.
- Deploy script menjalankan migrasi/backfill untuk kolom `password_hash` agar admin lama juga bisa memakai password default.

#### c. Voucher Fulfillment dan Notifikasi
- Fulfillment voucher dipusatkan di `src/lib/voucher.js` agar assign voucher, kirim kode, dan trigger auto-redeem konsisten di semua jalur.
- Trigger auto-redeem diperluas dari webhook saja menjadi payment webhook sukses, cek status pembayaran, update status admin, dan bulk update order.
- Pelanggan tetap menerima kode voucher dan instruksi redeem via WhatsApp walaupun auto-redeem berjalan di background.
- Jika auto-redeem gagal, grup admin menerima notifikasi berisi invoice, produk, nomor tujuan, provider, kode voucher, dan alasan gagal.

#### d. Auto-Redeem by.U
- Live redeem by.U diuji dengan nomor `085168822280` dan kode `28124507492165775`.
- Ditemukan flow by.U bukan sekali klik, tetapi bertahap: isi nomor/kode, klik `Tukar`, fetch detail paket, centang persetujuan, lalu klik `Tukar` final.
- Engine by.U diperbarui agar mengikuti seluruh flow sampai endpoint final `POST https://pidaw-app.cx.byu.id/v1/vouchers/redeem`.
- Parser by.U diperketat agar tidak salah membaca response banner maintenance, file JS, atau JSON translation sebagai hasil redeem.

#### e. Auto-Redeem Simpati/Telkomsel
- Live redeem Simpati diuji dengan nomor `081285755557`.
- Engine Telkomsel diperbarui agar membaca response langsung dari `POST /api/voucher/redeem`, bukan hanya teks halaman.
- Error Telkomsel seperti `VoucherAlreadyUsed` / code `15` sekarang diterjemahkan menjadi `voucher sudah terpakai`.
- Flow form Telkomsel diperkuat: memilih `Voucher Fisik`, timeout selector lebih panjang, pencarian field voucher lebih fleksibel, dan soft reload sekali jika form telat render.
- Bug `Telkomsel redeem gagal: success` diperbaiki. Payload Telkomsel dengan `message` atau `description` bernilai `success` sekarang dianggap berhasil.

#### f. UI dan Asset
- Icon kategori `Voucher Internet` diganti memakai SVG `public/icons/voucher-internet.svg`.
- Komponen reusable `src/components/CategoryIcon.js` dibuat agar icon khusus bisa tampil konsisten tanpa mengubah data kategori/database.
- Icon baru dipasang di homepage, tab kategori mobile, sidebar desktop, kartu produk, dan header detail produk.

#### g. Verifikasi dan Deploy
- `npm run build` sudah dijalankan dan lolos pada rangkaian perubahan utama.
- Semua perubahan terbaru sudah dipush ke GitHub `main`.
- Commit penting hari ini: `d15deff`, `bba75e3`, `d353766`, `910ff11`, `d49fd88`, `0a18b15`, `fe3c4fc`, `2241341`, `9cc862a`, `35d420b`, `0045e77`, `fdedd60`, `44693dd`, `73bd855`.

#### h. Catatan Operasional
- VPS update standar:
  ```bash
  cd /var/www/telkostore
  git pull origin main
  bash deploy.sh
  ```
- Untuk auto-redeem otomatis tanpa menunggu user membuka halaman, cron reconciliation tetap disarankan:
  ```bash
  */5 * * * * cd /var/www/telkostore && npm run payments:reconcile >> /var/log/telkostore-reconcile.log 2>&1
  ```
- Jika ada invoice lama yang sudah sukses redeem sebelum parser diperbaiki tetapi masih tertandai gagal, cek kuota/voucher di provider lalu update status order/voucher dari control panel.

### 20. Pemisahan Alur Produk & Manajemen Admin (23 April 2026) 📦

#### a. Alur Manual Non-Voucher (3 Gateway Selaras)
- **Webhook Midtrans, Pakasir, & DOKU**: Ketiga webhook diperbarui agar produk *selain voucher internet* berhenti di status `paid` (tidak auto-complete). Hanya produk voucher internet yang auto-complete + auto-assign kode.
- **Fix DOKU Webhook**: Sebelumnya DOKU menggunakan logika `productType === "virtual"` yang auto-complete semua produk virtual. Sekarang menggunakan `isVoucherProduct()` — konsisten dengan Midtrans & Pakasir.

#### b. Alur Proses Manual (Non-Voucher)
1. **Pelanggan checkout & bayar** → Notifikasi WA #1 ("Pesanan Dibuat") dikirim otomatis
2. **Webhook terima pembayaran** → Status order berubah ke `paid` → Notifikasi WA #2 ("Pembayaran Berhasil") ke pelanggan + Notifikasi "AKSI DIPERLUKAN" ke WA Grup Admin dengan tautan ke dashboard
3. **Admin ubah status di dashboard** (`paid` → `processing` → `completed`) → Setiap perubahan mengirim notifikasi WA ke pelanggan DAN ke WA Grup Admin
4. **Status `completed`** → Notifikasi WA #3 ("Pesanan Selesai") dikirim otomatis ke pelanggan

#### c. 3 Notifikasi WhatsApp untuk Pelanggan
| # | Trigger | Template | Keterangan |
|---|---------|----------|------------|
| 1 | Checkout (10s delay) | `buildOrderCreatedMsg()` | Pesanan dibuat + link bayar |
| 2 | Webhook payment success | `buildPaymentSuccessMsg()` | Pembayaran berhasil |
| 3 | Admin ubah ke `completed` | `buildOrderCompletedMsg()` | Pesanan selesai |

#### d. Notifikasi WA Grup Admin (Lengkap)
- **Pesanan Baru**: Saat pelanggan checkout
- **Pembayaran Diterima + AKSI DIPERLUKAN**: Saat webhook terima pembayaran (non-voucher)
- **Pesanan Diproses**: Saat admin ubah status ke `processing`
- **Pesanan Selesai**: Saat admin ubah status ke `completed`
- **Pembayaran Gagal**: Saat webhook terima status gagal/expired

#### e. Error Handling Ditingkatkan
- Semua notifikasi WA di admin order API dibungkus `try/catch` agar kegagalan kirim WA tidak menggagalkan update status.
- Notifikasi grup admin ditambahkan pada setiap perubahan status (sebelumnya hanya ke pelanggan).

#### f. Manajemen Admin Lainnya
- **Pembuatan Admin Manual**: Menambahkan form modal di `/admin/users` untuk membuat akun Admin/User secara manual (tanpa perlu OAuth).
- **Eksekusi Pesanan via User Profile**: Pada detail profil pengguna di halaman kelola User, admin dapat melihat riwayat pesanan user dan langsung mengubah status pesanan dari sana.

### 21. Auto-Redeem Voucher via Puppeteer (23 April 2026) 🤖

#### a. Engine Auto-Redeem (`src/lib/auto-redeem.js`)
- **Puppeteer Headless Chrome**: Mengotomasi browser tanpa GUI untuk redeem voucher di website Telkomsel dan byU.
- **Telkomsel Flow**: Navigasi ke `telkomsel.com/shops/voucher/redeem` → isi nomor HP + kode voucher → klik Redeem → deteksi hasil (sukses/gagal).
- **byU Flow**: Navigasi ke `pidaw-webfront.cx.byu.id/web/tkr-voucher` → isi nomor HP + kode voucher → klik Tukar → deteksi hasil (sukses/gagal).
- **Multiple Selector Fallback**: Mencoba beberapa CSS selector berbeda untuk setiap field input, sehingga jika website berubah struktur, masih ada fallback.
- **Retry Logic**: Maksimal 3 kali percobaan dengan delay 2 detik antar retry.
- **Human-like Typing**: Delay 100ms antar keystroke untuk menghindari deteksi bot.

#### b. Orchestrator (`autoRedeemAndComplete()` di `src/lib/voucher.js`)
- **Dynamic Import**: Puppeteer di-import secara dinamis agar build tidak error jika puppeteer belum di-install.
- **Fire-and-Forget**: Auto-redeem berjalan di background (non-blocking), tidak menghambat response webhook.
- **Alur Sukses**: Jika auto-redeem berhasil → voucher di-mark `redeemed` → order di-set `completed` → notifikasi WA ke pelanggan ("Voucher Berhasil Diaktifkan") + notifikasi ke grup admin.
- **Alur Gagal (Fallback ke Semi-Auto)**: Jika auto-redeem gagal → voucher tetap `reserved` → notifikasi ke grup admin "AUTO-REDEEM GAGAL — Perlu Redeem Manual" + link ke `/admin/voucher`.

#### c. Integrasi Webhook (3 Gateway)
- Ketiga webhook (Midtrans, Pakasir, DOKU) telah diintegrasikan dengan auto-redeem.
- Alur setelah payment confirmed untuk voucher:
  1. Assign voucher dari DB → status `reserved`
  2. Kirim kode + instruksi redeem ke pelanggan via WA (langsung)
  3. Trigger auto-redeem via Puppeteer (background)
  4. Jika sukses → order complete + notif WA ke pelanggan
  5. Jika gagal → notif ke admin grup untuk manual redeem

#### d. Konfigurasi
- **`next.config.mjs`**: Ditambahkan `puppeteer` dan `puppeteer-core` ke `serverExternalPackages` agar tidak di-bundle oleh Next.js.
- **Dependency**: `npm install puppeteer` — perlu dijalankan di server production. Chromium akan otomatis diunduh.
- **VPS Requirement**: Server production memerlukan Chrome/Chromium headless. Pastikan dependency sistem tersedia (`libx11`, `libnss3`, dll untuk Linux).



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
