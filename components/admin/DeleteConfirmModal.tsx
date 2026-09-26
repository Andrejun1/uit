'use client';

import { Loan } from '@/lib/supabase/types';
import { Loader2, Trash2, X } from 'lucide-react';

export default function DeleteConfirmModal({
  loan, processing, onConfirm, onClose,
}: { loan: Loan; processing: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-sm brut-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl border-2 border-ink bg-[#FEE2E2] flex items-center justify-center shadow-brut-sm">
            <Trash2 className="w-5 h-5 text-[#B91C1C]" />
          </div>
          <h2 className="font-display font-bold text-ink text-lg">Hapus Data?</h2>
        </div>
        <p className="text-ink/60 text-sm mb-5">
          Data peminjaman <span className="text-ink font-bold">{loan.nama}</span> ({loan.kode_unik}) akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={processing}
            className="flex-1 brut-btn !py-3">
            <X className="w-4 h-4" /> Batal
          </button>
          <button onClick={onConfirm} disabled={processing}
            className="flex-1 brut-btn brut-btn-red !py-3">
            {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Menghapus...</> : <><Trash2 className="w-4 h-4" /> Hapus</>}
          </button>
        </div>
      </div>
    </div>
  );
}