"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, Loader2, AlertCircle, ScanLine } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerModalProps {
  onResult: (kode: string) => void;
  onClose: () => void;
}

export default function BarcodeScannerModal({
  onResult,
  onClose,
}: BarcodeScannerModalProps) {
  const [status, setStatus] = useState<
    "idle" | "starting" | "scanning" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const isProcessingRef = useRef(false);
  const isInitializingRef = useRef(false);
  const containerId = useRef(
    `qr-reader-${Math.random().toString(36).substr(2, 9)}`,
  ).current;

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // State 2 = SCANNING
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    // Prevent multiple initialization attempts
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    try {
      // Stop and cleanup existing scanner first
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (err) {
          console.error("Error cleaning existing scanner:", err);
        }
        scannerRef.current = null;
      }

      if (!isMountedRef.current) {
        isInitializingRef.current = false;
        return;
      }

      if (isMountedRef.current) setStatus("starting");

      const html5Qrcode = new Html5Qrcode(containerId);
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 5,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Prevent duplicate processing
          if (isProcessingRef.current) return;
          if (!isMountedRef.current) return;

          isProcessingRef.current = true;

          // Extract UIT code from URL if full URL is scanned
          const uitMatch = decodedText.match(/UIT-\d{4}-\d{4}|LAB-\d{4}-\d{4}/);
          const code = uitMatch ? uitMatch[0] : decodedText;

          // Stop scanner first, then call result
          (async () => {
            if (scannerRef.current) {
              try {
                const state = scannerRef.current.getState();
                if (state === 2) {
                  await scannerRef.current.stop();
                }
                scannerRef.current.clear();
              } catch (err) {
                console.error("Error stopping scanner:", err);
              }
              scannerRef.current = null;
            }
            if (isMountedRef.current) {
              onResult(code);
            }
          })();
        },
        () => {}, // ignore per-frame errors
      );

      if (isMountedRef.current) setStatus("scanning");
    } catch (err: any) {
      console.error("Scanner error:", err);
      if (!isMountedRef.current) {
        isInitializingRef.current = false;
        return;
      }

      if (isMountedRef.current) {
        setStatus("error");
        if (err?.message?.includes("Permission")) {
          setErrorMsg(
            "Akses kamera ditolak. Izinkan akses kamera di browser Anda.",
          );
        } else if (
          err?.message?.includes("NotFound") ||
          err?.message?.includes("Requested device not found")
        ) {
          setErrorMsg("Kamera tidak ditemukan di perangkat ini.");
        } else {
          setErrorMsg("Gagal memulai kamera. Gunakan input manual di bawah.");
        }
      }
    } finally {
      isInitializingRef.current = false;
    }
  }, [onResult, containerId]);

  const handleManualSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const code = manualCode.trim().toUpperCase();
      if (code) {
        stopScanner();
        onResult(code);
      }
    },
    [manualCode, stopScanner, onResult],
  );

  const handleClose = useCallback(async () => {
    await stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  useEffect(() => {
    isMountedRef.current = true;
    isInitializingRef.current = false;
    let mounted = true;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(async () => {
      if (mounted) {
        await startScanner();
      }
    }, 100);

    return () => {
      mounted = false;
      isMountedRef.current = false;
      isProcessingRef.current = false;
      clearTimeout(timer);
      // Cleanup scanner on unmount
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/90">
      <div className="w-full max-w-md bg-white border-2 border-ink rounded-2xl overflow-hidden shadow-brut-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b-2 border-ink bg-[#F5F3EC] flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 bg-[#7DD3FC] border-2 border-ink rounded-xl flex items-center justify-center flex-shrink-0 shadow-brut-sm">
              <ScanLine className="w-4 h-4 text-ink" />
            </div>
            <div className="min-w-0">
              <h2 className="text-ink font-display font-bold text-base truncate">
                Scan QR Code
              </h2>
              <p className="text-ink/40 text-xs font-medium truncate">
                Arahkan kamera ke QR code peminjaman
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg border-2 border-ink bg-white flex items-center justify-center text-ink shadow-brut-sm hover:bg-[#FEE2E2] transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scanner area */}
        <div className="p-4 sm:p-5 flex-1 min-h-0 flex flex-col">
          <div
            className="relative rounded-xl overflow-hidden bg-black flex-1 border-2 border-ink"
            style={{ minHeight: 200 }}
          >
            <div id={containerId} className="w-full h-full" />

            {status === "starting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink">
                <div className="w-12 h-12 border-[3px] border-[#7DD3FC] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#7DD3FC]/80 text-sm font-medium">
                  Memulai kamera...
                </p>
              </div>
            )}

            {status === "scanning" && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-40 h-40 sm:w-52 sm:h-52">
                  {/* Corner frames */}
                  <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-l-2 border-[#7DD3FC] rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-r-2 border-[#7DD3FC] rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-l-2 border-[#7DD3FC] rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-r-2 border-[#7DD3FC] rounded-br-lg" />
                  {/* Scan line */}
                  <div
                    className="absolute inset-x-2 h-1 bg-[#7DD3FC] animate-scan shadow-[0_0_12px_rgba(125,211,252,0.9)]"
                    style={{ top: "50%" }}
                  />
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink p-4">
                <div className="w-12 h-12 bg-[#FEE2E2] border-2 border-ink rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-[#B91C1C]" />
                </div>
                <p className="text-[#FCA5A5] text-xs sm:text-sm text-center font-medium">
                  {errorMsg}
                </p>
                <button
                  onClick={startScanner}
                  className="mt-2 flex items-center justify-center gap-2 brut-btn brut-btn-blue !py-2"
                >
                  <Camera className="w-4 h-4" />
                  Coba Lagi
                </button>
              </div>
            )}
          </div>

          {/* Manual input */}
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-0.5 bg-ink/10" />
              <span className="text-ink/40 text-xs font-bold px-2 whitespace-nowrap">
                atau input manual
              </span>
              <div className="flex-1 h-0.5 bg-ink/10" />
            </div>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Contoh: UIT-2026-0001"
                className="flex-1 brut-input !py-2.5 font-mono text-sm"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="brut-btn brut-btn-blue !py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cari
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}