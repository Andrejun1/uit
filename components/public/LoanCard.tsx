"use client";

import { Loan, LoanItemWithItem } from "@/lib/loans";
import { formatDistance, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Link from "next/link";
import { Clock, CheckCircle2, Package, ChevronRight, User } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type LoanWithItems = Loan & {
  loan_items?: LoanItemWithItem[];
};

interface LoanCardProps {
  loan: LoanWithItems;
  index: number;
}

export default function LoanCard({ loan, index }: LoanCardProps) {
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
    const t = loan.status === "dipinjam" ? setInterval(update, 60000) : null;
    return () => {
      if (t) clearInterval(t);
    };
  }, [loan]);

  const isDipinjam = loan.status === "dipinjam";

  // Get first item from loan_items or fallback to nama_barang
  const firstItem =
    loan.loan_items && loan.loan_items.length > 0 ? loan.loan_items[0] : null;
  const itemCount = loan.loan_items?.length ?? 0;

  return (
    <Link href={`/detail/${loan.kode_unik}`}>
      <div
        className="group relative bg-white border-2 border-ink rounded-2xl overflow-hidden shadow-brut-sm hover:shadow-brut transition-all duration-300 hover:-translate-y-1 cursor-pointer"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        {/* Status indicator bar */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-2",
            isDipinjam ? "bg-[#2563EB]" : "bg-[#22C55E]",
          )}
        />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg mb-2 border-2 border-ink",
                  isDipinjam
                    ? "bg-[#DBEAFE] text-[#1D4ED8] shadow-brut-sm"
                    : "bg-[#DCFCE7] text-[#15803D] shadow-brut-sm",
                )}
              >
                {isDipinjam ? (
                  <>
                    <Clock className="w-3 h-3" /> Dipinjam
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> Dikembalikan
                  </>
                )}
              </span>
              <p className="text-ink/40 font-mono text-xs font-semibold">
                {loan.kode_unik}
              </p>
            </div>
            {loan.foto_peminjam_url ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-ink shadow-brut-sm flex-shrink-0 ml-3">
                <Image
                  src={loan.foto_peminjam_url}
                  alt={loan.nama}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#DBEAFE] border-2 border-ink shadow-brut-sm flex items-center justify-center flex-shrink-0 ml-3">
                <User className="w-5 h-5 text-[#1D4ED8]" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-2">
            <div>
              <p className="text-ink font-bold font-display text-base truncate">
                {loan.nama}
              </p>
              <p className="text-ink/40 text-sm font-medium truncate">
                {loan.prodi} • Sem {loan.semester}
              </p>
            </div>

            {/* Items display - show first item + count if multiple */}
            {firstItem ? (
              <div className="flex items-center gap-2 bg-[#F5F3EC] border-2 border-ink rounded-xl p-2.5 shadow-brut-sm">
                {firstItem.foto_barang_url ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border-2 border-ink">
                    <Image
                      src={firstItem.foto_barang_url}
                      alt={firstItem.items?.nama_barang || "Barang"}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] border-2 border-ink flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-[#0369A1]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-ink text-sm font-bold truncate">
                    {firstItem.items?.nama_barang || "Unknown"}
                  </p>
                  <p className="text-ink/40 text-xs font-medium">
                    {itemCount > 1
                      ? `${itemCount} barang (${firstItem.quantity} + ...)`
                      : `Qty: ${firstItem.quantity}`}
                  </p>
                </div>
              </div>
            ) : loan.nama_barang ? (
              <div className="flex items-center gap-2 bg-[#F5F3EC] border-2 border-ink rounded-xl p-2.5 shadow-brut-sm">
                {loan.foto_barang_url ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border-2 border-ink">
                    <Image
                      src={loan.foto_barang_url}
                      alt={loan.nama_barang}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] border-2 border-ink flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-[#0369A1]" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-ink text-sm font-bold truncate">
                    {loan.nama_barang}
                  </p>
                  <p className="text-ink/40 text-xs font-medium">
                    Barang yang dipinjam
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t-2 border-dashed border-ink/15 flex items-center justify-between">
            <div>
              <p className="text-ink/40 text-xs font-medium">
                {format(new Date(loan.tanggal_pinjam), "dd MMM yyyy HH:mm", {
                  locale: idLocale,
                })}
              </p>
              <p className="text-ink/60 text-xs font-bold mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {elapsed}
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#F5F3EC] border-2 border-ink flex items-center justify-center group-hover:bg-[#7DD3FC] transition-colors">
              <ChevronRight className="w-4 h-4 text-ink group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}