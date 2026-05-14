"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { CheckCircle, XCircle, Trash2, Clock, Users, CalendarDays, Inbox } from "lucide-react";
import { sendStatusEmail } from "./actions";

type Booking = {
  id: string;
  student_name: string;
  student_email: string;
  university: string;
  note: string | null;
  advisor_name: string;
  advisor_role: string;
  advisor_email: string;
  booking_date: string;
  booking_time: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
};

type Filter = "all" | "pending" | "confirmed" | "cancelled";

const statusStyle: Record<Booking["status"], string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border border-red-200",
};

const stats = [
  { key: "pending" as const, label: "Pending", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { key: "confirmed" as const, label: "Confirmed", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { key: "cancelled" as const, label: "Cancelled", color: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
];

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load bookings.");
    setBookings(data ?? []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: "confirmed" | "cancelled") => {
    setActionId(id);
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;

    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) {
      toast.error("Failed to update.");
      setActionId(null);
      return;
    }

    try {
      await sendStatusEmail({
        studentName: booking.student_name,
        studentEmail: booking.student_email,
        advisorName: booking.advisor_name,
        date: booking.booking_date,
        time: booking.booking_time,
        status,
      });
    } catch {
      toast.error("Status saved but email failed to send.");
    }

    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    toast.success(status === "confirmed" ? "Booking confirmed — student notified." : "Booking cancelled — student notified.");
    setActionId(null);
  };

  const deleteBooking = async (id: string) => {
    if (!confirm("Delete this booking? This cannot be undone.")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) { toast.error("Failed to delete."); return; }
    setBookings((prev) => prev.filter((b) => b.id !== id));
    toast.success("Booking deleted.");
  };

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-capha-navy" style={{ fontFamily: "var(--font-bodoni)" }}>
            Bookings
          </h1>
          <p className="text-capha-dark/60 mt-1">Review and manage mentorship appointment requests.</p>
        </div>
        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2">
            <Clock size={14} />
            {pendingCount} pending
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.key} className={`${s.bg} border ${s.border} rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{bookings.filter((b) => b.status === s.key).length}</p>
            <p className="text-xs text-capha-dark/50 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white border border-capha-blue/10 rounded-2xl p-1 mb-6 w-fit">
        {(["all", "pending", "confirmed", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
              filter === f ? "bg-capha-navy text-white shadow-sm" : "text-capha-dark/50 hover:text-capha-navy"
            }`}
          >
            {f}
            {f !== "all" && (
              <span className={`ml-1.5 text-xs ${filter === f ? "opacity-60" : "opacity-50"}`}>
                ({bookings.filter((b) => b.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Booking list */}
      {loading ? (
        <div className="text-capha-dark/40 text-sm p-4">Loading bookings...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-capha-blue/10 p-16 text-center">
          <Inbox size={32} className="text-capha-dark/20 mx-auto mb-3" />
          <p className="text-capha-dark/40 text-sm">No {filter === "all" ? "" : filter + " "}bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const initials = b.student_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={b.id} className="bg-white rounded-2xl border border-capha-blue/10 p-5 flex items-start gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-capha-navy flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-0.5">
                    <p className="text-capha-navy font-bold text-sm">{b.student_name}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusStyle[b.status]}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-capha-dark/50 text-xs mb-2">{b.student_email} · {b.university}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-capha-dark/55">
                    <span className="flex items-center gap-1">
                      <Users size={11} />
                      {b.advisor_name}
                      <span className="text-capha-dark/35">({b.advisor_role})</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays size={11} />
                      {b.booking_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {b.booking_time} EST
                    </span>
                  </div>
                  {b.note && (
                    <p className="mt-2 text-xs text-capha-dark/50 bg-capha-light rounded-lg px-3 py-2 italic">
                      "{b.note}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {b.status === "pending" && (
                    <>
                      <button
                        onClick={() => updateStatus(b.id, "confirmed")}
                        disabled={actionId === b.id}
                        className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-40"
                      >
                        <CheckCircle size={13} />
                        Confirm
                      </button>
                      <button
                        onClick={() => updateStatus(b.id, "cancelled")}
                        disabled={actionId === b.id}
                        className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-40"
                      >
                        <XCircle size={13} />
                        Cancel
                      </button>
                    </>
                  )}
                  {b.status === "confirmed" && (
                    <button
                      onClick={() => updateStatus(b.id, "cancelled")}
                      disabled={actionId === b.id}
                      className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-40"
                    >
                      <XCircle size={13} />
                      Cancel
                    </button>
                  )}
                  <button
                    aria-label={`Delete booking for ${b.student_name}`}
                    onClick={() => deleteBooking(b.id)}
                    className="p-2 text-capha-dark/25 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
