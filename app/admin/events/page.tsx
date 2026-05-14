"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Save, X, Loader2, Video, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Event = {
  id?: string;
  title: string;
  date: string;
  time: string;
  description: string;
  zoom_link: string;
  meeting_id: string;
  is_active: boolean;
  type: string;
};

const emptyEvent: Event = {
  title: "",
  date: "",
  time: "",
  description: "",
  zoom_link: "",
  meeting_id: "",
  is_active: true,
  type: "zoom",
};

export default function EventsAdmin() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event>(emptyEvent);
  const [saving, setSaving] = useState(false);

  const fetchEvents = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    setEvents(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleSave = async () => {
    if (!editing.title) { toast.error("Title is required."); return; }
    setSaving(true);
    const supabase = createClient();
    const { id, ...data } = editing;
    let error;
    if (id) {
      ({ error } = await supabase.from("events").update(data).eq("id", id));
    } else {
      ({ error } = await supabase.from("events").insert(data));
    }
    if (error) toast.error("Save failed: " + error.message);
    else { toast.success(id ? "Event updated!" : "Event added!"); setOpen(false); fetchEvents(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success("Event removed"); fetchEvents(); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-capha-navy" style={{ fontFamily: "var(--font-bodoni)" }}>
            Events
          </h1>
          <p className="text-capha-dark/60 mt-1">{events.length} events total</p>
        </div>
        <button
          onClick={() => { setEditing(emptyEvent); setOpen(true); }}
          className="flex items-center gap-2 bg-capha-navy text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-capha-blue transition-colors"
        >
          <Plus size={16} />
          Add Event
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-capha-blue" size={32} />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-capha-dark/40">
          <Video size={40} className="mx-auto mb-3 opacity-30" />
          <p>No events yet. Click "Add Event" to create one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="bg-white rounded-2xl border border-capha-blue/10 shadow-sm p-5 flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  ev.type === "mentorship" ? "bg-capha-blue/10" : "bg-capha-blue/10"
                }`}>
                  {ev.type === "mentorship"
                    ? <UserCheck size={20} className="text-capha-blue" />
                    : <Video size={20} className="text-capha-blue" />
                  }
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-capha-navy font-bold">{ev.title}</h3>
                    <Badge className={ev.is_active
                      ? "bg-green-100 text-green-700 text-xs"
                      : "bg-gray-100 text-gray-500 text-xs"
                    }>
                      {ev.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {(ev.date || ev.time) && (
                    <p className="text-capha-dark/50 text-sm">{ev.date} {ev.time && `· ${ev.time}`}</p>
                  )}
                  {ev.description && (
                    <p className="text-capha-dark/60 text-sm mt-1 line-clamp-2">{ev.description}</p>
                  )}
                  {ev.meeting_id && (
                    <p className="text-capha-dark/40 text-xs mt-1">Meeting ID: {ev.meeting_id}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  aria-label={`Edit: ${ev.title}`}
                  onClick={() => { setEditing(ev); setOpen(true); }}
                  className="w-9 h-9 rounded-xl bg-capha-light flex items-center justify-center hover:bg-capha-blue/10 transition-colors"
                >
                  <Pencil size={15} className="text-capha-navy" />
                </button>
                <button
                  aria-label={`Delete: ${ev.title}`}
                  onClick={() => handleDelete(ev.id!)}
                  className="w-9 h-9 rounded-xl bg-capha-light flex items-center justify-center hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={15} className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-bodoni)" }}>
              {editing.id ? "Edit Event" : "Add New Event"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label htmlFor="event-title" className="block text-sm font-semibold text-capha-navy mb-1">Title *</label>
              <input
                id="event-title"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                placeholder="Event title"
              />
            </div>

            <div>
              <label htmlFor="event-type" className="block text-sm font-semibold text-capha-navy mb-1">Type</label>
              <select
                id="event-type"
                value={editing.type}
                onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm bg-white"
              >
                <option value="zoom">Zoom Session</option>
                <option value="mentorship">Mentorship</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="event-date" className="block text-sm font-semibold text-capha-navy mb-1">Date</label>
                <input
                  id="event-date"
                  value={editing.date}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                  placeholder="e.g. March 7th"
                />
              </div>
              <div>
                <label htmlFor="event-time" className="block text-sm font-semibold text-capha-navy mb-1">Time</label>
                <input
                  id="event-time"
                  value={editing.time}
                  onChange={(e) => setEditing({ ...editing, time: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                  placeholder="e.g. EST 11:00 AM"
                />
              </div>
            </div>

            <div>
              <label htmlFor="event-description" className="block text-sm font-semibold text-capha-navy mb-1">Description</label>
              <textarea
                id="event-description"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm resize-none"
                placeholder="Event description..."
              />
            </div>

            <div>
              <label htmlFor="event-zoom-link" className="block text-sm font-semibold text-capha-navy mb-1">Zoom / Registration Link</label>
              <input
                id="event-zoom-link"
                value={editing.zoom_link}
                onChange={(e) => setEditing({ ...editing, zoom_link: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                placeholder="https://zoom.us/..."
              />
            </div>

            <div>
              <label htmlFor="event-meeting-id" className="block text-sm font-semibold text-capha-navy mb-1">Meeting ID</label>
              <input
                id="event-meeting-id"
                value={editing.meeting_id}
                onChange={(e) => setEditing({ ...editing, meeting_id: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                placeholder="966 343 9551"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                className="w-4 h-4 rounded accent-capha-navy"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-capha-navy">
                Show on website
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-capha-navy text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-capha-blue transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Saving…" : "Save Event"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 text-capha-dark/60 font-medium px-4 py-2.5 rounded-xl hover:bg-capha-light transition-colors"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
