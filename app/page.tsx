"use client";
import { useEffect, useState, useCallback } from "react";
import { getAllLoans } from "@/lib/loans";
import { getAvailableItems, Item } from "@/lib/items";
import { Loan } from "@/lib/supabase/types";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import {
  Search,
  Package,
  Clock,
  CheckCircle2,
  TrendingUp,
  Scan,
  Shield,
  X,
  FlaskConical,
  ZoomIn,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import BarcodeScannerModal from "@/components/public/BarcodeScannerModal";
import LoanCard from "@/components/public/LoanCard";
import StatsCard from "@/components/public/StatsCard";
import { cn } from "@/lib/utils";

type ActiveTab = "katalog" | "riwayat";

export default function PublicHomePage() {
  // ===== STATE =====
  const [activeTab, setActiveTab] = useState<ActiveTab>("katalog");
  
  // Data Loans
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loanSearchQuery, setLoanSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "dipinjam" | "kembali">("all");
  
  // Data Catalog
  const [catalogItems, setCatalogItems] = useState<Item[]>([]);
  const [filteredCatalogItems, setFilteredCatalogItems] = useState<Item[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // UI State
  const [showScanner, setShowScanner] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);

  // ===== LOAD FUNCTIONS =====
  const loadLoans = async () => {
    try {
      const data = await getAllLoans();
      setLoans(data as Loan[]);
    } catch (error) {
      console.error("Error loading loans:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogItems = async () => {
    try {
      const data = await getAvailableItems();
      setCatalogItems(data);
    } catch (error) {
      console.error("Error loading catalog:", error);
    } finally {
      setCatalogLoading(false);
    }
  };

  // ===== REALTIME SETUP =====
  const setupRealtime = () => {
    const channel = supabase.channel("public-loans-realtime");
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "loans" },
      async () => {
        await Promise.all([loadLoans(), loadCatalogItems()]);
      }
    );

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") console.log("Realtime active");
      if (status === "CHANNEL_ERROR") console.error("Realtime error");
    });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // ===== FILTER LOANS =====
  const filterLoans = useCallback(() => {
    let filtered = [...loans];
    if (loanSearchQuery.trim()) {
      const q = loanSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.kode_unik.toLowerCase().includes(q) ||
          l.nama.toLowerCase().includes(q) ||
          l.nama_barang.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((l) => l.status === statusFilter);
    }
    setFilteredLoans(filtered);
  }, [loans, loanSearchQuery, statusFilter]);

  // ===== FILTER CATALOG =====
  const filterCatalogItems = useCallback(() => {
    let filtered = [...catalogItems];
    if (catalogSearchQuery.trim()) {
      const q = catalogSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.nama_barang.toLowerCase().includes(q) ||
          item.kode_barang.toLowerCase().includes(q) ||
          item.deskripsi?.toLowerCase().includes(q) ||
          item.kategori?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.kategori === categoryFilter);
    }
    setFilteredCatalogItems(filtered);
  }, [catalogItems, catalogSearchQuery, categoryFilter]);

  // ===== GET UNIQUE CATEGORIES =====
  const categories = Array.from(
    new Set(catalogItems.map((item) => item.kategori).filter(Boolean))
  );

  // ===== STABLE SCAN HANDLERS (Mencegah kamera restart) =====
  const handleScanResult = useCallback((kode: string) => {
    setShowScanner(false);
    window.location.href = `/detail/${kode}`;
  }, []);

  const handleCloseScanner = useCallback(() => {
    setShowScanner(false);
  }, []);

  // ===== IMAGE MODAL HANDLERS =====
  const openImageModal = (url: string, alt: string) => {
    setSelectedImage({ url, alt });
    document.body.style.overflow = "hidden";
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    document.body.style.overflow = "unset";
  };

  // ===== STATS =====
  const stats = {
    total: loans.length,
    active: loans.filter((l) => l.status === "dipinjam").length,
    returned: loans.filter((l) => l.status === "kembali").length,
    today: loans.filter((l) => {
      const d = new Date(l.tanggal_pinjam);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
  };

  // ===== EFFECTS =====
  useEffect(() => {
    loadLoans();
    loadCatalogItems();
    const cleanupRealtime = setupRealtime();

    // Set initial time on client mount
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      clearInterval(timer);
      cleanupRealtime();
    };
  }, []);

  useEffect(() => {
    filterLoans();
  }, [filterLoans]);

  useEffect(() => {
    filterCatalogItems();
  }, [filterCatalogItems]);

  // Close modal with ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeImageModal();
    };
    if (selectedImage) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => window.removeEventListener("keydown", handleEsc);
  }, [selectedImage]);

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-[#F5F3EC]">
      {/* Header */}
      <header className="border-b-2 border-ink bg-[#F5F3EC]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border-2 border-ink shadow-brut-sm flex items-center justify-center">
                <img src="/logounimus.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-ink font-display font-bold text-lg tracking-tight">
                  Unimus <span className="bg-[#7DD3FC] px-1 rounded">Inventrack</span>
                </span>
                <p className="text-[10px] text-ink/50 -mt-0.5 hidden sm:block font-semibold">
                  Sistem Peminjaman Laboratorium
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Jam tanpa detik (mencegah hydration error) */}
              <div className="hidden sm:block text-right">
                <p className="text-ink/40 text-xs font-medium">
                  {currentTime
                    ? format(currentTime, "EEEE, dd MMMM yyyy", { locale: idLocale })
                    : "Memuat..."}
                </p>
                <p className="text-ink font-mono text-sm font-bold">
                  {currentTime ? format(currentTime, "HH:mm") : "--:--"}
                </p>
              </div>
              <a
                href="/login"
                className="flex items-center gap-2 brut-btn brut-btn-blue !px-4 !py-2"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-16 pb-10 px-4 overflow-hidden">
        {/* Decorative blocks */}
        <div className="absolute top-6 right-6 w-24 h-24 bg-[#2563EB]/15 border-2 border-ink rounded-2xl rotate-12 hidden lg:block" aria-hidden />
        <div className="absolute bottom-4 left-10 w-16 h-16 bg-[#7DD3FC] border-2 border-ink rounded-xl -rotate-6 hidden lg:block" aria-hidden />
        <div className="absolute top-16 left-1/4 w-10 h-10 bg-[#22C55E]/30 border-2 border-ink rounded-lg rotate-45 hidden lg:block" aria-hidden />

        <div className="max-w-7xl mx-auto text-center">
          <span className="kicker mb-5">Universitas Muhammadiyah Semarang</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-ink mb-4 leading-[1.05]">
            Sistem Peminjaman
            <br />
            <span className="inline-block bg-[#7DD3FC] border-2 border-ink rounded-xl px-3 py-1 shadow-brut rotate-[-1deg] mt-2">
              Barang Laboratorium
            </span>
          </h1>

          <br />

          <div className="max-w-md mx-auto">
            <button
              onClick={() => setShowScanner(true)}
              className="w-full flex items-center justify-center gap-2 brut-btn brut-btn-primary !px-6 !py-4 text-base shadow-brut"
            >
              <Scan className="w-5 h-5" />
              <span>Scan QR Code</span>
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 pb-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Peminjaman" value={stats.total} icon={Package} color="blue" />
          <StatsCard label="Sedang Dipinjam" value={stats.active} icon={Clock} color="amber" />
          <StatsCard label="Sudah Kembali" value={stats.returned} icon={CheckCircle2} color="emerald" />
          <StatsCard label="Hari Ini" value={stats.today} icon={TrendingUp} color="purple" />
        </div>
      </section>

      {/* TABS NAVIGATION */}
      <section className="px-4 pb-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2 bg-white border-2 border-ink p-1.5 rounded-2xl shadow-brut-sm">
            <button
              onClick={() => setActiveTab("katalog")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200",
                activeTab === "katalog"
                  ? "bg-[#7DD3FC] text-ink border-2 border-ink shadow-brut-sm"
                  : "text-ink/50 hover:bg-[#E0F2FE] hover:text-ink border-2 border-transparent",
              )}
            >
              <Package className="w-4 h-4" />
              <span>Katalog Barang</span>
              <span className="px-2 py-0.5 bg-ink/10 rounded-full text-xs">{catalogItems.length}</span>
            </button>
            <button
              onClick={() => setActiveTab("riwayat")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200",
                activeTab === "riwayat"
                  ? "bg-[#7DD3FC] text-ink border-2 border-ink shadow-brut-sm"
                  : "text-ink/50 hover:bg-[#E0F2FE] hover:text-ink border-2 border-transparent",
              )}
            >
              <Clock className="w-4 h-4" />
              <span>Riwayat Peminjaman</span>
              <span className="px-2 py-0.5 bg-ink/10 rounded-full text-xs">{loans.length}</span>
            </button>
          </div>
        </div>
      </section>

      {/* TAB CONTENT */}
      <section className="px-4 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* ===== TAB 1: KATALOG BARANG ===== */}
          {activeTab === "katalog" && (
            <div className="space-y-6">
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative min-w-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
                  <input
                    type="text"
                    placeholder="Cari barang, kode, atau kategori..."
                    value={catalogSearchQuery}
                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                    className="brut-input w-full !pl-12 !py-3"
                  />
                </div>
                {categories.length > 0 && (
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="brut-input !py-3 cursor-pointer w-full sm:w-52 sm:shrink-0"
                  >
                    <option value="all" className="bg-white">Semua Kategori</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat as string} className="bg-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Items Grid */}
              {catalogLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-64 rounded-2xl bg-ink/5 border-2 border-ink/10 animate-pulse" />
                  ))}
                </div>
              ) : filteredCatalogItems.length === 0 ? (
                <div className="text-center py-20 bg-white border-2 border-ink rounded-2xl shadow-brut-sm">
                  <div className="w-16 h-16 rounded-2xl border-2 border-ink bg-[#DBEAFE] flex items-center justify-center mx-auto mb-4 shadow-brut-sm">
                    <Package className="w-8 h-8 text-ink/40" />
                  </div>
                  <p className="text-ink/70 text-lg font-bold">Tidak ada barang ditemukan</p>
                  <p className="text-ink/40 text-sm mt-1 font-medium">
                    {catalogSearchQuery ? "Coba kata kunci lain" : "Belum ada barang tersedia"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredCatalogItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() =>
                        item.foto_url ? openImageModal(item.foto_url, item.nama_barang) : null
                      }
                      className={cn(
                        "group block bg-white border-2 border-ink rounded-2xl overflow-hidden shadow-brut-sm transition-all duration-300",
                        item.foto_url
                          ? "cursor-zoom-in hover:-translate-y-1 hover:shadow-brut"
                          : "cursor-default",
                      )}
                    >
                      <div className="relative h-36 bg-[#F5F3EC] border-b-2 border-ink">
                        {item.foto_url ? (
                          <>
                            <Image
                              src={item.foto_url}
                              alt={item.nama_barang}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 transition-colors duration-300 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[#7DD3FC] border-2 border-ink px-3 py-1.5 rounded-lg text-ink text-xs font-bold shadow-brut-sm">
                                <ZoomIn className="w-3.5 h-3.5 inline mr-1" />
                                Lihat Gambar
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <FlaskConical className="w-12 h-12 text-ink/20" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className={cn(
                            "px-2 py-1 text-xs font-bold border-2 border-ink rounded-lg shadow-brut-sm",
                            item.stok_tersedia > 0 ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEE2E2] text-[#B91C1C]",
                          )}>
                            {item.stok_tersedia} tersedia
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-ink font-bold font-display text-sm line-clamp-1">{item.nama_barang}</h3>
                        <p className="text-ink/40 text-xs mt-0.5 font-mono">{item.kode_barang}</p>
                        {item.kategori && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-[#E0F2FE] border-2 border-ink text-ink/70 text-[10px] font-bold rounded-lg">
                            {item.kategori}
                          </span>
                        )}
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-ink/40 font-bold mb-1">
                            <span>Ketersediaan</span>
                            <span>Sisa: {item.stok_tersedia} dari {item.stok_total}</span>
                          </div>
                          <div className="h-2 bg-ink/10 border-2 border-ink rounded-full overflow-hidden shadow-brut-sm">
                            <div
                              className="h-full bg-gradient-to-r from-[#22C55E] to-[#15803D] rounded-full"
                              style={{
                                width: `${item.stok_total > 0 ? (item.stok_tersedia / item.stok_total) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredCatalogItems.length > 0 && (
                <div className="text-center text-ink/40 text-sm font-medium">
                  Menampilkan {filteredCatalogItems.length} dari {catalogItems.length} barang
                </div>
              )}
            </div>
          )}

          {/* ===== TAB 2: RIWAYAT PEMINJAMAN ===== */}
          {activeTab === "riwayat" && (
            <div className="space-y-6">
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
                  <input
                    type="text"
                    placeholder="Cari kode peminjaman, nama, atau barang..."
                    value={loanSearchQuery}
                    onChange={(e) => setLoanSearchQuery(e.target.value)}
                    className="brut-input w-full !pl-12 !py-3"
                  />
                </div>
                <div className="flex gap-2">
                  {(["all", "dipinjam", "kembali"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={cn(
                        "px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 border-2",
                        statusFilter === s
                          ? "bg-[#7DD3FC] text-ink border-ink shadow-brut-sm"
                          : "bg-white text-ink/50 border-ink/20 hover:bg-[#E0F2FE] hover:text-ink",
                      )}
                    >
                      {s === "all" ? "Semua" : s === "dipinjam" ? "Dipinjam" : "Kembali"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loans Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-48 rounded-2xl bg-ink/5 border-2 border-ink/10 animate-pulse" />
                  ))}
                </div>
              ) : filteredLoans.length === 0 ? (
                <div className="text-center py-20 bg-white border-2 border-ink rounded-2xl shadow-brut-sm">
                  <div className="w-16 h-16 rounded-2xl border-2 border-ink bg-[#F3E8FF] flex items-center justify-center mx-auto mb-4 shadow-brut-sm">
                    <Clock className="w-8 h-8 text-ink/40" />
                  </div>
                  <p className="text-ink/70 text-lg font-bold">Tidak ada data peminjaman</p>
                  <p className="text-ink/40 text-sm mt-1 font-medium">
                    {loanSearchQuery ? "Coba kata kunci lain" : "Belum ada peminjaman tercatat"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLoans.map((loan, i) => (
                    <LoanCard key={loan.id} loan={loan as any} index={i} />
                  ))}
                </div>
              )}

              {filteredLoans.length > 0 && (
                <div className="text-center text-ink/40 text-sm font-medium">
                  Menampilkan {filteredLoans.length} dari {loans.length} peminjaman
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Image Modal / Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 backdrop-blur-sm p-4"
          onClick={closeImageModal}
        >
          <button
            onClick={closeImageModal}
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white border-2 border-ink shadow-brut flex items-center justify-center text-ink hover:bg-[#FEE2E2] transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl border-2 border-ink bg-white p-2 shadow-brut-xl">
              <Image
                src={selectedImage.url}
                alt={selectedImage.alt}
                width={1200}
                height={800}
                className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
              />
            </div>
            <p className="text-center text-white/90 text-sm mt-3 font-bold">{selectedImage.alt}</p>
          </div>
        </div>
      )}

      {/* Scanner Modal (Props stabil, tidak trigger restart kamera) */}
      {showScanner && (
        <BarcodeScannerModal onResult={handleScanResult} onClose={handleCloseScanner} />
      )}
    </div>
  );
}