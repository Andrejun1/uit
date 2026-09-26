"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";
import {
  Lock,
  Mail,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  ArrowLeft,
  QrCode,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn(email, password);

      console.log("LOGIN SUCCESS:", res);

      if (res.session) {
        router.push("/admin/dashboard");
        router.refresh();
      } else {
        setError("Session tidak ditemukan");
      }
    } catch (err: any) {
      console.error("LOGIN ERROR:", err);
      setError(err.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EC] lg:grid lg:grid-cols-2 lg:gap-8 lg:p-8">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 brut-card relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-3 bg-[#7DD3FC] border-b-2 border-ink" />

        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-ink bg-white flex items-center justify-center overflow-hidden shadow-brut-lg">
              <img
                src="/logounimus.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="kicker text-ink/50 mb-2">Universitas Muhammadiyah Semarang</p>
              <h1 className="font-display font-bold text-4xl leading-none text-ink">
                Unimus{" "}
                <span className="bg-[#7DD3FC] border-2 border-ink rounded-lg px-2 shadow-brut-sm inline-block">
                  Inventrack
                </span>
              </h1>
              <p className="mt-3 text-ink/60 font-medium">
                Sistem Peminjaman Barang Laboratorium
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-12">
          <p className="kicker text-ink/40 mb-4">{"// Fitur utama"}</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Tracking", desc: "Monitoring real-time", icon: ScanLine },
              { label: "QR Code", desc: "Scan & verifikasi", icon: QrCode },
              { label: "Aman", desc: "Auth terproteksi", icon: ShieldCheck },
            ].map((f) => (
              <div key={f.label} className="brut-card p-4 brut-card-hover">
                <div className="w-9 h-9 rounded-lg border-2 border-ink bg-[#7DD3FC] flex items-center justify-center mx-auto mb-3 shadow-brut-sm">
                  <f.icon className="w-4 h-4 text-ink" />
                </div>
                <p className="font-display font-bold text-sm text-ink">{f.label}</p>
                <p className="text-ink/50 text-xs mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-12 brut-stripes border-2 border-ink rounded-xl py-3 px-5 flex items-center justify-between bg-white">
          <span className="font-mono text-xs font-bold text-ink/70 tracking-widest uppercase">
            Lab Equipment Tracking System
          </span>
          <span className="font-mono text-xs font-bold text-ink/70">v2.0</span>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="w-full flex flex-col items-center justify-center p-6 sm:p-12 lg:p-0">
        <div className="w-full max-w-md">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-ink/60 hover:text-ink text-sm font-semibold mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>

          {/* Card */}
          <div className="brut-card p-8 sm:p-10">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center mb-8">
              <div className="w-16 h-16 rounded-2xl border-2 border-ink bg-white flex items-center justify-center overflow-hidden shadow-brut">
                <img
                  src="/logounimus.png"
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg border-2 border-ink bg-[#7DD3FC] flex items-center justify-center shadow-brut-sm">
                  <Shield className="w-3.5 h-3.5 text-ink" />
                </div>
                <span className="kicker text-ink/60">Portal Admin</span>
              </div>
              <h2 className="font-display text-3xl font-bold text-ink">
                Selamat Datang
              </h2>
              <p className="text-ink/50 text-sm mt-1">
                Masuk untuk mengelola data peminjaman
              </p>
            </div>

            {error && (
              <div className="mb-6 border-2 border-ink bg-[#FEE2E2] text-[#B91C1C] rounded-xl px-4 py-3 text-sm font-bold shadow-brut-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="brut-label">
                  Email Admin
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
                  <input
                    id="email"
                    type="email"
                    placeholder="admin@unimus.ac.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="brut-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="brut-label">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="brut-input pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Tampilkan password"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full brut-btn brut-btn-primary !py-3.5 !text-base mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Memproses...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" /> Masuk sebagai Admin
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-ink/40 text-xs mt-6 font-medium">
              UIT v2.0 — Universitas Muhammadiyah Semarang
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}