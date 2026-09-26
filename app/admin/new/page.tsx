"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createLoanWithItems, generateKodeUnik } from "@/lib/loans";
import { uploadLoanPhoto } from "@/lib/upload";
import { Item } from "@/lib/items";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Camera,
  Upload,
  Loader2,
  Save,
  User,
  Package,
  X,
  Trash2,
  Plus,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import CameraCapture from "@/components/admin/CameraCapture";
import { ItemSelect } from "@/components/ui/item-select";
import { cn } from "@/lib/utils";

interface SelectedLoanItem {
  item: Item;
  quantity: number;
}

export default function NewLoanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [selectedItems, setSelectedItems] = useState<SelectedLoanItem[]>([]);
  const [tempItem, setTempItem] = useState<Item | null>(null);
  const [tempQuantity, setTempQuantity] = useState(1);

  const [formData, setFormData] = useState({
    nama: "",
    tanggal_lahir: "",
    prodi: "",
    jurusan: "",
    semester: "",
    nomor_whatsapp: "",
    email: "",
    pickup_date: "",
    deadline: "",
  });

  const [fotoPeminjam, setFotoPeminjam] = useState<File | null>(null);
  const [fotoBarang, setFotoBarang] = useState<File | null>(null);
  const [previewPeminjam, setPreviewPeminjam] = useState("");
  const [previewBarang, setPreviewBarang] = useState("");

  const [cameraFor, setCameraFor] = useState<"peminjam" | "barang" | null>(
    null,
  );

  const peminjamInputRef = useRef<HTMLInputElement>(null);
  const barangInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "peminjam" | "barang",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === "peminjam") {
      setFotoPeminjam(file);
      setPreviewPeminjam(url);
    } else {
      setFotoBarang(file);
      setPreviewBarang(url);
    }
  };

  const handleCameraCapture = (file: File, type: "peminjam" | "barang") => {
    const url = URL.createObjectURL(file);
    if (type === "peminjam") {
      setFotoPeminjam(file);
      setPreviewPeminjam(url);
    } else {
      setFotoBarang(file);
      setPreviewBarang(url);
    }
    setCameraFor(null);
  };

  const handleAddItem = () => {
    if (!tempItem) {
      toast({
        title: "Validasi Gagal",
        description: "Pilih barang dari katalog terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (tempQuantity < 1) {
      toast({
        title: "Validasi Gagal",
        description: "Jumlah pinjam minimal 1",
        variant: "destructive",
      });
      return;
    }

    if (tempQuantity > tempItem.stok_tersedia) {
      toast({
        title: "Stok Tidak Cukup",
        description: `Stok "${tempItem.nama_barang}" hanya ${tempItem.stok_tersedia}`,
        variant: "destructive",
      });
      return;
    }

    const existingIndex = selectedItems.findIndex(
      (si) => si.item.id === tempItem.id,
    );
    if (existingIndex !== -1) {
      const newItems = [...selectedItems];
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newItems[existingIndex].quantity + tempQuantity,
      };
      if (newItems[existingIndex].quantity > tempItem.stok_tersedia) {
        toast({
          title: "Stok Tidak Cukup",
          description: `Total quantity "${tempItem.nama_barang}" melebihi stok tersedia`,
          variant: "destructive",
        });
        return;
      }
      setSelectedItems(newItems);
    } else {
      setSelectedItems([
        ...selectedItems,
        { item: tempItem, quantity: tempQuantity },
      ]);
    }

    setTempItem(null);
    setTempQuantity(1);
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    const item = selectedItems.find((si) => si.item.id === itemId);
    if (!item) return;

    if (newQuantity < 1) return;
    if (newQuantity > item.item.stok_tersedia) {
      toast({
        title: "Stok Tidak Cukup",
        description: `Maksimal ${item.item.stok_tersedia} unit`,
        variant: "destructive",
      });
      return;
    }

    setSelectedItems(
      selectedItems.map((si) =>
        si.item.id === itemId ? { ...si, quantity: newQuantity } : si,
      ),
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((si) => si.item.id !== itemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      toast({
        title: "Validasi Gagal",
        description: "Pilih minimal 1 barang untuk dipinjam",
        variant: "destructive",
      });
      return;
    }

    for (const { item, quantity } of selectedItems) {
      if (quantity > item.stok_tersedia) {
        toast({
          title: "Stok Berubah",
          description: `Stok "${item.nama_barang}" tidak mencukupi. Silakan refresh dan coba lagi.`,
          variant: "destructive",
        });
        return;
      }
    }

    if (!formData.nomor_whatsapp || formData.nomor_whatsapp.trim() === "") {
      toast({
        title: "Validasi Gagal",
        description: "Nomor WhatsApp wajib diisi",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email || formData.email.trim() === "") {
      toast({
        title: "Validasi Gagal",
        description: "Email peminjam wajib diisi",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast({
        title: "Validasi Gagal",
        description: "Format email tidak valid",
        variant: "destructive",
      });
      return;
    }

    const phoneRegex = /^(\+62|0)[0-9]{9,12}$/;
    if (!phoneRegex.test(formData.nomor_whatsapp.replace(/[- ]/g, ""))) {
      toast({
        title: "Validasi Gagal",
        description:
          "Format nomor WhatsApp tidak valid (gunakan format: 08123456789 atau +628123456789)",
        variant: "destructive",
      });
      return;
    }

    if (!formData.deadline || formData.deadline.trim() === "") {
      toast({
        title: "Validasi Gagal",
        description: "Deadline pengembalian wajib diisi",
        variant: "destructive",
      });
      return;
    }

    if (!formData.pickup_date || formData.pickup_date.trim() === "") {
      toast({
        title: "Validasi Gagal",
        description: "Tanggal Pengambilan wajib diisi",
        variant: "destructive",
      });
      return;
    }

    const pickupDate = new Date(formData.pickup_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (pickupDate < today) {
      toast({
        title: "Validasi Gagal",
        description: "Tanggal Pengambilan tidak boleh lebih awal dari hari ini",
        variant: "destructive",
      });
      return;
    }

    const deadlineDate = new Date(formData.deadline);
    deadlineDate.setHours(0, 0, 0, 0);

    if (deadlineDate < today) {
      toast({
        title: "Validasi Gagal",
        description: "Deadline harus lebih dari atau sama dengan hari ini",
        variant: "destructive",
      });
      return;
    }

    if (deadlineDate < pickupDate) {
      toast({
        title: "Validasi Gagal",
        description: "Deadline tidak boleh lebih awal dari Tanggal Pengambilan",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const groupKode = await generateKodeUnik();

      let fotoPeminjamUrl = null;
      if (fotoPeminjam) {
        fotoPeminjamUrl = await uploadLoanPhoto(
          fotoPeminjam,
          groupKode,
          "peminjam",
        );
      }

      const itemsToBorrow = await Promise.all(
        selectedItems.map(async ({ item, quantity }, index) => {
          let foto_barang_url = null;
          if (index === 0 && fotoBarang) {
            try {
              foto_barang_url = await uploadLoanPhoto(
                fotoBarang,
                `${groupKode}-${item.kode_barang}`,
                "barang",
              );
            } catch (err) {
              console.warn("Warning: Foto barang gagal diunggah:", err);
            }
          }
          return { item, quantity, foto_barang_url };
        }),
      );

      await createLoanWithItems(
        {
          kode_unik: groupKode,
          nama: formData.nama,
          tanggal_lahir: formData.tanggal_lahir,
          prodi: formData.prodi,
          jurusan: formData.jurusan,
          semester: parseInt(formData.semester),
          nomor_whatsapp: formData.nomor_whatsapp,
          email: formData.email,
          pickup_date: formData.pickup_date,
          deadline: new Date(formData.deadline).toISOString(),
          foto_peminjam_url: fotoPeminjamUrl,
          status: "dipinjam",
        },
        itemsToBorrow,
      );

      try {
        const response = await fetch("/api/loan-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            nama: formData.nama,
            kode_unik: groupKode,
            deadline: new Date(formData.deadline).toISOString(),
            items: itemsToBorrow.map(({ item, quantity }) => ({
              nama_barang: item.nama_barang,
              quantity,
            })),
          }),
        });
        if (!response.ok) {
          console.warn("Email konfirmasi peminjaman gagal terkirim", await response.text());
        }
      } catch (sendError) {
        console.warn("Email konfirmasi peminjaman gagal terkirim", sendError);
      }

      toast({
        title: "Berhasil!",
        description: `${selectedItems.length} jenis barang (${totalQuantity} unit) dipinjam dengan kode ${groupKode}`,
      });
      router.push("/admin/loans");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Gagal menyimpan data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalItems = selectedItems.length;
  const totalQuantity = selectedItems.reduce((acc, si) => acc + si.quantity, 0);

  return (
    <>
      {cameraFor && (
        <CameraCapture
          type={cameraFor}
          onCapture={(file) => handleCameraCapture(file, cameraFor)}
          onClose={() => setCameraFor(null)}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back */}
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-ink/50 hover:text-ink text-sm font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard
        </Link>

        <form onSubmit={handleSubmit}>
          {/* Data Peminjam */}
          <div className="brut-card overflow-hidden mb-5">
            <div className="flex items-center gap-3 p-5 border-b-2 border-ink bg-[#DBEAFE]">
              <div className="w-9 h-9 rounded-xl border-2 border-ink bg-white flex items-center justify-center shadow-brut-sm">
                <User className="w-4 h-4 text-[#1D4ED8]" />
              </div>
              <h2 className="font-display font-bold text-ink">Data Peminjam</h2>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    id: "nama",
                    label: "Nama Lengkap",
                    placeholder: "Nama lengkap peminjam",
                    required: true,
                  },
                  {
                    id: "tanggal_lahir",
                    label: "Tanggal Lahir",
                    type: "date",
                    required: true,
                  },
                  {
                    id: "prodi",
                    label: "Program Studi",
                    placeholder: "Contoh: Teknik Informatika",
                    required: true,
                  },
                  {
                    id: "jurusan",
                    label: "Jurusan",
                    placeholder: "Contoh: Teknik",
                    required: true,
                  },
                ].map((f) => (
                  <div key={f.id}>
                    <label htmlFor={f.id} className="brut-label">
                      {f.label}{" "}
                      {f.required && <span className="text-[#B91C1C]">*</span>}
                    </label>
                    <input
                      id={f.id}
                      name={f.id}
                      type={f.type || "text"}
                      placeholder={f.placeholder}
                      value={(formData as any)[f.id]}
                      onChange={handleChange}
                      required={f.required}
                      disabled={loading}
                      className="brut-input disabled:opacity-50"
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="semester" className="brut-label">
                    Semester <span className="text-[#B91C1C]">*</span>
                  </label>
                  <select
                    id="semester"
                    name="semester"
                    value={formData.semester}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="brut-input disabled:opacity-50"
                  >
                    <option value="">Pilih semester</option>
                    {[...Array(14)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Semester {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nomor WhatsApp & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t-2 border-dashed border-ink/15">
                <div>
                  <label htmlFor="nomor_whatsapp" className="brut-label">
                    Nomor WhatsApp <span className="text-[#B91C1C]">*</span>
                  </label>
                  <input
                    id="nomor_whatsapp"
                    name="nomor_whatsapp"
                    type="tel"
                    placeholder="08123456789 atau +628123456789"
                    value={formData.nomor_whatsapp}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="brut-input disabled:opacity-50"
                  />
                  <p className="text-xs text-ink/40 mt-1.5">
                    Format: 08123456789 atau +628123456789
                  </p>
                </div>
                <div>
                  <label htmlFor="email" className="brut-label">
                    Email Peminjam <span className="text-[#B91C1C]">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nama@domain.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="brut-input disabled:opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="pickup_date" className="brut-label">
                    Tanggal Pengambilan{" "}
                    <span className="text-[#B91C1C]">*</span>
                  </label>
                  <input
                    id="pickup_date"
                    name="pickup_date"
                    type="date"
                    value={formData.pickup_date}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="brut-input disabled:opacity-50"
                  />
                  <p className="text-xs text-ink/40 mt-1.5">Minimal: hari ini atau lebih</p>
                </div>
                <div>
                  <label htmlFor="deadline" className="brut-label">
                    Deadline Pengembalian{" "}
                    <span className="text-[#B91C1C]">*</span>
                  </label>
                  <input
                    id="deadline"
                    name="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="brut-input disabled:opacity-50"
                  />
                  <p className="text-xs text-ink/40 mt-1.5">
                    Minimal: sama dengan atau lebih dari Tanggal Pengambilan
                  </p>
                </div>
              </div>

              {/* Foto Peminjam */}
              <div className="pt-4 border-t-2 border-dashed border-ink/15">
                <span className="brut-label">Foto Peminjam</span>
                <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                  {previewPeminjam ? (
                    <div className="relative w-28 h-28 rounded-xl overflow-hidden border-2 border-ink shadow-brut-sm flex-shrink-0">
                      <Image
                        src={previewPeminjam}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFotoPeminjam(null);
                          setPreviewPeminjam("");
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-[#EF4444] rounded-full flex items-center justify-center shadow-brut-sm border-2 border-ink"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-xl border-2 border-dashed border-ink/40 flex items-center justify-center flex-shrink-0 bg-[#F5F3EC]">
                      <User className="w-8 h-8 text-ink/25" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 flex-1">
                    <button
                      type="button"
                      onClick={() => setCameraFor("peminjam")}
                      disabled={loading}
                      className="brut-btn brut-btn-blue !py-2.5"
                    >
                      <Camera className="w-4 h-4" /> Ambil Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => peminjamInputRef.current?.click()}
                      disabled={loading}
                      className="brut-btn !py-2.5"
                    >
                      <Upload className="w-4 h-4" /> Upload File
                    </button>
                    <input
                      ref={peminjamInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "peminjam")}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Barang - Multi Item */}
          <div className="brut-card overflow-hidden mb-5">
            <div className="flex items-center gap-3 p-5 border-b-2 border-ink bg-[#E0F2FE]">
              <div className="w-9 h-9 rounded-xl border-2 border-ink bg-white flex items-center justify-center shadow-brut-sm">
                <Package className="w-4 h-4 text-[#0369A1]" />
              </div>
              <h2 className="font-display font-bold text-ink">Data Barang</h2>
            </div>
            <div className="p-5 space-y-5">
              {/* Form Tambah Item */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-2">
                  <label className="brut-label">
                    Pilih Barang <span className="text-[#B91C1C]">*</span>
                  </label>
                  <ItemSelect
                    value={tempItem?.id}
                    onChange={(item) => {
                      setTempItem(item);
                      setTempQuantity(1);
                    }}
                    onlyAvailable={true}
                    placeholder="Cari dan pilih barang..."
                    disabled={loading}
                  />
                  {tempItem && (
                    <p className="text-xs text-ink/40 mt-1.5">
                      Stok: {tempItem.stok_tersedia}/{tempItem.stok_total}
                    </p>
                  )}
                </div>

                <div>
                  <label className="brut-label">Jumlah</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTempQuantity((q) => Math.max(1, q - 1))}
                      disabled={loading || tempQuantity <= 1 || !tempItem}
                      className="w-10 h-10 rounded-lg border-2 border-ink bg-white text-ink shadow-brut-sm hover:bg-[#E0F2FE] disabled:opacity-40 transition-all flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={tempItem?.stok_tersedia ?? 1}
                      value={tempQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setTempQuantity(
                          Math.min(
                            Math.max(1, val),
                            tempItem?.stok_tersedia ?? 1,
                          ),
                        );
                      }}
                      disabled={loading || !tempItem}
                      className="w-14 text-center brut-input !py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setTempQuantity((q) =>
                          Math.min(tempItem?.stok_tersedia ?? 1, q + 1),
                        )
                      }
                      disabled={
                        loading ||
                        !tempItem ||
                        tempQuantity >= (tempItem?.stok_tersedia ?? 1)
                      }
                      className="w-10 h-10 rounded-lg border-2 border-ink bg-white text-ink shadow-brut-sm hover:bg-[#E0F2FE] disabled:opacity-40 transition-all flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                disabled={loading || !tempItem}
                className="brut-btn brut-btn-primary !py-2.5"
              >
                <Plus className="w-4 h-4" /> Tambah ke Peminjaman
              </button>

              {/* List Selected Items */}
              {selectedItems.length > 0 && (
                <div className="space-y-3 pt-4 border-t-2 border-dashed border-ink/15">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-ink/60" />
                    <h3 className="font-display font-bold text-sm text-ink">
                      Barang Dipinjam ({totalItems} jenis, {totalQuantity} total
                      unit)
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {selectedItems.map(({ item, quantity }) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-3 brut-panel"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-ink font-semibold text-sm truncate">
                            {item.nama_barang}
                          </p>
                          <p className="text-ink/40 text-xs">
                            Kode: {item.kode_barang} • Stok: {item.stok_tersedia}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuantity(item.id, quantity - 1)
                            }
                            disabled={loading || quantity <= 1}
                            className="w-8 h-8 rounded-lg border-2 border-ink bg-white text-ink shadow-brut-sm hover:bg-[#E0F2FE] disabled:opacity-40 transition-all flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-display font-bold text-ink">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuantity(item.id, quantity + 1)
                            }
                            disabled={loading || quantity >= item.stok_tersedia}
                            className="w-8 h-8 rounded-lg border-2 border-ink bg-white text-ink shadow-brut-sm hover:bg-[#E0F2FE] disabled:opacity-40 transition-all flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={loading}
                          className="w-8 h-8 rounded-lg border-2 border-ink bg-[#FEE2E2] text-[#B91C1C] shadow-brut-sm hover:bg-[#FECACA] disabled:opacity-40 transition-all flex items-center justify-center"
                          title="Hapus dari list"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Foto Barang (opsional) */}
              <div className="space-y-2 pt-4 border-t-2 border-dashed border-ink/15">
                <span className="brut-label">Foto Barang (opsional)</span>
                <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                  {previewBarang ? (
                    <div className="relative w-28 h-28 rounded-xl overflow-hidden border-2 border-ink shadow-brut-sm flex-shrink-0">
                      <Image
                        src={previewBarang}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFotoBarang(null);
                          setPreviewBarang("");
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-[#EF4444] rounded-full flex items-center justify-center shadow-brut-sm border-2 border-ink"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-xl border-2 border-dashed border-ink/40 flex items-center justify-center flex-shrink-0 bg-[#F5F3EC]">
                      <Package className="w-8 h-8 text-ink/25" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 flex-1">
                    <button
                      type="button"
                      onClick={() => setCameraFor("barang")}
                      disabled={loading}
                      className="brut-btn brut-btn-orange !py-2.5"
                    >
                      <Camera className="w-4 h-4" /> Ambil Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => barangInputRef.current?.click()}
                      disabled={loading}
                      className="brut-btn !py-2.5"
                    >
                      <Upload className="w-4 h-4" /> Upload File
                    </button>
                    <input
                      ref={barangInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "barang")}
                      className="hidden"
                    />
                  </div>
                </div>
                <p className="text-xs text-ink/40">
                  Foto akan dilampirkan ke item pertama dalam peminjaman
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className={cn("flex items-center justify-end gap-3")}>
            <Link href="/admin/dashboard">
              <button
                type="button"
                disabled={loading}
                className="brut-btn disabled:opacity-50 !px-6 !py-3"
              >
                Batal
              </button>
            </Link>
            <button
              type="submit"
              disabled={loading || selectedItems.length === 0}
              className="brut-btn brut-btn-primary !px-6 !py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Simpan {totalQuantity} Unit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}