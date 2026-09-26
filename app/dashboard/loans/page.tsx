"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getAllLoans,
  returnLoan,
  deleteLoan,
  Loan,
  getLoanWithItems,
  LoanItemWithItem,
} from "@/lib/loans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { deleteLoanWithFiles } from "@/lib/loans";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  CircleCheck as CheckCircle,
  Printer,
  Eye,
  Trash2,
  ArrowLeft,
  Loader2,
  Package,
} from "lucide-react";
import { formatDistance, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Image from "next/image";
import Link from "next/link";

// Helper untuk ekstrak path file dari URL Supabase Storage
const extractStoragePath = (url: string | null): string | null => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const match = pathname.match(
      /\/storage\/v1\/object\/(?:public|authenticated)\/[^/]+\/(.+)/,
    );
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

// Type untuk loan dengan items yang sudah di-join
type LoanWithItems = Loan & {
  loan_items?: LoanItemWithItem[];
};

export default function LoansPage() {
  const { toast } = useToast();
  const [loans, setLoans] = useState<LoanWithItems[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<LoanWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLoan, setSelectedLoan] = useState<LoanWithItems | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Load all loans (header only, without items for performance)
  const loadLoans = useCallback(async () => {
    setIsRefetching(true);
    try {
      const data = await getAllLoans();
      setLoans(data as LoanWithItems[]);
    } catch (error) {
      console.error("Error loading loans:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data peminjaman",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsRefetching(false);
    }
  }, [toast]);

  // Load loan detail WITH items (untuk preview)
  const loadLoanDetail = useCallback(
    async (loanId: string): Promise<LoanWithItems | null> => {
      try {
        const loan = await getLoanWithItems(loanId);
        return loan as LoanWithItems | null;
      } catch (error) {
        console.error("Error loading loan detail:", error);
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    loadLoans();
    const interval = setInterval(loadLoans, 60000);
    return () => clearInterval(interval);
  }, [loadLoans]);

  useEffect(() => {
    let filtered = [...loans];
    if (searchQuery) {
      filtered = filtered.filter(
        (loan) =>
          loan.kode_unik.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loan.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (loan.nama_barang
            ? loan.nama_barang.toLowerCase().includes(searchQuery.toLowerCase())
            : false),
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((loan) => loan.status === statusFilter);
    }
    setFilteredLoans(filtered);
  }, [loans, searchQuery, statusFilter]);

  // Helper: Hitung total quantity & jenis barang dari loan_items
  const getLoanSummary = (loan: LoanWithItems) => {
    if (!loan.loan_items || loan.loan_items.length === 0) {
      // Fallback ke field legacy (single item)
      return {
        totalJenis: 1,
        totalUnit: loan.quantity ?? 1,
        items: loan.nama_barang
          ? [{ nama_barang: loan.nama_barang, quantity: loan.quantity ?? 1 }]
          : [],
      };
    }

    const totalJenis = loan.loan_items.length;
    const totalUnit = loan.loan_items.reduce(
      (acc, item) => acc + (item.quantity || 1),
      0,
    );
    const items = loan.loan_items.map((li) => ({
      nama_barang: li.items?.nama_barang || "Unknown",
      quantity: li.quantity,
      kode_barang: li.items?.kode_barang,
    }));

    return { totalJenis, totalUnit, items };
  };

  const handleReturn = async (loan: LoanWithItems) => {
    if (
      window.confirm(
        "Apakah Anda yakin ingin menandai barang ini sebagai dikembalikan?",
      )
    ) {
      try {
        await returnLoan(loan.id);
        toast({
          title: "Berhasil!",
          description: "Barang berhasil ditandai sebagai dikembalikan",
        });
        await loadLoans();
      } catch (error) {
        console.error("Error returning loan:", error);
        toast({
          title: "Error",
          description: "Gagal mengembalikan barang",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = async (loan: LoanWithItems) => {
    if (window.confirm("Hapus data peminjaman ini?")) {
      try {
        await deleteLoanWithFiles(
          loan.id,
          loan.foto_peminjam_url,
          loan.foto_barang_url,
        );
        toast({
          title: "Berhasil!",
          description: "Data dan foto berhasil dihapus",
        });
        await loadLoans();
      } catch (error) {
        console.error("Delete error:", error);
        toast({
          title: "Error",
          description: "Gagal menghapus data",
          variant: "destructive",
        });
      }
    }
  };

  const handlePreview = async (loan: Loan) => {
    setSelectedLoan(loan as LoanWithItems);
    setShowPreview(true);
    setPreviewLoading(true);

    // Load detail dengan items
    const detailedLoan = await loadLoanDetail(loan.id);
    if (detailedLoan) {
      setSelectedLoan(detailedLoan);
    }
    setPreviewLoading(false);
  };

  const getDuration = (loan: Loan) => {
    const endDate = loan.tanggal_kembali
      ? new Date(loan.tanggal_kembali)
      : new Date();
    return formatDistance(new Date(loan.tanggal_pinjam), endDate, {
      locale: idLocale,
    });
  };

  if (loading && loans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Memuat data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Daftar Peminjaman
          </h1>
          <p className="text-sm text-gray-500">
            Kelola dan pantau semua peminjaman barang laboratorium
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari berdasarkan kode, nama, atau barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="dipinjam">Sedang Dipinjam</SelectItem>
                <SelectItem value="kembali">Sudah Dikembalikan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Peminjam</TableHead>
                  <TableHead>Barang</TableHead>
                  <TableHead>Tanggal Pinjam</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-gray-500"
                    >
                      Tidak ada data peminjaman
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLoans.map((loan) => {
                    const { totalJenis, totalUnit, items } =
                      getLoanSummary(loan);

                    return (
                      <TableRow key={loan.id}>
                        <TableCell className="font-mono text-xs">
                          {loan.kode_unik}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{loan.nama}</div>
                          <div className="text-xs text-gray-500">
                            {loan.prodi} - Semester {loan.semester}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {/* Tampilkan max 2 item, sisanya "+X lagi" */}
                            {items.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="text-sm">
                                {item.nama_barang} × {item.quantity}
                              </div>
                            ))}
                            {items.length > 2 && (
                              <div className="text-xs text-gray-500">
                                + {items.length - 2} barang lagi
                              </div>
                            )}
                            <div className="text-xs font-medium text-blue-600">
                              Total: {totalUnit} unit ({totalJenis} jenis)
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(
                            new Date(loan.tanggal_pinjam),
                            "dd MMM yyyy HH:mm",
                            { locale: idLocale },
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getDuration(loan)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              loan.status === "dipinjam"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {loan.status === "dipinjam"
                              ? "Dipinjam"
                              : "Kembali"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreview(loan)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Link
                              href={`/dashboard/print/${loan.kode_unik}`}
                              target="_blank"
                            >
                              <Button variant="ghost" size="sm">
                                <Printer className="h-4 w-4" />
                              </Button>
                            </Link>
                            {loan.status === "dipinjam" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReturn(loan)}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(loan)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {isRefetching && (
            <div className="flex items-center justify-center py-4 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyegarkan
              data...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Peminjaman</DialogTitle>
            <DialogDescription>{selectedLoan?.kode_unik}</DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              <span className="ml-2 text-gray-500">Memuat detail...</span>
            </div>
          ) : selectedLoan ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Kode</p>
                  <p className="font-mono text-sm">{selectedLoan.kode_unik}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedLoan.status === "dipinjam"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {selectedLoan.status === "dipinjam"
                      ? "Dipinjam"
                      : "Kembali"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tanggal Pinjam</p>
                  <p className="text-sm">
                    {format(
                      new Date(selectedLoan.tanggal_pinjam),
                      "dd MMM yyyy",
                      { locale: idLocale },
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Deadline</p>
                  <p className="text-sm">
                    {format(new Date(selectedLoan.deadline), "dd MMM yyyy", {
                      locale: idLocale,
                    })}
                  </p>
                </div>
              </div>

              {/* Data Peminjam */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                    👤
                  </span>
                  Data Peminjam
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <p>
                    <span className="text-gray-500">Nama:</span>{" "}
                    {selectedLoan.nama}
                  </p>
                  <p>
                    <span className="text-gray-500">Tanggal Lahir:</span>{" "}
                    {format(
                      new Date(selectedLoan.tanggal_lahir),
                      "dd MMMM yyyy",
                      { locale: idLocale },
                    )}
                  </p>
                  <p>
                    <span className="text-gray-500">Prodi:</span>{" "}
                    {selectedLoan.prodi}
                  </p>
                  <p>
                    <span className="text-gray-500">Jurusan:</span>{" "}
                    {selectedLoan.jurusan}
                  </p>
                  <p>
                    <span className="text-gray-500">Semester:</span>{" "}
                    {selectedLoan.semester}
                  </p>
                  <p>
                    <span className="text-gray-500">WhatsApp:</span>{" "}
                    {selectedLoan.nomor_whatsapp}
                  </p>
                </div>
              </div>

              {/* Data Barang - MULTI ITEMS */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-500" />
                  Barang Dipinjam
                </h4>

                {selectedLoan.loan_items &&
                selectedLoan.loan_items.length > 0 ? (
                  <div className="space-y-2">
                    {selectedLoan.loan_items.map((loanItem, idx) => (
                      <div
                        key={loanItem.id || idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {loanItem.items?.nama_barang || loanItem.item_id}
                            </p>
                            <p className="text-xs text-gray-500">
                              Kode: {loanItem.items?.kode_barang || "-"}
                              {loanItem.items?.kategori &&
                                ` • ${loanItem.items.kategori}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">
                            × {loanItem.quantity}
                          </p>
                          <p className="text-xs text-gray-500">unit</p>
                        </div>
                      </div>
                    ))}

                    {/* Summary */}
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm">
                        <span className="font-medium">Total:</span>{" "}
                        {selectedLoan.loan_items.reduce(
                          (acc, item) => acc + (item.quantity || 1),
                          0,
                        )}{" "}
                        unit dari {selectedLoan.loan_items.length} jenis barang
                      </p>
                    </div>
                  </div>
                ) : (
                  // Fallback: tampilkan field legacy (single item)
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {selectedLoan.nama_barang || "-"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Kode: {selectedLoan.item_id || "-"}
                        </p>
                      </div>
                      <p className="font-bold text-blue-600">
                        × {selectedLoan.quantity || 1}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Foto */}
              {(selectedLoan.foto_peminjam_url ||
                selectedLoan.foto_barang_url) && (
                <div>
                  <h4 className="font-medium mb-3">Foto Dokumentasi</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedLoan.foto_peminjam_url && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">
                          Foto Peminjam
                        </p>
                        <div className="relative w-full h-40 rounded-lg overflow-hidden border">
                          <Image
                            src={selectedLoan.foto_peminjam_url}
                            alt="Foto Peminjam"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}
                    {selectedLoan.foto_barang_url && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">
                          Foto Barang
                        </p>
                        <div className="relative w-full h-40 rounded-lg overflow-hidden border">
                          <Image
                            src={selectedLoan.foto_barang_url}
                            alt="Foto Barang"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Riwayat</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-medium">Dipinjam</p>
                      <p className="text-xs text-gray-500">
                        {format(
                          new Date(selectedLoan.tanggal_pinjam),
                          "dd MMMM yyyy HH:mm",
                          { locale: idLocale },
                        )}
                      </p>
                    </div>
                  </div>
                  {selectedLoan.tanggal_kembali && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div>
                        <p className="font-medium">Dikembalikan</p>
                        <p className="text-xs text-gray-500">
                          {format(
                            new Date(selectedLoan.tanggal_kembali),
                            "dd MMMM yyyy HH:mm",
                            { locale: idLocale },
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              Gagal memuat detail peminjaman
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
