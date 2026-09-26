"use client";

import { useEffect, useRef, useState } from "react";
import { getLoanByKode, Loan } from "@/lib/loans";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Image from "next/image";
import { Printer, Loader2, AlertCircle, Pin } from "lucide-react";
import QRCode from "qrcode";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminPrintPage({
  params,
}: {
  params: { kode: string };
}) {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    loadLoan();
  }, []);

  useEffect(() => {
    if (loan && qrCanvasRef.current && origin) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        `${origin}/detail/${loan.kode_unik}`,
        {
          width: 100,
          margin: 1,
          color: { dark: "#0a0a0a", light: "#ffffff" },
          errorCorrectionLevel: "H",
        },
      );
    }
  }, [loan, origin]);

  const loadLoan = async () => {
    try {
      const data = await getLoanByKode(params.kode);
      if (!data) setNotFound(true);
      else setLoan(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F3EC] flex items-center justify-center">
        <div className="w-12 h-12 border-[3px] border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !loan) {
    return (
      <div className="min-h-screen bg-[#F5F3EC] flex flex-col items-center justify-center gap-4 p-4">
        <div className="w-14 h-14 bg-[#FEE2E2] border-2 border-ink rounded-2xl flex items-center justify-center shadow-brut">
          <AlertCircle className="w-7 h-7 text-[#B91C1C]" />
        </div>
        <p className="text-ink/70 font-bold">
          Data tidak ditemukan:{" "}
          <span className="font-mono font-bold">{params.kode}</span>
        </p>
        <Link
          href="/admin/loans"
          className="text-[#1D4ED8] hover:underline text-sm font-bold"
        >
          ← Kembali ke Daftar
        </Link>
      </div>
    );
  }

  const isDipinjam = loan.status === "dipinjam";

  return (
    <>
      {/* Print controls - hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 brut-btn brut-btn-blue shadow-brut !px-6 !py-2.5"
        >
          <Printer className="w-4 h-4" />
          Cetak / Print
        </button>
      </div>

      {/* Print page */}
      <div className="min-h-screen bg-[#F5F3EC] pt-28 sm:pt-20 pb-10 px-4 no-print-bg">
        <div
          id="print-area"
          className="max-w-2xl mx-auto bg-white border-2 border-ink shadow-brut-xl rounded-2xl overflow-hidden"
        >
          {/* Header strip */}
          <div className="bg-[#7DD3FC] border-b-2 border-ink text-ink p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <div className="w-8 h-8 bg-white border-2 border-ink rounded-lg flex items-center justify-center shadow-brut-sm">
                    <img
                      src="/logounimus.png"
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-display font-black text-lg sm:text-xl tracking-tight">
                      UNIMUS INVENTRACK
                    </p>
                    <p className="text-ink/70 text-xs font-semibold">
                      Universitas Muhammadiyah Semarang
                    </p>
                  </div>
                </div>
                <p className="text-ink/60 text-xs text-center sm:text-left font-medium">
                  Sistem Manajemen Peminjaman Barang Laboratorium
                </p>
              </div>
              <div className="bg-white border-2 border-ink shadow-brut p-2.5 rounded-xl flex-shrink-0">
                <canvas ref={qrCanvasRef} style={{ display: "block" }} />
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-8">
            {/* Title + Code */}
            <div className="text-center mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2 border-dashed border-ink/20">
              <h2 className="text-lg sm:text-xl font-display font-black text-ink mb-2 sm:mb-3">
                BUKTI PEMINJAMAN BARANG LABORATORIUM
              </h2>
              <div className="inline-block bg-[#F5F3EC] border-2 border-ink px-4 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-brut-sm">
                <p className="text-ink/50 text-xs font-bold uppercase tracking-widest mb-1">
                  Kode Peminjaman
                </p>
                <p className="font-mono text-2xl sm:text-3xl font-black text-ink tracking-wider">
                  {loan.kode_unik}
                </p>
              </div>
            </div>

            {/* Main info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
              {/* Peminjam */}
              <div>
                <h3 className="text-xs font-black text-ink/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-5 h-1 bg-[#7DD3FC] border border-ink inline-block" />
                  DATA PEMINJAM
                </h3>
                <div className="space-y-2.5 text-sm">
                  {[
                    { label: "Nama", value: loan.nama },
                    {
                      label: "Tanggal Lahir",
                      value: format(
                        new Date(loan.tanggal_lahir),
                        "dd MMMM yyyy",
                        { locale: idLocale },
                      ),
                    },
                    { label: "Program Studi", value: loan.prodi },
                    { label: "Jurusan", value: loan.jurusan },
                    { label: "Semester", value: `Semester ${loan.semester}` },
                  ].map((r) => (
                    <div key={r.label} className="flex gap-2">
                      <span className="text-ink/40 w-28 flex-shrink-0 font-medium">
                        {r.label}
                      </span>
                      <span className="text-ink font-bold flex-1">
                        : {r.value}
                      </span>
                    </div>
                  ))}
                </div>

                {loan.foto_peminjam_url && (
                  <div className="mt-4">
                    <p className="text-xs text-ink/40 font-bold mb-2">
                      FOTO PEMINJAM
                    </p>
                    <div className="relative w-28 h-28 rounded-xl overflow-hidden border-2 border-ink shadow-brut-sm">
                      <Image
                        src={loan.foto_peminjam_url}
                        alt={loan.nama}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Barang */}
              <div>
                <h3 className="text-xs font-black text-ink/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-5 h-1 bg-[#7DD3FC] border border-ink inline-block" />
                  DATA BARANG
                </h3>
                <div className="space-y-2.5 text-sm">
                  {[
                    { label: "Nama Barang", value: loan.nama_barang },
                    {
                      label: "Tanggal Pinjam",
                      value:
                        format(
                          new Date(loan.tanggal_pinjam),
                          "dd MMMM yyyy, HH:mm",
                          { locale: idLocale },
                        ) + " WIB",
                    },
                    {
                      label: "Status",
                      value: isDipinjam
                        ? "Sedang Dipinjam"
                        : "Sudah Dikembalikan",
                    },
                    ...(loan.tanggal_kembali
                      ? [
                          {
                            label: "Tgl Kembali",
                            value:
                              format(
                                new Date(loan.tanggal_kembali),
                                "dd MMMM yyyy, HH:mm",
                                { locale: idLocale },
                              ) + " WIB",
                          },
                        ]
                      : []),
                  ].map((r) => (
                    <div key={r.label} className="flex gap-2">
                      <span className="text-ink/40 w-28 flex-shrink-0 font-medium">
                        {r.label}
                      </span>
                      <span
                        className={cn(
                          "font-bold flex-1",
                          r.label === "Status"
                            ? isDipinjam
                              ? "text-[#1D4ED8]"
                              : "text-[#15803D]"
                            : "text-ink",
                        )}
                      >
                        : {r.value}
                      </span>
                    </div>
                  ))}
                </div>

                {loan.foto_barang_url && (
                  <div className="mt-4">
                    <p className="text-xs text-ink/40 font-bold mb-2">
                      FOTO BARANG
                    </p>
                    <div className="relative w-28 h-28 rounded-xl overflow-hidden border-2 border-ink shadow-brut-sm">
                      <Image
                        src={loan.foto_barang_url}
                        alt={loan.nama_barang || "Foto Barang"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Note */}
            <div className="bg-[#E0F2FE] border-l-4 border-[#0369A1] p-4 rounded-r-xl mb-8 text-sm">
              <p className="text-[#075985] font-medium">
                <Pin className="w-3.5 h-3.5 inline mr-1" />
                <strong>Catatan:</strong> Simpan bukti peminjaman ini. QR Code
                dapat dipindai untuk verifikasi status peminjaman secara
                real-time.
              </p>
            </div>

            {/* Signature */}
            <div className="grid grid-cols-2 gap-10">
              <div className="text-center">
                <p className="text-xs text-ink/50 font-medium mb-16">Peminjam</p>
                <div className="border-t-2 border-ink pt-2">
                  <p className="text-sm font-bold text-ink">{loan.nama}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-ink/50 font-medium mb-16">
                  Admin Laboratorium
                </p>
                <div className="border-t-2 border-ink pt-2">
                  <p className="text-sm font-medium text-ink/40">
                    ( ................................ )
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 pt-4 border-t border-ink/10">
              <p className="text-xs text-ink/40 font-medium">
                Dicetak:{" "}
                {format(new Date(), "dd MMMM yyyy, HH:mm", {
                  locale: idLocale,
                })}{" "}
                WIB
                {" · "} UIT v2.0 — Unimus Inventrack
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
          }

          *,
          *::before,
          *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            background-color: white !important;
          }

          /* Hapus background abu / hitam dari semua div */
          div {
            background-color: transparent;
          }

          .no-print {
            display: none !important;
          }

          .no-print-bg {
            background: white !important;
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: unset !important;
          }

          #print-area {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Kompres padding dalam konten agar muat 1 halaman */
          #print-area .p-4,
          #print-area .p-8,
          #print-area .sm\\:p-8 {
            padding: 0.75rem !important;
          }

          #print-area .mb-6,
          #print-area .mb-8,
          #print-area .sm\\:mb-8 {
            margin-bottom: 0.75rem !important;
          }

          #print-area .gap-8,
          #print-area .sm\\:gap-8 {
            gap: 1rem !important;
          }

          #print-area .mb-16 {
            margin-bottom: 3rem !important;
          }

          #print-area .mt-8 {
            margin-top: 1rem !important;
          }

          /* Sembunyikan header & sidebar global */
          header,
          nav,
          aside,
          footer,
          [class*="navbar"],
          [class*="sidebar"],
          [class*="header"] {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}