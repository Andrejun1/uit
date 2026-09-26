# 🚀 UNIMUS Inventrack (UIT)

> Smart Laboratory Inventory 

---

## 📌 Tentang Proyek

UNIMUS Inventrack (UIT) adalah sistem berbasis web yang digunakan untuk mengelola inventaris laboratorium dan proses peminjaman barang secara digital, real-time, dan terintegrasi.

Proyek ini dikembangkan untuk menggantikan pencatatan manual yang masih berbasis buku, sehingga proses pengelolaan barang menjadi lebih cepat, aman, dan transparan.

---

## ✅ Fitur yang Sudah Diimplementasikan

Sistem yang saat ini tersedia telah mencakup fitur-fitur utama berikut:

- 🔐 Autentikasi admin menggunakan Supabase Auth
- 🛡️ Proteksi route admin melalui middleware
- 📦 Manajemen katalog barang (CRUD)
- 🖼️ Upload foto barang dan peminjam
- 🧾 Generasi kode barang otomatis
- 📊 Dashboard admin untuk memantau peminjaman dan stok barang
- 🔄 Proses peminjaman barang dengan pengurangan stok otomatis
- ↩️ Proses pengembalian barang dan pengembalian stok
- 🧠 Pencatatan deadline pengembalian dan status peminjaman
- 📱 Scan barcode / QR code untuk pencarian dan pengembalian barang
- 📧 Pengiriman email konfirmasi peminjaman dan reminder pengembalian
- 🔔 Reminder otomatis H-2 dan hari deadline melalui API
- ⚡ Realtime update saat data berubah

---

## 👥 Peran Pengguna

| Peran    | Keterangan                                                        |
| -------- | ----------------------------------------------------------------- |
| Admin    | Mengelola barang, peminjaman, pengembalian, dan melihat dashboard |
| Peminjam | Melakukan peminjaman barang melalui sistem yang tersedia          |

---

## 🛠️ Teknologi yang Digunakan

- Frontend: Next.js 13, React, TypeScript
- UI: Tailwind CSS, shadcn/ui
- Backend: Supabase (Auth, Database, Storage)
- Email: Resend
- Barcode/QR: html5-qrcode, qrcode
- Deployment: Vercel / Netlify-ready

---

## 📁 Struktur Proyek

```bash
unimus-inventrack/
├── app/               # Halaman dan route aplikasi
├── components/        # Komponen UI dan fitur
├── contexts/          # Context untuk autentikasi dan state global
├── hooks/             # Custom hooks
├── lib/               # Logic bisnis, Supabase, item, loan, upload
├── public/            # Asset publik
├── middleware.ts      # Proteksi route admin
└── package.json       # Konfigurasi project
```

---

## 🚧 Status Proyek

✅ Sistem telah dikembangkan dan siap digunakan untuk kebutuhan manajemen inventaris dan peminjaman laboratorium.

---

## 👨‍💻 Tim Pengembang

UNIMUS Inventrack Project


