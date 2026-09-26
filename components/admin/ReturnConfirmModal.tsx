'use client';

import { Loan } from '@/lib/supabase/types';
import { Loader2, CheckCircle2, Package } from 'lucide-react';

export default function ReturnConfirmModal({
  loan, processing, onConfirm, onClose,
}: { loan: Loan; processing: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-sm brut-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl border-2 border-ink bg-[#DCFCE7] flex items-center justify-center shadow-brut-sm">
            <CheckCircle2 className="w-5 h-5 text-[#15803D]" />
          </div>
          <h2 className="font-display font-bold text-ink text-lg">Kembalikan Barang?</h2>
        </div>
        <div className="border-2 border-ink rounded-xl bg-[#F5F3EC] p-4 mb-5 space-y-1.5">
          <p className="kicker text-ink/40">Konfirmasi Pengembalian</p>
          <p className="font-display font-bold text-ink">{loan.nama}</p>
          <p className="flex items-center gap-1.5 text-ink/60 text-sm">
            <Package className="w-4 h-4" /> {loan.nama_barang}
          </p>
          <p className="font-mono text-ink/40 text-xs">{loan.kode_unik}</p>
        </div>
        <p className="text-ink/50 text-xs mb-5">
          Status akan diubah menjadi <span className="text-[#15803D] font-bold">Dikembalikan</span> dan tanggal kembali akan dicatat otomatis.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 brut-btn !py-3"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={processing}
            className="flex-1 brut-btn brut-btn-green !py-3"
          >
            {processing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
              : <><CheckCircle2 className="w-4 h-4" /> Konfirmasi</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}