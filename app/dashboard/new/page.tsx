'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createLoan, generateKodeUnik } from '@/lib/loans';
import { uploadLoanPhoto } from '@/lib/upload';
import { Item } from '@/lib/items';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Camera, Upload, Loader as Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ItemSelect } from '@/components/ui/item-select';

export default function NewLoanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [kodeUnik, setKodeUnik] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const [formData, setFormData] = useState({
    nama: '',
    tanggal_lahir: '',
    prodi: '',
    jurusan: '',
    semester: '',
    nomor_whatsapp: '',
    email: '',
    pickup_date: '', // Tanggal pengambilan barang
    deadline: '',
  });

  const [fotoPeminjam, setFotoPeminjam] = useState<File | null>(null);
  const [fotoBarang, setFotoBarang] = useState<File | null>(null);
  const [previewPeminjam, setPreviewPeminjam] = useState<string>('');
  const [previewBarang, setPreviewBarang] = useState<string>('');

  const peminjamInputRef = useRef<HTMLInputElement>(null);
  const barangInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'peminjam' | 'barang'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'peminjam') {
        setFotoPeminjam(file);
        setPreviewPeminjam(URL.createObjectURL(file));
      } else {
        setFotoBarang(file);
        setPreviewBarang(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi item barang
    if (!selectedItem) {
      toast({
        title: 'Validasi Gagal',
        description: 'Pilih barang dari katalog',
        variant: 'destructive',
      });
      return;
    }

    // Validasi stok
    if (selectedItem.stok_tersedia <= 0) {
      toast({
        title: 'Stok Habis',
        description: 'Barang tidak tersedia saat ini',
        variant: 'destructive',
      });
      return;
    }

    // Validasi nomor WhatsApp
    if (!formData.nomor_whatsapp || formData.nomor_whatsapp.trim() === '') {
      toast({
        title: 'Validasi Gagal',
        description: 'Nomor WhatsApp wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    // Validasi email
    if (!formData.email || formData.email.trim() === '') {
      toast({
        title: 'Validasi Gagal',
        description: 'Email peminjam wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast({
        title: 'Validasi Gagal',
        description: 'Format email tidak valid',
        variant: 'destructive',
      });
      return;
    }

    // Validasi format nomor WhatsApp (hanya angka, minimal 10 digit)
    const phoneRegex = /^(\+62|0)[0-9]{9,12}$/;
    if (!phoneRegex.test(formData.nomor_whatsapp.replace(/[- ]/g, ''))) {
      toast({
        title: 'Validasi Gagal',
        description: 'Format nomor WhatsApp tidak valid (gunakan format: 08123456789 atau +628123456789)',
        variant: 'destructive',
      });
      return;
    }

    // Validasi pickup_date
    if (!formData.pickup_date || formData.pickup_date.trim() === '') {
      toast({
        title: 'Validasi Gagal',
        description: 'Tanggal pengambilan barang wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    // Validasi pickup_date tidak boleh sebelum hari ini
    const pickupDate = new Date(formData.pickup_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (pickupDate < today) {
      toast({
        title: 'Validasi Gagal',
        description: 'Tanggal pengambilan tidak boleh sebelum hari ini',
        variant: 'destructive',
      });
      return;
    }

    // Validasi deadline
    if (!formData.deadline || formData.deadline.trim() === '') {
      toast({
        title: 'Validasi Gagal',
        description: 'Deadline pengembalian wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    // Validasi deadline harus lebih dari hari ini
    const deadlineDate = new Date(formData.deadline);
    if (deadlineDate <= today) {
      toast({
        title: 'Validasi Gagal',
        description: 'Deadline harus lebih dari hari ini',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const newKodeUnik = await generateKodeUnik();
      setKodeUnik(newKodeUnik);

      let fotoPeminjamUrl = null;
      let fotoBarangUrl = null;

      if (fotoPeminjam) {
        try {
          fotoPeminjamUrl = await uploadLoanPhoto(fotoPeminjam, newKodeUnik, 'peminjam');
        } catch (err: any) {
          console.warn('Warning: Foto peminjam gagal diunggah:', err?.message);
          // Continue anyway, photo is optional
        }
      }

      if (fotoBarang) {
        try {
          fotoBarangUrl = await uploadLoanPhoto(fotoBarang, newKodeUnik, 'barang');
        } catch (err: any) {
          console.warn('Warning: Foto barang gagal diunggah:', err?.message);
          // Continue anyway, photo is optional
        }
      }

      await createLoan({
        kode_unik: newKodeUnik,
        nama: formData.nama,
        tanggal_lahir: formData.tanggal_lahir,
        prodi: formData.prodi,
        jurusan: formData.jurusan,
        semester: parseInt(formData.semester),
        nama_barang: selectedItem.nama_barang,
        nomor_whatsapp: formData.nomor_whatsapp,
        email: formData.email,
        pickup_date: formData.pickup_date, // Tanggal pengambilan barang
        deadline: formData.deadline, // Deadline akan di-process di lib/loans.ts dengan jam 23:59:00
        foto_peminjam_url: fotoPeminjamUrl,
        foto_barang_url: fotoBarangUrl,
        item_id: selectedItem.id,
        status: 'dipinjam',
      });

      // Decrease stock
      const { decreaseStock } = await import('@/lib/items');
      await decreaseStock(selectedItem.id, 1);

      try {
        const response = await fetch('/api/loan-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            nama: formData.nama,
            kode_unik: newKodeUnik,
            deadline: new Date(formData.deadline).toISOString(),
            items: [
              {
                nama_barang: selectedItem.nama_barang,
                quantity: 1,
              },
            ],
          }),
        });
        if (!response.ok) {
          console.warn('Email konfirmasi peminjaman gagal terkirim', await response.text());
        }
      } catch (sendError) {
        console.warn('Email konfirmasi peminjaman gagal terkirim', sendError);
      }

      toast({
        title: 'Berhasil!',
        description: `Peminjaman berhasil dicatat dengan kode ${newKodeUnik}`,
      });

      router.push('/dashboard/loans');
    } catch (error: any) {
      console.error('Error creating loan:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan data peminjaman',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Peminjaman Barang Baru</CardTitle>
          <p className="text-sm text-white">
            Isi formulir di bawah ini untuk mencatat peminjaman barang
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Data Peminjam
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nama">Nama Lengkap *</Label>
                  <Input
                    id="nama"
                    name="nama"
                    value={formData.nama}
                    onChange={handleInputChange}
                    required
                    placeholder="Masukkan nama lengkap"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal_lahir">Tanggal Lahir *</Label>
                  <Input
                    id="tanggal_lahir"
                    name="tanggal_lahir"
                    type="date"
                    value={formData.tanggal_lahir}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prodi">Program Studi *</Label>
                  <Input
                    id="prodi"
                    name="prodi"
                    value={formData.prodi}
                    onChange={handleInputChange}
                    required
                    placeholder="Contoh: Teknik Informatika"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jurusan">Jurusan *</Label>
                  <Input
                    id="jurusan"
                    name="jurusan"
                    value={formData.jurusan}
                    onChange={handleInputChange}
                    required
                    placeholder="Contoh: Teknik"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="semester">Semester *</Label>
                  <Input
                    id="semester"
                    name="semester"
                    type="number"
                    min="1"
                    max="14"
                    value={formData.semester}
                    onChange={handleInputChange}
                    required
                    placeholder="1-14"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nomor_whatsapp">Nomor WhatsApp *</Label>
                  <Input
                    id="nomor_whatsapp"
                    name="nomor_whatsapp"
                    type="tel"
                    value={formData.nomor_whatsapp}
                    onChange={handleInputChange}
                    required
                    placeholder="Contoh: 08123456789 atau +628123456789"
                  />
                  <p className="text-xs text-gray-500">Format: 08123456789 atau +628123456789</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Peminjam *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="nama@domain.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pickup_date">Tanggal Pengambilan Barang *</Label>
                  <Input
                    id="pickup_date"
                    name="pickup_date"
                    type="date"
                    value={formData.pickup_date}
                    onChange={handleInputChange}
                    required
                  />
                  <p className="text-xs text-gray-500">Minimal: hari ini</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Tanggal Deadline Pengembalian *</Label>
                  <Input
                    id="deadline"
                    name="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={handleInputChange}
                    required
                  />
                  <p className="text-xs text-gray-500">Minimal: hari ini + 1 hari</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Foto Peminjam</Label>
                <div className="flex gap-4 items-start">
                  {previewPeminjam && (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                      <Image
                        src={previewPeminjam}
                        alt="Preview Peminjam"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => peminjamInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {previewPeminjam ? 'Ganti Foto' : 'Upload Foto'}
                    </Button>
                    <input
                      ref={peminjamInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'peminjam')}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Data Barang
              </h3>

              <div className="space-y-2">
                <Label>Nama Barang *</Label>
                <ItemSelect
                  value={selectedItem?.id}
                  onChange={(item) => setSelectedItem(item)}
                  onlyAvailable={true}
                  placeholder="Pilih barang dari katalog..."
                  disabled={loading}
                />
                {selectedItem && (
                  <p className="text-xs text-gray-500">
                    Stok tersedia: {selectedItem.stok_tersedia}/{selectedItem.stok_total}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Foto Barang</Label>
                <div className="flex gap-4 items-start">
                  {previewBarang && (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                      <Image
                        src={previewBarang}
                        alt="Preview Barang"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => barangInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {previewBarang ? 'Ganti Foto' : 'Upload Foto'}
                    </Button>
                    <input
                      ref={barangInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'barang')}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Link href="/dashboard">
                <Button type="button" variant="outline" disabled={loading}>
                  Batal
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Peminjaman
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
