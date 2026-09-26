"use client";

import { usePathname } from "next/navigation";
import { Menu, AlertTriangle, LogOut } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, { title: string; desc: string }> = {
  "/admin/dashboard": { title: "Dashboard", desc: "Ringkasan data peminjaman" },
  "/admin/new": {
    title: "Peminjaman Baru",
    desc: "Tambah data peminjaman baru",
  },
  "/admin/loans": {
    title: "Daftar Peminjaman",
    desc: "Kelola semua peminjaman",
  },
  "/admin/items": {
    title: "Katalog Barang",
    desc: "Kelola inventaris barang laboratorium",
  },
  "/admin/return": {
    title: "Pengembalian",
    desc: "Proses pengembalian barang",
  },
};

interface AdminHeaderProps {
  onMenuClick: () => void;
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const pathname = usePathname();
  const page = pageTitles[pathname] || {
    title: "Admin",
    desc: "Panel administrasi",
  };
  const now = new Date();
  const { showWarning, remainingTime, signOut } = useAuth();

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {/* Inactivity Warning Banner */}
      {showWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#7DD3FC] border-b-2 border-ink px-4 py-3 flex items-center justify-center gap-3 shadow-brut-sm">
          <AlertTriangle className="w-5 h-5 text-ink flex-shrink-0" />
          <p className="text-ink text-sm font-bold">
            Sesi akan berakhir dalam {formatTime(remainingTime)}. Lakukan
            aktivitas untuk tetap login.
          </p>
          <button
            onClick={signOut}
            className="brut-btn brut-btn-red !py-1.5 !px-3 !text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      )}

      <header
        className={cn(
          "bg-white border-b-2 border-ink px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30",
          showWarning && "mt-12",
        )}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            aria-label="Buka menu"
            className="lg:hidden w-9 h-9 rounded-lg border-2 border-ink bg-white flex items-center justify-center text-ink shadow-brut-sm hover:bg-[#E0F2FE]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight text-ink">
              {page.title}
            </h1>
            <p className="text-ink/50 text-xs hidden sm:block">{page.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 border-2 border-ink rounded-lg px-3 py-1.5 bg-white shadow-brut-sm">
            <span className="text-ink/60 text-xs font-medium">
              {format(now, "EEEE, dd MMM yyyy", { locale: idLocale })}
            </span>
            <span className="text-ink text-xs font-mono font-bold">
              {format(now, "HH:mm")}
            </span>
          </div>
          <div className="w-3 h-3 border-2 border-ink bg-[#22C55E] rounded-full animate-pulse shadow-brut-sm" title="Sistem online" />
        </div>
      </header>
    </>
  );
}