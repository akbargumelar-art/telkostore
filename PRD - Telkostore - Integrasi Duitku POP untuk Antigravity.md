---
tags: [work, project, telkostore, duitku, payment-gateway, pop, prd, antigravity]
---

# PRD - Telkostore - Integrasi Duitku POP untuk Antigravity

## 1. Ringkasan

Dokumen ini dipakai sebagai PRD / implementation brief untuk model di Antigravity agar dapat menambahkan Duitku sebagai payment gateway tambahan di Telkostore secara aman, minim breaking change, dan tetap kompatibel dengan konfigurasi VPS yang sudah berjalan.

Fokus utama:
- menambahkan Duitku sebagai payment gateway tambahan ke-4
- arsitektur payment gateway tetap single active gateway
- hanya 1 gateway aktif pada satu waktu
- gateway aktif dipilih oleh superadmin dari admin settings
- customer tidak perlu memilih gateway
- checkout tetap auto-route ke gateway aktif seperti sistem sekarang
- Duitku harus memakai mode POP
- payment gateway existing tetap dipertahankan: Midtrans, Pakasir, DOKU
- deploy tetap mengikuti workflow lokal -> GitHub -> pull di VPS
- konfigurasi VPS existing tidak boleh direset ke default

---

## 2. Instruksi wajib sebelum mulai patch

Sebelum audit dan implementasi, WAJIB cek dulu file berikut untuk melihat progres perubahan terakhir pada project:

- `/var/www/telkostore/progress.md`

Tujuan:
- memahami perubahan terakhir yang sudah dikerjakan
- menghindari duplikasi patch atau bentrok dengan perubahan sebelumnya
- menyesuaikan implementasi dengan arsitektur terkini

Catatan hasil cek awal dari `progress.md`:
- payment gateway yang sudah ada: Midtrans, Pakasir, DOKU
- arsitektur existing menggunakan single active gateway
- referral, Digiflazz, dan webhook payment sudah pernah disentuh
- perubahan payment baru harus additive dan backward compatible

---

## 3. Konteks Project

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
- Webhook payment: sudah ada jalur existing untuk gateway yang sudah terpasang

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

## 4. Tujuan Bisnis

### Tujuan utama
1. Menambahkan Duitku sebagai payment gateway tambahan
2. Payment gateway tetap model single active gateway
3. Superadmin tetap menentukan gateway aktif
4. Customer tetap tidak memilih gateway
5. Flow checkout existing tetap dipertahankan
6. Implementasi minimal-risk dan backward compatible

### Hasil yang diharapkan
- Duitku tersedia di admin settings sebagai provider baru
- hanya satu gateway yang aktif pada satu waktu
- jika gateway aktif adalah Duitku, checkout otomatis memakai Duitku POP
- Midtrans, Pakasir, dan DOKU tetap ada dan tetap bisa dipakai bila diaktifkan
- tidak ada bentrok config di VPS

---

## 5. Keputusan Arsitektur

### Wajib dipatuhi
- Duitku = payment gateway tambahan, bukan pengganti existing gateway
- arsitektur payment gateway tetap single active gateway
- customer tidak memilih gateway
- superadmin memilih gateway aktif
- Duitku harus memakai mode POP

### Bukan yang diinginkan
- jangan ubah checkout menjadi multi-gateway customer-facing
- jangan menampilkan pilihan gateway ke customer
- jangan menghapus Midtrans, Pakasir, atau DOKU
- jangan mengganti semua flow payment menjadi Duitku
- jangan menggunakan returnUrl / redirect sebagai sumber status final pembayaran

### Flow target
1. customer checkout produk di Telkostore
2. sistem mendeteksi gateway aktif dari admin settings
3. jika gateway aktif = Midtrans / Pakasir / DOKU -> jalur existing tetap jalan
4. jika gateway aktif = Duitku -> backend membuat Create Invoice Duitku POP
5. customer diarahkan ke flow POP Duitku
6. callback/webhook Duitku diterima backend
7. status order internal diupdate berdasarkan callback/webhook Duitku
8. returnUrl hanya dipakai untuk landing UX, bukan source of truth

---

## 6. Referensi Resmi Duitku yang Wajib Dipakai

Gunakan dokumentasi resmi ini sebagai sumber implementasi:

- Overview:
  - https://docs.duitku.com/payment-gateway/overview/
- API Browser / perbandingan POP vs API:
  - https://docs.duitku.com/payment-gateway/api-browser/
- POP Reference:
  - https://docs.duitku.com/pop/id/
- API Reference:
  - https://docs.duitku.com/api/id/

---

## 7. Fakta Teknis Duitku yang Wajib Diikuti

### 7.1 Create Invoice
- Create Invoice dipanggil dari backend
- Endpoint Sandbox:
  - `https://api-sandbox.duitku.com/api/merchant/createInvoice`
- Endpoint Production:
  - `https://api-prod.duitku.com/api/merchant/createInvoice`

### 7.2 Header auth request
Wajib mengirim header berikut:
- `x-duitku-signature`
- `x-duitku-timestamp`
- `x-duitku-merchantcode`

### 7.3 Signature request Create Invoice
Formula:
- `SHA256(merchantCode + timestampJakarta + apiKey)`

### 7.4 Callback / webhook Duitku
- Method: `POST`
- Content-Type: `x-www-form-urlencoded`
- Signature callback:
  - `MD5(merchantCode + amount + merchantOrderId + apiKey)`
- callback URL harus publik
- callback harus mengembalikan HTTP 200 OK
- Duitku akan retry callback jika belum menerima 200

### 7.5 Redirect / returnUrl
- returnUrl hanya untuk UX / landing page
- resultCode dari redirect tidak boleh dipakai untuk final update status payment
- source of truth status payment harus callback/webhook server-to-server

---

## 8. Requirement Fungsional

### 8.1 Duitku sebagai provider baru
Sistem harus memungkinkan admin/superadmin memiliki provider payment baru:
- `duitku`

Provider ini harus masuk ke ekosistem payment gateway existing bersama:
- `midtrans`
- `pakasir`
- `doku`

### 8.2 Single active gateway tetap dipertahankan
Sistem harus tetap memakai pola:
- hanya 1 gateway aktif pada satu waktu
- customer tidak memilih gateway
- checkout otomatis menggunakan gateway aktif

### 8.3 Checkout auto-route tetap berjalan
Jika gateway aktif adalah Duitku:
- checkout backend harus membuat invoice Duitku POP
- lanjutkan flow payment sesuai mode POP
- simpan data payment/order internal seperti provider lain

### 8.4 Callback/webhook Duitku
Sistem harus bisa menerima callback Duitku:
- endpoint baru terpisah
- verifikasi signature callback
- cocokkan event ke order internal
- update status internal dengan aman
- idempotent

### 8.5 Logging transaksi payment
Setiap transaksi Duitku minimal harus tercatat / bisa dilacak melalui struktur existing atau tambahan yang aman, misalnya memuat:
- order id internal
- merchantOrderId
- reference Duitku
- amount
- payment method / payment code bila tersedia
- status callback
- raw request / raw response bila memang dibutuhkan secara aman

---

## 9. Requirement Non-Fungsional

### 9.1 Backward compatibility
Prioritaskan kompatibilitas terhadap sistem existing.

### 9.2 Minimal-risk patch
- hindari refactor besar jika tidak perlu
- hindari rename file massal
- hindari perubahan arsitektur deploy existing

### 9.3 VPS-safe
- jangan reset setting port ke default
- jangan sentuh config VPS yang tidak relevan
- jangan ubah env existing kecuali menambah key baru yang diperlukan

### 9.4 Security
- jangan expose secret Duitku ke frontend
- jangan log full API key
- verifikasi callback signature
- jangan jadikan redirect client-side sebagai penentu status payment final

---

## 10. Scope Implementasi

### In scope
- audit codebase relevan
- cek dulu `progress.md` sebelum patch
- tambah support Duitku POP
- tambah helper Duitku
- tambah webhook/callback Duitku
- tambah provider baru `duitku` ke payment gateway system
- update active gateway logic agar mengenali `duitku`
- pertahankan single active gateway
- pertahankan flow lama untuk Midtrans / Pakasir / DOKU

### Out of scope
- mengganti payment gateway existing
- mengubah checkout agar customer memilih gateway
- refactor besar arsitektur payment kalau tidak diperlukan
- mengubah port / service config VPS

---

## 11. Desain Teknis yang Diinginkan

### 11.1 Env vars baru
Tambahkan hanya env baru yang diperlukan, misalnya:

```env
DUITKU_MERCHANT_CODE=YOUR_DUITKU_MERCHANT_CODE
DUITKU_API_KEY=YOUR_DUITKU_API_KEY
DUITKU_IS_PRODUCTION=false
```

Catatan:
- jangan hapus env existing
- jangan overwrite `.env.local` produksi sembarangan

### 11.2 File baru yang disarankan
- `src/lib/duitku.js`
- `src/app/api/webhook/duitku/route.js`

### 11.3 File existing yang kemungkinan diubah
- `src/app/api/checkout/route.js`
- `src/app/api/gateway/status/route.js`
- `src/app/api/admin/settings/route.js`
- `src/db/schema.js`
- file lain yang memang relevan setelah audit

### 11.4 Catatan schema
Jika butuh perubahan schema:
- lakukan additive migration yang aman
- hindari breaking rename jika field lama masih dipakai luas
- lebih aman tambah field baru jika benar-benar diperlukan

---

## 12. Audit Awal yang Wajib Dilakukan Model

Sebelum patch, model wajib audit file relevan berikut:

- `progress.md`
- `src/app/api/checkout/route.js`
- `src/app/api/gateway/status/route.js`
- `src/app/api/admin/settings/route.js`
- `src/lib/midtrans.js`
- `src/lib/pakasir.js`
- `src/lib/doku.js`
- `src/app/api/webhook/doku/route.js`
- file lain yang terkait payment status, webhook, dan update order

Tujuan audit:
- memahami struktur existing
- menjaga pola implementasi tetap konsisten
- meminimalkan patch yang tidak perlu

---

## 13. Ekspektasi Terhadap Antigravity Model

Model harus bekerja dengan urutan ini:

### Langkah 1 — Audit dulu
- cek `progress.md`
- cek file payment existing
- pahami jalur active gateway, checkout, dan webhook saat ini

### Langkah 2 — Rencana perubahan
Berikan ringkasan file-by-file yang akan diubah dan alasannya.

### Langkah 3 — Implementasi minim risk
Implement patch kecil, aman, dan kompatibel.

### Langkah 4 — Output akhir
Berikan:
- ringkasan audit
- daftar file yang diubah
- env baru yang diperlukan
- migration/schema baru jika ada
- catatan testing
- catatan deploy aman ke VPS
- area berisiko

---

## 14. Hal yang Tidak Boleh Dilakukan Model

- jangan ubah port aplikasi ke default
- jangan ubah host/bind/listen ke default
- jangan reset config VPS existing
- jangan overwrite env produksi sembarangan
- jangan ubah arsitektur checkout menjadi customer memilih gateway
- jangan hilangkan Midtrans, Pakasir, atau DOKU
- jangan gunakan returnUrl sebagai source of truth status payment
- jangan lakukan refactor besar yang tidak diperlukan
- jangan rename file besar-besaran jika tidak dibutuhkan
- jangan mengasumsikan struktur project tanpa audit dan tanpa cek `progress.md`

---

## 15. Prompt Operasional untuk Model

Gunakan instruksi berikut saat menjalankan implementasi:

"Kamu adalah senior full-stack engineer yang sedang mengupdate project Telkostore. Sebelum patch, cek dulu file `/var/www/telkostore/progress.md` untuk memahami progres perubahan terakhir. Setelah itu audit codebase payment terkait, lalu implementasikan penambahan Duitku sebagai payment gateway tambahan ke-4 dengan patch minimal-risk. Arsitektur payment gateway harus tetap single active gateway yang dipilih superadmin. Customer tidak boleh memilih gateway. Checkout harus tetap auto-route ke gateway aktif seperti sistem sekarang. Gunakan Duitku mode POP sesuai dokumentasi resmi. Backend harus membuat invoice Duitku lebih dulu, dan callback/webhook Duitku harus menjadi source of truth untuk update status pembayaran. Jangan ubah port, bind, ecosystem config, atau setting VPS existing ke default. Jangan overwrite config produksi secara sembrono. Prioritaskan backward compatibility." 

---

## 16. Deliverables yang Diharapkan

Model harus menghasilkan:
- audit singkat
- hasil cek `progress.md`
- gap analysis
- rencana perubahan file-by-file
- patch implementasi
- env baru yang dibutuhkan
- migration/schema tambahan jika ada
- langkah deploy aman
- checklist verifikasi pasca deploy
- area berisiko / regression points

---

## 17. Checklist Verifikasi Setelah Implementasi

- [ ] `progress.md` sudah dicek sebelum patch
- [ ] provider `duitku` dikenali di admin/payment logic
- [ ] single active gateway tetap berjalan
- [ ] customer tetap tidak memilih gateway
- [ ] checkout gateway existing tetap aman
- [ ] checkout dengan Duitku POP berjalan
- [ ] callback/webhook Duitku bisa diterima
- [ ] status order final diupdate dari callback, bukan redirect
- [ ] build lolos
- [ ] deploy aman tidak mengubah port/config VPS existing
