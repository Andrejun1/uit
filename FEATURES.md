# FEATURES.md — UNIMUS Inventrack (UIT)

> **Blueprint fitur untuk redesign UI/UX (Google Stitch).**
> Dokumen ini **hanya mencatat fitur yang benar-benar ditemukan di source code** (diverifikasi per file). Tidak ada fitur yang ditebak atau ditambahkan.
> Tanggal verifikasi: berdasarkan kondisi repository saat ini (Oktober 2026).
> Sumber utama: `app/`, `components/`, `lib/`, `contexts/`, `hooks/`, `middleware.ts`, `vercel.json`, `.env`.

---

## 0. RINGKASAN APLIKASI

**UNIMUS Inventrack (UIT)** adalah web app (Next.js 13 App Router + TypeScript + Tailwind + shadcn/ui + Supabase) untuk **pencatatan dan monitoring peminjaman barang laboratorium** Universitas Muhammadiyah Semarang.

Konsep inti:
1. **Admin** login → membuat data peminjaman (multi-barang) → stok barang otomatis berkurang → cetak bukti ber-QR.
2. **Peminjam (mahasiswa)** tidak punya akun; ia menerima **email konfirmasi + QR** dan dapat **melacak status peminjaman via halaman publik** (`/`, `/detail/[kode]`) dengan scan QR.
3. **Pengembalian** diproses admin (via daftar atau scan QR/barcode) → stok dikembalikan → email pengembalian terkirim.
4. **Reminder email otomatis** H-2 dan hari deadline (cron harian).

**Gaya visual saat ini:** *Neo-brutalism* — border hitam 2px, hard shadow (`4px 4px 0 #0A0A0A`), latar krem `#F5F3EC`, aksen biru `#7DD3FC`/`#2563EB`, font display **Space Grotesk**, mono **JetBrains Mono**, sans **Inter** (lihat `tailwind.config.ts`). Kelas utilitas: `brut-card`, `brut-btn`, `brut-input`, `brut-badge`, `brut-panel`, `brut-table`, `kicker`, `shadow-brut*`.

---

## 1. USER ROLE

**Tidak ada tabel role, tidak ada field role, tidak ada custom claim.** Diferensiasi role murni berdasarkan **ada/tidaknya Supabase Auth session**.

| Role | Status di kode | Definisi |
|---|---|---|
| **Admin** | ✅ Ada | Siapa pun yang berhasil login dengan email+password Supabase Auth. Semua akun yang bisa login = admin. Ditampilkan dengan label "Admin" (`AdminSidebar`, `Header` legacy). |
| **Guest / Publik** | ✅ Ada | Pengunjung tanpa login. Mengakses `/`, `/detail/[kode]`, `/login`. |
| **Peminjam (mahasiswa)** | ⚠️ Bukan akun | Hanya **data** di tabel `loans` + penerima email. Tidak pernah login, tidak punya portal self-service. |

**File bukti:** `contexts/AuthContext.tsx`, `middleware.ts`, `lib/auth.ts`, `app/admin/layout.tsx`.
README menyebut 2 peran (Admin, Peminjam) — pada kenyataannya "Peminjam" bukan akun sistem.

---

## 2. ROUTE / PAGE

### 2.1 Route aktif (dapat diakses)

| Route | File | Akses | Deskripsi |
|---|---|---|---|
| `/` | `app/page.tsx` | Publik | Homepage: hero + scan QR + stats + tab Katalog & Riwayat |
| `/login` | `app/login/page.tsx` | Publik (redirect ke `/admin/dashboard` jika sudah login) | Form login admin |
| `/detail/[kode]` | `app/detail/[kode]/page.tsx` | Publik | Halaman tracking status peminjaman via kode `UIT-YYYY-NNNN` |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | Login | Dashboard admin |
| `/admin/new` | `app/admin/new/page.tsx` | Login | Form peminjaman baru (multi-item) |
| `/admin/loans` | `app/admin/loans/page.tsx` | Login | Daftar/kelola semua peminjaman |
| `/admin/items` | `app/admin/items/page.tsx` → `components/admin/ItemsCatalog.tsx` | Login | Katalog barang (CRUD) |
| `/admin/return` | `app/admin/return/page.tsx` → `components/admin/ReturnBarangModal.tsx` | Login | Proses pengembalian (daftar + scan) |
| `/admin/print/[kode]` | `app/admin/print/[kode]/page.tsx` | Login (middleware) | Halaman cetak bukti peminjaman (A4) + QR |

### 2.2 Route API

| Route | Method | File |
|---|---|---|
| `/api/loan-confirmation` | POST | `app/api/loan-confirmation/route.ts` |
| `/api/reminder` | GET | `app/api/reminder/route.ts` (cron harian) |

### 2.3 Route LEGACY (kode masih ada, TIDAK dapat diakses)

`app/dashboard/layout.tsx` melakukan `router.replace('/admin/dashboard')` dan `return null` untuk **seluruh subtree** `/dashboard/*`, sehingga semua halaman di bawahnya tidak pernah dirender.

| Route | File | Status |
|---|---|---|
| `/dashboard` | `app/dashboard/page.tsx` | Legacy redirect → `/admin/dashboard` |
| `/dashboard/catalog` | `app/dashboard/catalog/page.tsx` | Legacy (halaman penuh ada di kode, tidak terjangkau) |
| `/dashboard/loans` | `app/dashboard/loans/page.tsx` | Legacy (halaman penuh, konfirmasi pakai `window.confirm`) |
| `/dashboard/new` | `app/dashboard/new/page.tsx` | Legacy (form peminjaman **single-item**, memanggil `createLoan()` lama) |
| `/dashboard/print/[kode]` | `app/dashboard/print/[kode]/page.tsx` | Legacy (cetak, QR via api.qrserver.com) |

Komponen legacy yang tidak diimpor halaman aktif: `components/dashboard/Sidebar.tsx`, `components/dashboard/Header.tsx`.

> Catatan: `middleware.ts` hanya mem-match `['/admin/:path*', '/login']` — `/dashboard/*` **tidak** dilindungi middleware, hanya diblokir oleh client-side redirect layout.

---

## 3. FITUR SETIAP ROLE

### 3.1 Admin (terautentikasi)
- Melihat dashboard ringkasan + panel terlambat (realtime).
- Membuat peminjaman baru multi-barang + foto (kamera/upload).
- Melihat daftar semua peminjaman: search, filter status, refresh.
- Melihat detail peminjaman (modal) + QR.
- **Edit deadline** pengembalian (dialog, dengan validasi).
- **Menandai pengembalian** (dari daftar atau halaman scan).
- **Menghapus** data peminjaman (diblokir jika status masih `dipinjam`) beserta file foto di storage.
- **CRUD barang** (tambah/edit/hapus) + upload/hapus foto barang.
- **Mencetak bukti peminjaman** (A4 + QR).
- **Scan QR/barcode** untuk proses pengembalian.
- Melihat/membuka halaman publik (link baru tab).
- Logout; peringatan & auto-logout inaktivitas.

### 3.2 Guest / Publik (tanpa login)
- Melihat homepage: jam realtime, 4 kartu statistik, katalog barang (yang tersedia), riwayat peminjaman (publik).
- Search + filter kategori (katalog) dan search + filter status (riwayat).
- **Scan QR code** (kamera) → diarahkan ke `/detail/[kode]`.
- Lightbox foto barang (klik gambar, tutup dengan ESC/klik).
- Membuka `/detail/[kode]`: status, identitas peminjam, foto, durasi realtime, daftar barang, QR, update realtime.
- Tombol ke `/login` (portal admin).

### 3.3 Peminjam
- **Tidak memiliki fitur interface.** Menerima email (konfirmasi, reminder H-2, reminder hari deadline, konfirmasi pengembalian) berisi kode + QR menuju `/detail/[kode]`.

---

## 4. SEMUA CRUD

### 4.1 Barang (`items`) — `lib/items.ts` + `components/admin/ItemsCatalog.tsx`
| Operasi | Fungsi | UI |
|---|---|---|
| Create | `createItem()` + `generateKodeBarang()` (`LAB-YYYY-NNNN`) | Dialog "Tambah Barang Baru" |
| Read | `getAllItems()`, `getAvailableItems()`, `getItemById()`, `getItemByBarcode()`, `searchItems()`, `getItemsByCategory()`, `getAllCategories()`, `getItemsStatistics()` | Grid kartu |
| Update | `updateItem()` — **auto-sync `stok_tersedia`** saat `stok_total` berubah (selisih, dibatasi 0..stok_total) | Dialog "Edit Barang" |
| Delete | `deleteItem()` + `deleteItemPhoto()` (hapus file dari storage dulu) | AlertDialog "Hapus Barang?" |
| Stok | `decreaseStock()` / `increaseStock()` (dipanggil alur peminjaman & pengembalian) | — |

Foto: upload ke bucket **`items`** path `items/{kode}-{timestamp}-{random}.{ext}`.
Validasi upload: `image/jpeg|png|webp`, maks **5MB** (`lib/upload.ts`).

### 4.2 Peminjaman (`loans`) — `lib/loans.ts`
| Operasi | Fungsi | UI |
|---|---|---|
| Create (multi-item, aktif) | `createLoanWithItems()` → insert `loans` + insert `loan_items` + `decreaseStock()` per item; rollback hapus loan jika insert detail gagal | `/admin/new` |
| Create (single-item, legacy) | `createLoan()` | hanya dipakai halaman legacy `/dashboard/new` |
| Read | `getAllLoans()` (join `loan_items`→`items`), `getLoanByKode()`, `getLoanById()`, `getLoanWithItems()`, `getLoanWithItemsByKode()`, `getLoansByStatus()`, `getOverdueLoans()`, `getLoansByPhoneNumber()`, `getActiveLoansCount()` | berbagai halaman |
| Update | `updateLoan()`, `updateLoanDeadline()` (disimpan jam **23:59:00**) | Dialog "Edit Deadline" |
| Return | `returnLoan()` — optimistic lock | modal konfirmasi / halaman return |
| Delete | `deleteLoan()`, `deleteLoanWithFiles()` (hapus file storage → hapus baris; `loan_items` CASCADE) | DeleteConfirmModal |
| Kode unik | `generateKodeUnik()` → `UIT-YYYY-NNNN` (urut dari kode tertinggi tahun berjalan) | — |

### 4.3 Detail peminjaman (`loan_items`) — fungsi ada di `lib/loans.ts`
`getLoanItems()`, `addLoanItem()`, `updateLoanItemQuantity()`, `removeLoanItem()` (semua dengan penyesuaian stok).
> **Catatan faktual:** keempat fungsi ini **didefinisikan tetapi tidak dipanggil** dari halaman/UI mana pun saat ini.

---

## 5. WORKFLOW PEMINJAMAN

**Alur aktif (admin): `/admin/new`**

1. Admin mengisi **Data Peminjam**:
   - Nama Lengkap*, Tanggal Lahir* (date), Program Studi*, Jurusan*, Semester* (select 1–14), Nomor WhatsApp*, Email*, Tanggal Pengambilan* (date), Deadline Pengembalian* (date), Foto Peminjam (opsional).
2. Admin menambahkan barang via komponen `ItemSelect` (search dropdown, hanya barang `stok_tersedia > 0`) + stepper jumlah (−/+/input) → **"Tambah ke Peminjaman"** → masuk keranjang.
   - Keranjang: ubah qty inline, hapus item per baris, ringkasan "*N jenis, M total unit*".
   - Item duplikat dijumlahkan; validasi ulang terhadap stok.
3. Foto Barang (opsional) — dilampirkan ke **item pertama** dalam peminjaman.
4. **Validasi client-side sebelum submit** (toast `destructive`):
   - minimal 1 barang; qty ≥ 1; qty ≤ stok tersedia;
   - WhatsApp wajib; format regex `^(\+62|0)[0-9]{9,12}$` (strip `-`/spasi);
   - Email wajib; format email regex;
   - Deadline wajib; Pickup wajib;
   - pickup ≥ hari ini; deadline ≥ hari ini; deadline ≥ pickup.
5. Submit:
   - `generateKodeUnik()` → `UIT-YYYY-NNNN`;
   - upload Foto Peminjam ke bucket `loans` (`loans/peminjam/…`) — jika gagal hanya warning;
   - upload Foto Barang (`loans/barang/{kode}-{kodeBarang}`) untuk item pertama — best effort;
   - `createLoanWithItems()` (insert header + detail + kurangi stok per item);
   - `deadline` disimpan dengan jam **23:59:00**; `tanggal_pinjam` = `created_at` server; `status = "dipinjam"`;
   - **POST `/api/loan-confirmation`** (email konfirmasi berisi kode, deadline, daftar barang, QR);
   - toast sukses "*N jenis barang (M unit) dipinjam dengan kode UIT-…*" → redirect `/admin/loans`.

**Stok:** `stok_tersedia` dikurangi per item saat peminjaman dibuat.

---

## 6. WORKFLOW PENGEMBALIAN

**Dua jalur (keduanya memanggil `returnLoan()` yang sama):**

### Jalur A — Daftar peminjaman (`/admin/loans`)
1. Baris dengan status `dipinjam` → tombol ✓ "Kembalikan Barang".
2. **ReturnConfirmModal** (ringkasan nama, barang, kode; keterangan status akan jadi "Dikembalikan" + tanggal kembali dicatat otomatis) → Batal / Konfirmasi.
3. `returnLoan()` → sukses → **POST `/api/loan-confirmation`** dengan `type: "return"` → toast → list realtime ter-refresh.

### Jalur B — Halaman pengembalian (`/admin/return`)
1. Tombol **"Scan QR Code"** → `BarcodeScannerModal` (kamera `html5-qrcode` **atau input manual**).
2. Kode yang discan:
   - Format `UIT-…` → dicari langsung sebagai `kode_unik` loan.
   - Format `LAB-…` → dicari `items.barcode`, lalu dicocokkan dengan loan `dipinjam` yang memiliki `item_id` tersebut.
   - Anti-duplikat scan dalam **2 detik**.
3. Jika loan tidak ditemukan / sudah `kembali` → toast error.
4. **Otomatis langsung diproses tanpa dialog konfirmasi** (jalur scan) → `returnLoan()` → email notifikasi → reload.
5. Alternatif manual: setiap baris "Barang Sedang Dipinjam" punya tombol **"Kembalikan"** → **modal "Konfirmasi Pengembalian"** (foto barang, nama peminjam, WhatsApp, lama pinjam, deadline, badge "Terlambat" jika lewat) → Batal / Kembalikan.

**Inti `returnLoan()` (`lib/loans.ts`):**
1. Cek loan; tolak jika sudah `kembali`/`selesai`.
2. **Optimistic lock**: `UPDATE loans SET status='kembali', tanggal_kembali=now() WHERE id=? AND status='dipinjam'` — jika tidak ada baris yang ter-update → error "Peminjaman sedang diproses atau sudah dikembalikan oleh admin lain."
3. Kembalikan stok per `loan_items` (fallback: field legacy `item_id`/`quantity`).
4. Jika pengembalian stok gagal → **rollback** status ke `dipinjam` dan `tanggal_kembali = null`, lalu throw error.

---

## 7. SEMUA STATUS

### 7.1 Status peminjaman (field `loans.status`, enum di `lib/supabase/types.ts`)
| Status | Label UI | Badge | Ditulis oleh kode? |
|---|---|---|---|
| `dipinjam` | "Dipinjam" / "Sedang Dipinjam" | `badge-blue` (biru) | ✅ saat create & saat rollback return |
| `kembali` | "Kembali" / "Sudah Dikembalikan" | `badge-green` (hijau) | ✅ saat return |
| `selesai` | "Selesai" | `badge-purple` (ungu) | ❌ **didefinisikan di type + mapping badge, tetapi tidak pernah ditulis** oleh kode mana pun |

### 7.2 Status turunan (computed, tidak disimpan di DB)
- **Terlambat / overdue** = `status === "dipinjam" && deadline < now` → badge merah "Terlambat", panel merah dashboard, teks deadline merah di tabel.
- **Stok barang**: `stok_tersedia > 0` = "Tersedia" (hijau) / `stok_tersedia === 0` = "Stok Habis" (merah); public catalog memakai teks "`{n} tersedia`".
- **Hari ini** = loan yang `tanggal_pinjam` sama dengan tanggal hari ini (statistik).
- **Reminder**: kolom `reminder_h2_sent_at` & `reminder_deadline_sent_at` (null = belum dikirim). Field `reminder_sent_at` ditandai deprecated di kode.

---

## 8. SEMUA FORM

### 8.1 Login (`/login`)
Field: **Email Admin** (email, icon Mail), **Password** (toggle lihat/sembunyi Eye/EyeOff). Tombol "Masuk sebagai Admin". Pesan error muncul di banner merah atas form. Tidak ada halaman register/forgot-password.

### 8.2 Peminjaman Baru (`/admin/new`) — lihat §5
Field: nama, tanggal_lahir (date), prodi, jurusan, semester (select 1–14), nomor_whatsapp (tel), email, pickup_date (date), deadline (date), foto peminjam (camera/upload), pemilih barang + qty, daftar keranjang, foto barang (opsional).

### 8.3 Form Barang (dialog Tambah/Edit di `/admin/items`)
Field: **Kode Barang** (auto-generated, *disabled/read-only*), **Stok Total\*** (number min 1), **Nama Barang\***, **Deskripsi** (textarea 3 baris), **Kategori** (Select, daftar statis), **Barcode** (text), **Foto Barang** (upload, preview, tombol hapus preview).
Kategori statis (`ItemsCatalog.tsx`): `Elektronik`, `Alat Ukur`, `Bahan Kimia`, `Alat Laboratorium`, `Perlengkapan`, `Lainnya`.
Validasi: nama barang wajib. Catatan UI: "Format: JPG, PNG, Max 5MB".

### 8.4 Form Edit Deadline (dialog di `/admin/loans`)
Field: **Deadline** (date). Disimpan dengan jam 23:59:00.
Validasi: wajib; tanggal valid; tidak boleh sebelum hari ini; tidak boleh sebelum `pickup_date`. Diblokir jika status loan = `kembali`.

### 8.5 Input manual di BarcodeScannerModal
Field: text placeholder "Contoh: UIT-2026-0001" + tombol "Cari" (otomatis uppercase).

### 8.6 Form legacy (tidak terjangkau) `/dashboard/new`
9 field + 1 item select single + upload foto (tanpa kamera).

---

## 9. SEMUA TABEL / LIST

### 9.1 Tabel database Supabase (faktual dari kode)
**`loans`** — kolom yang digunakan kode:
`id`, `kode_unik`, `nama`, `tanggal_lahir`, `prodi`, `jurusan`, `semester`, `nama_barang` (referensi item pertama, legacy), `nomor_whatsapp`, `email`, `pickup_date`, `deadline`, `foto_peminjam_url`, `foto_barang_url`, `tanggal_pinjam`, `tanggal_kembali`, `status`, `item_id`, `quantity`, `foto_barang_url`, `reminder_h2_sent_at`, `reminder_deadline_sent_at`, `created_at`, `updated_at`.

**`loan_items`** (junction detail):
`id`, `loan_id`, `item_id`, `quantity`, `foto_barang_url`, `created_at`. Relasi ke `items`; `ON DELETE CASCADE` dari `loans` (disebut di kode).

**`items`**:
`id`, `kode_barang`, `nama_barang`, `deskripsi`, `kategori`, `stok_total`, `stok_tersedia`, `foto_url`, `barcode`, `qr_code`, `created_at`, `updated_at`.

> `lib/supabase/types.ts` hanya mendefinisikan tipe `loans` (tipe `items`/`loan_items` didefinisikan inline di `lib/items.ts` & `lib/loans.ts`).

### 9.2 Tabel UI (grid data)
| Tabel | Halaman | Kolom |
|---|---|---|
| Daftar peminjaman (desktop, `brut-table`) | `/admin/loans` | Kode · Peminjam (foto+nama+prodi+semester) · Barang (maks 2 baris + "+N barang lagi" + "Total: N unit (M jenis)") · Tanggal Pinjam · Deadline · Durasi · Status · Aksi |
| — versi mobile | `/admin/loans` | berubah jadi kartu (bukan tabel) |
| Legacy daftar peminjaman | `/dashboard/loans` (tidak terjangkau) | Kode · Peminjam · Barang · Tanggal Pinjam · Durasi · Status · Aksi |

### 9.3 Tampilan list/grid non-tabel
- Grid kartu katalog publik (`/`, 1–4 kolom).
- Grid riwayat publik (`/`, 1–3 kolom, `LoanCard`).
- Grid kartu admin barang `/admin/items` (1–4 kolom).
- List "Peminjaman Terbaru" (baris) & "Terlambat" (baris) di dashboard admin.
- List "Barang Sedang Dipinjam" di `/admin/return`.

**Tidak ada pagination** di halaman mana pun (semua data dimuat penuh). **Tidak ada chart/grafik** yang dirender (dependency `recharts` & komponen `components/ui/chart.tsx` ada, tetapi tidak dipakai halaman mana pun).

---

## 10. SEMUA FILTER / SEARCH

| Halaman | Search | Field yang dicari | Filter lain |
|---|---|---|---|
| `/` tab **Katalog** | "Cari barang, kode, atau kategori..." | `nama_barang`, `kode_barang`, `deskripsi`, `kategori` (client-side, substring, case-insensitive) | Select **Kategori** ("Semua Kategori" + daftar kategori unik dari data) |
| `/` tab **Riwayat** | "Cari kode peminjaman, nama, atau barang..." | `kode_unik`, `nama`, `nama_barang` | Tombol segmented status: **Semua / Dipinjam / Kembali** |
| `/admin/loans` | "Cari kode, nama, atau barang..." | `kode_unik`, `nama`, `nama_barang` | Tombol segmented status: **Semua / Dipinjam / Kembali** + tombol **Refresh** (icon, spinner saat load) + teks "Menampilkan X dari Y data" |
| `/admin/items` | "Cari nama barang, kode, atau deskripsi..." | `nama_barang`, `kode_barang`, `deskripsi` | Select **Kategori** (Semua Kategori + 6 kategori statis) dan Select **Stok** (Semua Barang / Tersedia / Stok Habis) + teks "Menampilkan X dari Y barang" |
| `/admin/return` | — | — | Hanya menampilkan loan `status = "dipinjam"`; tombol Refresh |
| `ItemSelect` (dropdown) | "Cari barang..." | `nama_barang`, `kode_barang`, `deskripsi` | Hanya `stok_tersedia > 0`; baris habis disabled |
| Legacy `/dashboard/catalog` | "Cari barang, kode, atau kategori..." | `nama_barang`, `kode_barang`, `deskripsi`, `kategori` | Select ketersediaan (Semua/ Tersedia/ Tidak Tersedia) |
| Legacy `/dashboard/loans` | "Cari berdasarkan kode, nama, atau barang..." | kode/nama/barang | Select status (Semua Status / Sedang Dipinjam / Sudah Dikembalikan) |

---

## 11. SEMUA DASHBOARD

### 11.1 Dashboard Admin (`/admin/dashboard`) — satu-satunya dashboard aktif
- **Header aksi cepat**: "Peminjaman Baru" (`/admin/new`), "Katalog Barang" (`/admin/items`), "Pengembalian" (`/admin/return`).
- **4 kartu statistik**:
  1. *Total Peminjaman* (sub: "Semua waktu")
  2. *Sedang Dipinjam* (sub: "`N` terlambat")
  3. *Dikembalikan* (sub: "Selesai")
  4. *Barang Tersedia* (sub: "`N` total barang")
- **Banner peringatan** (muncul jika ada yang terlambat): "*N Peminjaman Terlambat*" + tombol "Lihat detailnya" → `/admin/return`.
- **Panel "Peminjaman Terbaru"** (8 terbaru): dot status, nama + badge, barang, kode, tanggal + relatif ("3 hari yang lalu"), link "Lihat semua" → `/admin/loans`; empty state + tombol "Tambah sekarang".
- **Panel "Terlambat (N)"** (maks 5): nama barang, peminjam, nomor WhatsApp, "Terlambat {durasi}".
- **Realtime** `postgres_changes` pada tabel `loans` dan `items` → reload.
- Statistik dihitung client-side dari seluruh data (termasuk `getItemsStatistics()`: total/available/borrowed/unavailable).

### 11.2 Homepage publik (`/`) — "dashboard" untuk guest
- 4 `StatsCard`: *Total Peminjaman*, *Sedang Dipinjam*, *Sudah Kembali*, *Hari Ini*.
- Jam + tanggal realtime (update tiap detik, format Indonesia).

### 11.3 Legacy dashboard `/dashboard` (tidak terjangkau)
Header "Dashboard Admin" + dropdown avatar (lihat email, logout) — hanya redirect.

---

## 12. SEMUA MODAL / DIALOG / OVERLAY

| Komponen | File | Tipe | Trigger | Isi / Aksi |
|---|---|---|---|---|
| **LoanDetailModal** | `components/admin/LoanDetailModal.tsx` | Custom fixed modal | Tombol Eye di `/admin/loans` | Header biru + kode; kartu status + durasi **realtime** (tick 1 detik); grid **Foto Peminjam / Foto Barang**; baris info (Nama, Tanggal Lahir, Prodi, Jurusan, Semester, setiap barang ×qty, Tanggal Pinjam, Deadline, Tanggal Kembali); QR menuju `/detail/[kode]`; tombol "Print QR Code" (tab baru) & "Tutup" |
| **DeleteConfirmModal** | `components/admin/DeleteConfirmModal.tsx` | Custom fixed modal | Tombol Hapus | Ikon tempat sampah, "Hapus Data?", peringatan permanen + kode; Batal / Hapus (spinner "Menghapus...") |
| **ReturnConfirmModal** | `components/admin/ReturnConfirmModal.tsx` | Custom fixed modal | Tombol Kembalikan (daftar) | Ringkasan nama/barang/kode; keterangan status & tanggal kembali otomatis; Batal / Konfirmasi (spinner) |
| **Dialog Edit Deadline** | inline di `app/admin/loans/page.tsx` | shadcn `Dialog` | Tombol pensil | Field date + Batal/Simpan (spinner) |
| **Dialog Tambah Barang** | `components/admin/ItemsCatalog.tsx` | shadcn `Dialog` (max-w-2xl, scroll) | "Tambah Barang" | Form §8.3 |
| **Dialog Edit Barang** | idem | shadcn `Dialog` | Tombol Edit per kartu | Form §8.3 (kode disabled) |
| **AlertDialog Hapus Barang** | idem | shadcn `AlertDialog` | Tombol Hapus per kartu | "Hapus Barang?" + nama; Batal / Hapus |
| **Modal Konfirmasi Pengembalian** | inline `ReturnBarangModal.tsx` | Custom fixed modal | Tombol "Kembalikan" | Foto barang, Barang, Peminjam, WhatsApp, "Dipinjam {relatif}", Deadline, badge Terlambat, panel "Status: Siap Dikembalikan"; Batal / Kembalikan |
| **BarcodeScannerModal** | `components/public/BarcodeScannerModal.tsx` | Full-screen overlay | Tombol "Scan QR Code" (homepage & `/admin/return`) | Viewfinder + garis scan animasi; state: memulai kamera / scanning / error (+ "Coba Lagi"); divider "atau input manual" + input + "Cari"; ekstrak kode via regex `UIT-\d{4}-\d{4}` atau `LAB-\d{4}-\d{4}` |
| **CameraCapture** | `components/admin/CameraCapture.tsx` | Full-screen overlay | Tombol "Ambil Foto" (form admin) | Preview video 4:3, toggle kamera depan/belakang (mirrored), tombol shutter, state hasil: "Ulangi" / "Gunakan Foto"; pesan error izin/kamera |
| **Image Lightbox** | inline `app/page.tsx` | Full-screen overlay | Klik foto barang di katalog publik | Zoom gambar, tombol X, tutup via ESC / klik overlay |
| **Toaster/Toast** | `hooks/use-toast.ts` + root `Toaster` | Toast | Sukses/error/validasi di seluruh halaman | Varian `default` & `destructive` |
| **Banner Inaktivitas** | inline `components/admin/AdminHeader.tsx` | Fixed banner atas | Sisa waktu < 5 menit | "Sesi akan berakhir dalam m:ss…" + tombol Logout |

Tidak ada `window.confirm` di halaman aktif (hanya di halaman legacy `/dashboard/loans`).

---

## 13. SEMUA AUTHENTICATION

- **Metode**: Supabase Auth **email + password** (`supabase.auth.signInWithPassword`) — `lib/auth.ts`.
- **Halaman**: `/login` saja. **Tidak ada** register, reset password, OTP, atau sosial login.
- **Session**: browser client `@supabase/ssr` (`lib/supabase/client.ts`); middleware membuat server client untuk cek `supabase.auth.getUser()` pada setiap request yang match.
- **`AuthContext`** (`contexts/AuthContext.tsx`, dibungkus di root layout):
  - `getSession()` awal + listener `onAuthStateChange`.
  - **Auto-logout inaktivitas**: timeout **60 menit**, peringatan mulai **5 menit** sebelumnya; event yang dihitung: `mousedown`, `mousemove`, `keydown`, `scroll`, `touchstart`, `click`; cek tiap 1 detik.
  - Saat habis → `signOut()` → redirect `/login?timeout=true`.
  - **Fakta:** halaman `/login` **tidak membaca** query `?timeout=true` (tidak ada UI khusus "sesi berakhir").
  - `signOut()` manual → redirect `/login`.
- **Feedback loading auth**: `app/admin/layout.tsx` menampilkan "Memverifikasi akses..." dan me-redirect ke `/login` jika tidak ada user (lapisan kedua setelah middleware).

---

## 14. SEMUA AUTHORIZATION

- **`middleware.ts`** (matcher `['/admin/:path*', '/login']`):
  1. `/admin/*` tanpa user → redirect `/login`.
  2. Sudah login + akses `/login` → redirect `/admin/dashboard`.
- **`app/admin/layout.tsx`**: guard client-side kedua (redirect + loading state).
- **`app/dashboard/layout.tsx`**: seluruh `/dashboard/*` → redirect `/admin/dashboard` (legacy).
- **Tidak ada**: pembagian permission antar admin, role-based access, pengecekan resource-per-user, atau proteksi API (`/api/loan-confirmation` & `/api/reminder` **tanpa autentikasi**).
- Route publik yang mengekspos data PII tanpa login: `/`, `/detail/[kode]`, `/admin/print/*` (terproteksi middleware).

---

## 15. SEMUA INTEGRASI SUPABASE

### Auth
- `supabase.auth.signInWithPassword`, `getSession`, `getUser`, `onAuthStateChange`, `signOut`.

### Database (tabel)
- `loans`, `loan_items`, `items` — lihat §9.1.

### Storage (bucket)
| Bucket | Dipakai untuk | Path |
|---|---|---|
| `items` | Foto barang | `items/{kode}-{timestamp}-{random}.{ext}` |
| `loans` | Foto peminjam & foto barang peminjaman | `loans/peminjam/{kode}-{ts}.{ext}`, `loans/barang/{kode}-{kodeBarang}-{ts}.{ext}` |

Operasi: `upload` (cacheControl 3600, upsert false), `getPublicUrl`, `remove` (delete saat hapus barang/peminjaman — `deleteItemPhoto`, `deleteLoanWithFiles`).

### Realtime (`postgres_changes`)
| Halaman | Channel / tabel | Efek |
|---|---|---|
| `/` | `public-loans-realtime`, tabel `loans` (event `*`) | reload loans + katalog |
| `/admin/dashboard` | `admin-dashboard`, `loans` + `items` | reload semua data |
| `/admin/loans` | `admin-loans`, `loans` | reload daftar |
| `/admin/items` (via `useRealtimeListener`) | `items` | reload katalog |
| `/admin/return` (via `useRealtimeListener`) | `loans` | reload daftar aktif |
| `/detail/[kode]` | channel per-id, event `UPDATE`, filter `id=eq.…` | update status loan live |

`hooks/use-realtime.ts` menyediakan `useRealtimeSubscription`, `useRealtimeData`, `useRealtimeListener` — **yang dipakai aktif hanya `useRealtimeListener`** (dua lainnya tidak dipanggil halaman mana pun).

### Environment (kunci yang terbaca kode)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, (`SUPABASE_SERVICE_ROLE_KEY` opsional untuk `/api/reminder`).

---

## 16. SEMUA API / SERVER ACTION

**Tidak ada Server Action Next.js.** Semua baca/tulis data dilakukan **dari browser** memakai Supabase JS client dengan anon key.

### 16.1 `POST /api/loan-confirmation` (`app/api/loan-confirmation/route.ts`)
- Payload: `{ type: "confirmation" | "return", email, nama, kode_unik, deadline, items: [{nama_barang, quantity}] }` (field `type` default `confirmation` bila tidak dikirim).
- Kirim email via **Resend**; subyek:
  - `Konfirmasi Peminjaman - {kode}` / `Konfirmasi Pengembalian - {kode}`.
- Konten HTML: judul, sapaan, kartu detail (kode + deadline), tabel barang+qty, **QR Code** (URL eksternal `api.qrserver.com` berisi kode_unik), tombol "Hubungi Admin" (`mailto:`), versi plain-text fallback.
- Dipanggil dari: `/admin/new` (konfirmasi), `/admin/loans` (return), `/admin/return` (return), legacy `/dashboard/new`.
- Respons: `503` jika `RESEND_API_KEY` kosong; `400` payload tidak lengkap; `500` gagal kirim.
- Kegagalan email **tidak menggagalkan** operasi bisnis (hanya `console.warn`).

### 16.2 `GET /api/reminder` (`app/api/reminder/route.ts`)
- Dijadwalkan **cron harian `0 0 * * *`** via `vercel.json`.
- Dua siklus, keduanya hanya untuk `status = "dipinjam"` dan kolom pengirim masih `NULL` (idempoten):
  1. **H-2**: deadline jatuh pada tanggal (hari ini + 2) dalam timezone **Asia/Jakarta** → email "⏰ Pengingat H-2: Pengembalian Barang" (sisa hari, kartu kuning, QR, tombol Hubungi Admin) → tandai `reminder_h2_sent_at`.
  2. **Hari deadline**: deadline jatuh pada tanggal hari ini (Jakarta) → email "🚨 HARI DEADLINE: Segera Kembalikan Barang!" (kartu merah, QR, tombol "HUBUNGI ADMIN SEKARANG") → tandai `reminder_deadline_sent_at`.
- Loan tanpa `email` dilewati (dicatat sebagai skipped).
- Respons JSON: `summary { h2: {found,sent,skipped}, deadline: {...}, totalSent }` + `details`.

---

## 17. FITUR ADMIN (checklist per halaman)

### `/admin/dashboard`
Ringkasan statistik, banner terlambat, 8 peminjaman terbaru, panel terlambat (5), aksi cepat, realtime. → §11.1

### `/admin/new`
Form peminjaman multi-item + keranjang + stok validation + foto kamera/upload + email konfirmasi + redirect. → §5, §8.2

### `/admin/loans`
- Toolbar: search, filter status (Semua/Dipinjam/Kembali), refresh.
- Desktop: tabel 8 kolom; Mobile: kartu.
- Aksi per baris: **Detail** (Eye), **Print QR** (tab baru ke `/admin/print/{kode}`), **Edit Deadline** (Pencil; disabled bila `kembali`), **Kembalikan** (hanya bila `dipinjam`), **Hapus** (selalu; diblokir saat `dipinjam` dengan toast "Barang masih dipinjam…").
- Kolom Deadline berwarna merah tebal bila terlambat.
- Durasi pinjam dihitung live (`tanggal_pinjam` → `tanggal_kembali`/now).
- Realtime reload.

### `/admin/items` (`ItemsCatalog`)
Header + tombol "Tambah Barang"; panel search + 2 filter; grid kartu (foto/placeholder, kode, nama, deskripsi 2 baris, badge kategori, badge stok, barcode); aksi Edit & Hapus per kartu; AlertDialog hapus; realtime; count "Menampilkan X dari Y".

### `/admin/return` (`ReturnBarangModal`)
Header + tombol "Scan QR Code"; list loan aktif (nama barang, badge "Terlambat", peminjam, WA, kode, lama pinjam, tombol "Kembalikan"); modal konfirmasi; scan → proses otomatis; refresh manual; empty state "Semua barang sudah dikembalikan"; realtime.

### `/admin/print/[kode]`
- Tombol "Cetak / Print" (`window.print()`, disembunyikan saat print).
- Layout A4: header biru + logo + QR (canvas library `qrcode`, isi URL `/detail/{kode}`), judul "BUKTI PEMINJAMAN BARANG LABORATORIUM", blok kode besar, kolom **Data Peminjam** (nama, tgl lahir, prodi, jurusan, semester, foto) & **Data Barang** (nama barang, tanggal pinjam, status, tgl kembali, foto), catatan biru, blok tanda tangan (Peminjam / Admin Laboratorium), stempel waktu cetak.
- `@media print` inline: A4 portrait margin 5mm, sembunyikan elemen `.no-print`.

### Chrome admin (layout)
- **Sidebar** (off-canvas di mobile): logo "Unimus UIT / Admin Panel", menu: Dashboard, Peminjaman Baru, Daftar Peminjaman, Katalog Barang, Pengembalian; divider; "Lihat Halaman Publik" (tab baru); kartu user (huruf inisial + email + label "Admin") + tombol **Logout**.
- **Header**: judul + deskripsi per halaman (map pathname), tombol hamburger (mobile), tanggal/jam Indonesia, indikator hijau berdenyut "Sistem online", serta banner inaktivitas.

---

## 18. FITUR USER / PUBLIK (checklist)

### `/` (Homepage)
1. **Header sticky**: logo, "Unimus Inventrack", tagline "Sistem Peminjaman Laboratorium", jam + tanggal realtime, tombol "Admin" → `/login`.
2. **Hero**: kicker "Universitas Muhammadiyah Semarang", judul "Sistem Peminjaman / Barang Laboratorium", tombol besar **"Scan QR Code"** → `BarcodeScannerModal` → hasil scan redirect `window.location.href = /detail/{kode}`.
3. **4 statistik**: Total Peminjaman, Sedang Dipinjam, Sudah Kembali, Hari Ini.
4. **Tab** (segmented, dengan count badge): **Katalog Barang** / **Riwayat Peminjaman**.
5. **Tab Katalog**: search + select kategori; grid kartu (foto dengan hover "Lihat Gambar" + lightbox, badge "`n` tersedia" hijau/merah, nama, kode, badge kategori, bar progres ketersediaan "Sisa: X dari Y"); skeleton loading; empty state; footer "Menampilkan X dari Y barang". Data = hanya `stok_tersedia > 0`.
6. **Tab Riwayat**: search + tombol status; grid `LoanCard` (kartu klik-able ke `/detail/{kode}`, bar status atas, badge Dipinjam/Dikembalikan, kode, foto peminjam, nama + prodi/semester, box barang ± foto + qty, waktu pinjam + durasi live); empty state; footer count.
7. **Realtime** pada `loans`; **Lightbox** foto; **Scanner**.

### `/detail/[kode]` (tracking publik)
- Loading spinner; **empty state** "Data Tidak Ditemukan" + tombol Kembali.
- Header sticky dengan tombol "Kembali".
- Badge status (Dipinjam biru / Sudah Dikembalikan hijau) + nama + kode.
- Grid **Foto Peminjam / Foto Barang**.
- Kartu **Lama Peminjaman (Realtime)** — angka durasi update tiap detik saat masih dipinjam + titik berdenyut.
- **Detail Peminjaman** (baris ikon): Nama Peminjam, Program Studi, Jurusan, Semester, Tanggal Pinjam, Deadline, (Tanggal Kembali bila ada).
- **Barang yang Dipinjam (N item)**: foto kecil, nama, kode, badge Qty, badge kategori; fallback single-item legacy.
- **QR Code Peminjaman** (canvas, isi `/detail/{kode}`) + kode.

### Komponen pendukung publik
- `LoanCard`, `StatsCard`, `QRCodeDisplay`, `BarcodeScannerModal` (lihat §12).

---

## 19. INVENTARIS STATUS/FEEDBACK UI (untuk konsistensi redesign)

**Toast** (`useToast`): varian sukses & `destructive`, dipakai untuk: validasi form, stok tidak cukup, sukses create/update/delete/return, error load/save, "Tidak Bisa Dihapus", "Deadline diperbarui", "Tidak Dapat Diedit", "Sudah Dikembalikan", "Peminjaman Tidak Ditemukan".

**Empty state** tersedia di: katalog publik, riwayat publik, daftar admin loans, katalog admin, list pengembalian, recent loans dashboard, panel terlambat, `/detail` not-found, print not-found.

**Loading state**: spinner `Loader2`, skeleton kartu (publik), "Memverifikasi akses...", "Memuat data...".

**Durasi/relatif time** (locale `id`): `formatDistance`, `formatDistanceToNow`, `format` dd MMM yyyy HH:mm.

---

## 20. YANG TIDAK ADA (faktual — untuk mencegah asumsi desain)

Fitur-folowing **tidak ditemukan** di source code:
- Register / lupa password / profil user.
- Role/permission terpisah (semua login = admin).
- Portal self-service peminjam (peminjam hanya menerima email).
- Persetujuan/approval peminjaman, perpanjangan resmi, denda.
- Notifikasi WhatsApp (nomor WA hanya disimpan/ditampilkan).
- Export PDF/Excel, laporan cetak selain bukti peminjaman.
- Pagination, sorting interaktif, pencarian tergabung lintas entitas.
- Grafik/chart (dependency terpasang, tidak digunakan).
- Status `selesai` yang pernah di-set.
- Proteksi autentikasi pada route API.
- Membaca flag `?timeout=true` di halaman login.

---

## 21. RINGKASAN PEMETAAN UNTUK REDESIGN (Google Stitch)

**Layar yang perlu didesain ulang (aktif):**
1. Login (desktop split-panel + mobile).
2. Beranda Publik — 2 tab (Katalog, Riwayat) + hero scan + statistik.
3. Halaman Detail Peminjaman publik (tracking).
4. Admin Dashboard.
5. Admin — Form Peminjaman Baru (multi-item + kamera).
6. Admin — Daftar Peminjaman (tabel desktop / kartu mobile) + aksi.
7. Admin — Katalog Barang (grid + dialog CRUD).
8. Admin — Pengembalian (list + scan + konfirmasi).
9. Halaman Cetak Bukti (A4).
10. Overlay global: scanner QR, kamera, lightbox, modal detail/konfirmasi/hapus, toast, banner sesi.

**State yang harus didesain:** loading, empty, error, skeleton, badge status (`dipinjam`/`kembali`/`selesai`), badge terlambat, badge stok habis, disabled actions, in-progress/spinner, peringatan sesi.

**Entitas inti:** `Loan` (peminjaman), `LoanItem` (detail barang), `Item` (barang), `User admin`, `Email notifikasi`.
