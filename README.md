# WhatsApp Status HD

Project sederhana: browser -> server -> akun WhatsApp yang ditautkan -> Status WhatsApp.

## Yang dibutuhkan

- Node.js 20+
- Akun WhatsApp milik sendiri
- Server yang tetap hidup ketika ingin menerima upload
- HTTPS untuk deployment publik (disarankan)

## Jalankan

```bash
npm install
npm start
```

Buka:

```text
http://localhost:3000
```

Scan QR dari menu **Perangkat tertaut** di WhatsApp.

Setelah status menunjukkan **WhatsApp terhubung**, pilih foto/video dan kirim.

## Kualitas media

Browser tidak melakukan resize/re-encode. File asli dikirim sebagai multipart upload ke server.
WhatsApp tetap dapat melakukan transcoding/compression saat mempublikasikan Status, jadi
tidak ada cara yang sah untuk menjamin hasil Status identik 100% dengan file asli.

## Catatan penting

Project ini menggunakan Baileys, yaitu library tidak resmi untuk berinteraksi dengan
WhatsApp Web. API dapat berubah dan koneksi dapat terputus. Jangan mengandalkan project ini
untuk kebutuhan produksi tanpa pengujian dan monitoring.

Untuk penggunaan publik/multi-user, jangan memakai satu folder `auth` bersama. Setiap akun
harus memiliki session/auth store terpisah dan harus ada autentikasi website, pembatasan ukuran
file, rate limit, serta penghapusan file sementara.

## Keamanan

- Jangan commit folder `auth/`.
- Jangan membagikan QR WhatsApp.
- Jangan menjalankan server sebagai root.
- Gunakan HTTPS jika diakses dari internet.
- Batasi ukuran upload sesuai kebutuhan.
- Simpan session WhatsApp secara privat.

## Kenapa bukan HTML saja?

HTML hanya menangani antarmuka. Pengiriman ke Status memerlukan proses server-side yang
memiliki sesi WhatsApp yang sudah diautentikasi.

## Status audience

Contoh ini mengirim ke `status@broadcast` dan tidak membangun daftar kontak sendiri.
Pengaturan privasi Status di akun WhatsApp tetap harus diperhatikan. Implementasi audience
yang lebih kompleks perlu diuji terhadap versi WhatsApp/Baileys yang digunakan.
