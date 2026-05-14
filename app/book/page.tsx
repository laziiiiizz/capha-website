"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Calendar, Clock, ChevronRight, ChevronLeft, CheckCircle } from "lucide-react";
import { bookAppointment } from "./actions";
import { createClient } from "@/lib/supabase";

type Advisor = {
  id: string;
  name: string;
  role: string;
  school: string;
  photo: string;
};

function firstSentence(text: string): string {
  if (!text) return "";
  const end = text.search(/[.!?]/);
  return end >= 0 ? text.slice(0, end + 1) : text;
}

const timeSlots = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM",
];

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const LONG_MONTHS = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function friendlyDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function parseFlexDate(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  // MMDDYYYY (8 digits no separators)
  if (/^\d{8}$/.test(s)) {
    const dt = new Date(+s.slice(4), +s.slice(0,2) - 1, +s.slice(2,4));
    if (!isNaN(dt.getTime())) return isoDate(dt);
  }

  // M/D/YYYY or MM/DD/YYYY
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const dt = new Date(+slash[3], +slash[1] - 1, +slash[2]);
    if (!isNaN(dt.getTime())) return isoDate(dt);
  }

  // Month D YYYY or Month D, YYYY  (e.g. "March 10 2026" or "march 10, 2026")
  const named = s.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (named) {
    const mIdx = LONG_MONTHS.findIndex(m => m.startsWith(named[1].toLowerCase()));
    if (mIdx >= 0) {
      const dt = new Date(+named[3], mIdx, +named[2]);
      if (!isNaN(dt.getTime())) return isoDate(dt);
    }
  }

  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Last resort: native Date.parse
  const native = new Date(s);
  if (!isNaN(native.getTime())) return isoDate(native);

  return null;
}

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

const schema = z.object({
  name: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email address"),
  university: z.string().min(2, "University is required"),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const todayISO = isoDate(new Date());
const steps = ["Choose Advisor", "Date & Time", "Your Details"];

export default function BookPage() {
  const [step, setStep] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [advisorsLoading, setAdvisorsLoading] = useState(true);

  // Custom calendar state
  const [calOpen, setCalOpen] = useState(false);
  const [dateText, setDateText] = useState("");
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("blocked_dates").select("blocked_date"),
      supabase.from("blocked_slots").select("time_slot"),
      supabase
        .from("team_members")
        .select("id, name, role, bio, photo_url")
        .in("category", ["advisor", "academic-director"])
        .neq("email", "")
        .order("display_order"),
    ]).then(([{ data: dates }, { data: slots }, { data: members }]) => {
      setBlockedDates((dates ?? []).map((d) => d.blocked_date));
      setBlockedSlots((slots ?? []).map((s) => s.time_slot));
      setAdvisors(
        (members ?? []).map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          school: firstSentence(m.bio ?? ""),
          photo: m.photo_url || "",
        }))
      );
    });
  }, []);

  // Close calendar on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Sync dateText when selectedDate is cleared
  useEffect(() => {
    if (!selectedDate) setDateText("");
    else setDateText(friendlyDate(selectedDate));
  }, [selectedDate]);

  function handleDateInput(val: string) {
    setDateText(val);
    const iso = parseFlexDate(val);
    if (iso) {
      if (iso < todayISO) {
        toast.error("Please choose a future date.");
        return;
      }
      if (blockedDates.includes(iso)) {
        toast.error("This date is unavailable. Please choose another.");
        return;
      }
      setSelectedDate(iso);
      setCalYear(+iso.slice(0,4));
      setCalMonth(+iso.slice(5,7) - 1);
      setCalOpen(false);
      setSelectedTime("");
    }
  }

  function handleDayClick(day: number) {
    const iso = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    if (iso < todayISO) return;
    if (blockedDates.includes(iso)) {
      toast.error("This date is unavailable. Please choose another.");
      return;
    }
    setSelectedDate(iso);
    setDateText(friendlyDate(iso));
    setCalOpen(false);
    setSelectedTime("");
  }

  const advisor = advisors.find((a) => a.id === selectedId);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!advisor) return;
    setLoading(true);
    try {
      await bookAppointment({
        ...data,
        advisorId: advisor.id,
        advisorName: advisor.name,
        advisorEmail: "",
        advisorRole: advisor.role,
        date: selectedDate,
        time: selectedTime,
      });
      setDone(true);
    } catch {
      toast.error("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calDays = buildCalendarDays(calYear, calMonth);

  if (done) {
    return (
      <div className="min-h-screen bg-capha-light flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-xl"
        >
          <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="text-emerald-500" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-capha-navy mb-2" style={{ fontFamily: "var(--font-bodoni)" }}>
            Request Sent!
          </h2>
          <p className="text-capha-dark/60 text-sm leading-relaxed mb-6">
            Your request was sent to <strong className="text-capha-navy">{advisor?.name}</strong>.
            Check your inbox — we also sent you a confirmation.
          </p>
          <div className="bg-capha-light p-4 text-left space-y-2 mb-7 text-sm">
            <div className="flex justify-between">
              <span className="text-capha-dark/50">Advisor</span>
              <span className="text-capha-navy font-semibold">{advisor?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-capha-dark/50">Date</span>
              <span className="text-capha-navy font-semibold">{friendlyDate(selectedDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-capha-dark/50">Time</span>
              <span className="text-capha-navy font-semibold">{selectedTime} EST</span>
            </div>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-capha-navy text-white font-semibold px-6 py-3 hover:bg-capha-blue transition-colors text-sm"
          >
            Back to homepage
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-capha-light">
      {/* Header */}
      <div className="bg-capha-navy">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="relative w-10 h-10 overflow-hidden ring-2 ring-white/30">
              <Image src="/logo.jpeg" alt="CAPHA" fill className="object-cover" />
            </div>
            <span className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-bodoni)" }}>
              CAPHA
            </span>
          </a>
          <span className="text-white/40 text-sm">Mentorship Booking</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Step progress */}
        <div className="flex items-center mb-10">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div
                  className={`w-8 h-8 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    i < step
                      ? "bg-emerald-500 text-white"
                      : i === step
                      ? "bg-capha-navy text-white"
                      : "bg-white border-2 border-capha-blue/20 text-capha-dark/30"
                  }`}
                >
                  {i < step ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    i === step ? "text-capha-navy" : "text-capha-dark/35"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 h-px mx-3 bg-capha-blue/15" />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Choose advisor */}
          {step === 0 && (
            <motion.div
              key="s0"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <h1 className="text-2xl font-bold text-capha-navy mb-1" style={{ fontFamily: "var(--font-bodoni)" }}>
                Choose your advisor
              </h1>
              <p className="text-capha-dark/55 text-sm mb-6">
                Select the CAPHA advisor whose track matches your goals. Sessions are 30 min via Zoom.
              </p>

              <div className="space-y-3">
                {advisors.length === 0 && (
                  <p className="text-capha-dark/40 text-sm py-6 text-center">
                    Loading advisors...
                  </p>
                )}
                {advisors.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={`w-full flex items-center gap-4 p-4 border-2 text-left transition-all duration-200 ${
                      selectedId === a.id
                        ? "border-capha-navy bg-white shadow-md"
                        : "border-capha-blue/10 bg-white hover:border-capha-blue/25 hover:shadow-sm"
                    }`}
                  >
                    <div className="relative w-12 h-12 overflow-hidden flex-shrink-0 ring-2 ring-capha-blue/10 bg-capha-light">
                      {a.photo ? (
                        <Image src={a.photo} alt={a.name} fill className="object-cover object-top" unoptimized={a.photo.startsWith("/")} />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full text-capha-navy font-bold text-sm">
                          {a.name[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-capha-navy font-semibold text-sm">{a.name}</p>
                      <p className="text-capha-navy/70 text-xs font-medium mt-0.5">{a.role}</p>
                      <p className="text-capha-dark/40 text-xs mt-0.5 truncate">{a.school}</p>
                    </div>
                    <div
                      className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedId === a.id
                          ? "border-capha-navy bg-capha-navy"
                          : "border-capha-blue/20"
                      }`}
                    >
                      {selectedId === a.id && (
                        <div className="w-2 h-2 bg-white" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(1)}
                disabled={!selectedId}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-capha-navy text-white font-semibold py-3.5 hover:bg-capha-blue transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
              >
                Continue
                <ChevronRight size={18} />
              </button>
            </motion.div>
          )}

          {/* Step 1: Date & Time */}
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <h1 className="text-2xl font-bold text-capha-navy mb-1" style={{ fontFamily: "var(--font-bodoni)" }}>
                Pick a date & time
              </h1>
              <p className="text-capha-dark/55 text-sm mb-6">
                All times are Eastern (EST). Your advisor will confirm availability.
              </p>

              {/* Date picker */}
              <div className="bg-white border border-capha-blue/10 p-5 mb-4">
                <label htmlFor="booking-date" className="flex items-center gap-2 text-capha-navy font-semibold text-sm mb-3">
                  <Calendar size={15} className="text-capha-blue" />
                  Select Date
                </label>

                <div className="relative" ref={calRef}>
                  {/* Text input */}
                  <input
                    id="booking-date"
                    type="text"
                    value={dateText}
                    onChange={(e) => setDateText(e.target.value)}
                    onBlur={(e) => handleDateInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleDateInput(dateText); }}
                    onFocus={() => setCalOpen(true)}
                    placeholder="e.g. March 10 2026  or  3/10/2026  or  03102026"
                    className="w-full border border-capha-blue/20 px-4 py-2.5 text-capha-navy text-sm focus:outline-none focus:border-capha-navy transition-colors placeholder:text-capha-dark/25"
                  />

                  {/* Calendar popup */}
                  <AnimatePresence>
                    {calOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-capha-blue/20 shadow-xl overflow-hidden"
                        style={{ minWidth: 280 }}
                      >
                        {/* Month navigation */}
                        <div className="bg-capha-navy flex items-center justify-between px-4 py-3">
                          <button
                            aria-label="Previous month"
                            onClick={() => {
                              if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                              else setCalMonth(m => m - 1);
                            }}
                            className="text-white/70 hover:text-white transition-colors p-1"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-white font-semibold text-sm">
                            {MONTH_NAMES[calMonth]} {calYear}
                          </span>
                          <button
                            aria-label="Next month"
                            onClick={() => {
                              if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                              else setCalMonth(m => m + 1);
                            }}
                            className="text-white/70 hover:text-white transition-colors p-1"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>

                        {/* Day names */}
                        <div className="grid grid-cols-7 bg-capha-navy/5 border-b border-capha-blue/10">
                          {DAY_NAMES.map((d) => (
                            <div key={d} className="text-center text-capha-blue/60 text-[11px] font-bold py-2">
                              {d}
                            </div>
                          ))}
                        </div>

                        {/* Days grid */}
                        <div className="grid grid-cols-7 px-2 pb-2 pt-1">
                          {calDays.map((day, idx) => {
                            if (!day) return <div key={`e${idx}`} />;
                            const iso = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                            const isPast = iso < todayISO;
                            const isBlocked = blockedDates.includes(iso);
                            const isSelected = iso === selectedDate;
                            const isToday = iso === todayISO;
                            return (
                              <div key={day} className="flex items-center justify-center py-0.5">
                                <button
                                  onClick={() => handleDayClick(day)}
                                  disabled={isPast || isBlocked}
                                  className={`
                                    w-8 h-8 flex items-center justify-center text-sm font-medium transition-all
                                    ${isSelected ? "bg-capha-navy text-white" : ""}
                                    ${!isSelected && isToday ? "text-capha-blue font-bold ring-1 ring-capha-blue" : ""}
                                    ${!isSelected && !isPast && !isBlocked ? "text-capha-dark hover:bg-capha-blue/10 hover:text-capha-navy cursor-pointer" : ""}
                                    ${isPast ? "text-capha-dark/20 cursor-not-allowed" : ""}
                                    ${isBlocked && !isPast ? "text-red-300 line-through cursor-not-allowed" : ""}
                                  `}
                                >
                                  {day}
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        <div className="px-3 pb-3 pt-1 border-t border-capha-blue/10">
                          <p className="text-capha-dark/35 text-[11px]">
                            You can also type a date above — e.g. "March 10 2026" or "3/10/2026"
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {selectedDate && (
                  <p className="text-capha-blue text-xs mt-2 font-medium">
                    Selected: {friendlyDate(selectedDate)}
                  </p>
                )}
              </div>

              {/* Time slots */}
              <div className="bg-white border border-capha-blue/10 p-5 mb-6">
                <label className="flex items-center gap-2 text-capha-navy font-semibold text-sm mb-4">
                  <Clock size={15} className="text-capha-blue" />
                  Select Time (EST)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {timeSlots
                    .filter((t) => !blockedSlots.includes(t))
                    .map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`py-2.5 px-2 text-xs font-medium border transition-all duration-150 ${
                          selectedTime === t
                            ? "bg-capha-navy text-white border-capha-navy shadow-sm"
                            : "bg-capha-light text-capha-dark/65 border-capha-blue/10 hover:border-capha-navy/30 hover:text-capha-navy"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                </div>
                {timeSlots.filter((t) => !blockedSlots.includes(t)).length === 0 && (
                  <p className="text-capha-dark/50 text-sm text-center py-4">
                    No time slots available — please check back soon.
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="px-5 py-3 border border-capha-blue/20 text-capha-dark/55 text-sm font-medium hover:text-capha-navy hover:border-capha-navy/30 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedDate || !selectedTime}
                  className="flex-1 flex items-center justify-center gap-2 bg-capha-navy text-white font-semibold py-3 hover:bg-capha-blue transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  Continue
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Details & Submit */}
          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <h1 className="text-2xl font-bold text-capha-navy mb-1" style={{ fontFamily: "var(--font-bodoni)" }}>
                Your details
              </h1>
              <p className="text-capha-dark/55 text-sm mb-5">
                We will send your request to {advisor?.name} and a confirmation to you.
              </p>

              {/* Booking summary */}
              <div className="bg-capha-navy p-4 mb-5 flex items-center gap-3">
                <div className="relative w-10 h-10 overflow-hidden flex-shrink-0 ring-2 ring-white/20">
                  {advisor?.photo ? (
                    <Image src={advisor.photo} alt={advisor.name} fill className="object-cover object-top" unoptimized={advisor.photo.startsWith("/")} />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{advisor?.name}</p>
                  <p className="text-white/50 text-xs">{advisor?.role}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white text-xs font-semibold">{friendlyDate(selectedDate)}</p>
                  <p className="text-white/50 text-xs">{selectedTime} EST</p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="bg-white border border-capha-blue/10 p-5 space-y-4">
                  <div>
                    <label htmlFor="booking-name" className="block text-capha-navy text-sm font-semibold mb-1.5">Full Name</label>
                    <input
                      id="booking-name"
                      {...register("name")}
                      placeholder="Your full name"
                      className="w-full border border-capha-blue/20 px-4 py-2.5 text-capha-navy text-sm focus:outline-none focus:border-capha-navy transition-colors placeholder:text-capha-dark/25"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="booking-email" className="block text-capha-navy text-sm font-semibold mb-1.5">Email Address</label>
                    <input
                      id="booking-email"
                      {...register("email")}
                      type="email"
                      placeholder="your@email.com"
                      className="w-full border border-capha-blue/20 px-4 py-2.5 text-capha-navy text-sm focus:outline-none focus:border-capha-navy transition-colors placeholder:text-capha-dark/25"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="booking-university" className="block text-capha-navy text-sm font-semibold mb-1.5">University / School</label>
                    <input
                      id="booking-university"
                      {...register("university")}
                      placeholder="Where do you study?"
                      className="w-full border border-capha-blue/20 px-4 py-2.5 text-capha-navy text-sm focus:outline-none focus:border-capha-navy transition-colors placeholder:text-capha-dark/25"
                    />
                    {errors.university && <p className="text-red-500 text-xs mt-1">{errors.university.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="booking-note" className="block text-capha-navy text-sm font-semibold mb-1.5">
                      Brief Note{" "}
                      <span className="text-capha-dark/35 font-normal">(optional)</span>
                    </label>
                    <textarea
                      id="booking-note"
                      {...register("note")}
                      rows={3}
                      placeholder="What would you like to discuss in this session?"
                      className="w-full border border-capha-blue/20 px-4 py-2.5 text-capha-navy text-sm focus:outline-none focus:border-capha-navy transition-colors placeholder:text-capha-dark/25 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-5 py-3 border border-capha-blue/20 text-capha-dark/55 text-sm font-medium hover:text-capha-navy hover:border-capha-navy/30 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 bg-capha-navy text-white font-semibold py-3 hover:bg-capha-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      "Request Appointment"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
