"use client";

import { useEffect, useState } from "react";
import {
  getAllLoans,
  returnLoan,
  deleteLoanWithFiles,
  updateLoanDeadline,
} from "@/lib/loans";
import { Loan, LoanItemWithItem } from "@/lib/loans";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistance, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  Printer,
  Eye,
  Trash2,
  Loader2,
  Package,
  RefreshCw,
  User,
  Clock,
  Filter,
  Pencil,
} from "lucide-react";
import LoanDetailModal from "@/components/admin/LoanDetailModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import ReturnConfirmModal from "@/components/admin/ReturnConfirmModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LoanWithItems = Loan & {
  loan_items?: LoanItemWithItem[];
  email?: string | null;
};

type LoanStatus = "dipinjam" | "kembali" | "selesai";

const statusBadge: Record<LoanStatus, { cls: string; label: string }> = {
  dipinjam: { cls: "badge-blue", label: "Dipinjam" },
  kembali: { cls: "badge-green", label: "Kembali" },
  selesai: { cls: "badge-purple", label: "Selesai" },
};

export default function AdminLoansPage() {
  const { toast } = useToast();
  const [loans, setLoans] = useState<LoanWithItems[]>([]);
  const [filtered, setFiltered] = useState<LoanWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "dipinjam" | "kembali"
  >("all");
  const [selectedLoan, setSelectedLoan] = useState<LoanWithItems | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<LoanWithItems | null>(
    null,
  );
  const [confirmReturn, setConfirmReturn] = useState<LoanWithItems | null>(
    null,
  );
  const [processing, setProcessing] = useState<string | null>(null);

  // Edit deadline
  const [editDeadlineLoan, setEditDeadlineLoan] =
    useState<LoanWithItems | null>(null);
  const [deadlineDraft, setDeadlineDraft] = useState<string>("");
  const [deadlineSavingForId, setDeadlineSavingForId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    loadLoans();
    const channel = supabase
      .channel("admin-loans")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loans" },
        () => loadLoans(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    let result = [...loans];
    if (q) {
      result = result.filter(
        (l) =>
          (l.kode_unik ?? "").toLowerCase().includes(q) ||
          (l.nama ?? "").toLowerCase().includes(q) ||
          (l.nama_barang ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    setFiltered(result);
  }, [loans, searchQuery, statusFilter]);

  const loadLoans = async () => {
    try {
      const data = await getAllLoans();
      setLoans(data as LoanWithItems[]);
    } catch {
      toast({
        title: "Error",
        description: "Gagal memuat data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLoanDeadlineInState = (loanId: string, deadlineISO: string) => {
    setLoans((prev) =>
      prev.map((l) => (l.id === loanId ? { ...l, deadline: deadlineISO } : l)),
    );
  };

  const sendReturnNotification = async (loan: LoanWithItems) => {
    if (!loan.email) {
      console.warn("Email tidak ditemukan pada data loan, skip notifikasi.");
      return;
    }

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
          items:
            loan.loan_items && loan.loan_items.length > 0
              ? loan.loan_items.map((li) => ({
                  nama_barang: li.items?.nama_barang ?? "Barang",
                  quantity: li.quantity ?? 1,
                }))
              : [
                  {
                    nama_barang: loan.nama_barang ?? "Barang",
                    quantity: loan.quantity ?? 1,
                  },
                ],
        }),
      });
    } catch (error) {
      console.warn("Gagal mengirim email notifikasi pengembalian", error);
    }
  };

  const handleReturn = async (loan: LoanWithItems) => {
    setProcessing(loan.id);
    try {
      await returnLoan(loan.id);
      await sendReturnNotification(loan);

      setLoans((prev) =>
        prev.map((l) =>
          l.id === loan.id
            ? {
                ...l,
                status: "kembali",
                tanggal_kembali: new Date().toISOString(),
              }
            : l,
        ),
      );

      toast({
        title: "Berhasil",
        description:
          "Barang ditandai sebagai dikembalikan & notifikasi terkirim",
      });
      setConfirmReturn(null);
    } catch {
      toast({
        title: "Error",
        description: "Gagal mengembalikan barang",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (loan: LoanWithItems) => {
    if (loan.status === "dipinjam") {
      toast({
        title: "Tidak Bisa Dihapus",
        description:
          "Barang masih dipinjam. Kembalikan barang terlebih dahulu sebelum menghapus data.",
        variant: "destructive",
      });
      setConfirmDelete(null);
      return;
    }

    setProcessing(loan.id);
    try {
      await deleteLoanWithFiles(
        loan.id,
        loan.foto_peminjam_url,
        loan.foto_barang_url,
      );

      setLoans((prev) => prev.filter((l) => l.id !== loan.id));

      toast({
        title: "Dihapus",
        description: "Data peminjaman dan foto berhasil dihapus",
      });
      setConfirmDelete(null);
    } catch {
      toast({
        title: "Error",
        description: "Gagal menghapus data",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const getDuration = (loan: LoanWithItems) => {
    const end = loan.tanggal_kembali
      ? new Date(loan.tanggal_kembali)
      : new Date();
    return formatDistance(new Date(loan.tanggal_pinjam), end, {
      locale: idLocale,
    });
  };

  const getLoanSummary = (loan: LoanWithItems) => {
    if (!loan.loan_items || loan.loan_items.length === 0) {
      return {
        totalJenis: 1,
        totalUnit: loan.quantity ?? 1,
        items: loan.nama_barang
          ? [
              {
                nama_barang: loan.nama_barang,
                quantity: loan.quantity ?? 1,
                kode_barang: null,
              },
            ]
          : [],
      };
    }

    const totalJenis = loan.loan_items.length;
    const totalUnit = loan.loan_items.reduce(
      (acc, item) => acc + (item.quantity || 1),
      0,
    );
    const items = loan.loan_items.map((li) => ({
      nama_barang: li.items?.nama_barang ?? "Unknown",
      quantity: li.quantity ?? 1,
      kode_barang: li.items?.kode_barang ?? null,
    }));

    return { totalJenis, totalUnit, items };
  };

  const normalizeLoanForModal = (loan: LoanWithItems) => ({
    ...loan,
    nama_barang: loan.nama_barang ?? "",
    kode_unik: loan.kode_unik ?? "",
    nama: loan.nama ?? "",
    prodi: loan.prodi ?? "",
    jurusan: loan.jurusan ?? "",
    foto_peminjam_url: loan.foto_peminjam_url ?? null,
    loan_items: loan.loan_items,
  });

  const handleOpenEditDeadline = (loan: LoanWithItems) => {
    if (loan.status === "kembali") {
      toast({
        title: "Tidak Dapat Diedit",
        description:
          "Deadline tidak dapat diubah karena barang sudah dikembalikan.",
        variant: "destructive",
      });
      return;
    }

    setEditDeadlineLoan(loan);
    const dateOnly = loan.deadline ? new Date(loan.deadline) : null;
    if (!dateOnly || Number.isNaN(dateOnly.getTime())) {
      setDeadlineDraft("");
      return;
    }
    const yyyy = dateOnly.getFullYear();
    const mm = String(dateOnly.getMonth() + 1).padStart(2, "0");
    const dd = String(dateOnly.getDate()).padStart(2, "0");
    setDeadlineDraft(`${yyyy}-${mm}-${dd}`);
  };

  const handleSaveDeadline = async () => {
    if (!editDeadlineLoan) return;

    const loanId = editDeadlineLoan.id;
    const loanPickupDate = editDeadlineLoan.pickup_date;

    if (!deadlineDraft) {
      toast({
        title: "Validasi",
        description: "Deadline wajib diisi",
        variant: "destructive",
      });
      return;
    }

    const selected = new Date(deadlineDraft);
    if (Number.isNaN(selected.getTime())) {
      toast({
        title: "Validasi",
        description: "Deadline tanggal tidak valid",
        variant: "destructive",
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    selected.setHours(0, 0, 0, 0);

    if (selected < today) {
      toast({
        title: "Validasi",
        description: "Deadline tidak boleh sebelum hari ini",
        variant: "destructive",
      });
      return;
    }

    if (loanPickupDate) {
      const pickup = new Date(loanPickupDate);
      pickup.setHours(0, 0, 0, 0);
      if (selected < pickup) {
        toast({
          title: "Validasi",
          description: "Deadline tidak boleh sebelum tanggal pickup",
          variant: "destructive",
        });
        return;
      }
    }

    const deadlineToSave = new Date(deadlineDraft);
    deadlineToSave.setHours(23, 59, 0, 0);
    const deadlineISO = deadlineToSave.toISOString();

    setDeadlineSavingForId(loanId);
    try {
      await updateLoanDeadline(loanId, deadlineDraft);

      updateLoanDeadlineInState(loanId, deadlineISO);

      toast({
        title: "Deadline diperbarui",
        description: "Tanggal pengembalian berhasil dipanjangkan/diedit",
      });
      setEditDeadlineLoan(null);
    } catch {
      toast({
        title: "Error",
        description: "Gagal menyimpan deadline",
        variant: "destructive",
      });
    } finally {
      setDeadlineSavingForId(null);
    }
  };

  return (
    <>
      {showDetail && selectedLoan && (
        <LoanDetailModal
          loan={normalizeLoanForModal(selectedLoan)}
          onClose={() => setShowDetail(false)}
        />
      )}
      {confirmDelete && (
        <DeleteConfirmModal
          loan={normalizeLoanForModal(confirmDelete)}
          processing={processing === confirmDelete.id}
          onConfirm={() => handleDelete(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
      {confirmReturn && (
        <ReturnConfirmModal
          loan={normalizeLoanForModal(confirmReturn)}
          processing={processing === confirmReturn.id}
          onConfirm={() => handleReturn(confirmReturn)}
          onClose={() => setConfirmReturn(null)}
        />
      )}

      {editDeadlineLoan && (
        <Dialog
          open={!!editDeadlineLoan}
          onOpenChange={(open) => {
            if (!open) setEditDeadlineLoan(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-lg text-ink">
                Edit Deadline
              </DialogTitle>
              <DialogDescription>
                Ubah deadline pengembalian barang (disimpan jam 23:59:00).
              </DialogDescription>
            </DialogHeader>

            <div>
              <label htmlFor="deadline" className="brut-label">
                Deadline
              </label>
              <input
                id="deadline"
                name="deadline"
                type="date"
                value={deadlineDraft}
                onChange={(e) => setDeadlineDraft(e.target.value)}
                className="brut-input"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDeadlineLoan(null)}
                disabled={deadlineSavingForId === editDeadlineLoan.id}
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleSaveDeadline}
                disabled={deadlineSavingForId === editDeadlineLoan.id}
              >
                {deadlineSavingForId === editDeadlineLoan.id ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </span>
                ) : (
                  "Simpan"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="space-y-5 max-w-7xl">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              type="text"
              placeholder="Cari kode, nama, atau barang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="brut-input pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "dipinjam", "kembali"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-4 py-3 rounded-xl text-sm font-bold transition-all border-2 border-ink",
                  statusFilter === s
                    ? "bg-[#7DD3FC] text-ink shadow-brut-sm"
                    : "bg-white text-ink/50 hover:text-ink hover:bg-[#E0F2FE] shadow-brut-sm",
                )}
              >
                {s === "all"
                  ? "Semua"
                  : s === "dipinjam"
                    ? "Dipinjam"
                    : "Kembali"}
              </button>
            ))}
            <button
              onClick={() => {
                setLoading(true);
                loadLoans();
              }}
              aria-label="Muat ulang"
              className="w-12 h-12 bg-white border-2 border-ink rounded-xl flex items-center justify-center text-ink shadow-brut-sm hover:bg-[#E0F2FE] transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Count */}
        <div className="flex items-center gap-2 text-ink/50 text-sm font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>
            Menampilkan{" "}
            <span className="text-ink font-bold">{filtered.length}</span> dari{" "}
            {loans.length} data
          </span>
        </div>

        {/* Table / Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-ink animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 brut-card">
            <Package className="w-12 h-12 text-ink/15 mx-auto mb-3" />
            <p className="text-ink/40 font-semibold">Tidak ada data ditemukan</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block brut-card overflow-hidden">
              <table className="brut-table">
                <thead>
                  <tr>
                    {[
                      "Kode",
                      "Peminjam",
                      "Barang",
                      "Tanggal Pinjam",
                      "Deadline",
                      "Durasi",
                      "Status",
                      "Aksi",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((loan) => {
                    const { totalJenis, totalUnit, items } =
                      getLoanSummary(loan);
                    const st =
                      statusBadge[(loan.status as LoanStatus)] ||
                      statusBadge.dipinjam;

                    return (
                      <tr key={loan.id}>
                        <td>
                          <span className="font-mono text-[#1D4ED8] text-xs bg-[#DBEAFE] border-2 border-ink px-2 py-1 rounded-lg">
                            {loan.kode_unik}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            {loan.foto_peminjam_url ? (
                              <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 border-2 border-ink">
                                <Image
                                  src={loan.foto_peminjam_url}
                                  alt={loan.nama ?? "Peminjam"}
                                  width={36}
                                  height={36}
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-xl border-2 border-ink bg-[#DBEAFE] flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-[#1D4ED8]" />
                              </div>
                            )}
                            <div>
                              <p className="text-ink font-semibold text-sm">
                                {loan.nama}
                              </p>
                              <p className="text-ink/40 text-xs">
                                {loan.prodi} • Sem {loan.semester}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-1">
                            {items.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="text-ink/70 text-sm">
                                {item.nama_barang} × {item.quantity}
                              </div>
                            ))}
                            {items.length > 2 && (
                              <div className="text-ink/40 text-xs">
                                + {items.length - 2} barang lagi
                              </div>
                            )}
                            <div className="text-[#1D4ED8] text-xs font-bold">
                              Total: {totalUnit} unit ({totalJenis} jenis)
                            </div>
                          </div>
                        </td>
                        <td className="text-ink/60 text-xs whitespace-nowrap">
                          {format(
                            new Date(loan.tanggal_pinjam),
                            "dd MMM yyyy HH:mm",
                            { locale: idLocale },
                          )}
                        </td>
                        <td
                          className={cn(
                            "text-xs whitespace-nowrap",
                            loan.status === "dipinjam" &&
                              loan.deadline &&
                              new Date(loan.deadline) < new Date()
                              ? "text-[#B91C1C] font-bold"
                              : "text-ink/60",
                          )}
                        >
                          {format(
                            new Date(loan.deadline),
                            "dd MMM yyyy HH:mm",
                            { locale: idLocale },
                          )}
                        </td>
                        <td className="text-ink/60 text-xs">
                          {getDuration(loan)}
                        </td>
                        <td>
                          <span className={cn("brut-badge", st.cls)}>
                            {st.label}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedLoan(loan);
                                setShowDetail(true);
                              }}
                              className="w-8 h-8 rounded-lg border-2 border-ink bg-white shadow-brut-sm flex items-center justify-center text-ink/60 hover:bg-[#E0F2FE] transition-colors"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <Link
                              href={`/admin/print/${loan.kode_unik}`}
                              target="_blank"
                            >
                              <div
                                className="w-8 h-8 rounded-lg border-2 border-ink bg-white shadow-brut-sm flex items-center justify-center text-ink/60 hover:bg-[#E0F2FE] transition-colors"
                                title="Print QR"
                              >
                                <Printer className="w-4 h-4" />
                              </div>
                            </Link>
                            <button
                              onClick={() => handleOpenEditDeadline(loan)}
                              disabled={deadlineSavingForId === loan.id}
                              className={cn(
                                "w-8 h-8 rounded-lg border-2 border-ink bg-white shadow-brut-sm flex items-center justify-center transition-colors",
                                loan.status === "kembali"
                                  ? "opacity-30 cursor-not-allowed text-ink/20"
                                  : "text-ink/60 hover:bg-[#E0F2FE]",
                              )}
                              title={
                                loan.status === "kembali"
                                  ? "Barang sudah kembali"
                                  : "Edit Deadline"
                              }
                            >
                              {deadlineSavingForId === loan.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Pencil className="w-4 h-4" />
                              )}
                            </button>

                            {loan.status === "dipinjam" && (
                              <button
                                onClick={() => setConfirmReturn(loan)}
                                disabled={processing === loan.id}
                                className="w-8 h-8 rounded-lg border-2 border-ink bg-[#DCFCE7] shadow-brut-sm flex items-center justify-center text-[#15803D] hover:bg-[#BBF7D0] transition-colors"
                                title="Kembalikan Barang"
                              >
                                {processing === loan.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDelete(loan)}
                              disabled={processing === loan.id}
                              className="w-8 h-8 rounded-lg border-2 border-ink bg-[#FEE2E2] shadow-brut-sm flex items-center justify-center text-[#B91C1C] hover:bg-[#FECACA] transition-colors"
                              title="Hapus Data"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-4">
              {filtered.map((loan) => {
                const { totalJenis, totalUnit, items } = getLoanSummary(loan);
                const st =
                  statusBadge[(loan.status as LoanStatus)] ||
                  statusBadge.dipinjam;

                return (
                  <div key={loan.id} className="brut-card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="font-mono text-[#1D4ED8] text-xs bg-[#DBEAFE] border-2 border-ink px-2 py-1 rounded-lg">
                          {loan.kode_unik}
                        </span>
                        <p className="font-display font-bold text-sm text-ink mt-2">
                          {loan.nama}
                        </p>
                        <p className="text-ink/40 text-xs">
                          {loan.prodi} • Sem {loan.semester}
                        </p>
                      </div>
                      <span className={cn("brut-badge flex-shrink-0", st.cls)}>
                        {st.label}
                      </span>
                    </div>
                    <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="border-2 border-ink rounded-lg bg-[#F5F3EC] px-2 py-1.5">
                        <p className="kicker text-ink/40 mb-0.5">Pinjam</p>
                        <p className="text-ink/70">
                          {format(
                            new Date(loan.tanggal_pinjam),
                            "dd MMM HH:mm",
                            { locale: idLocale },
                          )}
                        </p>
                      </div>
                      <div className="border-2 border-ink rounded-lg bg-[#F5F3EC] px-2 py-1.5">
                        <p className="kicker text-ink/40 mb-0.5">Deadline</p>
                        <p
                          className={cn(
                            loan.status === "dipinjam" &&
                              loan.deadline &&
                              new Date(loan.deadline) < new Date()
                              ? "text-[#B91C1C] font-bold"
                              : loan.status === "kembali"
                                ? "text-[#15803D]"
                                : "text-ink/70",
                          )}
                        >
                          {format(new Date(loan.deadline), "dd MMM HH:mm", {
                            locale: idLocale,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <p className="kicker text-ink/40 mb-1">Barang</p>
                      <div className="space-y-1">
                        {items.slice(0, 2).map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-ink/70 text-sm border-2 border-dashed border-ink/20 rounded-lg px-2 py-1"
                          >
                            <Package className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{item.nama_barang}</span>
                            <span className="font-bold flex-shrink-0">× {item.quantity}</span>
                          </div>
                        ))}
                        {items.length > 2 && (
                          <p className="text-ink/40 text-xs">
                            + {items.length - 2} barang lagi
                          </p>
                        )}
                        <p className="text-[#1D4ED8] text-xs font-bold">
                          Total: {totalUnit} unit ({totalJenis} jenis)
                        </p>
                      </div>
                    </div>
                    <p className="flex items-center gap-1.5 text-ink/40 text-xs mb-3">
                      <Clock className="w-3.5 h-3.5" />
                      {getDuration(loan)}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setSelectedLoan(loan);
                          setShowDetail(true);
                        }}
                        className="brut-btn !py-1.5 !text-xs flex-1 sm:flex-none"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </button>
                      <Link
                        href={`/admin/print/${loan.kode_unik}`}
                        target="_blank"
                      >
                        <span className="brut-btn !py-1.5 !text-xs">
                          <Printer className="w-3.5 h-3.5" /> Print
                        </span>
                      </Link>
                      <button
                        onClick={() => handleOpenEditDeadline(loan)}
                        disabled={loan.status === "kembali"}
                        className={cn(
                          "brut-btn !py-1.5 !text-xs",
                          loan.status === "kembali" && "opacity-30 cursor-not-allowed",
                        )}
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit Deadline
                      </button>
                      {loan.status === "dipinjam" && (
                        <button
                          onClick={() => setConfirmReturn(loan)}
                          className="brut-btn brut-btn-green !py-1.5 !text-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Kembalikan
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(loan)}
                        className="brut-btn brut-btn-red !py-1.5 !text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}