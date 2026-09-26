"use client";

import { useEffect, useState } from "react";
import {
  getAllItems,
  createItem,
  updateItem,
  deleteItem,
  generateKodeBarang,
  Item,
  ItemInsert,
} from "@/lib/items";
import { uploadItemPhoto, deleteItemPhoto } from "@/lib/upload";
import { useRealtimeListener } from "@/hooks/use-realtime";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Plus,
  Edit2,
  Trash2,
  Search,
  Upload,
  Loader2,
  Package,
  X,
  Layers,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Elektronik",
  "Alat Ukur",
  "Bahan Kimia",
  "Alat Laboratorium",
  "Perlengkapan",
  "Lainnya",
];

export default function ItemsCatalog() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStok, setFilterStok] = useState<"semua" | "tersedia" | "kosong">(
    "semua",
  );
  const [filterKategori, setFilterKategori] = useState<string>("semua");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const [formData, setFormData] = useState<
    Partial<ItemInsert> & { id?: string }
  >({
    nama_barang: "",
    deskripsi: "",
    kategori: "",
    stok_total: 1,
    barcode: "",
  });

  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string>("");

  useEffect(() => {
    loadItems();
  }, []);

  useRealtimeListener(
    "items",
    () => {
      loadItems();
    },
    { event: "*" },
  );

  const loadItems = async () => {
    try {
      const data = await getAllItems();
      setItems(data);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Gagal memuat data barang",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kode_barang.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.deskripsi?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStok === "semua" ||
      (filterStok === "tersedia" && item.stok_tersedia > 0) ||
      (filterStok === "kosong" && item.stok_tersedia === 0);

    const matchesKategori =
      filterKategori === "semua" || item.kategori === filterKategori;

    return matchesSearch && matchesFilter && matchesKategori;
  });

  const handleOpenAdd = async () => {
    const kodeBarang = await generateKodeBarang();
    setFormData({
      kode_barang: kodeBarang,
      nama_barang: "",
      deskripsi: "",
      kategori: "",
      stok_total: 1,
      barcode: "",
    });
    setFotoPreview("");
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (item: Item) => {
    setFormData({
      id: item.id,
      nama_barang: item.nama_barang,
      deskripsi: item.deskripsi,
      kategori: item.kategori,
      stok_total: item.stok_total,
      barcode: item.barcode,
    });
    setFotoPreview(item.foto_url || "");
    setIsEditDialogOpen(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "stok_total" ? parseInt(value) || 0 : value,
    }));
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFoto(true);
    try {
      if (formData.foto_url) {
        await deleteItemPhoto(formData.foto_url);
      }
      const fotoUrl = await uploadItemPhoto(
        file,
        formData.kode_barang || Date.now().toString(),
      );
      setFotoPreview(fotoUrl);
      setFormData((prev) => ({ ...prev, foto_url: fotoUrl }));
      toast({ title: "Berhasil", description: "Foto berhasil diunggah" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Gagal mengunggah foto",
        variant: "destructive",
      });
    } finally {
      setUploadingFoto(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_barang) {
      toast({
        title: "Validasi Gagal",
        description: "Nama barang harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      if (formData.id) {
        await updateItem(formData.id, formData);
        toast({ title: "Berhasil", description: "Barang berhasil diperbarui" });
        setIsEditDialogOpen(false);
      } else {
        const kodeBarang = await generateKodeBarang();
        await createItem({
          ...formData,
          kode_barang: formData.kode_barang || kodeBarang,
          nama_barang: formData.nama_barang!,
          stok_total: formData.stok_total || 1,
        });
        toast({
          title: "Berhasil",
          description: "Barang berhasil ditambahkan",
        });
        setIsAddDialogOpen(false);
      }
      await loadItems();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Gagal menyimpan barang",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      setLoading(true);

      if (itemToDelete.foto_url) {
        try {
          await deleteItemPhoto(itemToDelete.foto_url);
          console.log("✅ Foto berhasil dihapus dari bucket");
        } catch (storageErr: any) {
          console.warn(
            "⚠️ Gagal menghapus foto dari bucket:",
            storageErr?.message,
          );
          toast({
            title: "Peringatan",
            description:
              "Data terhapus, tetapi foto mungkin masih tersimpan di storage",
            variant: "destructive",
          });
        }
      }

      await deleteItem(itemToDelete.id);

      toast({ title: "Berhasil", description: "Barang berhasil dihapus" });
      await loadItems();
    } catch (err: any) {
      console.error("❌ Delete error:", err);
      toast({
        title: "Error",
        description: err.message || "Gagal menghapus barang",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setItemToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      nama_barang: "",
      deskripsi: "",
      kategori: "",
      stok_total: 1,
      barcode: "",
    });
    setFotoPreview("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl border-2 border-ink bg-[#8B5CF6] flex items-center justify-center shadow-brut-sm">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-ink">
              Katalog Barang
            </h2>
            <p className="text-ink/50 mt-1 text-sm md:text-base">
              Kelola inventori barang laboratorium
            </p>
          </div>
        </div>
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={handleOpenAdd}
              className="brut-btn brut-btn-primary w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" /> Tambah Barang
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-ink">
                Tambah Barang Baru
              </DialogTitle>
              <DialogDescription>
                Isi form di bawah untuk menambahkan barang ke katalog
              </DialogDescription>
            </DialogHeader>
            <ItemFormDialog
              formData={formData}
              handleInputChange={handleInputChange}
              handleFotoChange={handleFotoChange}
              handleSubmit={handleSubmit}
              fotoPreview={fotoPreview}
              setFotoPreview={setFotoPreview}
              uploadingFoto={uploadingFoto}
              loading={loading}
              isEdit={false}
              setFormData={setFormData}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filter */}
      <div className="brut-card p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40" />
            <input
              placeholder="Cari nama barang, kode, atau deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="brut-input pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={filterKategori} onValueChange={setFilterKategori}>
              <SelectTrigger className="w-[170px] border-2 border-ink bg-white rounded-xl shadow-brut-sm font-medium text-ink">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value="semua">Semua Kategori</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterStok}
              onValueChange={(v) => setFilterStok(v as any)}
            >
              <SelectTrigger className="w-[150px] border-2 border-ink bg-white rounded-xl shadow-brut-sm font-medium text-ink">
                <SelectValue placeholder="Stok" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value="semua">Semua Barang</SelectItem>
                <SelectItem value="tersedia">Tersedia</SelectItem>
                <SelectItem value="kosong">Stok Habis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-ink" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="brut-card flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-ink/20 mb-4" />
          <p className="text-ink/60 font-semibold">Tidak ada barang ditemukan</p>
          <p className="text-ink/40 text-sm text-center mt-2">
            Coba ubah filter atau tambahkan barang baru
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="kicker text-ink/40">
              Menampilkan {filteredItems.length} dari {items.length} barang
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="brut-card overflow-hidden brut-card-hover flex flex-col"
              >
                {item.foto_url ? (
                  <div className="relative h-40 sm:h-48 border-b-2 border-ink bg-[#F5F3EC]">
                    <Image
                      src={item.foto_url}
                      alt={item.nama_barang}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-40 sm:h-48 bg-[#F5F3EC] brut-stripes border-b-2 border-ink flex items-center justify-center">
                    <div className="w-14 h-14 rounded-xl border-2 border-ink bg-white flex items-center justify-center shadow-brut">
                      <Package className="h-7 w-7 text-ink/60" />
                    </div>
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[11px] font-mono font-bold text-ink/40 truncate">
                        {item.kode_barang}
                      </p>
                      {item.kategori && (
                        <span className="brut-badge badge-purple !px-2 !py-0 !text-[9px]">
                          {item.kategori}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-base text-ink line-clamp-1">
                      {item.nama_barang}
                    </h3>
                    {item.deskripsi && (
                      <p className="text-sm text-ink/50 mt-1.5 line-clamp-2">
                        {item.deskripsi}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {item.stok_tersedia > 0 ? (
                      <span className="brut-badge badge-green">
                        {item.stok_tersedia}/{item.stok_total} stok
                      </span>
                    ) : (
                      <span className="brut-badge badge-red">Stok Habis</span>
                    )}
                    {item.barcode && (
                      <span className="text-[11px] text-ink/40 font-mono truncate">
                        {item.barcode}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 mt-3 border-t-2 border-dashed border-ink/15">
                    {/* Edit Button */}
                    <Dialog
                      open={isEditDialogOpen}
                      onOpenChange={(open) => {
                        setIsEditDialogOpen(open);
                        if (!open) resetForm();
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="flex-1 text-xs border-2 border-ink bg-white shadow-brut-sm hover:bg-[#E0F2FE] hover:-translate-y-0.5 transition-all"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="font-display text-xl text-ink">
                            Edit Barang
                          </DialogTitle>
                        </DialogHeader>
                        <ItemFormDialog
                          formData={formData}
                          handleInputChange={handleInputChange}
                          handleFotoChange={handleFotoChange}
                          handleSubmit={handleSubmit}
                          fotoPreview={fotoPreview}
                          setFotoPreview={setFotoPreview}
                          uploadingFoto={uploadingFoto}
                          loading={loading}
                          isEdit={true}
                          item={item}
                          setFormData={setFormData}
                        />
                      </DialogContent>
                    </Dialog>

                    {/* Delete Button */}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setItemToDelete(item)}
                      className="flex-1 text-xs brut-btn brut-btn-red !py-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Hapus
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Global delete dialog */}
      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={() => setItemToDelete(null)}
      >
        <AlertDialogContent className="w-[95vw] sm:w-full max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg text-ink">
              Hapus Barang?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus &quot;{itemToDelete?.nama_barang}&quot;?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel className="flex-1 brut-btn !py-2.5">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="flex-1 brut-btn brut-btn-red !py-2.5"
            >
              Hapus
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Form Dialog Component
function ItemFormDialog({
  formData,
  handleInputChange,
  handleFotoChange,
  handleSubmit,
  fotoPreview,
  setFotoPreview,
  uploadingFoto,
  loading,
  isEdit,
  setFormData,
}: {
  formData: Partial<ItemInsert> & { id?: string };
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handleFotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  fotoPreview: string;
  setFotoPreview: React.Dispatch<React.SetStateAction<string>>;
  uploadingFoto: boolean;
  loading: boolean;
  isEdit: boolean;
  item?: Item;
  setFormData: React.Dispatch<React.SetStateAction<Partial<ItemInsert>>>;
}) {
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="kode_barang" className="brut-label">
            Kode Barang
          </label>
          <input
            id="kode_barang"
            name="kode_barang"
            value={formData.kode_barang || ""}
            disabled
            className="brut-input disabled:opacity-60"
          />
        </div>
        <div>
          <label htmlFor="stok_total" className="brut-label">
            Stok Total *
          </label>
          <input
            id="stok_total"
            name="stok_total"
            type="number"
            min="1"
            value={formData.stok_total || "1"}
            onChange={handleInputChange}
            required
            className="brut-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="nama_barang" className="brut-label">
          Nama Barang *
        </label>
        <input
          id="nama_barang"
          name="nama_barang"
          value={formData.nama_barang || ""}
          onChange={handleInputChange}
          required
          placeholder="Masukkan nama barang"
          className="brut-input"
        />
      </div>

      <div>
        <label htmlFor="deskripsi" className="brut-label">
          Deskripsi
        </label>
        <textarea
          id="deskripsi"
          name="deskripsi"
          value={formData.deskripsi || ""}
          onChange={handleInputChange}
          placeholder="Deskripsi barang (opsional)"
          rows={3}
          className="brut-input resize-none"
        />
      </div>

      <div>
        <label htmlFor="kategori" className="brut-label">
          Kategori
        </label>
        <Select
          value={formData.kategori || ""}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, kategori: value }))
          }
        >
          <SelectTrigger className="w-full border-2 border-ink bg-white rounded-xl shadow-brut-sm font-medium text-ink">
            <SelectValue placeholder="Pilih kategori" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="barcode" className="brut-label">
          Barcode
        </label>
        <input
          id="barcode"
          name="barcode"
          value={formData.barcode || ""}
          onChange={handleInputChange}
          placeholder="Masukkan kode barcode"
          className="brut-input"
        />
      </div>

      <div>
        <span className="brut-label">Foto Barang</span>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {fotoPreview && (
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-2 border-ink shadow-brut-sm flex-shrink-0">
              <Image
                src={fotoPreview}
                alt="Preview"
                fill
                className="object-cover"
              />
              <button
                type="button"
                className="absolute -top-2 -right-2 h-6 w-6 bg-[#EF4444] text-white rounded-full p-0 border-2 border-ink flex items-center justify-center shadow-brut-sm hover:bg-[#DC2626]"
                onClick={(e) => {
                  e.stopPropagation();
                  setFotoPreview("");
                  setFormData((prev) => ({ ...prev, foto_url: undefined }));
                }}
              >
                <X className="h-3 w-3" color="white" />
              </button>
            </div>
          )}
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              id="foto-input"
              className="hidden"
              disabled={uploadingFoto}
            />
            <label htmlFor="foto-input">
              <Button
                type="button"
                variant="outline"
                asChild
                disabled={uploadingFoto}
                className="brut-btn brut-ghost border-2 border-ink w-full sm:w-auto"
              >
                <span>
                  {uploadingFoto ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" /> Upload Foto
                    </>
                  )}
                </span>
              </Button>
            </label>
            <p className="text-xs text-ink/40 mt-2">
              Format: JPG, PNG, Max 5MB
            </p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex gap-3 pt-4 border-t-2 border-dashed border-ink/15",
        )}
      >
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 brut-btn brut-btn-primary !py-3"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
            </>
          ) : (
            "Simpan"
          )}
        </Button>
      </div>
    </form>
  );
}