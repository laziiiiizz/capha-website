// "use client" means this component runs in the browser, not on the server.
// It can use React state, event handlers, and browser APIs (like document).
// Learn more: https://nextjs.org/docs/app/building-your-application/rendering/client-components
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
// toast() shows a small pop-up notification in the corner of the screen —
// much friendlier than alert() for confirming that an action succeeded or failed.
// Learn more: https://sonner.emilkowal.ski/
import { toast } from "sonner";
import {
  Ban, Trash2, Calendar, Clock, ToggleLeft, ToggleRight, Loader2, XCircle, CheckCircle2,
} from "lucide-react";

type Member = {
  id: string;
  name: string;
  role: string;
  // booking_eligible is a boolean flag in the database that controls whether
  // a team member appears in the booking flow for students.
  booking_eligible: boolean;
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
  const [togglingEligibility, setTogglingEligibility] = useState(false);

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

  // useCallback gives fetchAll a stable identity across re-renders so that the
  // useEffect below (which lists fetchAll as a dependency) doesn't re-run on
  // every render. Without useCallback a new function reference would be created
  // each render, causing an infinite loop.
  // Learn more: https://react.dev/reference/react/useCallback
  const fetchAll = useCallback(async () => {
    // Promise.all fires all four database queries at the same time (in parallel)
    // rather than one after another. The page loads as fast as the slowest query
    // instead of waiting for all four in sequence.
    // Learn more: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
    const [{ data: mData }, { data: bookings }, { data: dates }, { data: slots }] = await Promise.all([
      supabase.from("team_members").select("id,name,role,booking_eligible").order("display_order"),
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

  // useEffect runs fetchAll once when the page first loads (and again any time
  // fetchAll changes identity, which is rare thanks to useCallback).
  // Learn more: https://react.dev/reference/react/useEffect
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const selected = members.find((m) => m.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  // toggleEligibility flips the booking_eligible flag for the selected member.
  // When true, the member appears in the student booking flow.
  // When false, they are hidden — students cannot book sessions with them.
  const toggleEligibility = async () => {
    if (!selectedId || !selected) return;
    const enabling = !selected.booking_eligible;
    if (!enabling && !confirm(`Remove ${selected.name} from booking eligibility?`)) return;
    setTogglingEligibility(true);
    const { error } = await supabase
      .from("team_members")
      .update({ booking_eligible: enabling })
      .eq("id", selectedId);
    if (error) toast.error("Failed to update eligibility.");
    else {
      // Show a toast notification so the admin gets instant visual feedback.
      toast.success(enabling ? `${selected.name} is now accepting bookings.` : `${selected.name} removed from bookings.`);
      fetchAll();
    }
    setTogglingEligibility(false);
  };

  const blockDate = async () => {
    if (!newDate) return;
    setSavingDate(true);
    const { error } = await supabase
      .from("blocked_dates")
      .insert({ blocked_date: newDate, reason: newReason.trim() || null });
    if (error) {
      // The database has a unique constraint on blocked_date — check if that
      // is the cause so we can show a friendlier message than the raw DB error.
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
    // Optimistically remove the date from local state immediately rather than
    // waiting for a full re-fetch, so the UI feels instant.
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
    // Parse the date parts manually to avoid timezone shifting.
    // new Date("2026-05-17") is treated as UTC midnight and can display as the
    // previous day in timezones west of UTC. Splitting and passing year/month/day
    // to the Date constructor uses local time, which is what we want here.
    const [y, m, d] = iso.split("-");
    return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
      weekday: "short", month: "long", day: "numeric", year: "numeric",
    });
  };

  // Build a Set of time slots that are already taken by confirmed bookings.
  // Using a Set makes the .has() lookup in the JSX below O(1) (instant) even
  // if there are many bookings.
  // Learn more: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
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
            <ToggleRight size={17} className="text-capha-blue" />
            Member Booking Eligibility
          </h2>
          <p className="text-capha-dark/50 text-xs mt-0.5">
            Select a member to enable or disable their ability to receive booking requests.
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
                    {m.name} — {m.role}{m.booking_eligible ? " ✓" : ""}
                  </option>
                ))}
              </select>
            )}
            <p className="text-capha-dark/35 text-xs mt-1.5">Members marked with ✓ are currently accepting bookings.</p>
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
                  selected.booking_eligible
                    ? "text-emerald-600 bg-emerald-50 border border-emerald-200"
                    : "text-capha-dark/40 bg-gray-100 border border-gray-200"
                }`}>
                  {selected.booking_eligible
                    ? <><CheckCircle2 size={11} /> Accepting Bookings</>
                    : <><XCircle size={11} /> Not Accepting</>
                  }
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-white border border-capha-blue/10 rounded-xl">
                <div>
                  <p className="text-capha-navy font-semibold text-sm">Booking Status</p>
                  <p className="text-capha-dark/50 text-xs mt-0.5">
                    {selected.booking_eligible
                      ? "Students can currently request sessions with this member."
                      : "This member will not appear in the booking flow."}
                  </p>
                </div>
                <button
                  onClick={toggleEligibility}
                  disabled={togglingEligibility}
                  className={`flex items-center gap-1.5 font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 text-sm ${
                    selected.booking_eligible
                      ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  {togglingEligibility
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : selected.booking_eligible
                      ? <><ToggleLeft size={16} /> Disable</>
                      : <><ToggleRight size={16} /> Enable</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* Eligible members summary */}
          {!loading && members.some((m) => m.booking_eligible) && (
            <div>
              <p className="text-xs font-semibold text-capha-dark/40 uppercase tracking-wide mb-2">
                Accepting Bookings ({members.filter((m) => m.booking_eligible).length})
              </p>
              <div className="flex flex-wrap gap-2">
                {members.filter((m) => m.booking_eligible).map((m) => (
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
              // bookedSlots is a Set built from confirmed bookings above — this
              // check tells us if this slot has a real confirmed appointment.
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
