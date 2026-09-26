/**
 * email-qr.ts
 *
 * Server-side utility untuk menyisipkan QR Code di email.
 *
 * PENDEKATAN: External URL via api.qrserver.com
 * ─────────────────────────────────────────────
 * ❌ Base64 data URL (data:image/png;base64,...) → DIBLOKIR oleh Gmail, Outlook,
 *    Apple Mail, dan hampir semua email client modern karena alasan keamanan.
 *
 * ✅ External URL (<img src="https://api.qrserver.com/...">)
 *    → Dirender normal seperti gambar biasa di semua email client.
 *    → Tidak perlu library qrcode, tidak perlu async, tidak ada overhead CPU.
 *    → api.qrserver.com: free, stable, widely used, HTTPS, no auth required.
 *
 * QR Content:
 * - Berisi kode_unik peminjaman (misal: "UIT-2026-0001")
 * - Admin scan → dapat kode untuk verifikasi di sistem
 *
 * ⚠️ Email client me-load gambar saat email dibuka (normal behaviour).
 *    Jika penerima memblokir load gambar eksternal, QR tidak tampil —
 *    tapi kode_unik tetap ada sebagai teks di bawah gambar.
 */

/**
 * Generate URL gambar QR Code via api.qrserver.com
 *
 * @param kodeUnik  - Kode peminjaman, misal "UIT-2026-0001"
 * @param size      - Ukuran gambar dalam pixel (default 160)
 * @returns HTTPS URL yang menghasilkan gambar PNG QR Code
 */
export function buildQrImageUrl(kodeUnik: string, size = 160): string {
  const data = encodeURIComponent(kodeUnik.trim());
  // ecc=M  → Medium error correction (balance ukuran & robustness)
  // margin=1 → Quiet zone minimal agar QR tidak terlalu kecil
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${data}&ecc=M&margin=1`;
}

/**
 * Build HTML block untuk QR Code yang disisipkan di email.
 * Fungsi ini tetap async untuk kompatibilitas dengan caller yang sudah ada.
 *
 * @param kodeUnik - Kode peminjaman
 * @param options  - Opsi tampilan
 * @returns HTML string <tr>...</tr> siap disisipkan ke template email,
 *          atau string kosong jika kodeUnik tidak valid
 */
export async function buildQrHtmlBlock(
  kodeUnik: string,
  options?: {
    /** Ukuran QR dalam pixel, default 160 */
    size?: number;
    /** Tampilkan label kode di bawah QR, default true */
    showLabel?: boolean;
    /** Warna border card QR */
    borderColor?: string;
    /** Warna background card QR */
    bgColor?: string;
  },
): Promise<string> {
  if (!kodeUnik || typeof kodeUnik !== "string" || kodeUnik.trim() === "") {
    console.warn("[QR] kodeUnik tidak valid, skip QR block");
    return "";
  }

  const size = options?.size ?? 160;
  const showLabel = options?.showLabel ?? true;
  const borderColor = options?.borderColor ?? "#e2e8f0";
  const bgColor = options?.bgColor ?? "#f8fafc";

  const qrUrl = buildQrImageUrl(kodeUnik, size);

  const labelHtml = showLabel
    ? `<p style="margin:8px 0 0; color:#64748b; font-size:12px; font-family:monospace; letter-spacing:0.05em;">${kodeUnik}</p>
       <p style="margin:4px 0 0; color:#94a3b8; font-size:11px;">Scan untuk verifikasi</p>`
    : "";

  return `
    <tr>
      <td style="padding:16px 0; text-align:center;">
        <div style="display:inline-block; background:${bgColor}; border:1px solid ${borderColor}; border-radius:12px; padding:16px 20px;">
          <p style="margin:0 0 10px; color:#334155; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">QR Code Peminjaman</p>
          <img
            src="${qrUrl}"
            alt="QR Code ${kodeUnik}"
            width="${size}"
            height="${size}"
            style="display:block; margin:0 auto; border-radius:4px;"
          />
          ${labelHtml}
        </div>
      </td>
    </tr>
  `;
}
