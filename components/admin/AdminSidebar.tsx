"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Plus,
  List,
  Package,
  Undo2,
  X,
  LogOut,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/new", label: "Peminjaman Baru", icon: Plus },
  { href: "/admin/loans", label: "Daftar Peminjaman", icon: List },
  { href: "/admin/items", label: "Katalog Barang", icon: Package },
  { href: "/admin/return", label: "Pengembalian", icon: Undo2 },
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 lg:sticky lg:top-0 lg:z-auto w-72 shrink-0 transition-transform duration-300 lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="h-full p-4 bg-[#F5F3EC] flex flex-col gap-4 overflow-y-auto">
        {/* Logo */}
        <div className="brut-card p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl border-2 border-ink bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
            <img
              src="/logounimus.png"
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm leading-tight text-ink">
              Unimus UIT
            </p>
            <p className="kicker mt-1 text-ink/50">Admin Panel</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="lg:hidden w-8 h-8 rounded-lg border-2 border-ink bg-white flex items-center justify-center text-ink shadow-brut-sm hover:bg-[#E0F2FE] flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="brut-card p-2 flex-1">
          <p className="kicker px-3 pb-1 pt-1 text-ink/40">Menu</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 border-2 text-sm font-semibold transition-all duration-150 font-display",
                  active
                    ? "bg-[#7DD3FC] text-ink border-ink shadow-brut-sm"
                    : "border-transparent text-ink/70 hover:bg-[#E0F2FE] hover:text-ink",
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-2 mt-2 border-t-2 border-dashed border-ink/20">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-ink/70 hover:bg-[#FFEDD5] transition-colors font-display"
            >
              <Home className="w-4 h-4 flex-shrink-0" />
              Lihat Halaman Publik
            </Link>
          </div>
        </nav>

        {/* User + Logout */}
        <div className="brut-card p-3">
          <div className="flex items-center gap-3 px-3 py-2.5 border-2 border-ink rounded-xl bg-[#E0F2FE]">
            <div className="w-9 h-9 rounded-lg border-2 border-ink bg-[#7DD3FC] flex items-center justify-center text-ink text-sm font-bold flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ink text-xs font-bold truncate">Admin</p>
              <p className="text-ink/50 text-[10px] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full brut-btn brut-btn-red mt-2 !py-2 !text-xs"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}