"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
  role: string;
  category: string;
  photo_url: string;
  bio: string;
  email: string;
  calendly_url: string;
  display_order: number;
};

const LEADERSHIP_CATS = new Set(["founder", "co-founder", "academic-director"]);
const ADVISOR_CATS = new Set(["advisor"]);
const AMBASSADOR_CATS = new Set(["ambassador-coordinator", "ambassador"]);

function MemberCard({ member }: { member: Member }) {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => { timerRef.current = setTimeout(() => setRevealed(true), 300); };
  const handleLeave = () => { if (timerRef.current) clearTimeout(timerRef.current); setRevealed(false); };
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="relative w-60 cursor-pointer group" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl bg-capha-light">
        {member.photo_url ? (
          <Image
            src={member.photo_url}
            alt={member.name}
            fill
            className={`object-cover object-top transition-all duration-500 ${
              revealed ? "blur-sm brightness-40 scale-105" : "brightness-100 scale-100"
            }`}
            sizes="240px"
            unoptimized={member.photo_url.startsWith("/")}
          />
        ) : (
          <div className={`w-full h-full bg-capha-navy/20 flex items-center justify-center transition-all duration-500 ${revealed ? "brightness-40" : ""}`}>
            <span className="text-capha-navy/40 text-4xl font-bold">{member.name[0]}</span>
          </div>
        )}

        <motion.div
          initial={false}
          animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute inset-0 flex flex-col justify-end p-4 pointer-events-none"
        >
          {revealed && (
            <div className="pointer-events-auto">
              <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider mb-1">{member.role}</p>
              <p className="text-white font-bold text-base mb-2 leading-snug" style={{ fontFamily: "var(--font-bodoni)" }}>
                {member.name}
              </p>
              <p className="text-white/80 text-xs leading-relaxed line-clamp-5 mb-3">{member.bio}</p>
              <div className="flex flex-col gap-1.5">
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-capha-sky text-[11px] hover:text-white transition-colors"
                  >
                    <Mail size={11} />
                    <span className="truncate">{member.email}</span>
                  </a>
                )}
                {member.calendly_url && (
                  <a
                    href={member.calendly_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-[11px] bg-white text-capha-navy font-bold px-3 py-1.5 rounded-lg w-fit hover:bg-capha-sky transition-colors"
                  >
                    <CalendarDays size={11} />
                    Book a slot
                  </a>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <div className="pt-3 pb-1">
        <p className="text-capha-navy font-semibold text-sm">{member.name}</p>
        <p className="text-capha-dark/40 text-xs mt-0.5">{member.role}</p>
      </div>
    </div>
  );
}

export default function Leadership() {
  const [activeTab, setActiveTab] = useState("founders");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient()
      .from("team_members")
      .select("*")
      .order("display_order")
      .then(({ data }) => { setMembers(data ?? []); setLoading(false); });
  }, []);

  const tabs = [
    { id: "founders",    label: "Leadership",   members: members.filter((m) => LEADERSHIP_CATS.has(m.category)) },
    { id: "advisors",    label: "Advisors",     members: members.filter((m) => ADVISOR_CATS.has(m.category)) },
    { id: "ambassadors", label: "Ambassadors",  members: members.filter((m) => AMBASSADOR_CATS.has(m.category)) },
  ];

  const active = tabs.find((t) => t.id === activeTab)!;

  return (
    <section id="leadership" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-capha-blue text-sm font-semibold uppercase tracking-widest mb-3">Meet the Team</p>
          <h2 className="text-4xl md:text-5xl font-bold text-capha-navy mb-4" style={{ fontFamily: "var(--font-bodoni)" }}>
            Leadership Team
          </h2>
          <p className="text-capha-dark/60 text-lg max-w-xl mx-auto">
            Dedicated students and healthcare professionals guiding the CAPHA community.
            Hover over a card to learn more.
          </p>
        </motion.div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-capha-light rounded-2xl p-1.5 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-capha-navy text-white shadow-sm"
                    : "text-capha-dark/60 hover:text-capha-navy"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-capha-blue/20 border-t-capha-blue rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="flex flex-wrap justify-center gap-6"
            >
              {active.members.map((member, i) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                >
                  <MemberCard member={member} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
