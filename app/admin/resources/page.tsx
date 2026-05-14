"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Save, X, Loader2, GripVertical, ChevronUp, ChevronDown,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Step = {
  id?: string;
  track: string;
  title: string;
  detail: string;
  link_label: string;
  link_href: string;
  display_order: number;
};

const TRACKS = [
  { id: "medicine", label: "Medicine (MD)" },
  { id: "dentistry", label: "Dentistry (DDS/DMD)" },
  { id: "optometry", label: "Optometry (OD)" },
  { id: "pa", label: "Physician Assistant (PA)" },
  { id: "nursing", label: "Nursing (RN/NP)" },
  { id: "pharmacy", label: "Pharmacy (PharmD)" },
  { id: "physicaltherapy", label: "Physical Therapy (DPT)" },
  { id: "publichealth", label: "Public Health (MPH)" },
];

const emptyStep = (track: string, order: number): Step => ({
  track, title: "", detail: "", link_label: "", link_href: "", display_order: order,
});

export default function ResourcesAdmin() {
  const [activeTrack, setActiveTrack] = useState("medicine");
  const [stepsByTrack, setStepsByTrack] = useState<Record<string, Step[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Step>(emptyStep("medicine", 0));
  const [saving, setSaving] = useState(false);

  const fetchSteps = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("resource_steps")
      .select("*")
      .order("display_order");
    if (error) { toast.error("Failed to load steps"); setLoading(false); return; }
    const grouped: Record<string, Step[]> = {};
    for (const track of TRACKS) grouped[track.id] = [];
    for (const row of data ?? []) {
      if (grouped[row.track]) grouped[row.track].push(row);
    }
    setStepsByTrack(grouped);
    setLoading(false);
  };

  useEffect(() => { fetchSteps(); }, []);

  const currentSteps = stepsByTrack[activeTrack] ?? [];

  const openNew = () => {
    setEditing(emptyStep(activeTrack, currentSteps.length + 1));
    setOpen(true);
  };

  const openEdit = (s: Step) => { setEditing(s); setOpen(true); };

  const handleSave = async () => {
    if (!editing.title.trim()) { toast.error("Step title is required."); return; }
    if (editing.link_href && !/^https?:\/\//i.test(editing.link_href)) {
      toast.error("Link URL must start with https:// or http://");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { id, ...data } = editing;
    const { error } = id
      ? await supabase.from("resource_steps").update(data).eq("id", id)
      : await supabase.from("resource_steps").insert(data);
    if (error) toast.error("Save failed: " + error.message);
    else { toast.success(id ? "Step updated!" : "Step added!"); setOpen(false); fetchSteps(); }
    setSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete step "${title}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("resource_steps").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success("Step removed"); fetchSteps(); }
  };

  const moveStep = async (step: Step, direction: "up" | "down") => {
    const steps = [...currentSteps];
    const idx = steps.findIndex(s => s.id === step.id);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;

    const supabase = createClient();
    const a = steps[idx];
    const b = steps[targetIdx];
    await Promise.all([
      supabase.from("resource_steps").update({ display_order: b.display_order }).eq("id", a.id!),
      supabase.from("resource_steps").update({ display_order: a.display_order }).eq("id", b.id!),
    ]);
    fetchSteps();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-capha-navy" style={{ fontFamily: "var(--font-bodoni)" }}>
          Resources
        </h1>
        <p className="text-capha-dark/60 mt-1 text-sm">Edit career path steps for each healthcare track.</p>
      </div>

      {/* Track tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {TRACKS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTrack(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTrack === t.id
                ? "bg-capha-navy text-white shadow-sm"
                : "bg-white border border-capha-blue/15 text-capha-dark/60 hover:border-capha-blue/40 hover:text-capha-navy"
            }`}
          >
            {t.label.split(" (")[0]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-capha-blue" size={32} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-capha-blue/10 shadow-sm overflow-hidden">
          {/* Track header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-capha-blue/10 bg-capha-light/50">
            <div>
              <h2 className="text-capha-navy font-bold">
                {TRACKS.find(t => t.id === activeTrack)?.label}
              </h2>
              <p className="text-capha-dark/50 text-xs mt-0.5">{currentSteps.length} steps</p>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 bg-capha-navy text-white font-semibold px-4 py-2 rounded-xl hover:bg-capha-blue transition-colors text-sm"
            >
              <Plus size={15} /> Add Step
            </button>
          </div>

          {/* Steps list */}
          {currentSteps.length === 0 ? (
            <div className="text-center py-12 text-capha-dark/40">
              <p className="text-sm">No steps yet. Click "Add Step" to create the first one.</p>
            </div>
          ) : (
            <div className="divide-y divide-capha-blue/5">
              {currentSteps.map((s, i) => (
                <div key={s.id} className="flex items-start gap-4 px-6 py-5">
                  {/* Step number */}
                  <div className="w-8 h-8 rounded-full bg-capha-navy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-capha-navy text-xs font-bold">{i + 1}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-capha-navy font-semibold text-sm">{s.title}</p>
                    <p className="text-capha-dark/60 text-sm mt-0.5 leading-relaxed">{s.detail}</p>
                    {s.link_label && s.link_href && (
                      <p className="text-capha-blue text-xs mt-1">
                        Link: {s.link_label}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      aria-label="Move step up"
                      onClick={() => moveStep(s, "up")}
                      disabled={i === 0}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-capha-light transition-colors disabled:opacity-25"
                    >
                      <ChevronUp size={14} className="text-capha-dark/60" />
                    </button>
                    <button
                      aria-label="Move step down"
                      onClick={() => moveStep(s, "down")}
                      disabled={i === currentSteps.length - 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-capha-light transition-colors disabled:opacity-25"
                    >
                      <ChevronDown size={14} className="text-capha-dark/60" />
                    </button>
                    <button
                      aria-label={`Edit: ${s.title}`}
                      onClick={() => openEdit(s)}
                      className="w-8 h-8 rounded-xl bg-capha-light flex items-center justify-center hover:bg-capha-blue/10 transition-colors ml-1"
                    >
                      <Pencil size={14} className="text-capha-navy" />
                    </button>
                    <button
                      aria-label={`Delete: ${s.title}`}
                      onClick={() => handleDelete(s.id!, s.title)}
                      className="w-8 h-8 rounded-xl bg-capha-light flex items-center justify-center hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-bodoni)" }}>
              {editing.id ? "Edit Step" : "Add Step"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label htmlFor="step-title" className="block text-sm font-semibold text-capha-navy mb-1">Step Title *</label>
              <input
                id="step-title"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                placeholder="e.g. MCAT Exam"
              />
            </div>
            <div>
              <label htmlFor="step-detail" className="block text-sm font-semibold text-capha-navy mb-1">Description *</label>
              <textarea
                id="step-detail"
                value={editing.detail}
                onChange={(e) => setEditing({ ...editing, detail: e.target.value })}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm resize-none"
                placeholder="Explain this step..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="step-link-label" className="block text-sm font-semibold text-capha-navy mb-1">Link Label (optional)</label>
                <input
                  id="step-link-label"
                  value={editing.link_label}
                  onChange={(e) => setEditing({ ...editing, link_label: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                  placeholder="e.g. MCAT info"
                />
              </div>
              <div>
                <label htmlFor="step-link-href" className="block text-sm font-semibold text-capha-navy mb-1">Link URL (optional)</label>
                <input
                  id="step-link-href"
                  value={editing.link_href}
                  onChange={(e) => setEditing({ ...editing, link_href: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-capha-navy text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-capha-blue transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Saving…" : "Save Step"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 text-capha-dark/60 font-medium px-4 py-2.5 rounded-xl hover:bg-capha-light transition-colors"
              >
                <X size={16} /> Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
