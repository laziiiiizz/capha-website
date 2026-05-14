"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Ban, Trash2, Calendar, Clock, Link2, Save, Loader2, XCircle, CheckCircle2,
} from "lucide-react";

type Member = {
  id: string;
  name: string;
  role: string;
  calendly_url: string;
};

type BlockedDate = { id: string; blocked_date: string; reason: string | null };

type Booking = {
  id: string;
  advisor_name: string;
  student_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
};

const ALL_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM",
];

export default function AdminCalendar() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);
  const [removingUrl, setRemovingUrl] = useState(false);

  const [confirmedBookings, setConfirmedBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const [togglingSlot, setTogglingSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  const fetchAll = useCallback(async () => {
    const [{ data: mData }, { data: bookings }, { data: dates }, { data: slots }] = await Promise.all([
      supabase.from("team_members").select("id,name,role,calendly_url").order("display_order"),
      supabase.from("bookings").select("id,advisor_name,student_name,booking_date,booking_time,status").eq("status", "confirmed").order("booking_date"),
      supabase.from("blocked_dates").select("*").order("blocked_date"),
      supabase.from("blocked_slots").select("time_slot"),
    ]);
    setMembers(mData ?? []);
    setConfirmedBookings(bookings ?? []);
    setBlockedDates(dates ?? []);
    setBlockedSlots((slots ?? []).map((s) => s.time_slot));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const selected = members.find((m) => m.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const m = members.find((m) => m.id === id);
    setUrlInput(m?.calendly_url ?? "");
  };

  const saveUrl = async () => {
    if (!selectedId) return;
    if (!urlInput.trim()) { toast.error("Please enter a Calendly URL."); return; }
    setSavingUrl(true);
    const { error } = await supabase
      .from("team_members")
      .update({ calendly_url: urlInput.trim() })
      .eq("id", selectedId);
    if (error) toast.error("Failed to save URL.");
    else { toast.success(`${selected?.name} is now accepting bookings.`); fetchAll(); }
    setSavingUrl(false);
  };

  const removeEligibility = async () => {
    if (!selectedId || !selected) return;
    if (!confirm(`Remove ${selected.name} from booking eligibility? Their Calendly link will be cleared.`)) return;
    setRemovingUrl(true);
    const { error } = await supabase
      .from("team_members")
      .update({ calendly_url: "" })
      .eq("id", selectedId);
    if (error) toast.error("Failed to remove.");
    else { toast.success(`${selected.name} removed from bookings.`); setUrlInput(""); fetchAll(); }
    setRemovingUrl(false);
  };

  const blockDate = async () => {
    if (!newDate) return;
    setSavingDate(true);
    const { error } = await supabase
      .from("blocked_dates")
      .insert({ blocked_date: newDate, reason: newReason.trim() || null });
    if (error) {
      toast.error(error.message.includes("unique") ? "Already blocked." : "Failed to block date.");
    } else {
      toast.success("Date blocked — no bookings on this day.");
      setNewDate(""); setNewReason(""); fetchAll();
    }
    setSavingDate(false);
  };

  const removeDate = async (id: string) => {
    const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
    if (error) { toast.error("Failed."); return; }
    setBlockedDates((prev) => prev.filter((d) => d.id !== id));
    toast.success("Date unblocked.");
  };

  const toggleSlot = async (slot: string) => {
    setTogglingSlot(slot);
    const isBlocked = blockedSlots.includes(slot);
    if (isBlocked) {
      await supabase.from("blocked_slots").delete().eq("time_slot", slot);
      setBlockedSlots((prev) => prev.filter((s) => s !== slot));
      toast.success(`${slot} is now available.`);
    } else {
      await supabase.from("blocked_slots").insert({ time_slot: slot });
      setBlockedSlots((prev) => [...prev, slot]);
      toast.success(`${slot} blocked.`);
    }
    setTogglingSlot(null);
  };

  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
      weekday: "short", month: "long", day: "numeric", year: "numeric",
    });
  };

  // Slots already taken by confirmed bookings
  const bookedSlots = new Set(confirmedBookings.map((b) => b.booking_time));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-capha-navy" style={{ fontFamily: "var(--font-bodoni)" }}>
          Calendar Management
        </h1>
        <p className="text-capha-dark/60 mt-1 text-sm">
          Manage member booking eligibility and block unavailable dates or time slots.
        </p>
      </div>

      {/* ── Member Booking Eligibility ── */}
      <div className="bg-white rounded-2xl border border-capha-blue/10 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-capha-blue/10 bg-capha-light/50">
          <h2 className="text-capha-navy font-bold flex items-center gap-2">
            <Link2 size={17} className="text-capha-blue" />
            Member Booking Eligibility
          </h2>
          <p className="text-capha-dark/50 text-xs mt-0.5">
            Select a member to set or update their Calendly booking link.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Single dropdown — ALL members */}
          <div>
            <label htmlFor="calendar-member-select" className="block text-sm font-semibold text-capha-navy mb-2">Select Member</label>
            {loading ? (
              <div className="flex items-center gap-2 text-capha-dark/40 text-sm py-2">
                <Loader2 size={14} className="animate-spin" /> Loading members…
              </div>
            ) : members.length === 0 ? (
              <p className="text-capha-dark/40 text-sm italic">
                No members found. Add team members in the Members section first.
              </p>
            ) : (
              <select
                id="calendar-member-select"
                value={selectedId}
                onChange={(e) => handleSelect(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm bg-white text-capha-navy"
              >
                <option value="">— Choose a member —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.role}{m.calendly_url ? " ✓" : ""}
                  </option>
                ))}
              </select>
            )}
            <p className="text-capha-dark/35 text-xs mt-1.5">Members with ✓ already have a Calendly link set.</p>
          </div>

          {/* Selected member panel */}
          {selected && (
            <div className="border border-capha-blue/15 rounded-xl p-4 bg-capha-light/30">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-capha-navy flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">{selected.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-capha-navy font-bold text-sm">{selected.name}</p>
                    <p className="text-capha-dark/50 text-xs">{selected.role}</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  selected.calendly_url
                    ? "text-emerald-600 bg-emerald-50 border border-emerald-200"
                    : "text-capha-dark/40 bg-gray-100 border border-gray-200"
                }`}>
                  {selected.calendly_url
                    ? <><CheckCircle2 size={11} /> Eligible</>
                    : <><XCircle size={11} /> Not eligible</>
                  }
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="calendar-calendly-url" className="block text-xs font-semibold text-capha-navy mb-1.5">Calendly URL</label>
                  <input
                    id="calendar-calendly-url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://calendly.com/their-username"
                    className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveUrl}
                    disabled={savingUrl}
                    className="flex items-center gap-1.5 bg-capha-navy text-white font-semibold px-4 py-2 rounded-xl hover:bg-capha-blue transition-colors disabled:opacity-60 text-sm"
                  >
                    {savingUrl ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {savingUrl ? "Saving…" : "Save Link"}
                  </button>
                  {selected.calendly_url && (
                    <button
                      onClick={removeEligibility}
                      disabled={removingUrl}
                      className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 font-semibold px-4 py-2 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60 text-sm"
                    >
                      {removingUrl ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                      Remove Eligibility
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Eligible members summary */}
          {!loading && members.some((m) => m.calendly_url) && (
            <div>
              <p className="text-xs font-semibold text-capha-dark/40 uppercase tracking-wide mb-2">
                Currently Eligible ({members.filter((m) => m.calendly_url).length})
              </p>
              <div className="flex flex-wrap gap-2">
                {members.filter((m) => m.calendly_url).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelect(m.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                      selectedId === m.id
                        ? "bg-capha-navy text-white border-capha-navy"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    <CheckCircle2 size={11} />
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmed Bookings (auto-blocked) ── */}
      {confirmedBookings.length > 0 && (
        <div className="bg-white rounded-2xl border border-capha-blue/10 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-capha-blue/10 bg-capha-light/50">
            <h2 className="text-capha-navy font-bold flex items-center gap-2">
              <CheckCircle2 size={17} className="text-emerald-500" />
              Confirmed Bookings
            </h2>
            <p className="text-capha-dark/50 text-xs mt-0.5">
              These time slots are taken — new bookings for the same slot are automatically blocked.
            </p>
          </div>
          <div className="divide-y divide-capha-blue/5">
            {confirmedBookings.map((b) => (
              <div key={b.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-capha-navy font-semibold text-sm">{b.student_name}</p>
                  <p className="text-capha-dark/45 text-xs">with {b.advisor_name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-capha-navy text-xs font-semibold">{b.booking_date}</p>
                  <p className="text-capha-dark/50 text-xs">{b.booking_time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Date + Slot Blocking ── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Block Dates */}
        <div className="bg-white rounded-2xl border border-capha-blue/10 p-6">
          <h2 className="text-capha-navy font-bold text-lg mb-1 flex items-center gap-2">
            <Calendar size={18} className="text-capha-blue" /> Block Dates
          </h2>
          <p className="text-capha-dark/55 text-sm mb-5">Block an entire day — no one can book on this date.</p>

          <div className="space-y-3 mb-6">
            <div>
              <label htmlFor="block-date-input" className="block text-xs font-semibold text-capha-dark/45 uppercase tracking-wide mb-1.5">Date</label>
              <input
                id="block-date-input"
                type="date" min={today} value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full border border-capha-blue/20 rounded-xl px-4 py-2.5 text-capha-navy text-sm focus:outline-none focus:border-capha-navy"
              />
            </div>
            <div>
              <label htmlFor="block-date-reason" className="block text-xs font-semibold text-capha-dark/45 uppercase tracking-wide mb-1.5">
                Reason <span className="font-normal normal-case">(optional)</span>
              </label>
              <input
                id="block-date-reason"
                type="text" value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && blockDate()}
                placeholder="e.g. Holiday, advisors unavailable"
                className="w-full border border-capha-blue/20 rounded-xl px-4 py-2.5 text-capha-navy text-sm focus:outline-none focus:border-capha-navy placeholder:text-capha-dark/25"
              />
            </div>
            <button
              onClick={blockDate}
              disabled={!newDate || savingDate}
              className="w-full flex items-center justify-center gap-2 bg-capha-navy text-white font-semibold py-2.5 rounded-xl hover:bg-capha-blue transition-colors disabled:opacity-35 disabled:cursor-not-allowed text-sm"
            >
              <Ban size={14} />
              {savingDate ? "Saving…" : "Block This Date"}
            </button>
          </div>

          {blockedDates.length === 0 ? (
            <p className="text-capha-dark/35 text-sm italic">No dates blocked yet.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-capha-dark/40 uppercase tracking-wide mb-2">
                Blocked ({blockedDates.length})
              </p>
              {blockedDates.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-capha-navy font-semibold text-sm">{formatDate(d.blocked_date)}</p>
                    {d.reason && <p className="text-capha-dark/45 text-xs mt-0.5">{d.reason}</p>}
                  </div>
                  <button
                    aria-label={`Unblock ${formatDate(d.blocked_date)}`}
                    onClick={() => removeDate(d.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Time Slot Control */}
        <div className="bg-white rounded-2xl border border-capha-blue/10 p-6">
          <h2 className="text-capha-navy font-bold text-lg mb-1 flex items-center gap-2">
            <Clock size={18} className="text-capha-blue" /> Time Slot Control
          </h2>
          <p className="text-capha-dark/55 text-sm mb-5">
            Toggle slots on/off. Slots with confirmed bookings are shown as taken.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {ALL_SLOTS.map((slot) => {
              const blocked = blockedSlots.includes(slot);
              const booked = bookedSlots.has(slot);
              const toggling = togglingSlot === slot;
              return (
                <button
                  key={slot}
                  onClick={() => !booked && toggleSlot(slot)}
                  disabled={toggling || booked}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150 ${
                    booked
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default"
                      : blocked
                        ? "bg-red-50 border-red-200 text-red-600"
                        : "bg-capha-light border-capha-blue/10 text-capha-navy hover:border-capha-navy/25"
                  } disabled:opacity-80`}
                >
                  <span>{slot}</span>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    booked ? "bg-emerald-400" : blocked ? "bg-red-400" : "bg-gray-300"
                  }`} />
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-capha-blue/10">
            <div className="flex items-center gap-2 text-xs text-capha-dark/45">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Available
            </div>
            <div className="flex items-center gap-2 text-xs text-capha-dark/45">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Booked
            </div>
            <div className="flex items-center gap-2 text-xs text-capha-dark/45">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Blocked
            </div>
            <p className="ml-auto text-xs text-capha-dark/35">
              {blockedSlots.length} blocked · {bookedSlots.size} booked
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
