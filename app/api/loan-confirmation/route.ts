import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildQrHtmlBlock } from "@/lib/email-qr";

export const dynamic = "force-dynamic";
const resendFrom = process.env.RESEND_FROM_EMAIL ?? "reminder@resend.dev";

function createResendClient() {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return null;
  }
  return new Resend(resendApiKey);
}

type LoanNotificationPayload = {
  type: "confirmation" | "return";
  email: string;
  nama: string;
  kode_unik: string;
  deadline: string;
  items: Array<{ nama_barang: string; quantity: number }>;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function buildConfirmationHtml(
  payload: LoanNotificationPayload,
): Promise<string> {
  const itemRows = payload.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0; border-bottom:1px solid #e2e8f0;">${item.nama_barang}</td><td style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-align:right;">${item.quantity}</td></tr>`,
    )
    .join("");

  // Generate QR — fail-safe: jika gagal, qrBlock = ""
  const qrBlock = await buildQrHtmlBlock(payload.kode_unik, {
    size: 160,
    borderColor: "#bfdbfe",
    bgColor: "#eff6ff",
  });

  return `
    <html>
      <body style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f6f8fb; margin:0; padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px; margin:0 auto; padding:24px; background:#ffffff; border-radius:20px; box-shadow:0 20px 60px rgba(0,0,0,.08);">
          <tr>
            <td style="padding-bottom:24px; text-align:center;">
              <h1 style="margin:0; font-size:26px; color:#0f172a;">Konfirmasi Peminjaman Barang</h1>
              <p style="margin:8px 0 0; color:#475569; font-size:15px; line-height:1.6;">Halo ${payload.nama}, peminjaman Anda telah tercatat. Simpan informasi ini untuk referensi pengembalian.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0;">
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:20px;">
                <p style="margin:0 0 12px; color:#334155; font-size:14px; font-weight:600;">Detail Peminjaman</p>
                <p style="margin:0; color:#475569; font-size:14px;"><strong>Kode Peminjaman:</strong> ${payload.kode_unik}</p>
                <p style="margin:8px 0 0; color:#475569; font-size:14px;"><strong>Deadline Pengembalian:</strong> ${formatDateTime(payload.deadline)}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:16px;">
                <thead>
                  <tr>
                    <th style="text-align:left; padding-bottom:12px; color:#334155; font-size:13px; text-transform:uppercase; letter-spacing:.03em;">Barang</th>
                    <th style="text-align:right; padding-bottom:12px; color:#334155; font-size:13px; text-transform:uppercase; letter-spacing:.03em;">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </td>
          </tr>
          ${qrBlock}
          <tr>
            <td>
              <p style="color:#334155; font-size:15px; line-height:1.75;">Jika Anda membutuhkan bantuan lebih lanjut, silakan balas email ini atau hubungi admin laboratorium.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 0; text-align:center;">
              <a href="mailto:${payload.email}" style="background:#2563eb; color:#ffffff; text-decoration:none; padding:14px 24px; border-radius:12px; display:inline-block; font-weight:600;">Hubungi Admin</a>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

async function buildReturnHtml(
  payload: LoanNotificationPayload,
): Promise<string> {
  const itemRows = payload.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0; border-bottom:1px solid #e2e8f0;">${item.nama_barang}</td><td style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-align:right;">${item.quantity}</td></tr>`,
    )
    .join("");

  // Generate QR — fail-safe: jika gagal, qrBlock = ""
  const qrBlock = await buildQrHtmlBlock(payload.kode_unik, {
    size: 160,
    borderColor: "#bbf7d0",
    bgColor: "#f0fdf4",
  });

  return `
    <html>
      <body style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f6f8fb; margin:0; padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px; margin:0 auto; padding:24px; background:#ffffff; border-radius:20px; box-shadow:0 20px 60px rgba(0,0,0,.08);">
          <tr>
            <td style="padding-bottom:24px; text-align:center;">
              <h1 style="margin:0; font-size:26px; color:#0f172a;">Konfirmasi Pengembalian Barang</h1>
              <p style="margin:8px 0 0; color:#475569; font-size:15px; line-height:1.6;">Halo ${payload.nama}, pengembalian Anda telah berhasil dicatat. Terima kasih telah mengembalikan barang.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0;">
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:20px;">
                <p style="margin:0 0 12px; color:#334155; font-size:14px; font-weight:600;">Detail Pengembalian</p>
                <p style="margin:0; color:#475569; font-size:14px;"><strong>Kode Peminjaman:</strong> ${payload.kode_unik}</p>
                <p style="margin:8px 0 0; color:#475569; font-size:14px;"><strong>Deadline Pengembalian:</strong> ${formatDateTime(payload.deadline)}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:16px;">
                <thead>
                  <tr>
                    <th style="text-align:left; padding-bottom:12px; color:#334155; font-size:13px; text-transform:uppercase; letter-spacing:.03em;">Barang</th>
                    <th style="text-align:right; padding-bottom:12px; color:#334155; font-size:13px; text-transform:uppercase; letter-spacing:.03em;">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </td>
          </tr>
          ${qrBlock}
          <tr>
            <td>
              <p style="color:#334155; font-size:15px; line-height:1.75;">Jika butuh bantuan lanjutan, silakan balas email ini atau hubungi admin laboratorium.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 0; text-align:center;">
              <a href="mailto:${payload.email}" style="background:#2563eb; color:#ffffff; text-decoration:none; padding:14px 24px; border-radius:12px; display:inline-block; font-weight:600;">Hubungi Admin</a>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function buildConfirmationText(payload: LoanNotificationPayload) {
  const itemsText = payload.items
    .map((item) => `- ${item.nama_barang} x${item.quantity}`)
    .join("\n");

  return `Konfirmasi Peminjaman Barang\n\nKode Peminjaman: ${payload.kode_unik}\nNama: ${payload.nama}\nDeadline Pengembalian: ${formatDateTime(payload.deadline)}\n\nBarang yang dipinjam:\n${itemsText}\n\nTerima kasih telah menggunakan fasilitas laboratorium.`;
}

function buildReturnText(payload: LoanNotificationPayload) {
  const itemsText = payload.items
    .map((item) => `- ${item.nama_barang} x${item.quantity}`)
    .join("\n");

  return `Konfirmasi Pengembalian Barang\n\nKode Peminjaman: ${payload.kode_unik}\nNama: ${payload.nama}\nDeadline Pengembalian: ${formatDateTime(payload.deadline)}\n\nBarang yang dikembalikan:\n${itemsText}\n\nTerima kasih telah mengembalikan barang.`;
}

export async function POST(request: Request) {
  const resend = createResendClient();

  if (!resend) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is required to send loan confirmation email." },
      { status: 503 },
    );
  }

  const payload = (await request.json()) as LoanNotificationPayload;

  if (
    !payload.email ||
    !payload.nama ||
    !payload.kode_unik ||
    !payload.deadline
  ) {
    return NextResponse.json(
      { error: "Payload tidak lengkap." },
      { status: 400 },
    );
  }

  const isReturn = payload.type === "return";

  // Build HTML (async karena generate QR)
  const html = isReturn
    ? await buildReturnHtml(payload)
    : await buildConfirmationHtml(payload);

  const text = isReturn
    ? buildReturnText(payload)
    : buildConfirmationText(payload);

  const subject = isReturn
    ? `Konfirmasi Pengembalian - ${payload.kode_unik}`
    : `Konfirmasi Peminjaman - ${payload.kode_unik}`;

  try {
    await resend.emails.send({
      from: resendFrom,
      to: payload.email,
      subject,
      html,
      text,
    });
    console.log(
      `[loan-confirmation] Email ${isReturn ? "return" : "confirmation"} terkirim ke ${payload.email} (${payload.kode_unik})`,
    );
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(
      `[loan-confirmation] Gagal kirim email untuk ${payload.kode_unik}:`,
      error?.message,
    );
    return NextResponse.json(
      { error: error?.message ?? "Gagal mengirim email." },
      { status: 500 },
    );
  }
}
