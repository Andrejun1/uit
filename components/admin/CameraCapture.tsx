"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  X,
  RotateCcw,
  Check,
  FlipHorizontal,
} from "lucide-react";

interface CameraCaptureProps {
  type: "peminjam" | "barang";
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCapture({
  type,
  onCapture,
  onClose,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const isInitializingRef = useRef(false);

  const [status, setStatus] = useState<
    "loading" | "ready" | "captured" | "error"
  >("loading");
  const [capturedUrl, setCapturedUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      // Stop all tracks
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    // Prevent multiple initialization attempts
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    try {
      // Stop existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }

      if (!isMountedRef.current) return;

      if (isMountedRef.current) setStatus("loading");

      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (isMountedRef.current) {
            videoRef.current?.play().catch(() => {
              // Auto-play may be blocked, that's ok
            });
            if (isMountedRef.current) setStatus("ready");
          }
        };
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;

      if (isMountedRef.current) {
        setStatus("error");
        setErrorMsg(
          err?.name === "NotAllowedError"
            ? "Akses kamera ditolak. Izinkan akses kamera di browser."
            : err?.name === "NotFoundError"
              ? "Kamera tidak ditemukan di perangkat ini."
              : "Gagal memulai kamera. Coba lagi atau gunakan upload manual.",
        );
      }
    } finally {
      isInitializingRef.current = false;
    }
  }, [facingMode]);

  useEffect(() => {
    isMountedRef.current = true;
    startCamera();

    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [facingMode]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror for front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    const url = canvas.toDataURL("image/jpeg", 0.9);

    setCapturedUrl(url);
    if (isMountedRef.current) setStatus("captured");
    stopCamera();
  }, [facingMode, stopCamera]);

  const retake = useCallback(() => {
    setCapturedUrl("");
    if (isMountedRef.current) setStatus("loading");
    startCamera();
  }, [facingMode]);

  const confirmCapture = useCallback(() => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${type}-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        stopCamera();
        onCapture(file);
      },
      "image/jpeg",
      0.9,
    );
  }, [type, stopCamera, onCapture]);

  const flipCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const label = type === "peminjam" ? "Peminjam" : "Barang";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/90">
      <div className="w-full max-w-lg bg-white border-2 border-ink rounded-2xl overflow-hidden shadow-brut-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-ink bg-[#F5F3EC] flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 bg-[#7DD3FC] border-2 border-ink rounded-xl flex items-center justify-center flex-shrink-0 shadow-brut-sm">
              <Camera className="w-4 h-4 text-ink" />
            </div>
            <div className="min-w-0">
              <h2 className="text-ink font-display font-bold text-base truncate">
                Ambil Foto {label}
              </h2>
              <p className="text-ink/40 text-xs font-medium">
                Posisikan objek di tengah frame
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

        {/* Camera view */}
        <div
          className="relative bg-black flex-1 min-h-0"
          style={{ aspectRatio: "4/3" }}
        >
          {status !== "captured" && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                transform: facingMode === "user" ? "scaleX(-1)" : "none",
              }}
            />
          )}

          {status === "captured" && capturedUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capturedUrl}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}

          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 border-[3px] border-ink border-t-transparent rounded-full animate-spin" />
              <p className="text-white/60 text-sm font-medium">Memulai kamera...</p>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
              <p className="text-[#FCA5A5] text-sm text-center font-medium">
                {errorMsg}
              </p>
            </div>
          )}

          {status === "ready" && (
            <>
              {/* Viewfinder */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-40 h-40 sm:w-48 sm:h-48">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#7DD3FC]" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#7DD3FC]" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#7DD3FC]" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#7DD3FC]" />
                </div>
              </div>
              {/* Flip button */}
              <button
                type="button"
                onClick={flipCamera}
                className="absolute top-2 right-2 w-9 h-9 bg-black/60 border-2 border-white/40 rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        <div className="p-4 bg-[#F5F3EC] border-t-2 border-ink flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 flex-shrink-0">
          {status === "ready" && (
            <button
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full border-2 border-ink bg-white flex items-center justify-center shadow-brut hover:bg-[#E0F2FE] transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[#7DD3FC] border-2 border-ink flex items-center justify-center">
                <Camera className="w-5 h-5 text-ink" />
              </div>
            </button>
          )}

          {status === "captured" && (
            <>
              <button
                onClick={retake}
                className="w-full sm:w-auto flex items-center justify-center gap-2 brut-btn !py-3"
              >
                <RotateCcw className="w-4 h-4" />
                Ulangi
              </button>
              <button
                onClick={confirmCapture}
                className="w-full sm:w-auto flex items-center justify-center gap-2 brut-btn brut-btn-blue !py-3"
              >
                <Check className="w-4 h-4" />
                Gunakan Foto
              </button>
            </>
          )}

          {status === "error" && (
            <button
              onClick={startCamera}
              className="w-full sm:w-auto flex items-center justify-center gap-2 brut-btn brut-btn-blue !py-3"
            >
              <RotateCcw className="w-4 h-4" />
              Coba Lagi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}