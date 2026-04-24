---
tags: [work, project, telkostore, digiflazz, prd, antigravity]
---

# PRD - Telkostore - Integrasi Digiflazz untuk Antigravity

## 1. Ringkasan

Dokumen ini dipakai sebagai PRD / implementation brief untuk model di Antigravity agar dapat mengupdate aplikasi Telkostore dengan integrasi Digiflazz secara aman, minim breaking change, dan tetap kompatibel dengan konfigurasi VPS yang sudah berjalan.

Fokus utama:
- menambahkan integrasi Digiflazz sebagai supplier / fulfillment API
- admin bisa memilih produk mana yang memakai Digiflazz
- voucher internet tetap memakai sistem existing saat ini
- payment gateway existing tetap dipakai
- deploy tetap mengikuti workflow lokal -> GitHub -> pull di VPS
- konfigurasi VPS existing tidak boleh direset ke default

---

## 2. Konteks Project

### Lokasi & workflow
- VPS project path: `/var/www/telkostore`
- Pengembangan dilakukan lokal memakai Antigravity
- Flow deploy:
  1. edit/update di lokal
  2. commit + push ke GitHub
  3. git pull di VPS

### Stack saat ini
- Next.js
- React
- MySQL
- Drizzle ORM
- Admin dashboard internal
- Payment gateway existing: Midtrans, Pakasir, DOKU
- Voucher internet internal: sudah ada flow existing sendiri
- Notifikasi WhatsApp: sudah ada helper existing

### Constraint operasional VPS
Sangat penting:
- jangan ubah port aplikasi existing
- jangan ubah binding / host / listen address ke default
- jangan ubah ecosystem config / PM2 config ke default
- jangan ubah reverse proxy / Nginx / service port yang sudah ada
- jangan overwrite file env produksi secara sembrono
- jangan mengganti setting VPS aktif hanya karena local dev default berbeda
- semua patch harus kompatibel dengan environment VPS yang berjalan sekarang

---

## 3. Tujuan Bisnis

### Tujuan utama
1. Admin bisa memilih produk mana yang memakai Digiflazz
2. Produk yang tidak memakai Digiflazz tetap memakai flow existing
3. Voucher internet tetap memakai mekanisme yang sekarang
4. Digiflazz dipakai sebagai supplier fulfillment, bukan payment gateway frontend
5. Sistem tetap aman untuk workflow deploy lokal -> GitHub -> VPS

### Hasil yang diharapkan
- produk tertentu bisa fulfilled lewat Digiflazz setelah order dibayar
- produk non-Digiflazz tidak berubah perilakunya
- voucher internet tidak ikut dimigrasikan ke Digiflazz
- tidak ada bentrok config di VPS

---

## 4. Referensi Resmi yang Wajib Dipakai

Gunakan panduan ini sebagai sumber implementasi:

### Panduan buyer setting API
- https://digiflazz.com/blog/post/panduan-buyer-pengaturan-koneksi-api=all

### Dokumentasi teknis
- https://developer.digiflazz.com/api/

Poin penting dari dokumentasi yang harus diikuti:
- Digiflazz buyer API memakai method `POST`
- whitelist IP wajib di panel Digiflazz
- tersedia `Username`, `Development Key`, `Production Key`
- endpoint penting:
  - cek saldo
  - daftar harga
  - topup prepaid
  - cek status
  - webhook
- signature buyer API:
  - saldo: `md5(username + apiKey + "depo")`
  - price list: `md5(username + apiKey + "pricelist")`
  - topup / status prepaid: `md5(username + apiKey + ref_id)`

---

## 5. Credential & Koneksi Digiflazz

### Credential
- Username: `yuvaneDbGYKW`
- Development Key: `dev-91c0f600-3fa4-11f1-bc61-fdae9296a2f7`
- Production Key: `f288d1bd-3a91-5644-8950-f100f9f06d5d`

### Kandidat IP VPS saat ini
Jika request API Digiflazz dijalankan dari VPS Telkostore saat ini, IP publik yang sudah terdeteksi adalah:
- `31.97.106.147`

Catatan:
- bila dev dan prod memakai host yang sama, development IP dan production IP bisa sama
- jangan hardcode IP di codebase

---

## 6. Keputusan Arsitektur

### Wajib dipatuhi
- Digiflazz = supplier / fulfillment API
- Midtrans / Pakasir / DOKU = payment gateway tetap
- voucher internet = tetap memakai sistem lama

### Bukan yang diinginkan
- jangan jadikan Digiflazz sebagai payment gateway frontend
- jangan mengganti seluruh checkout flow menjadi Digiflazz
- jangan migrasikan voucher internet ke Digiflazz

### Flow target
1. customer checkout produk di Telkostore
2. payment diproses oleh gateway existing
3. order menjadi `paid`
4. bila produk ditandai memakai Digiflazz, backend mengirim fulfillment ke Digiflazz
5. hasil transaksi Digiflazz dicatat
6. order internal diupdate sesuai status supplier
7. buyer/admin menerima notifikasi sesuai hasil final

---

## 7. Requirement Fungsional

### 7.1 Pemilihan produk Digiflazz
Sistem harus memungkinkan admin menentukan apakah produk tertentu:
- memakai Digiflazz
- atau tidak memakai Digiflazz

Minimal ada field seperti:
- `supplier_name`
- `supplier_sku_code`
- atau field setara yang jelas

### 7.2 Voucher internet tetap existing
Untuk kategori / produk voucher internet:
- jangan ubah flow existing
- jangan arahkan fulfillment ke Digiflazz
- jangan rusak logic voucher_codes internal yang sudah ada

### 7.3 Fulfillment setelah paid
Jika order status sudah `paid`:
- bila produk memakai Digiflazz -> kirim request ke Digiflazz
- bila tidak -> jalankan flow lama

### 7.4 Logging transaksi supplier
Setiap transaksi Digiflazz harus dicatat, minimal memuat:
- `order_id`
- `ref_id`
- `buyer_sku_code`
- `customer_no`
- `status`
- `message`
- `sn`
- `buyer_last_saldo`
- raw request
- raw response

### 7.5 Idempotency
Harus ada perlindungan agar:
- order yang sama tidak mengirim fulfillment Digiflazz lebih dari sekali
- webhook + polling tidak menyebabkan update dobel
- retry tidak menciptakan transaksi ganda

### 7.6 Webhook Digiflazz
Sistem harus bisa menerima webhook Digiflazz:
- endpoint baru terpisah
- verifikasi signature bila secret digunakan
- cocokkan event ke transaksi internal
- update status internal dengan aman

---

## 8. Requirement Non-Fungsional

### 8.1 Backward compatibility
Prioritaskan kompatibilitas terhadap sistem existing.

### 8.2 Minimal-risk patch
- hindari refactor besar jika tidak perlu
- hindari rename file massal
- hindari perubahan arsitektur deploy existing

### 8.3 VPS-safe
- jangan reset setting port ke default
- jangan sentuh config VPS yang tidak relevan
- jangan ubah env existing kecuali menambah key baru yang diperlukan

### 8.4 Security
- jangan expose secret Digiflazz ke frontend
- jangan log full API key
- verifikasi webhook signature jika secret dipakai

---

## 9. Scope Implementasi

### In scope
- audit codebase relevan
- tambah support Digiflazz supplier fulfillment
- tambah mapping produk ke Digiflazz
- tambah helper Digiflazz
- tambah webhook Digiflazz
- tambah logging transaksi supplier
- tambah env vars Digiflazz
- pertahankan flow lama untuk produk non-Digiflazz

### Out of scope
- mengganti payment gateway existing
- migrasi total produk voucher internet ke Digiflazz
- mengganti deploy architecture
- mengubah port / service config VPS

---

## 10. Desain Teknis yang Diinginkan

### 10.1 Env vars baru
Tambahkan hanya env baru yang diperlukan, misalnya:

```env
DIGIFLAZZ_USERNAME=yuvaneDbGYKW
DIGIFLAZZ_API_KEY_DEV=dev-91c0f600-3fa4-11f1-bc61-fdae9296a2f7
DIGIFLAZZ_API_KEY_PROD=f288d1bd-3a91-5644-8950-f100f9f06d5d
DIGIFLAZZ_IS_PRODUCTION=false
DIGIFLAZZ_BASE_URL=https://api.digiflazz.com
DIGIFLAZZ_WEBHOOK_SECRET=
```

Catatan:
- jangan ubah port / base setting existing di `.env.example`
- jangan hapus env existing

### 10.2 File baru yang disarankan
- `src/lib/digiflazz.js`
- `src/app/api/webhook/digiflazz/route.js`
- migration untuk schema Digiflazz
- script sync price list jika diperlukan

### 10.3 File existing yang kemungkinan diubah
- `.env.example`
- `src/db/schema.js`
- admin product/settings UI terkait supplier mapping
- handler yang memproses order setelah `paid`
- helper notifikasi bila perlu

### 10.4 Tabel / schema tambahan
Buat tabel baru, contoh:
- `digiflazz_transactions`

Field minimal:
- `id`
- `order_id`
- `ref_id`
- `buyer_sku_code`
- `customer_no`
- `status`
- `message`
- `sn`
- `buyer_last_saldo`
- `raw_request`
- `raw_response`
- `created_at`
- `updated_at`

Tambahkan juga metadata pada produk, misalnya:
- `supplier_name`
- `supplier_sku_code`
- `is_digiflazz_enabled`

---

## 11. Workflow Transaksi yang Diinginkan

### Untuk produk non-Digiflazz
- tetap pakai flow lama
- tidak ada perubahan perilaku

### Untuk voucher internet
- tetap pakai flow voucher existing saat ini
- jangan dialihkan ke Digiflazz

### Untuk produk Digiflazz
1. order dibuat seperti biasa
2. payment diproses seperti biasa
3. saat webhook/payment handler menandai order `paid`
4. cek apakah produk memakai Digiflazz
5. jika ya, kirim transaksi ke Digiflazz
6. simpan hasil awal
7. jika sukses final -> update order sesuai rule
8. jika pending -> tunggu webhook / cek status
9. jika gagal -> tandai butuh retry / follow-up admin sesuai desain yang aman

---

## 12. Ekspektasi Terhadap Antigravity Model

Model harus bekerja dengan urutan ini:

### Langkah 1 — Audit dulu
Sebelum patch, lakukan audit file relevan untuk memahami struktur existing.

### Langkah 2 — Rencana perubahan
Berikan ringkasan file-by-file yang akan diubah dan alasannya.

### Langkah 3 — Implementasi minim risk
Implement patch kecil, aman, dan kompatibel.

### Langkah 4 — Output akhir
Berikan:
- ringkasan audit
- daftar file yang diubah
- env baru yang diperlukan
- migration/schema baru
- catatan testing
- catatan deploy aman ke VPS
- area berisiko

---

## 13. Hal yang Tidak Boleh Dilakukan Model

- jangan ubah port aplikasi ke default
- jangan ubah host/bind/listen ke default
- jangan reset config VPS existing
- jangan overwrite env produksi sembarangan
- jangan migrasikan voucher internet ke Digiflazz
- jangan jadikan Digiflazz sebagai payment gateway frontend
- jangan lakukan refactor besar yang tidak diperlukan
- jangan rename file besar-besaran jika tidak dibutuhkan
- jangan mengasumsikan struktur project tanpa audit

---

## 14. Prompt Operasional untuk Model

Gunakan instruksi berikut saat menjalankan implementasi:

"Kamu adalah senior full-stack engineer yang sedang mengupdate project Telkostore. Audit codebase terlebih dahulu, lalu implementasikan integrasi Digiflazz sebagai supplier fulfillment API dengan patch minimal-risk. Admin harus bisa memilih produk mana yang memakai Digiflazz. Voucher internet harus tetap memakai sistem existing. Jangan ubah payment gateway existing. Jangan ubah port, bind, ecosystem config, atau setting VPS existing ke default. Jangan overwrite config produksi secara sembrono. Tambahkan hanya perubahan yang diperlukan agar Digiflazz bisa dipakai setelah order paid. Gunakan dokumentasi resmi Digiflazz buyer API untuk signature, endpoint, topup, cek status, dan webhook. Prioritaskan backward compatibility." 

---

## 15. Deliverables yang Diharapkan

Model harus menghasilkan:
- audit singkat file relevan
- rencana implementasi
- patch code
- env vars baru
- migration/schema update
- endpoint webhook Digiflazz
- helper Digiflazz
- catatan testing dev/prod
- catatan deploy aman ke VPS

---

## 16. Checklist Validasi Hasil

- [ ] Admin bisa menandai produk memakai Digiflazz
- [ ] Produk non-Digiflazz tetap normal
- [ ] Voucher internet tetap pakai flow existing
- [ ] Payment gateway existing tetap normal
- [ ] Order paid bisa memicu fulfillment Digiflazz
- [ ] Ada logging transaksi supplier
- [ ] Ada idempotency
- [ ] Ada webhook Digiflazz
- [ ] `.env.example` hanya bertambah, tidak merusak config existing
- [ ] Tidak ada perubahan port / config VPS defaultisasi
- [ ] Deploy via pull di VPS tetap aman

---

## 17. Catatan Tambahan

Bila ada pilihan antara desain ideal vs aman untuk production existing, pilih yang lebih aman dan kompatibel dengan sistem berjalan.
