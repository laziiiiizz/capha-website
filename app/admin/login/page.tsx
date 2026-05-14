"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { adminLogin } from "./actions";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");

    const { ok, error: err } = await adminLogin(email, password);
    if (!ok) {
      setError(err ?? "Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push("/admin/bookings");
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(160deg, #0b3c5d 0%, #134a72 40%, #1a5e8a 70%, #328cc1 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="relative w-16 h-16 overflow-hidden ring-2 ring-white/25 mb-5">
            <Image src="/logo.jpeg" alt="CAPHA" fill className="object-cover" />
          </div>
          <h1
            className="text-3xl font-bold text-white mb-1"
            style={{ fontFamily: "var(--font-bodoni)" }}
          >
            CAPHA Admin
          </h1>
          <p className="text-white/45 text-sm">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
            <input
              type="email"
              aria-label="Email address"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="Email"
              autoFocus
              className="w-full bg-white/10 border border-white/20 pl-10 pr-4 py-3.5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-white/45 transition-colors"
            />
          </div>

          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
            <input
              type={showPw ? "text" : "password"}
              aria-label="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Password"
              className="w-full bg-white/10 border border-white/20 pl-10 pr-11 py-3.5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-white/45 transition-colors"
            />
            <button
              type="button"
              aria-label={showPw ? "Hide password" : "Show password"}
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors"
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {error && (
            <p className="text-red-300 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full bg-white text-capha-navy font-bold py-3.5 hover:bg-capha-light transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a href="/" className="text-white/30 text-xs hover:text-white/55 transition-colors">
            ← Back to website
          </a>
        </div>
      </div>
    </div>
  );
}
