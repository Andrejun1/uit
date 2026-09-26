"use client";

import { useEffect, useState } from "react";
import {
  getLoanByKode,
  getLoanWithItems,
  Loan,
  LoanItemWithItem,
} from "@/lib/loans";
import { supabase } from "@/lib/supabase/client";
import { format, formatDistance } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  User,
  Calendar,
  Barcode,
  MapPin,
  BookOpen,
  GraduationCap,
  Loader2,
  AlertCircle,
  Timer,
} from "lucide-react";
import QRCodeDisplay from "@/components/public/QRCodeDisplay";
import { cn } from "@/lib/utils";

type LoanWithItems = Loan & {
  loan_items?: LoanItemWithItem[];
};

export default function DetailPage({ params }: { params: { kode: string } }) {
  const [loan, setLoan] = useState<LoanWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    loadLoan();
  }, [params.kode]);

  useEffect(() => {
    if (!loan) return;

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

  useEffect(() => {
    if (!loan) return;

    const channel = supabase
      .channel(`loan-${loan.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "loans",
          filter: `id=eq.${loan.id}`,
        },
        (payload) => {
          setLoan(payload.new as LoanWithItems);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loan?.id]);

  const loadLoan = async () => {
    try {
      // Pertama cek apakah ini kode peminjaman atau kode barang
      const data = await getLoanByKode(params.kode);
      if (!data) {
        setNotFound(true);
        return;
      }

      // Load loan dengan items yang sudah di-join
      const loanWithItems = await getLoanWithItems(data.id);
      if (!loanWithItems) {
        setNotFound(true);
        return;
      }
      setLoan(loanWithItems as LoanWithItems);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F3EC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-[3px] border-ink border-t-transparent rounded-full animate-spin" />
          <p className="text-ink/60 font-bold">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (notFound || !loan) {
    return (
      <div className="min-h-screen bg-[#F5F3EC] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-[#FEE2E2] border-2 border-ink rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-brut">
            <AlertCircle className="w-10 h-10 text-[#B91C1C]" />
          </div>
          <h1 className="text-ink text-2xl font-display font-black mb-2">
            Data Tidak Ditemukan
          </h1>
          <p className="text-ink/50 font-medium mb-6">
            Kode <span className="font-mono font-bold text-[#1D4ED8]">{params.kode}</span>{" "}
            tidak ditemukan dalam sistem.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 brut-btn brut-btn-primary !px-5 !py-2.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  const isDipinjam = loan.status === "dipinjam";

  return (
    <div className="min-h-screen bg-[#F5F3EC] pb-16">
      {/* Header */}
      <header className="border-b-2 border-ink bg-[#F5F3EC]/90 backdrop-blur-xl sticky top-0 z-40 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-ink/60 hover:text-ink transition-colors font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold">Kembali</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-ink font-display font-bold text-sm">
              Unimus Inventrack
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-5">
        {/* Title + Status */}
        <div className="text-center mb-6">
          <span
            className={cn(
              "inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-bold mb-3 border-2 border-ink shadow-brut-sm",
              isDipinjam
                ? "bg-[#DBEAFE] text-[#1D4ED8]"
                : "bg-[#DCFCE7] text-[#15803D]",
            )}
          >
            {isDipinjam ? (
              <>
                <Clock className="w-4 h-4" /> Sedang Dipinjam
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Sudah Dikembalikan
              </>
            )}
          </span>
          <h1 className="text-ink text-3xl font-display font-black mb-1">
            {loan.nama}
          </h1>
          <p className="font-mono text-ink/40 text-sm font-bold">{loan.kode_unik}</p>
        </div>

        {/* Photos */}
        <div className="grid grid-cols-2 gap-4">
          {/* Peminjam photo */}
          <div className="bg-white border-2 border-ink rounded-2xl overflow-hidden shadow-brut-sm">
            <div className="p-3 border-b-2 border-ink bg-[#DBEAFE]">
              <p className="text-[#1D4ED8] text-xs font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Foto Peminjam
              </p>
            </div>
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
                <User className="w-12 h-12 text-ink/20" />
              </div>
            )}
          </div>

          {/* Barang photo */}
          <div className="bg-white border-2 border-ink rounded-2xl overflow-hidden shadow-brut-sm">
            <div className="p-3 border-b-2 border-ink bg-[#E0F2FE]">
              <p className="text-[#0369A1] text-xs font-bold flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Foto Barang
              </p>
            </div>
            {loan.foto_barang_url ? (
              <div className="relative aspect-square">
                <Image
                  src={loan.foto_barang_url}
                  alt={loan.nama_barang || "Foto Barang"}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square flex items-center justify-center bg-[#F5F3EC]">
                <Package className="w-12 h-12 text-ink/20" />
              </div>
            )}
          </div>
        </div>

        {/* Real-time Duration */}
        <div
          className={cn(
            "rounded-2xl p-5 border-2 border-ink shadow-brut-sm",
            isDipinjam ? "bg-[#DBEAFE]" : "bg-[#DCFCE7]",
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-ink/50 text-xs font-bold mb-1 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" /> Lama Peminjaman (Real-time)
              </p>
              <p
                className={cn(
                  "text-3xl font-display font-black",
                  isDipinjam ? "text-[#1D4ED8]" : "text-[#15803D]",
                )}
              >
                {elapsed}
              </p>
            </div>
            {isDipinjam && (
              <div className="w-4 h-4 bg-[#1D4ED8] border-2 border-ink rounded-full animate-pulse" />
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="bg-white border-2 border-ink rounded-2xl overflow-hidden shadow-brut-sm">
          <div className="p-4 border-b-2 border-ink bg-[#F5F3EC]">
            <h2 className="text-ink font-display font-bold">Detail Peminjaman</h2>
          </div>
          <div className="divide-y-2 divide-dashed divide-ink/10">
            <InfoRow icon={User} label="Nama Peminjam" value={loan.nama} />
            <InfoRow
              icon={GraduationCap}
              label="Program Studi"
              value={loan.prodi}
            />
            <InfoRow icon={BookOpen} label="Jurusan" value={loan.jurusan} />
            <InfoRow
              icon={MapPin}
              label="Semester"
              value={`Semester ${loan.semester}`}
            />
            <InfoRow
              icon={Calendar}
              label="Tanggal Pinjam"
              value={format(
                new Date(loan.tanggal_pinjam),
                "dd MMMM yyyy, HH:mm",
                { locale: idLocale },
              )}
            />
            <InfoRow
              icon={Clock}
              label="Deadline Pengembalian"
              value={format(
                new Date(loan.deadline),
                "dd MMMM yyyy, HH:mm",
                { locale: idLocale },
              )}
            />
            {loan.tanggal_kembali && (
              <InfoRow
                icon={CheckCircle2}
                label="Tanggal Kembali"
                value={format(
                  new Date(loan.tanggal_kembali),
                  "dd MMMM yyyy, HH:mm",
                  { locale: idLocale },
                )}
              />
            )}
          </div>
        </div>

        {/* Items Dipinjam */}
        {loan.loan_items && loan.loan_items.length > 0 && (
          <div className="bg-white border-2 border-ink rounded-2xl overflow-hidden shadow-brut-sm">
            <div className="p-4 border-b-2 border-ink bg-[#E0F2FE]">
              <h2 className="text-ink font-display font-bold flex items-center gap-2">
                <Package className="w-4 h-4" />
                Barang yang Dipinjam ({loan.loan_items.length} item)
              </h2>
            </div>
            <div className="divide-y-2 divide-dashed divide-ink/10">
              {loan.loan_items.map((loanItem, idx) => (
                <div
                  key={loanItem.id}
                  className="p-4 hover:bg-[#E0F2FE] transition-colors"
                >
                  <div className="flex gap-4">
                    {loanItem.foto_barang_url && (
                      <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-[#F5F3EC] border-2 border-ink shadow-brut-sm">
                        <Image
                          src={loanItem.foto_barang_url}
                          alt={loanItem.items?.nama_barang || "Barang"}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-ink font-bold">
                        {loanItem.items?.nama_barang || "Unknown"}
                      </p>
                      <p className="text-ink/40 text-xs mt-0.5 font-mono">
                        {loanItem.items?.kode_barang}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#DBEAFE] border-2 border-ink text-[#1D4ED8] text-xs font-bold rounded-lg shadow-brut-sm">
                          <Package className="w-3 h-3" />
                          Qty: {loanItem.quantity}
                        </span>
                        {loanItem.items?.kategori && (
                          <span className="inline-flex items-center px-2 py-1 bg-[#F5F3EC] border-2 border-ink text-ink/60 text-xs font-bold rounded-lg">
                            {loanItem.items.kategori}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Old single barang display for backward compatibility */}
        {(!loan.loan_items || loan.loan_items.length === 0) &&
          loan.nama_barang && (
            <div className="bg-white border-2 border-ink rounded-2xl overflow-hidden shadow-brut-sm">
              <div className="p-4 border-b-2 border-ink bg-[#E0F2FE]">
                <h2 className="text-ink font-display font-bold flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Barang yang Dipinjam
                </h2>
              </div>
              <div className="p-4">
                <InfoRow
                  icon={Package}
                  label="Nama Barang"
                  value={loan.nama_barang}
                />
              </div>
            </div>
          )}

        {/* QR Code */}
        <div className="bg-white border-2 border-ink rounded-2xl p-5 shadow-brut-sm flex flex-col items-center gap-3">
          <p className="text-ink/50 text-xs font-bold flex items-center gap-1.5">
            <Barcode className="w-3.5 h-3.5" /> QR Code Peminjaman
          </p>
          <QRCodeDisplay
            value={`${typeof window !== "undefined" ? window.location.origin : ""}/detail/${loan.kode_unik}`}
            size={180}
          />
          <p className="font-mono text-ink/50 text-sm font-bold">{loan.kode_unik}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] border-2 border-ink flex items-center justify-center flex-shrink-0 shadow-brut-sm">
        <Icon className="w-4 h-4 text-[#0369A1]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-ink/40 text-xs font-bold uppercase tracking-wide">
          {label}
        </p>
        <p className="text-ink font-bold text-sm truncate">{value}</p>
      </div>
    </div>
  );
}