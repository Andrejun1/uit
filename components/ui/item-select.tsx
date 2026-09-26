"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getAvailableItems, Item } from "@/lib/items";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemSelectProps {
  value?: string;
  onChange: (item: Item | null) => void;
  onlyAvailable?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ItemSelect({
  value,
  onChange,
  onlyAvailable = true,
  placeholder = "Pilih barang...",
  disabled = false,
}: ItemSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load items on mount
  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        const data = onlyAvailable ? await getAvailableItems() : [];
        setItems(data);
      } catch (err) {
        console.error("Error loading items:", err);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, [onlyAvailable]);

  // Filter items based on search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredItems(items);
    } else {
      const query = search.toLowerCase();
      const filtered = items.filter(
        (item) =>
          item.nama_barang.toLowerCase().includes(query) ||
          item.kode_barang.toLowerCase().includes(query) ||
          item.deskripsi?.toLowerCase().includes(query)
      );
      setFilteredItems(filtered);
    }
  }, [search, items]);

  // Handle selection
  const handleSelect = useCallback(
    (item: Item) => {
      setSelectedItem(item);
      onChange(item);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  // Handle clear
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedItem(null);
      onChange(null);
      setSearch("");
    },
    [onChange]
  );

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        className={cn(
          "brut-input flex items-center justify-between gap-2 text-left !py-2.5",
          !selectedItem && "text-ink/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        <span className="truncate font-medium">
          {selectedItem
            ? `${selectedItem.nama_barang} (${selectedItem.stok_tersedia}/${selectedItem.stok_total})`
            : placeholder}
        </span>
        {selectedItem ? (
          <X
            className="ml-2 h-4 w-4 shrink-0 opacity-70 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              handleClear(e);
            }}
          />
        ) : (
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 border-2 border-ink bg-white shadow-brut rounded-xl overflow-hidden">
          <div className="p-2 border-b-2 border-ink bg-[#F5F3EC]">
            <Input
              placeholder="Cari barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm text-ink/60 font-medium">Memuat...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <p className="text-sm text-ink/50 font-medium">
                  {search ? "Barang tidak ditemukan" : "Tidak ada barang tersedia"}
                </p>
              </div>
            ) : (
              <div className="p-1">
                {filteredItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const isOutOfStock = item.stok_tersedia <= 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isOutOfStock}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg cursor-pointer text-sm flex items-center justify-between transition-colors border-2",
                        isSelected
                          ? "bg-[#7DD3FC] text-ink border-ink shadow-brut-sm"
                          : "border-transparent text-ink/80 hover:bg-[#E0F2FE] hover:text-ink",
                        isOutOfStock && "opacity-50 cursor-not-allowed hover:bg-transparent"
                      )}
                      onClick={() => !isOutOfStock && handleSelect(item)}
                    >
                      <div className="flex-1 truncate pr-2">
                        <div className="font-semibold truncate font-display">
                          {item.nama_barang}
                          {isOutOfStock && (
                            <span className="ml-2 text-xs font-bold text-[#B91C1C]">
                              (Habis)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-ink/50 mt-0.5 font-medium">
                          {item.kode_barang} • Stok:{" "}
                          <span className={cn(
                            item.stok_tersedia > 0 ? "text-[#15803D] font-bold" : "text-[#B91C1C] font-bold"
                          )}>
                            {item.stok_tersedia}
                          </span>/{item.stok_total}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 ml-2 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedItem && (
            <div className="border-t-2 border-ink p-2 bg-[#F5F3EC]">
              <button
                type="button"
                className="w-full text-center text-sm font-bold text-ink/60 hover:text-ink py-2"
                onClick={handleClear}
              >
                Hapus Pilihan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}