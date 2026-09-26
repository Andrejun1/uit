"use client";

import { useEffect, useState } from "react";
import { getAllLoans } from "@/lib/loans";
import { getAllItems, getItemsStatistics } from "@/lib/items";
import { Loan } from "@/lib/supabase/types";
import { Item } from "@/lib/items";
import { supabase } from "@/lib/supabase/client";
import { formatDistance, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Link from "next/link";
import {
  Package,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  Loader2,
  AlertCircle,
  Box,
  Undo2,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LoanStatus = "dipinjam" | "kembali" | "selesai";

const statusBadge: Record<LoanStatus, { cls: string; label: string }> = {
  dipinjam: { cls: "badge-blue", label: "Dipinjam" },
  kembali: { cls: "badge-green", label: "Kembali" },
  selesai: { cls: "badge-purple", label: "Selesai" },
};

export default function AdminDashboard() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [itemStats, setItemStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel("admin-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loans" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        () => loadData(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      const [loansData, itemsData, itemStatsData] = await Promise.all([
        getAllLoans(),
        getAllItems(),
        getItemsStatistics(),
      ]);
      setLoans(loansData as Loan[]);
      setItems(itemsData);
      setItemStats(itemStatsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalLoans: loans.length,
    activeLoans: loans.filter((l) => l.status === "dipinjam").length,
    returnedLoans: loans.filter((l) => l.status === "kembali").length,
    todayLoans: loans.filter((l) => {
      const d = new Date(l.tanggal_pinjam);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
    overdueLoans: loans.filter(
      (l) =>
        l.status === "dipinjam" &&
        l.deadline &&
        new Date(l.deadline) < new Date(),
    ).length,
    totalItems: itemStats.total || 0,
    availableItems: itemStats.available || 0,
    unavailableItems: itemStats.unavailable || 0,
  };

  const recentLoans = loans.slice(0, 8);
  const overdueLoans = loans
    .filter(
      (l) =>
        l.status === "dipinjam" &&
        l.deadline &&
        new Date(l.deadline) < new Date(),
    )
    .slice(0, 5);

  const statCards = [
    {
      label: "Total Peminjaman",
      value: stats.totalLoans,
      icon: Package,
      chip: "bg-[#DBEAFE]",
      valueCls: "text-[#1D4ED8]",
      sub: "Semua waktu",
    },
    {
      label: "Sedang Dipinjam",
      value: stats.activeLoans,
      icon: Clock,
      chip: "bg-[#E0F2FE]",
      valueCls: "text-[#0369A1]",
      sub: `${stats.overdueLoans} terlambat`,
    },
    {
      label: "Dikembalikan",
      value: stats.returnedLoans,
      icon: CheckCircle2,
      chip: "bg-[#DCFCE7]",
      valueCls: "text-[#15803D]",
      sub: "Selesai",
    },
    {
      label: "Barang Tersedia",
      value: stats.availableItems,
      icon: Box,
      chip: "bg-[#EDE9FE]",
      valueCls: "text-[#6D28D9]",
      sub: `${stats.totalItems} total barang`,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Quick action */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg border-2 border-ink bg-[#7DD3FC] flex items-center justify-center shadow-brut-sm">
            <Activity className="w-4 h-4 text-ink" />
          </div>
          <span className="kicker text-ink/60">Overview Sistem</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/new" className="brut-btn brut-btn-primary !py-2.5">
            <Plus className="w-4 h-4" />
            Peminjaman Baru
          </Link>
          <Link href="/admin/items" className="brut-btn brut-btn-blue !py-2.5">
            <Box className="w-4 h-4" />
            Katalog Barang
          </Link>
          <Link
            href="/admin/return"
            className="brut-btn brut-btn-green !py-2.5"
          >
            <Undo2 className="w-4 h-4" />
            Pengembalian
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="brut-card p-5 brut-card-hover">
              <div className="flex items-center justify-between mb-4">
                <div
                  className={cn(
                    "w-11 h-11 rounded-xl border-2 border-ink flex items-center justify-center shadow-brut-sm",
                    s.chip,
                  )}
                >
                  <Icon className="w-5 h-5 text-ink" />
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/30">
                  {s.sub}
                </span>
              </div>
              <p
                className={cn(
                  "font-display text-3xl md:text-4xl font-bold",
                  s.valueCls,
                )}
              >
                {loading ? "—" : s.value}
              </p>
              <p className="text-ink/60 text-xs font-semibold mt-1">
                {s.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Overdue loans alert */}
      {!loading && stats.overdueLoans > 0 && (
        <div className="border-2 border-ink rounded-2xl bg-[#FEE2E2] p-5 shadow-brut flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl border-2 border-ink bg-[#EF4444] flex items-center justify-center flex-shrink-0 shadow-brut-sm">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-ink">
                {stats.overdueLoans} Peminjaman Terlambat
              </h3>
              <p className="text-[#7F1D1D] text-sm mt-1">
                Barang-barang berikut sudah melewati deadline pengembalian
              </p>
            </div>
          </div>
          <Link href="/admin/return" className="brut-btn brut-btn-red">
            Lihat detailnya <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Main bento grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent loans - main */}
        <div className="lg:col-span-2 brut-card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b-2 border-ink bg-[#7DD3FC]">
            <h2 className="font-display font-bold text-ink">
              Peminjaman Terbaru
            </h2>
            <Link
              href="/admin/loans"
              className="inline-flex items-center gap-1.5 text-ink/70 hover:text-ink text-sm font-bold transition-colors shadow-brut-sm border-2 border-ink bg-white rounded-lg px-3 py-1.5"
            >
              Lihat semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-ink animate-spin" />
            </div>
          ) : recentLoans.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-ink/10 mx-auto mb-3" />
              <p className="text-ink/30 text-sm">Belum ada data peminjaman</p>
              <Link
                href="/admin/new"
                className="inline-flex mt-4 items-center gap-2 text-ink font-bold text-sm brut-btn brut-btn-primary !py-2"
              >
                <Plus className="w-4 h-4" /> Tambah sekarang
              </Link>
            </div>
          ) : (
            <div className="divide-y-2 divide-ink/10">
              {recentLoans.map((loan) => {
                const st =
                  statusBadge[loan.status as LoanStatus] ||
                  statusBadge.dipinjam;
                return (
                  <div
                    key={loan.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-[#E0F2FE] transition-colors"
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full border-2 border-ink flex-shrink-0",
                        loan.status === "dipinjam"
                          ? "bg-[#2563EB]"
                          : loan.status === "kembali"
                            ? "bg-[#22C55E]"
                            : "bg-[#8B5CF6]",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-ink font-semibold text-sm truncate">
                          {loan.nama}
                        </p>
                        <span
                          className={cn(
                            "brut-badge !py-0.5 !px-2 !text-[10px]",
                            st.cls,
                          )}
                        >
                          {st.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-ink/45 text-xs truncate">
                          {loan.nama_barang}
                        </p>
                        <span className="text-ink/20 text-xs">•</span>
                        <p className="font-mono text-ink/30 text-xs flex-shrink-0">
                          {loan.kode_unik}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-ink/45 text-xs">
                        {format(new Date(loan.tanggal_pinjam), "dd MMM yyyy", {
                          locale: idLocale,
                        })}
                      </p>
                      <p className="text-ink/30 text-xs mt-0.5">
                        {formatDistance(
                          new Date(loan.tanggal_pinjam),
                          new Date(),
                          {
                            addSuffix: true,
                            locale: idLocale,
                          },
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Overdue loans - sidebar */}
        <div className="brut-card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b-2 border-ink bg-[#FEE2E2]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#B91C1C]" />
              <h2 className="font-display font-bold text-[#B91C1C]">
                Terlambat ({stats.overdueLoans})
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-ink animate-spin" />
            </div>
          ) : overdueLoans.length === 0 ? (
            <div className="text-center py-12 px-4">
              <CheckCircle2 className="w-10 h-10 text-[#15803D] mx-auto mb-2" />
              <p className="text-ink/40 text-sm">
                Tidak ada peminjaman terlambat
              </p>
            </div>
          ) : (
            <div className="divide-y-2 divide-ink/10">
              {overdueLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="px-5 py-3 hover:bg-[#FEE2E2] transition-colors"
                >
                  <p className="text-[#B91C1C] font-bold text-sm truncate">
                    {loan.nama_barang}
                  </p>
                  <p className="text-ink/50 text-xs mt-1 truncate">
                    {loan.nama}
                  </p>
                  {loan.nomor_whatsapp && (
                    <p className="text-ink/30 text-xs mt-1 font-mono truncate">
                      {loan.nomor_whatsapp}
                    </p>
                  )}
                  {loan.deadline && (
                    <p className="text-[#B91C1C]/70 text-xs mt-2 font-bold">
                      Terlambat{" "}
                      {formatDistance(new Date(loan.deadline), new Date(), {
                        locale: idLocale,
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
