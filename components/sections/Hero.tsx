"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase";

type HeroContent = {
  headline: string;
  subtext: string;
  about_text: string;
};

const DEFAULT: HeroContent = {
  headline: "Supporting Future Central Asian Healthcare Leaders",
  subtext:
    "CAPHA is a student-led organization dedicated to helping Central Asian students in the United States build careers in healthcare — with real mentorship, real community, and the guidance that textbooks do not provide.",
  about_text: [
    "CAPHA — the Central Asian Pre-Health Association — was founded to fill a gap that too many Central Asian students face when pursuing healthcare in the United States: limited access to mentors who understand their background, their academic path, and the challenges of navigating a new system far from home.",
    "We bring together pre-medical, pre-dental, pre-PA, pre-optometry, nursing, pharmacy, and public health students from universities across the country. Through monthly virtual workshops, healthcare professionals share their journeys and offer the kind of insight that comes only from experience. Our one-on-one mentorship program connects students directly with current healthcare students who have walked the same road.",
    "We believe access to guidance should not depend on who you happen to know. CAPHA exists to change that — one student, one session, one community at a time.",
  ].join("\n\n"),
};

export default function Hero() {
  const [content, setContent] = useState<HeroContent>(DEFAULT);

  useEffect(() => {
    createClient()
      .from("site_content")
      .select("key, value")
      .eq("section", "hero")
      .then(({ data }) => {
        if (!data?.length) return;
        const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
        setContent((prev) => ({
          headline: map.headline ?? prev.headline,
          subtext: map.subtext ?? prev.subtext,
          about_text: map.about_text ?? prev.about_text,
        }));
      });
  }, []);

  const aboutParagraphs = content.about_text.split(/\n\n+/);

  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20"
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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid lg:grid-cols-5 gap-10 lg:gap-16 items-center">

          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1
              className="text-4xl md:text-5xl xl:text-6xl font-bold text-white leading-tight mb-6"
              style={{ fontFamily: "var(--font-bodoni)" }}
            >
              {content.headline}
            </h1>

            <p className="text-white/75 text-lg md:text-xl leading-relaxed mb-8 max-w-2xl">
              {content.subtext}
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="#events"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group flex items-center gap-2 bg-white text-capha-navy font-bold px-6 py-3 rounded-xl hover:bg-capha-light transition-all duration-200 shadow-lg shadow-black/20 hover:-translate-y-0.5"
              >
                Join Next Event
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#resources"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("resources")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center gap-2 bg-white/10 border border-white/30 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/20 transition-all duration-200 hover:-translate-y-0.5"
              >
                Explore Resources
              </a>
            </div>
          </motion.div>

          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          >
            <div className="bg-white p-7 border-l-4 border-capha-blue">
              <p className="text-capha-blue text-[11px] font-bold uppercase tracking-widest mb-4">
                About CAPHA
              </p>
              {aboutParagraphs.map((para, i) => (
                <p
                  key={i}
                  className={`text-capha-dark/80 text-sm leading-[1.85]${i < aboutParagraphs.length - 1 ? " mb-4" : ""}`}
                >
                  {para}
                </p>
              ))}
            </div>
          </motion.div>

        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60L1440 60L1440 30C1200 0 960 60 720 30C480 0 240 60 0 30L0 60Z" fill="#f4f8fb" />
        </svg>
      </div>
    </section>
  );
}
