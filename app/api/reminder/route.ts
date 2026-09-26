import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildQrHtmlBlock } from "@/lib/email-qr";

export const dynamic = "force-dynamic";
const resendFrom = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

function createResendClient() {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return null;
  }
  return new Resend(resendApiKey);
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
type ReminderLoan = {
  id: string;
  kode_unik: string;
  nama: string;
  email: string | null;
  nomor_whatsapp: string;
  deadline: string; // ISO timestamp dengan jam 23:59:00
  reminder_h2_sent_at: string | null;
  reminder_deadline_sent_at: string | null;
};

type ReminderResult = {
  id: string;
  type: "h2" | "deadline";
  email: string;
  kode_unik: string;
  sentAt: string;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format waktu menjadi format lokal Indonesia
 * @param value ISO timestamp string
 * @returns String format: "15 Mei 2026 23:59"
 */
function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Hitung jumlah jam dari sekarang hingga deadline
 */
function getHoursUntilDeadline(deadline: string): number {
  const now = new Date();
  const deadlineTime = new Date(deadline);
  const diffMs = deadlineTime.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

/**
 * ⏱️ TIMEZONE HELPER: Format tanggal dalam format YYYY-MM-DD
 * menggunakan timezone Asia/Jakarta (WIB/UTC+7)
 *
 * Alasan: Database deadline disimpan dalam TIMESTAMPTZ dengan jam 23:59:00.
 * Untuk membandingkan hanya berdasarkan tanggal (bukan exact jam), kita perlu
 * mengekstrak tanggal dalam timezone Jakarta saja.
 *
 * @param date - JavaScript Date object
 * @returns String format YYYY-MM-DD dalam timezone Asia/Jakarta
 */
function formatDateInJakarta(date: Date): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * 🔄 TIMEZONE HELPER: Konversi tanggal YYYY-MM-DD ke range UTC untuk query database
 *
 * Database menyimpan deadline sebagai TIMESTAMPTZ. Ketika kita ingin mencocokkan
 * berdasarkan DATE (bukan exact timestamp), kita perlu:
 * 1. Konversi tanggal target menjadi waktu di timezone Jakarta (+07:00)
 * 2. Buat range [00:00:00+07:00 hingga 23:59:59+07:00]
 * 3. Konversi range tersebut ke UTC untuk perbandingan dengan database
 *
 * Contoh:
 * - Input: "2026-05-20" (hari H-2 dalam timezone Jakarta)
 * - Output: {
 *     start: "2026-05-19T17:00:00.000Z" (2026-05-20 00:00:00+07:00 dalam UTC)
 *     end:   "2026-05-20T16:59:59.000Z" (2026-05-20 23:59:59+07:00 dalam UTC)
 *   }
 *
 * @param dateStr - Format YYYY-MM-DD dalam timezone Jakarta
 * @returns { start, end } - ISO timestamp strings dalam UTC untuk query
 */
function getDateRangeInUTC(dateStr: string): { start: string; end: string } {
  // PENTING: Timestamp string dibuat dengan +07:00 timezone offset
  // Ini memastikan "2026-05-20T00:00:00+07:00" diinterpretasi sebagai
  // pukul 00:00 di Jakarta, bukan 00:00 UTC
  const startJakarta = new Date(`${dateStr}T00:00:00+07:00`);
  const endJakarta = new Date(`${dateStr}T23:59:59+07:00`);

  // toISOString() otomatis konversi ke UTC
  return {
    start: startJakarta.toISOString(),
    end: endJakarta.toISOString(),
  };
}

// ============================================================================
// EMAIL BUILDERS
// ============================================================================

/**
 * Build HTML untuk reminder H-2 (2 hari sebelum deadline)
 */
async function buildReminderH2Html(loan: ReminderLoan): Promise<string> {
  const hoursLeft = getHoursUntilDeadline(loan.deadline);
  const daysLeft = Math.ceil(hoursLeft / 24);

  // Generate QR — fail-safe: jika gagal, qrBlock = ""
  const qrBlock = await buildQrHtmlBlock(loan.kode_unik, {
    size: 160,
    borderColor: "#fcd34d",
    bgColor: "#fffbeb",
  });

  return `
    <html>
      <body style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f6f8fb; margin:0; padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px; margin:0 auto; padding:24px; background:#ffffff; border-radius:20px; box-shadow:0 20px 60px rgba(0,0,0,.08);">
          <tr>
            <td style="padding-bottom:24px; text-align:center;">
              <h1 style="margin:0; font-size:26px; color:#0f172a;">⏰ Pengingat H-2: Pengembalian Barang</h1>
              <p style="margin:8px 0 0; color:#475569; font-size:15px; line-height:1.6;">Halo ${loan.nama}, tinggal <strong>${daysLeft} hari</strong> lagi untuk mengembalikan peminjaman laboratorium Anda.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0;">
              <div style="background:#fef3c7; border:1px solid #fcd34d; border-radius:16px; padding:20px;">
                <p style="margin:0 0 12px; color:#92400e; font-size:14px; font-weight:600;">⏱️ Detail Pengembalian</p>
                <p style="margin:0; color:#b45309; font-size:14px;"><strong>Kode Peminjaman:</strong> ${loan.kode_unik}</p>
                <p style="margin:8px 0 0; color:#b45309; font-size:14px;"><strong>Nama:</strong> ${loan.nama}</p>
                <p style="margin:8px 0 0; color:#b45309; font-size:14px;"><strong>Deadline Pengembalian:</strong> ${formatDateTime(loan.deadline)}</p>
                <p style="margin:8px 0 0; color:#b45309; font-size:14px;"><strong>Sisa Waktu:</strong> ${daysLeft} hari</p>
              </div>
            </td>
          </tr>
          ${qrBlock}
          <tr>
            <td>
              <p style="color:#334155; font-size:15px; line-height:1.75;">
                Mohon persiapkan pengembalian barang Anda. Pastikan semua barang dalam kondisi baik saat dikembalikan. Jika Anda memerlukan perpanjangan atau memiliki kendala, segera hubungi admin laboratorium.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 0; text-align:center;">
              <a href="mailto:support@laboratorium.com" style="background:#f59e0b; color:#ffffff; text-decoration:none; padding:14px 24px; border-radius:12px; display:inline-block; font-weight:600;">Hubungi Admin</a>
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin:0; color:#94a3b8; font-size:13px; line-height:1.6;">Ini adalah pengingat otomatis dari sistem Unimus Inventrack. Jika Anda telah mengembalikan barang, abaikan pesan ini.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * Build HTML untuk reminder hari deadline
 */
async function buildReminderDeadlineHtml(loan: ReminderLoan): Promise<string> {
  // Generate QR — fail-safe: jika gagal, qrBlock = ""
  const qrBlock = await buildQrHtmlBlock(loan.kode_unik, {
    size: 160,
    borderColor: "#fca5a5",
    bgColor: "#fff5f5",
  });

  return `
    <html>
      <body style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f6f8fb; margin:0; padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px; margin:0 auto; padding:24px; background:#ffffff; border-radius:20px; box-shadow:0 20px 60px rgba(0,0,0,.08);">
          <tr>
            <td style="padding-bottom:24px; text-align:center;">
              <h1 style="margin:0; font-size:26px; color:#dc2626;">🚨 HARI DEADLINE: Segera Kembalikan Barang!</h1>
              <p style="margin:8px 0 0; color:#475569; font-size:15px; line-height:1.6;">Halo ${loan.nama}, <strong>HARI INI</strong> adalah deadline pengembalian peminjaman Anda.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0;">
              <div style="background:#fee2e2; border:1px solid #fca5a5; border-radius:16px; padding:20px;">
                <p style="margin:0 0 12px; color:#7f1d1d; font-size:14px; font-weight:600;">⚠️ Informasi Penting</p>
                <p style="margin:0; color:#991b1b; font-size:14px;"><strong>Kode Peminjaman:</strong> ${loan.kode_unik}</p>
                <p style="margin:8px 0 0; color:#991b1b; font-size:14px;"><strong>Nama:</strong> ${loan.nama}</p>
                <p style="margin:8px 0 0; color:#991b1b; font-size:14px;"><strong>Deadline Hari Ini Pukul:</strong> ${formatDateTime(loan.deadline)}</p>
              </div>
            </td>
          </tr>
          ${qrBlock}
          <tr>
            <td>
              <p style="color:#334155; font-size:15px; line-height:1.75;">
                <strong>Mohon segera mengembalikan barang hari ini sebelum deadline.</strong> Pengembalian terlambat dapat berdampak pada status peminjaman Anda di masa depan. 
              </p>
              <p style="color:#334155; font-size:15px; line-height:1.75;">
                Jika ada kendala atau memerlukan perpanjangan, hubungi admin laboratorium <strong>SEKARANG JUGA</strong> sebelum deadline berakhir.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 0; text-align:center;">
              <a href="mailto:support@laboratorium.com" style="background:#dc2626; color:#ffffff; text-decoration:none; padding:14px 24px; border-radius:12px; display:inline-block; font-weight:600;">HUBUNGI ADMIN SEKARANG</a>
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin:0; color:#94a3b8; font-size:13px; line-height:1.6;">Ini adalah pengingat otomatis hari deadline dari sistem Unimus Inventrack. Jika Anda telah mengembalikan barang, abaikan pesan ini.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * Build text version untuk reminder H-2
 */
function buildReminderH2Text(loan: ReminderLoan): string {
  const hoursLeft = getHoursUntilDeadline(loan.deadline);
  const daysLeft = Math.ceil(hoursLeft / 24);

  return `PENGINGAT H-2: PENGEMBALIAN BARANG

Halo ${loan.nama},

Tinggal ${daysLeft} hari lagi untuk mengembalikan peminjaman laboratorium Anda.

DETAIL PENGEMBALIAN:
Kode Peminjaman: ${loan.kode_unik}
Nama: ${loan.nama}
Deadline: ${formatDateTime(loan.deadline)}
Sisa Waktu: ${daysLeft} hari

Mohon persiapkan pengembalian barang Anda. Pastikan semua barang dalam kondisi baik saat dikembalikan.

Jika memerlukan perpanjangan atau bantuan, hubungi admin laboratorium.

---
Ini adalah pengingat otomatis dari Unimus Inventrack.`;
}

/**
 * Build text version untuk reminder deadline
 */
function buildReminderDeadlineText(loan: ReminderLoan): string {
  return `HARI DEADLINE: SEGERA KEMBALIKAN BARANG!

Halo ${loan.nama},

HARI INI adalah deadline pengembalian peminjaman Anda.

INFORMASI PENTING:
Kode Peminjaman: ${loan.kode_unik}
Nama: ${loan.nama}
Deadline Hari Ini Pukul: ${formatDateTime(loan.deadline)}

MOHON SEGERA MENGEMBALIKAN BARANG HARI INI SEBELUM DEADLINE.

Jika ada kendala atau memerlukan perpanjangan, HUBUNGI ADMIN LABORATORIUM SEKARANG JUGA sebelum deadline berakhir.

---
Ini adalah pengingat otomatis hari deadline dari Unimus Inventrack.`;
}

// ============================================================================
// MAIN ENDPOINT HANDLER
// ============================================================================

export async function GET() {
  const supabase = createSupabaseClient();
  const resend = createResendClient();

  if (!supabase || !resend) {
    return NextResponse.json(
      {
        error:
          "RESEND_API_KEY and Supabase configuration are required to run this endpoint.",
      },
      { status: 503 },
    );
  }

  try {
    // ========================================================================
    // 1️⃣ REMINDER H-2 (2 hari sebelum deadline)
    // ========================================================================
    // REFACTORED LOGIC (Date-based, bukan exact timestamp):
    //
    // H-2 = deadline tanggal X, maka H-2 adalah tanggal X-2
    // Contoh:
    //   - Deadline: 16 Mei 2026 23:59 WIB
    //   - H-2 dikirim: 14 Mei 2026 (sepanjang hari)
    //
    // CATATAN TIMEZONE:
    // - Server timezone: UTC
    // - Deadline stored: TIMESTAMPTZ dengan jam 23:59 (WIB)
    // - Perlu extract DATE dalam timezone Asia/Jakarta untuk comparison
    // - Hindari exact 48 hour logic karena tidak stabil dengan timezone & jam 23:59

    const now = new Date();

    // 1. Dapatkan tanggal dalam timezone Jakarta (YYYY-MM-DD)
    const todayJakarta = formatDateInJakarta(now);

    // 2. Hitung H-2 date: hari ini + 2 hari (dalam timezone Jakarta)
    const h2DateInMs = now.getTime() + 2 * 24 * 60 * 60 * 1000;
    const h2Date = formatDateInJakarta(new Date(h2DateInMs));

    // 3. Konversi ke UTC range untuk query database
    // Range: [h2Date 00:00:00+07:00 ... h2Date 23:59:59+07:00] dalam UTC
    const h2Range = getDateRangeInUTC(h2Date);

    console.log(
      `[H-2] Today Jakarta: ${todayJakarta}, H-2 Date: ${h2Date}, UTC Range: ${h2Range.start} to ${h2Range.end}`,
    );

    // 4. Query: deadline antara h2Range.start dan h2Range.end
    // Logika:
    // - gte("deadline", h2Range.start) : deadline >= start of H-2 date in UTC
    // - lte("deadline", h2Range.end)   : deadline <= end of H-2 date in UTC
    // Hasil: semua deadline yang jatuh pada tanggal H-2 (dalam timezone Jakarta)
    const { data: loansH2, error: errorH2 } = await supabase
      .from("loans")
      .select(
        "id,kode_unik,nama,email,nomor_whatsapp,deadline,reminder_h2_sent_at,reminder_deadline_sent_at",
      )
      .eq("status", "dipinjam")
      .gte("deadline", h2Range.start)
      .lte("deadline", h2Range.end)
      .is("reminder_h2_sent_at", null)
      .order("deadline", { ascending: true });

    if (errorH2) {
      console.error("❌ H-2 Query Error:", errorH2);
      return NextResponse.json({ error: errorH2.message }, { status: 500 });
    }

    const sentH2: ReminderResult[] = [];
    const skippedH2: Array<{ id: string; reason: string }> = [];

    // 🔄 Process reminder H-2
    for (const loan of loansH2 ?? []) {
      if (!loan.email || typeof loan.email !== "string") {
        skippedH2.push({
          id: loan.id,
          reason: "Email tidak tersedia",
        });
        continue;
      }

      try {
        const subject = `⏰ Pengingat H-2: Pengembalian Barang - ${loan.kode_unik}`;
        const html = await buildReminderH2Html(loan as ReminderLoan);
        const text = buildReminderH2Text(loan as ReminderLoan);

        await resend.emails.send({
          from: resendFrom,
          to: loan.email,
          subject,
          html,
          text,
        });

        sentH2.push({
          id: loan.id,
          type: "h2",
          email: loan.email,
          kode_unik: loan.kode_unik,
          sentAt: new Date().toISOString(),
        });
      } catch (sendError: any) {
        skippedH2.push({
          id: loan.id,
          reason: sendError?.message ?? "Gagal mengirim email",
        });
      }
    }

    // Update database: tandai reminder H-2 sudah dikirim
    if (sentH2.length > 0) {
      const { error: updateErrorH2 } = await supabase
        .from("loans")
        .update({ reminder_h2_sent_at: new Date().toISOString() })
        .in(
          "id",
          sentH2.map((item) => item.id),
        );

      if (updateErrorH2) {
        console.error("❌ Gagal update reminder_h2_sent_at:", updateErrorH2);
      }
    }

    // ========================================================================
    // 2️⃣ REMINDER DEADLINE (hari deadline)
    // ========================================================================
    // REFACTORED LOGIC (Date-based, bukan exact timestamp):
    //
    // Deadline reminder dikirim pada tanggal deadline itu sendiri (hari ini)
    // Contoh:
    //   - Deadline: 16 Mei 2026 23:59 WIB
    //   - Reminder dikirim: 16 Mei 2026 (sepanjang hari)
    //
    // CATATAN TIMEZONE:
    // - Extract DATE dalam timezone Asia/Jakarta
    // - Bandingkan dengan tanggal hari ini (juga dalam timezone Jakarta)
    // - Hindari masalah UTC vs WIB dengan menggunakan date range boundary

    // 1. Dapatkan tanggal hari ini dalam timezone Jakarta (YYYY-MM-DD)
    const todayRange = getDateRangeInUTC(todayJakarta);

    console.log(
      `[DEADLINE] Today Jakarta: ${todayJakarta}, UTC Range: ${todayRange.start} to ${todayRange.end}`,
    );

    // 2. Query: deadline antara todayRange.start dan todayRange.end
    // Logika:
    // - gte("deadline", todayRange.start) : deadline >= start of today in UTC
    // - lte("deadline", todayRange.end)   : deadline <= end of today in UTC
    // Hasil: semua deadline yang jatuh pada hari ini (dalam timezone Jakarta)
    const { data: loansDeadline, error: errorDeadline } = await supabase
      .from("loans")
      .select(
        "id,kode_unik,nama,email,nomor_whatsapp,deadline,reminder_h2_sent_at,reminder_deadline_sent_at",
      )
      .eq("status", "dipinjam")
      .gte("deadline", todayRange.start)
      .lte("deadline", todayRange.end)
      .is("reminder_deadline_sent_at", null)
      .order("deadline", { ascending: true });

    if (errorDeadline) {
      console.error("❌ Deadline Query Error:", errorDeadline);
      return NextResponse.json(
        { error: errorDeadline.message },
        { status: 500 },
      );
    }

    const sentDeadline: ReminderResult[] = [];
    const skippedDeadline: Array<{ id: string; reason: string }> = [];

    // 🔄 Process reminder deadline
    for (const loan of loansDeadline ?? []) {
      if (!loan.email || typeof loan.email !== "string") {
        skippedDeadline.push({
          id: loan.id,
          reason: "Email tidak tersedia",
        });
        continue;
      }

      try {
        const subject = `🚨 HARI DEADLINE: Segera Kembalikan Barang - ${loan.kode_unik}`;
        const html = await buildReminderDeadlineHtml(loan as ReminderLoan);
        const text = buildReminderDeadlineText(loan as ReminderLoan);

        await resend.emails.send({
          from: resendFrom,
          to: loan.email,
          subject,
          html,
          text,
        });

        sentDeadline.push({
          id: loan.id,
          type: "deadline",
          email: loan.email,
          kode_unik: loan.kode_unik,
          sentAt: new Date().toISOString(),
        });
      } catch (sendError: any) {
        skippedDeadline.push({
          id: loan.id,
          reason: sendError?.message ?? "Gagal mengirim email",
        });
      }
    }

    // Update database: tandai reminder deadline sudah dikirim
    if (sentDeadline.length > 0) {
      const { error: updateErrorDeadline } = await supabase
        .from("loans")
        .update({ reminder_deadline_sent_at: new Date().toISOString() })
        .in(
          "id",
          sentDeadline.map((item) => item.id),
        );

      if (updateErrorDeadline) {
        console.error(
          "❌ Gagal update reminder_deadline_sent_at:",
          updateErrorDeadline,
        );
      }
    }

    // ========================================================================
    // RESPONSE
    // ========================================================================
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: {
        h2: {
          found: loansH2?.length ?? 0,
          sent: sentH2.length,
          skipped: skippedH2.length,
        },
        deadline: {
          found: loansDeadline?.length ?? 0,
          sent: sentDeadline.length,
          skipped: skippedDeadline.length,
        },
        totalSent: sentH2.length + sentDeadline.length,
      },
      details: {
        h2: {
          sent: sentH2,
          skipped: skippedH2,
        },
        deadline: {
          sent: sentDeadline,
          skipped: skippedDeadline,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Reminder API Error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}
