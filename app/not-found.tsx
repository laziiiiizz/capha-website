import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{
        background: "linear-gradient(160deg, #0b3c5d 0%, #134a72 40%, #1a5e8a 70%, #328cc1 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative flex flex-col items-center">
        <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/25 mb-8">
          <Image src="/logo.jpeg" alt="CAPHA" fill className="object-cover" />
        </div>

        <p className="text-white/40 text-sm font-semibold uppercase tracking-widest mb-4">
          404 — Page Not Found
        </p>

        <h1
          className="text-5xl md:text-6xl font-bold text-white mb-4"
          style={{ fontFamily: "var(--font-bodoni)" }}
        >
          Lost?
        </h1>

        <p className="text-white/60 text-lg max-w-sm mb-10 leading-relaxed">
          That page doesn&apos;t exist. Let&apos;s get you back to the CAPHA community.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-white text-capha-navy font-bold px-8 py-3.5 hover:bg-capha-light transition-colors duration-200 text-sm"
        >
          ← Back to Homepage
        </Link>
      </div>
    </div>
  );
}
