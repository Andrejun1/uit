"use client";

import { useEffect, useState } from "react";
import { getAvailableItems, getAllItems, Item } from "@/lib/items";
import { useRealtimeListener } from "@/hooks/use-realtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search,
  Loader2,
} from "lucide-react";
import Image from "next/image";

interface CatalogItem extends Item {
  statusLabel: string;
  statusColor: string;
}

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAvailability, setFilterAvailability] = useState<"semua" | "tersedia" | "kosong">("semua");

  const loadItems = async () => {
    try {
      setLoading(true);
      let data: Item[];
      if (filterAvailability === "tersedia") {
        data = await getAvailableItems();
      } else {
        data = await getAllItems();
      }

      // Map items with status labels
      const catalogItems: CatalogItem[] = data.map((item) => ({
        ...item,
        statusLabel: item.stok_tersedia > 0 ? "Tersedia" : "Tidak Tersedia",
        statusColor: item.stok_tersedia > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
      }));

      setItems(catalogItems);
    } catch (err) {
      console.error("Error loading items:", err);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    loadItems();
  }, [filterAvailability]);

  // Subscribe to realtime updates with optimization
  useRealtimeListener("items", () => {
    loadItems();
  }, { event: "*" });

  // Filter items based on search and availability
  useEffect(() => {
    let filtered = items;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.nama_barang.toLowerCase().includes(query) ||
          item.kode_barang.toLowerCase().includes(query) ||
          item.deskripsi?.toLowerCase().includes(query) ||
          item.kategori?.toLowerCase().includes(query)
      );
    }

    // Apply availability filter
    if (filterAvailability === "tersedia") {
      filtered = filtered.filter((item) => item.stok_tersedia > 0);
    } else if (filterAvailability === "kosong") {
      filtered = filtered.filter((item) => item.stok_tersedia === 0);
    }

    setFilteredItems(filtered);
  }, [searchQuery, items, filterAvailability]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Katalog Barang</h1>
        <p className="text-gray-500 mt-1">
          Lihat daftar barang yang tersedia untuk dipinjam
        </p>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari barang, kode, atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="semua">Semua Barang</option>
              <option value="tersedia">Tersedia</option>
              <option value="kosong">Tidak Tersedia</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              {searchQuery ? "Barang tidak ditemukan" : "Tidak ada barang tersedia"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`overflow-hidden transition-all hover:shadow-lg ${
                item.stok_tersedia === 0 ? "opacity-75" : ""
              }`}
            >
              {/* Item Image */}
              {item.foto_url ? (
                <div className="relative h-48 bg-gray-100">
                  <Image
                    src={item.foto_url}
                    alt={item.nama_barang}
                    fill
                    className="object-cover"
                  />
                  {item.stok_tersedia === 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">Tidak Tersedia</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                  <Package className="h-12 w-12 text-gray-300" />
                </div>
              )}

              <CardContent className="pt-6 space-y-4">
                {/* Item Info */}
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {item.nama_barang}
                  </h3>
                  <p className="text-sm text-gray-500">{item.kode_barang}</p>
                  {item.deskripsi && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {item.deskripsi}
                    </p>
                  )}
                </div>

                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  {item.kategori && (
                    <Badge variant="outline" className="text-xs">
                      {item.kategori}
                    </Badge>
                  )}
                  <Badge className={`text-xs ${item.statusColor}`}>
                    {item.stok_tersedia > 0
                      ? `Stok: ${item.stok_tersedia}/${item.stok_total}`
                      : "Stok Habis"}
                  </Badge>
                </div>

                {/* Stock Info */}
                <div className="pt-2 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Stok Total:</span>
                    <span className="font-semibold text-gray-900">{item.stok_total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tersedia:</span>
                    <span
                      className={`font-semibold ${
                        item.stok_tersedia > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {item.stok_tersedia}
                    </span>
                  </div>
                </div>

                {/* QR Code Display */}
                {item.qr_code && (
                  <div className="flex justify-center bg-gray-50 p-3 rounded">
                    <Image
                      src={item.qr_code}
                      alt="QR Code"
                      width={80}
                      height={80}
                      className="w-20 h-20"
                    />
                  </div>
                )}

                {/* Barcode Info */}
                {item.barcode && (
                  <div className="text-center text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    Barcode: <span className="font-mono font-semibold">{item.barcode}</span>
                  </div>
                )}

                {/* Status */}
                <div
                  className={`text-center py-2 rounded text-sm font-medium ${
                    item.stok_tersedia > 0
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {item.stok_tersedia > 0 ? "✓ Siap Dipinjam" : "✗ Tidak Tersedia"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Box */}
      {filteredItems.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900">
              <strong>Total Barang:</strong> {filteredItems.length} dari {items.length} •{" "}
              <strong>Tersedia:</strong> {items.filter((i) => i.stok_tersedia > 0).length}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
