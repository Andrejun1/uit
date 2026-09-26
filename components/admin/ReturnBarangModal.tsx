"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  returnLoan,
  getLoanByKode,
  updateLoan,
  getAllLoans,
} from "@/lib/loans";
import { increaseStock, getItemByBarcode } from "@/lib/items";
import { useRealtimeListener } from "@/hooks/use-realtime";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
  QrCode,
  Clock,
  User,
  Phone,
  X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import BarcodeScannerModal from "@/components/public/BarcodeScannerModal";
import Image from "next/image";

interface LoanWithDetails {
  id: string;
  kode_unik: string;
  nama: string;
  email: string | null;
  nomor_whatsapp: string;
  nama_barang: string | null;
  deadline: string;
  status: "dipinjam" | "kembali" | "selesai";
  tanggal_pinjam: string;
  tanggal_kembali: string | null;
  foto_peminjam_url: string | null;
  foto_barang_url: string | null;
  item_id: string | null;
}

export default function ReturnBarangModal() {
  const { toast } = useToast();
  const [showScanner, setShowScanner] = useState(false);
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<LoanWithDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isReturning, setIsReturning] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Track last scanned code to prevent duplicates
  const lastScannedRef = useRef<{ code: string; timestamp: number } | null>(
    null,
  );

  const loadLoans = useCallback(async () => {
    try {
      const data = await getAllLoans();
      // Filter hanya yang masih dipinjam (belum dikembalikan)
      const activeLoans = data.filter(
        (l) => l.status === "dipinjam",
      ) as LoanWithDetails[];
      setLoans(activeLoans);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Gagal memuat data peminjaman",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  // Subscribe to realtime updates with optimization
  useRealtimeListener("loans", () => {
    loadLoans();
  }, { event: "*" });

  const sendReturnNotification = async (loan: LoanWithDetails) => {
    if (!loan.email) return;
    try {
      await fetch("/api/loan-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "return",
          email: loan.email,
          nama: loan.nama,
          kode_unik: loan.kode_unik,
          deadline: loan.deadline,
          items: [{ nama_barang: loan.nama_barang ?? "Barang", quantity: 1 }],
        }),
      });
    } catch (error) {
      console.warn("Email pengembalian gagal dikirim", error);
    }
  };

  const handleScanResult = async (kodeBarang: string) => {
    // Prevent duplicate scans within 2 seconds
    const now = Date.now();
    if (
      lastScannedRef.current &&
      lastScannedRef.current.code === kodeBarang &&
      now - lastScannedRef.current.timestamp < 2000
    ) {
      return;
    }
    lastScannedRef.current = { code: kodeBarang, timestamp: now };

    setShowScanner(false);
    setLoading(true);

    try {
      // First try to find loan by kode (UIT code)
      let loan = await getLoanByKode(kodeBarang);

      // If not found, try to find item by barcode (LAB code)
      if (!loan && kodeBarang.startsWith("LAB")) {
        const item = await getItemByBarcode(kodeBarang);
        if (item && item.id) {
          // Find loan with this item_id that is still borrowed
          const loanForItem = loans.find(
            (l) => l.item_id === item.id && l.status === "dipinjam",
          );
          if (loanForItem) {
            loan = loanForItem as any;
          }
        }
      }

      if (!loan) {
        toast({
          title: "Peminjaman Tidak Ditemukan",
          description: `Kode "${kodeBarang}" tidak ditemukan atau sudah dikembalikan.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (loan.status === "kembali") {
        toast({
          title: "Sudah Dikembalikan",
          description: `Barang ini sudah dikembalikan pada ${format(
            new Date(loan.tanggal_kembali!),
            "dd MMM yyyy HH:mm",
            { locale: idLocale },
          )}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Automatically process the return without showing dialog
      setIsReturning(true);
      try {
        // 1. Update loan status to 'kembali' and restore stock internally
        await returnLoan(loan.id);

        // 3. Send return notification
        await sendReturnNotification(loan);

        // 4. Reload loans
        await loadLoans();

        toast({
          title: "Berhasil!",
          description: `Barang "${loan.nama_barang ?? "item"}" berhasil dikembalikan.`,
        });

        setSelectedLoan(null);
        setShowConfirmDialog(false);
      } catch (err: any) {
        console.error(err);
        toast({
          title: "Error",
          description: err.message || "Gagal memproses pengembalian",
          variant: "destructive",
        });
      } finally {
        setIsReturning(false);
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal memproses scan barcode",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!selectedLoan) return;

    setIsReturning(true);
    try {
      // 1. Update loan status to 'kembali' and restore stock internally
      await returnLoan(selectedLoan.id);

      // 3. Send return notification
      await sendReturnNotification(selectedLoan);

      // 4. Reload loans
      await loadLoans();

      toast({
        title: "Berhasil!",
        description: `Barang "${selectedLoan.nama_barang ?? "item"}" berhasil dikembalikan.`,
      });

      setShowConfirmDialog(false);
      setSelectedLoan(null);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal memproses pengembalian",
        variant: "destructive",
      });
    } finally {
      setIsReturning(false);
    }
  };

  const isOverdue = selectedLoan
    ? new Date(selectedLoan.deadline) < new Date()
    : false;

  return (
    <div className="space-y-6">
      {/* Scan Modal */}
      {showScanner && (
        <BarcodeScannerModal
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="kicker">Return</span>
          <h2 className="font-display font-bold text-3xl text-ink">
            Pengembalian Barang
          </h2>
          <p className="text-ink/50 mt-1 font-medium">
            Kelola pengembalian barang yang sedang dipinjam
          </p>
        </div>
        <button
          onClick={() => setShowScanner(true)}
          className="brut-btn brut-btn-blue !px-5 !py-3"
        >
          <QrCode className="w-4 h-4" />
          Scan QR Code
        </button>
      </div>

      {/* Confirm Dialog */}
      {showConfirmDialog && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60">
          <div className="w-full max-w-md bg-white border-2 border-ink rounded-2xl shadow-brut-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b-2 border-ink bg-[#F5F3EC]">
              <h3 className="font-display font-bold text-lg text-ink">
                Konfirmasi Pengembalian
              </h3>
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isReturning}
                className="w-8 h-8 rounded-lg border-2 border-ink bg-white flex items-center justify-center text-ink shadow-brut-sm hover:bg-[#FEE2E2] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {selectedLoan.foto_barang_url && (
                <div className="relative h-40 rounded-xl border-2 border-ink overflow-hidden shadow-brut-sm">
                  <Image
                    src={selectedLoan.foto_barang_url}
                    alt={selectedLoan.nama_barang ?? "Foto barang"}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 shrink-0 rounded-lg border-2 border-ink bg-[#DBEAFE] flex items-center justify-center">
                    <Package className="w-4 h-4 text-[#1D4ED8]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink/40 uppercase tracking-wide">
                      Barang
                    </p>
                    <p className="text-sm font-semibold text-ink">
                      {selectedLoan.nama_barang}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 shrink-0 rounded-lg border-2 border-ink bg-[#E0F2FE] flex items-center justify-center">
                    <User className="w-4 h-4 text-[#0369A1]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink/40 uppercase tracking-wide">
                      Peminjam
                    </p>
                    <p className="text-sm font-semibold text-ink">
                      {selectedLoan.nama}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 shrink-0 rounded-lg border-2 border-ink bg-[#DCFCE7] flex items-center justify-center">
                    <Phone className="w-4 h-4 text-[#15803D]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink/40 uppercase tracking-wide">
                      WhatsApp
                    </p>
                    <p className="text-sm font-semibold text-ink">
                      {selectedLoan.nomor_whatsapp}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 shrink-0 rounded-lg border-2 border-ink bg-[#F3E8FF] flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#7E22CE]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink/40 uppercase tracking-wide">
                      Dipinjam{" "}
                      {formatDistanceToNow(
                        new Date(selectedLoan.tanggal_pinjam),
                        {
                          addSuffix: true,
                          locale: idLocale,
                        },
                      )}
                    </p>
                    <p className="text-sm font-semibold text-ink">
                      Deadline:{" "}
                      {format(
                        new Date(selectedLoan.deadline),
                        "dd MMM yyyy HH:mm",
                        {
                          locale: idLocale,
                        },
                      )}
                    </p>
                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 mt-2 brut-badge badge-red">
                        <AlertCircle className="w-3 h-3" />
                        Terlambat{" "}
                        {formatDistanceToNow(
                          new Date(selectedLoan.deadline),
                          {
                            locale: idLocale,
                          },
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-[#DCFCE7] border-2 border-[#15803D] rounded-xl p-3 shadow-brut-sm">
                <p className="text-xs font-bold text-[#15803D]">
                  Status: Siap Dikembalikan
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t-2 border-ink bg-[#F5F3EC]">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isReturning}
                className="flex-1 brut-btn !py-3 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReturn}
                disabled={isReturning}
                className="flex-1 brut-btn brut-btn-green !py-3 disabled:opacity-50"
              >
                {isReturning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Kembalikan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Loans List */}
      <div className="brut-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b-2 border-ink bg-[#E0F2FE]">
          <h3 className="font-display font-bold text-ink">
            Barang Sedang Dipinjam ({loans.length})
          </h3>
          <button
            onClick={loadLoans}
            disabled={loading}
            className="w-8 h-8 rounded-lg border-2 border-ink bg-white flex items-center justify-center text-ink shadow-brut-sm hover:bg-[#E0F2FE] disabled:opacity-40 transition-all"
            title="Refresh"
          >
            <RotateIcon />
          </button>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
            </div>
          ) : loans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-ink/50">
              <div className="w-14 h-14 rounded-2xl border-2 border-ink bg-[#DCFCE7] flex items-center justify-center shadow-brut-sm mb-3">
                <CheckCircle2 className="w-7 h-7 text-[#15803D]" />
              </div>
              <p className="font-bold text-ink/60">
                Semua barang sudah dikembalikan
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {loans.map((loan) => {
                const isLate = new Date(loan.deadline) < new Date();
                return (
                  <div
                    key={loan.id}
                    className="p-4 brut-panel transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-bold text-ink truncate">
                            {loan.nama_barang}
                          </h3>
                          {isLate && (
                            <span className="brut-badge badge-red text-[10px]">
                              Terlambat
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-ink/50 font-medium">
                          {loan.nama} • {loan.nomor_whatsapp}
                        </p>
                        <div className="flex gap-2 mt-1.5">
                          <span className="inline-flex items-center font-mono text-[11px] font-bold border-2 border-ink bg-white px-2 py-0.5 rounded-lg shadow-brut-sm">
                            {loan.kode_unik}
                          </span>
                          <span className="inline-flex items-center text-[11px] font-bold text-ink/50">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDistanceToNow(
                              new Date(loan.tanggal_pinjam),
                              { addSuffix: true, locale: idLocale },
                            )}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedLoan(loan);
                          setShowConfirmDialog(true);
                        }}
                        className="brut-btn brut-btn-green !py-2.5 shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Kembalikan
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RotateIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
    </svg>
  );
}