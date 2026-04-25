---
tags: [work, project, telkostore, referral, multi-level, duitku, popup, antigravity, prd]
---

# PRD - Telkostore - Referral Multi Level + Perbaikan Duitku Popup untuk Antigravity

## 1. Ringkasan

Dokumen ini dipakai sebagai PRD / implementation brief untuk model di Antigravity agar dapat mengerjakan 2 perubahan penting pada project Telkostore secara aman, minim breaking change, dan tetap kompatibel dengan konfigurasi VPS yang sedang berjalan.

Fokus utama:
- memperbaiki integrasi Duitku dari redirect-style menjadi popup asli `duitku.js`
- tetap mempertahankan model single active gateway
- customer tetap tidak memilih gateway
- mengubah sistem referral dari flat commission menjadi multi-level referral bulanan
- level referral berlaku berdasarkan jumlah transaksi bulan sebelumnya
- aturan level dan nominal komisi diatur oleh superadmin dari dashboard
- histori komisi lama tidak boleh berubah
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

Catatan audit awal yang sudah diketahui:
- Duitku sudah masuk ke single active gateway flow
- build project saat ini sudah lolos
- implementasi Duitku yang terpasang sekarang masih cenderung redirect-style karena memakai `paymentUrl`
- target perubahan sekarang adalah popup asli `duitku.js`
- sistem referral existing masih memakai pendekatan margin / komisi flat yang disnapshot ke order

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
- Payment gateway existing: Midtrans, Pakasir, DOKU, Duitku
- Sistem referral / mitra sudah ada
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

### 4.1 Tujuan untuk Duitku
1. Memperbaiki integrasi Duitku agar memakai popup asli `duitku.js`
2. Tetap mempertahankan single active gateway
3. Superadmin tetap menentukan gateway aktif
4. Customer tetap tidak memilih gateway
5. Webhook/callback Duitku tetap menjadi source of truth status pembayaran

### 4.2 Tujuan untuk Referral
1. Mengubah komisi referral menjadi multi-level berdasarkan performa bulanan
2. Level bulan berjalan ditentukan dari transaksi bulan sebelumnya
3. Nominal komisi mengikuti level aktif bulan berjalan
4. Rule level dan nominal komisi harus dapat diatur superadmin
5. Histori komisi lama harus tetap konsisten

---

## 5. Requirement Bisnis Duitku

### Wajib dipatuhi
- Telkostore tetap memakai model single active gateway
- hanya 1 payment gateway aktif pada satu waktu
- gateway aktif dipilih oleh superadmin
- customer tidak memilih gateway
- jika gateway aktif adalah Duitku, flow yang diinginkan adalah popup asli `duitku.js`
- backend tetap membuat invoice Duitku lebih dulu
- frontend harus membuka popup `duitku.js` memakai reference Duitku
- callback/webhook Duitku tetap menjadi source of truth untuk status pembayaran
- redirect/returnUrl tidak boleh menjadi penentu final payment status
- gateway lain tetap aman:
  - Midtrans
  - Pakasir
  - DOKU

### Bukan yang diinginkan
- jangan ubah checkout menjadi multi-gateway customer-facing
- jangan buat customer memilih gateway
- jangan menjadikan returnUrl sebagai sumber kebenaran payment final
- jangan menghapus gateway yang sudah ada

---

## 6. Hasil Audit Awal Duitku yang Harus Dijadikan Dasar

Temuan yang harus dipakai model saat audit:
- implementasi Duitku sudah masuk ke single active gateway flow
- provider `duitku` sudah ada di active gateway logic dan admin settings
- helper `src/lib/duitku.js` sudah ada
- webhook `src/app/api/webhook/duitku/route.js` sudah ada
- build project saat ini lolos
- tetapi implementasi saat ini masih cenderung redirect-style karena memakai `paymentUrl`
- target sekarang adalah memperbaiki flow ini menjadi popup asli `duitku.js`
- model active gateway harus tetap dipertahankan

---

## 7. Referensi Resmi Duitku yang Wajib Dipakai

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

## 8. Requirement Teknis Duitku

### 8.1 Audit wajib
Sebelum patch, audit dulu file berikut:
- `progress.md`
- `src/lib/duitku.js`
- `src/app/api/checkout/route.js`
- `src/app/api/webhook/duitku/route.js`
- `src/app/payment/finish/page.js`
- `src/app/api/gateway/status/route.js`
- `src/app/api/admin/settings/route.js`
- komponen checkout frontend yang relevan

### 8.2 Flow yang diinginkan
- jika gateway aktif adalah `duitku`, backend tetap membuat invoice Duitku
- backend mengembalikan data yang dibutuhkan frontend untuk membuka popup asli `duitku.js`
- frontend memanggil popup `duitku.js` menggunakan reference Duitku
- callback frontend dari popup hanya untuk UX
- final status payment tetap harus berasal dari webhook Duitku
- returnUrl tetap boleh ada untuk UX/landing page, tetapi bukan source of truth

### 8.3 Constraint perubahan Duitku
- jangan ubah model checkout menjadi customer memilih gateway
- jangan ubah single active gateway
- minimalkan perubahan selain yang diperlukan untuk popup asli Duitku
- patch harus backward compatible dan aman

---

## 9. Requirement Bisnis Referral Multi Level

### Rule utama
- level referral ditentukan berdasarkan jumlah transaksi bulan sebelumnya
- level otomatis berubah setiap awal bulan berdasarkan performa bulan sebelumnya
- besaran komisi per transaksi mengikuti level aktif pada bulan berjalan
- aturan level dan nominal komisi tidak hardcoded
- superadmin harus bisa mengatur threshold level dan nominal komisi dari dashboard
- sistem harus tetap backward compatible dan minim risiko

### Contoh rule bisnis
- Bronze:
  - 0 sampai 20 transaksi per bulan
  - komisi 100 rupiah per transaksi
- Silver:
  - 21 sampai 50 transaksi per bulan
  - komisi 150 rupiah per transaksi
- Gold:
  - lebih dari 50 transaksi per bulan
  - komisi 200 rupiah per transaksi

### Catatan penting
- level bulan ini ditentukan dari jumlah transaksi bulan lalu
- misalnya performa April menentukan level yang berlaku untuk Mei
- transaksi yang dipakai untuk penentuan level harus didefinisikan jelas dan konsisten
- jangan asumsi tanpa audit codebase referral yang sekarang

---

## 10. Audit Awal Referral yang Wajib Dilakukan

Sebelum patch, model wajib audit file relevan berikut:
- `progress.md`
- `src/db/schema.js`
- file migrasi referral yang sudah ada
- `src/lib/referral-service.js`
- `src/lib/referral-commission.js`
- route admin downline/referral
- route mitra commissions/stats/orders
- file yang mengisi `downlineMarginSnapshot`
- file yang mengelola dashboard `/control/downline`
- file yang menampilkan statistik referral / mitra
- file lain yang relevan setelah audit

### Asumsi existing yang perlu diverifikasi
- saat ini ada field `marginPerTransaction` / margin snapshot pada referral/downline
- saat ini komisi kemungkinan masih berbasis nilai flat yang disnapshot ke order saat order dibuat
- ada tabel `referral_commissions` dan `downline_profiles`
- ada service referral, sinkronisasi komisi, serta dashboard admin/mitra

---

## 11. Desain Data yang Diinginkan untuk Referral

### 11.1 Rule level referral
Gunakan tabel baru, contoh:

- `referral_level_rules`
  - `id`
  - `name`
  - `min_transactions`
  - `max_transactions` nullable
  - `commission_amount`
  - `sort_order`
  - `is_active`
  - `created_at`
  - `updated_at`

### 11.2 Snapshot bulanan referral
Jika diperlukan, gunakan tabel baru, contoh:

- `referral_monthly_levels` atau `referral_monthly_stats`
  - `id`
  - `downline_profile_id`
  - `period_month`
  - `total_transactions`
  - `applied_level_rule_id`
  - `applied_level_name`
  - `applied_commission_amount`
  - `created_at`
  - `updated_at`

Jika tidak perlu tabel snapshot bulanan terpisah, model harus menjelaskan kenapa dan memilih desain yang lebih sederhana namun tetap aman.

### 11.3 Aturan penting
- histori order / commission lama tidak boleh rusak
- nominal komisi transaksi lama tidak boleh berubah ketika rule level berubah
- snapshot komisi per order tetap wajib dipertahankan

---

## 12. Rule Perhitungan Referral yang Harus Jelas

Model harus mendefinisikan secara eksplisit:
- transaksi apa yang dihitung untuk penentuan level
- rekomendasi: hitung hanya order referral yang sukses final sesuai rule existing
- tentukan apakah memakai status `paid`, `completed`, atau kombinasi tertentu berdasarkan audit sistem sekarang
- jelaskan alasannya
- jangan mengubah histori lama

---

## 13. Perubahan Perilaku yang Diinginkan

### 13.1 Duitku
- saat gateway aktif adalah Duitku, checkout membuka popup asli `duitku.js`
- frontend callback popup hanya untuk UX
- webhook Duitku tetap source of truth status pembayaran

### 13.2 Referral
- saat order referral baru dibuat, sistem menentukan komisi berdasarkan level aktif referral pada bulan berjalan
- nominal komisi saat itu disnapshot ke order / referral commission
- perubahan level di masa depan tidak mengubah order lama
- saat bulan baru dimulai, level referral otomatis menyesuaikan performa bulan sebelumnya
- superadmin dapat mengubah rule level dari dashboard tanpa edit code

---

## 14. Requirement Dashboard Admin

Dashboard admin terkait referral harus mendukung:
- daftar level referral
- create/update/delete atau minimal create/update/nonaktif rule
- melihat level aktif referral
- melihat jumlah transaksi bulan sebelumnya
- melihat komisi aktif per level

Admin settings payment gateway tetap harus mendukung Duitku sebagai bagian dari single active gateway.

UI boleh sederhana, yang penting aman dan jelas.

---

## 15. Requirement Dashboard Mitra

Jika memungkinkan dengan patch kecil:
- tampilkan level aktif saat ini
- tampilkan jumlah transaksi bulan berjalan
- tampilkan target ke level berikutnya

Jika terlalu besar untuk fase awal, prioritaskan backend + admin dulu lalu tandai bagian mitra dashboard sebagai fase lanjutan.

---

## 16. Requirement Migration

- jika ada schema baru, buat migration script yang aman dan idempotent
- standalone migration harus load `.env.local` dengan benar
- jangan merusak data referral existing
- jika perlu backfill data referral lama, lakukan dengan aman
- jelaskan strategi backfill

---

## 17. Testing yang Diinginkan

### 17.1 Untuk Referral
- test rule penentuan level
- test penentuan level dari transaksi bulan sebelumnya
- test snapshot komisi order tetap stabil walaupun rule berubah
- test rollover bulan
- test edge case:
  - 0 transaksi
  - tepat di batas threshold
  - `max_transactions` nullable untuk level tertinggi
  - referral baru tanpa histori bulan sebelumnya

### 17.2 Untuk Duitku
- test backend create invoice
- test frontend hanya memakai callback UX
- test webhook tetap source of truth
- test regression agar payment gateway existing tidak rusak

---

## 18. Output yang Diinginkan dari Antigravity

Model harus menghasilkan:
- audit singkat dari sistem Duitku existing
- audit singkat dari sistem referral existing
- hasil cek `progress.md`
- gap analysis
- usulan desain data dan alasan pemilihannya
- rencana perubahan file-by-file
- patch implementasi
- migration/schema baru
- env baru jika diperlukan
- langkah deploy aman di VPS
- checklist verifikasi pasca deploy
- area berisiko / regression points

---

## 19. Guardrail Wajib

- cek dulu `/var/www/telkostore/progress.md`
- audit dulu, baru patch
- jangan ubah port existing
- jangan ubah PM2/ecosystem/nginx/reverse proxy ke default
- jangan overwrite `.env.local`
- jangan refactor besar jika tidak perlu
- utamakan backward compatibility
- histori komisi lama tidak boleh berubah
- nominal komisi transaksi lama harus tetap sesuai snapshot saat transaksi dibuat
- callback/webhook Duitku harus jadi source of truth
- frontend Duitku popup callback tidak boleh dipakai untuk final payment status
- gunakan patch minim risiko
- laporkan semua file yang diubah
- sertakan migration dan langkah deploy aman
- sertakan test dan checklist verifikasi

---

## 20. Prompt Operasional untuk Model

Gunakan instruksi berikut saat menjalankan implementasi:

"Kamu adalah senior full-stack engineer yang sedang mengupdate project Telkostore. Sebelum patch, cek dulu file `/var/www/telkostore/progress.md` untuk memahami progres perubahan terakhir. Setelah itu audit codebase payment dan referral terkait. Pertama, perbaiki integrasi Duitku dari redirect-style menjadi popup asli `duitku.js` tanpa mengubah model single active gateway. Customer tetap tidak boleh memilih gateway, dan webhook Duitku harus tetap menjadi source of truth status pembayaran. Kedua, implementasikan sistem multi-level referral bulanan berdasarkan jumlah transaksi bulan sebelumnya. Level dan nominal komisi harus dapat diatur superadmin dari dashboard admin. Snapshot komisi pada order harus tetap dipertahankan agar histori lama tidak berubah. Jangan ubah port, bind, ecosystem config, atau setting VPS existing ke default. Jangan overwrite config produksi secara sembrono. Prioritaskan backward compatibility dan patch minimal-risk." 

---

## 21. Deliverables yang Diharapkan

- audit singkat
- hasil cek `progress.md`
- gap analysis Duitku dan referral
- rencana perubahan file-by-file
- patch implementasi
- env baru yang dibutuhkan
- migration/schema tambahan jika ada
- langkah deploy aman
- checklist verifikasi pasca deploy
- area berisiko / regression points
