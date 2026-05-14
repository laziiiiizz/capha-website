"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase";
import {
  ExternalLink,
  Stethoscope,
  Smile,
  Eye,
  UserCog,
  HeartPulse,
  Pill,
  Activity,
  Globe,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

type Step = {
  id: string;
  track: string;
  title: string;
  detail: string;
  link_label: string;
  link_href: string;
  display_order: number;
};

const TRACK_META = [
  {
    id: "medicine",
    shortLabel: "Medicine",
    label: "Medicine (MD)",
    icon: Stethoscope,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    description: "Physicians diagnose, treat, and prevent illness across all specialties. The journey to becoming an MD is rigorous but deeply rewarding.",
    links: [
      { href: "https://students-residents.aamc.org/", label: "AAMC Pre-Med Hub" },
      { href: "https://blueprintprep.com/mcat", label: "Blueprint MCAT Prep" },
      { href: "https://www.khanacademy.org/science/mcat", label: "Khan Academy MCAT (Free)" },
      { href: "https://students-residents.aamc.org/applying-medical-school/applying-medical-school-process", label: "Medical School Application Tips" },
    ],
    facts: [
      "Over 120 medical specialties exist — from cardiology to psychiatry.",
      "Physicians lead research, policy, and communities worldwide.",
    ],
  },
  {
    id: "dentistry",
    shortLabel: "Dentistry",
    label: "Dentistry (DDS/DMD)",
    icon: Smile,
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
    description: "Dentists prevent, diagnose, and treat oral diseases while improving aesthetics and health. A hands-on, patient-centered career with excellent work-life balance.",
    links: [
      { href: "https://boosterprep.com/dat", label: "DAT Booster" },
      { href: "https://bootcamp.com/dat", label: "DAT Bootcamp" },
      { href: "https://school.chadsprep.com/", label: "Chad's Prep Videos" },
      { href: "https://orgoman.com/products/dat-destroyer", label: "Orgoman DAT Destroyer" },
    ],
    facts: [
      "Specialties include Orthodontics, Endodontics, Oral Surgery, and Pediatric Dentistry.",
      "Dentists consistently rank among the highest job satisfaction rates in healthcare.",
    ],
  },
  {
    id: "optometry",
    shortLabel: "Optometry",
    label: "Optometry (OD)",
    icon: Eye,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    description: "Optometrists diagnose, manage, and treat eye and vision conditions, playing a vital role in maintaining lifelong eye health for their communities.",
    links: [
      { href: "https://optometriceducation.org/", label: "ASCO Optometry Education" },
      { href: "https://youtube.com/results?search_query=optometry+school+day+in+the+life", label: "Optometry Student Vlogs" },
    ],
    facts: [
      "Optometry is a fast-growing, technology-driven field with rising demand.",
      "ODs can prescribe medications and treat ocular diseases in all 50 states.",
    ],
  },
  {
    id: "pa",
    shortLabel: "Physician Assistant",
    label: "Physician Assistant (PA)",
    icon: UserCog,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    description: "PAs provide medical care in collaboration with physicians across specialties, focusing on patient care, diagnostics, and treatment planning with a shorter training path.",
    links: [
      { href: "https://www.arc-pa.org/accredited-programs/", label: "Accredited PA Programs" },
      { href: "https://paeaonline.org/", label: "PA Education Association" },
      { href: "https://youtube.com/results?search_query=how+to+become+a+physician+assistant", label: "PA Career Guides (YouTube)" },
    ],
    facts: [
      "PAs can practice across nearly every medical specialty.",
      "One of the fastest-growing healthcare occupations — projected 28% growth.",
    ],
  },
  {
    id: "nursing",
    shortLabel: "Nursing",
    label: "Nursing (RN/NP)",
    icon: HeartPulse,
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    description: "Nurses are the backbone of healthcare delivery. From bedside RN to advanced practice Nurse Practitioner, nursing offers one of the most flexible and impactful careers in medicine.",
    links: [
      { href: "https://www.aacnnursing.org/", label: "AACN — Nursing Education" },
      { href: "https://www.ncsbn.org/nclex.htm", label: "NCLEX Prep & Info" },
      { href: "https://www.uworld.com/", label: "UWorld NCLEX Prep" },
      { href: "https://www.aanp.org/", label: "American Assoc. of Nurse Practitioners" },
    ],
    facts: [
      "Nurse Practitioners can prescribe medications and practice independently in many states.",
      "Nursing is the largest healthcare profession in the US with over 4 million RNs.",
    ],
  },
  {
    id: "pharmacy",
    shortLabel: "Pharmacy",
    label: "Pharmacy (PharmD)",
    icon: Pill,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    description: "Pharmacists are medication experts who ensure safe and effective drug therapy. The PharmD opens doors in retail, hospital, industry, and clinical research settings.",
    links: [
      { href: "https://www.aacp.org/", label: "AACP — Pharmacy School Directory" },
      { href: "https://nabp.pharmacy/", label: "NABP — Licensing Info" },
      { href: "https://www.pharmcas.org/", label: "PharmCAS — Application Portal" },
      { href: "https://www.rxprep.com/", label: "RxPrep NAPLEX Study" },
    ],
    facts: [
      "Pharmacists earn six-figure salaries across most practice settings.",
      "Clinical pharmacists work directly with physicians on hospital patient care teams.",
    ],
  },
  {
    id: "physicaltherapy",
    shortLabel: "Physical Therapy",
    label: "Physical Therapy (DPT)",
    icon: Activity,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    description: "Physical therapists help patients recover from injuries, surgeries, and chronic conditions by restoring strength, mobility, and function.",
    links: [
      { href: "https://www.apta.org/", label: "APTA — American PT Association" },
      { href: "https://www.ptcas.org/", label: "PTCAS — Application Portal" },
      { href: "https://www.scorebuilders.com/", label: "ScoreBuilders NPTE Prep" },
    ],
    facts: [
      "DPT is the entry-level degree for all PT practice — it's a doctoral profession.",
      "Specialties include sports, pediatrics, neuro, geriatrics, orthopedics, and cardiopulmonary.",
    ],
  },
  {
    id: "publichealth",
    shortLabel: "Public Health",
    label: "Public Health (MPH)",
    icon: Globe,
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    description: "Public health professionals protect and improve the health of entire populations — from epidemiology to global health policy, MPH graduates work where medicine meets society.",
    links: [
      { href: "https://www.aspph.org/", label: "ASPPH — MPH Program Finder" },
      { href: "https://sophas.org/", label: "SOPHAS — Application Portal" },
      { href: "https://www.cdc.gov/", label: "CDC — Public Health Careers" },
      { href: "https://www.who.int/careers", label: "WHO — Global Health Careers" },
    ],
    facts: [
      "MPH graduates work at the CDC, WHO, hospitals, and international NGOs.",
      "Epidemiologists were central to the COVID-19 pandemic response worldwide.",
    ],
  },
];

export default function Resources() {
  const [activeId, setActiveId] = useState("medicine");
  const [stepsByTrack, setStepsByTrack] = useState<Record<string, Step[]>>({});
  const [loadingSteps, setLoadingSteps] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("resource_steps")
      .select("*")
      .order("display_order")
      .then(({ data }) => {
        const grouped: Record<string, Step[]> = {};
        for (const row of data ?? []) {
          if (!grouped[row.track]) grouped[row.track] = [];
          grouped[row.track].push(row);
        }
        setStepsByTrack(grouped);
        setLoadingSteps(false);
      });
  }, []);

  const active = TRACK_META.find((r) => r.id === activeId)!;
  const ActiveIcon = active.icon;
  const activeSteps = stepsByTrack[activeId] ?? [];

  return (
    <section id="resources" className="py-24 bg-capha-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-4 bg-capha-navy/10 text-capha-navy border-capha-navy/20 hover:bg-capha-navy/10">
            Career Guidance
          </Badge>
          <h2
            className="text-4xl md:text-5xl font-bold text-capha-navy mb-4"
            style={{ fontFamily: "var(--font-bodoni)" }}
          >
            Resources & Guidance
          </h2>
          <p className="text-capha-dark/60 text-lg max-w-2xl mx-auto">
            Explore healthcare career paths with step-by-step roadmaps, curated resources,
            and guidance from our advisors and mentors.
          </p>
        </motion.div>

        <div
          className="overflow-x-auto mb-8"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="flex border-b-2 border-capha-blue/10 min-w-max">
            {TRACK_META.map((r) => {
              const Icon = r.icon;
              const isActive = activeId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveId(r.id)}
                  className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                    isActive ? "text-capha-navy" : "text-capha-dark/45 hover:text-capha-dark/75"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                      isActive ? `${r.bg} ${r.border}` : "bg-white border-capha-blue/10"
                    }`}
                  >
                    <Icon size={13} className={isActive ? r.color : "text-capha-dark/40"} />
                  </span>
                  {r.shortLabel}
                  {isActive && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-capha-navy rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="grid sm:grid-cols-[2fr_1fr] gap-5"
          >
            <div className="bg-white border border-capha-blue/10 rounded-2xl overflow-hidden">
              <div className={`${active.bg} border-b ${active.border} px-6 py-5 flex items-center gap-4`}>
                <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <ActiveIcon size={22} className={active.color} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[11px] font-bold uppercase tracking-widest ${active.color} mb-0.5`}>
                    Career Path
                  </p>
                  <h3
                    className="text-capha-navy text-lg font-bold leading-tight"
                    style={{ fontFamily: "var(--font-bodoni)" }}
                  >
                    {active.label}
                  </h3>
                </div>
              </div>

              <div className="px-6 py-4 border-b border-capha-blue/8 bg-capha-light/60">
                <p className="text-capha-dark/65 text-sm leading-relaxed">{active.description}</p>
              </div>

              <div className="p-6">
                {loadingSteps ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-capha-blue/30 border-t-capha-blue rounded-full animate-spin" />
                  </div>
                ) : activeSteps.length === 0 ? (
                  <p className="text-capha-dark/40 text-sm text-center py-4">
                    Steps coming soon.
                  </p>
                ) : (
                  activeSteps.map((s, i) => (
                    <div key={s.id} className="flex gap-4">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full ${active.bg} border-2 ${active.border} flex items-center justify-center`}>
                          <span className={`text-xs font-bold ${active.color}`}>{i + 1}</span>
                        </div>
                        {i < activeSteps.length - 1 && (
                          <div className="w-px flex-1 bg-capha-blue/15 my-2 min-h-[20px]" />
                        )}
                      </div>
                      <div className={i < activeSteps.length - 1 ? "pb-6" : "pb-1"}>
                        <p className="text-capha-navy font-semibold text-sm leading-tight">{s.title}</p>
                        <p className="text-capha-dark/60 text-sm mt-0.5 leading-relaxed">{s.detail}</p>
                        {s.link_label && s.link_href && (
                          <a
                            href={s.link_href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-xs mt-1.5 font-semibold ${active.color} hover:underline`}
                          >
                            {s.link_label}
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="bg-capha-navy rounded-2xl p-5 flex-1">
                <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/15 flex items-center justify-center">
                    <ExternalLink size={10} className="text-white" />
                  </span>
                  Helpful Resources
                </h4>
                <div className="space-y-2">
                  {active.links.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.15] border border-white/10 transition-all duration-200 group"
                    >
                      <span className="flex-1 min-w-0 text-white/90 text-sm font-medium leading-tight truncate">
                        {l.label}
                      </span>
                      <ChevronRight
                        size={14}
                        className="text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                      />
                    </a>
                  ))}
                </div>
              </div>

              <div className={`${active.bg} border ${active.border} rounded-2xl p-5`}>
                <h4 className={`${active.color} font-bold text-sm uppercase tracking-wide mb-3`}>
                  Key Facts
                </h4>
                <div className="space-y-3">
                  {active.facts.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 size={15} className={`${active.color} flex-shrink-0 mt-0.5`} />
                      <p className="text-capha-dark/70 text-sm leading-relaxed">{f}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}
