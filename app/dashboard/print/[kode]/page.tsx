"use client";

import { useEffect, useState } from "react";
import { getLoanByKode } from "@/lib/loans";
import { Loan } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Image from "next/image";

export default function PrintPage({ params }: { params: { kode: string } }) {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLoan();
  }, []);

  const loadLoan = async () => {
    try {
      const data = await getLoanByKode(params.kode);
      setLoan(data as Loan | null);
    } catch (error) {
      console.error("Error loading loan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Data peminjaman tidak ditemukan</p>
      </div>
    );
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(loan.kode_unik)}`;

  return (
    <>
      {/* Tombol Print - Hidden saat dicetak */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
          <Printer className="mr-2 h-4 w-4" />
          Cetak
        </Button>
      </div>

      {/* Container Utama - Optimasi A4 */}
      <div className="min-h-screen bg-gray-100 p-4 print:p-0 print:bg-white">
        <div
          id="print-area"
          className="max-w-[190mm] mx-auto bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 print:shadow-none print:border-0 print:rounded-none print:max-w-none"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 print:p-2.5 print:text-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold print:text-base">
                  UNIMUS INVENTRACK
                </h1>
                <p className="text-sm text-blue-100 mt-1 print:text-xs">
                  Universitas Muhammadiyah Semarang
                </p>
                <p className="text-xs text-blue-200 mt-1 print:hidden">
                  Sistem Manajemen Peminjaman Barang Laboratorium
                </p>
              </div>
              <div className="bg-white p-2 rounded-lg">
                {qrCodeUrl && (
                  <Image
                    src={qrCodeUrl}
                    alt="QR Code"
                    width={100}
                    height={100}
                    className="rounded print:w-24 print:h-24"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 print:p-2.5 text-sm print:text-xs">
            {/* Title Section */}
            <div className="text-center mb-4 pb-3 border-b border-gray-300">
              <h2 className="text-base font-bold text-gray-900 mb-2 print:text-sm">
                BUKTI PEMINJAMAN BARANG
              </h2>
              <div className="inline-block bg-blue-50 px-3 py-1.5 rounded">
                <p className="text-xs text-gray-600">Kode Peminjaman</p>
                <p className="text-base font-bold text-blue-700 font-mono print:text-xs">
                  {loan.kode_unik}
                </p>
              </div>
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Data Peminjam */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Data Peminjam
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex">
                      <span className="w-28 text-gray-600">Nama</span>
                      <span className="flex-1 font-medium">: {loan.nama}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-gray-600">Tanggal Lahir</span>
                      <span className="flex-1 font-medium">
                        :{" "}
                        {loan.tanggal_lahir
                          ? format(
                              new Date(loan.tanggal_lahir),
                              "dd MMMM yyyy",
                              { locale: idLocale },
                            )
                          : "-"}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-gray-600">Program Studi</span>
                      <span className="flex-1 font-medium">: {loan.prodi}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-gray-600">Jurusan</span>
                      <span className="flex-1 font-medium">
                        : {loan.jurusan}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-gray-600">Semester</span>
                      <span className="flex-1 font-medium">
                        : {loan.semester}
                      </span>
                    </div>
                  </div>
                </div>

                {loan.foto_peminjam_url && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 mb-1">
                      Foto Peminjam
                    </h4>
                    <div className="relative w-24 h-24 rounded overflow-hidden border border-gray-300">
                      <Image
                        src={loan.foto_peminjam_url}
                        alt="Foto Peminjam"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Data Barang */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Data Barang
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex">
                      <span className="w-24 text-gray-600">Nama Barang</span>
                      <span className="flex-1 font-medium text-xs">
                        : {loan.nama_barang ?? "-"}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-gray-600">Tanggal Pinjam</span>
                      <span className="flex-1 font-medium">
                        :{" "}
                        {loan.tanggal_pinjam
                          ? format(
                              new Date(loan.tanggal_pinjam),
                              "dd MMMM yyyy, HH:mm",
                              { locale: idLocale },
                            )
                          : "-"}{" "}
                        WIB
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-gray-600">Status</span>
                      <span className="flex-1 font-medium">
                        :{" "}
                        <span
                          className={
                            loan.status === "dipinjam"
                              ? "text-blue-600"
                              : "text-green-600"
                          }
                        >
                          {loan.status === "dipinjam"
                            ? "Sedang Dipinjam"
                            : "Sudah Dikembalikan"}
                        </span>
                      </span>
                    </div>
                    {loan.tanggal_kembali && (
                      <div className="flex">
                        <span className="w-28 text-gray-600">
                          Tanggal Kembali
                        </span>
                        <span className="flex-1 font-medium">
                          :{" "}
                          {format(
                            new Date(loan.tanggal_kembali),
                            "dd MMMM yyyy, HH:mm",
                            { locale: idLocale },
                          )}{" "}
                          WIB
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {loan.foto_barang_url && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 mb-1">
                      Foto Barang
                    </h4>
                    <div className="relative w-24 h-24 rounded overflow-hidden border border-gray-300">
                      <Image
                        src={loan.foto_barang_url}
                        alt="Foto Barang"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Section */}
            <div className="border-t border-gray-300 pt-4 mt-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 print:bg-transparent print:border-l-2">
                <p className="text-xs text-yellow-800 print:text-gray-700">
                  <strong>Catatan:</strong> Simpan bukti peminjaman ini dengan
                  baik. QR Code dapat digunakan untuk verifikasi.
                </p>
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 gap-6 mt-6">
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-12 print:mb-16">
                    Peminjam
                  </p>
                  <div className="border-t border-gray-900 pt-1">
                    <p className="text-xs font-medium">{loan.nama}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-12 print:mb-16">
                    Admin Laboratorium
                  </p>
                  <div className="border-t border-gray-900 pt-1">
                    <p className="text-xs font-medium">
                      ( ............................ )
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Timestamp */}
            <div className="text-center text-[10px] text-gray-500 mt-4 pt-3 border-t border-gray-200 print:hidden">
              <p>
                Dicetak pada:{" "}
                {format(new Date(), "dd MMMM yyyy, HH:mm", {
                  locale: idLocale,
                })}{" "}
                WIB
              </p>
              <p className="mt-0.5">UIT - Unimus Inventrack v1.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles - Global */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 8mm;
          }

          body {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          #print-area {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }

          /* Pastikan tidak ada page break di tengah konten penting */
          #print-area,
          #print-area > * {
            page-break-inside: avoid;
          }

          /* Force background colors to print */
          .bg-gradient-to-r,
          .bg-blue-50,
          .bg-yellow-50 {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
