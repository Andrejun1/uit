"use client";

import { Loan, LoanItemWithItem } from "@/lib/loans";
import { format, formatDistance } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Image from "next/image";
import {
  X,
  User,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  Barcode,
} from "lucide-react";
import { useEffect, useState } from "react";
import QRCodeDisplay from "@/components/public/QRCodeDisplay";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { Printer as PrinterIcon } from "lucide-react";

interface LoanDetailModalProps {
  loan: Loan & { loan_items?: LoanItemWithItem[] };
  onClose: () => void;
}

export default function LoanDetailModal({
  loan,
  onClose,
}: LoanDetailModalProps) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const update = () => {
      const end = loan.tanggal_kembali
        ? new Date(loan.tanggal_kembali)
        : new Date();
      setElapsed(
        formatDistance(new Date(loan.tanggal_pinjam), end, {
          locale: idLocale,
        }),
      );
    };
    update();
    const t = loan.status === "dipinjam" ? setInterval(update, 1000) : null;
    return () => {
      if (t) clearInterval(t);
    };
  }, [loan]);

  const isDipinjam = loan.status === "dipinjam";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-2xl brut-card overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b-2 border-ink bg-[#7DD3FC] flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-ink text-lg">
              Detail Peminjaman
            </h2>
            <p className="font-mono text-ink/60 text-xs mt-0.5">
              {loan.kode_unik}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-lg bg-white text-ink flex items-center justify-center shadow-brut-sm hover:bg-[#E0F2FE] border-2 border-ink"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Status + Duration */}
          <div
            className={cn(
              "rounded-2xl border-2 border-ink p-4 flex items-center justify-between shadow-brut-sm",
              isDipinjam ? "bg-[#DBEAFE]" : "bg-[#DCFCE7]",
            )}
          >
            <div>
              <div
                className={cn(
                  "flex items-center gap-2 mb-1",
                  isDipinjam ? "text-[#1D4ED8]" : "text-[#15803D]",
                )}
              >
                {isDipinjam ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span className="font-display font-bold text-sm text-ink">
                  {isDipinjam ? "Sedang Dipinjam" : "Sudah Dikembalikan"}
                </span>
              </div>
              <p className={cn("font-display text-2xl font-bold", isDipinjam ? "text-[#1D4ED8]" : "text-[#15803D]")}>
                {elapsed}
              </p>
            </div>
            {isDipinjam && (
              <div className="w-3 h-3 bg-[#2563EB] border-2 border-ink rounded-full animate-pulse" />
            )}
          </div>

          {/* Photos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="brut-panel overflow-hidden">
              <p className="text-ink/50 text-xs font-bold px-3 py-2 border-b-2 border-ink flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Foto Peminjam
              </p>
              {loan.foto_peminjam_url ? (
                <div className="relative aspect-square">
                  <Image
                    src={loan.foto_peminjam_url}
                    alt={loan.nama}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-[#F5F3EC]">
                  <User className="w-12 h-12 text-ink/15" />
                </div>
              )}
            </div>
            <div className="brut-panel overflow-hidden">
              <p className="text-ink/50 text-xs font-bold px-3 py-2 border-b-2 border-ink flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Foto Barang
              </p>
              {loan.foto_barang_url ? (
                <div className="relative aspect-square">
                  <Image
                    src={loan.foto_barang_url}
                    alt={loan.nama_barang ?? ""}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-[#F5F3EC]">
                  <Package className="w-12 h-12 text-ink/15" />
                </div>
              )}
            </div>
          </div>

          {/* Info Grid */}
          <div className="brut-panel divide-y-2 divide-dashed divide-ink/15 overflow-hidden">
            {[
              { icon: User, label: "Nama", value: loan.nama },
              {
                icon: Calendar,
                label: "Tanggal Lahir",
                value: format(new Date(loan.tanggal_lahir), "dd MMMM yyyy", {
                  locale: idLocale,
                }),
              },
              {
                icon: GraduationCap,
                label: "Program Studi",
                value: loan.prodi,
              },
              { icon: BookOpen, label: "Jurusan", value: loan.jurusan },
              {
                icon: BookOpen,
                label: "Semester",
                value: `Semester ${loan.semester}`,
              },
              ...(loan.loan_items && loan.loan_items.length > 0
                ? loan.loan_items.map((item, idx) => ({
                    icon: Package,
                    label: idx === 0 ? "Barang" : `Barang ${idx + 1}`,
                    value: `${item.items?.nama_barang ?? "Unknown"} × ${item.quantity}`,
                  }))
                : [
                    {
                      icon: Package,
                      label: "Nama Barang",
                      value: loan.nama_barang || "-",
                    },
                  ]),
              {
                icon: Calendar,
                label: "Tanggal Pinjam",
                value: format(
                  new Date(loan.tanggal_pinjam),
                  "dd MMM yyyy, HH:mm",
                  { locale: idLocale },
                ),
              },
              {
                icon: Clock,
                label: "Deadline Pengembalian",
                value: format(
                  new Date(loan.deadline),
                  "dd MMM yyyy, HH:mm",
                  { locale: idLocale },
                ),
              },
              ...(loan.tanggal_kembali
                ? [
                    {
                      icon: CheckCircle2,
                      label: "Tanggal Kembali",
                      value: format(
                        new Date(loan.tanggal_kembali),
                        "dd MMM yyyy, HH:mm",
                        { locale: idLocale },
                      ),
                    },
                  ]
                : []),
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg border-2 border-ink bg-[#F5F3EC] flex items-center justify-center flex-shrink-0 shadow-brut-sm">
                  <row.icon className="w-3.5 h-3.5 text-ink/60" />
                </div>
                <p className="text-ink/40 text-xs w-28 flex-shrink-0 font-semibold">
                  {row.label}
                </p>
                <p className="text-ink text-sm font-semibold flex-1">
                  {row.value}
                </p>
              </div>
            ))}
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3 brut-panel p-5">
            <p className="text-ink/50 text-xs font-bold flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5" /> QR Code
            </p>
            <QRCodeDisplay
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/detail/${loan.kode_unik}`}
              size={150}
            />
            <p className="font-mono text-ink/40 text-xs font-bold">
              {loan.kode_unik}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href={`/admin/print/${loan.kode_unik}`}
              target="_blank"
              className="flex-1"
            >
              <button className="w-full brut-btn brut-btn-blue">
                <PrinterIcon /> Print QR Code
              </button>
            </Link>
            <button
              onClick={onClose}
              className="flex-1 brut-btn"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}