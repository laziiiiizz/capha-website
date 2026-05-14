"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Save, Loader2, RefreshCw } from "lucide-react";

type ContentRow = { id: string; section: string; key: string; value: string };

const FIELDS = [
  {
    section: "Hero",
    rows: [
      { section: "hero", key: "headline", label: "Main Headline", long: false },
      { section: "hero", key: "subtext", label: "Intro Paragraph", long: true },
      { section: "hero", key: "about_text", label: "About CAPHA (right panel)", long: true, hint: "Separate paragraphs with a blank line" },
      { section: "hero", key: "member_count", label: "Member Count", long: false, hint: "Number only, e.g. 95" },
      { section: "hero", key: "events_count", label: "Events Hosted", long: false, hint: "Number only, e.g. 20" },
      { section: "hero", key: "universities_count", label: "Universities", long: false, hint: "Number only, e.g. 8" },
    ],
  },
  {
    section: "Events",
    rows: [
      { section: "events", key: "intro", label: "Events Intro Text", long: true },
    ],
  },
  {
    section: "Contact & Social",
    rows: [
      { section: "contact", key: "email", label: "Email Address", long: false },
      { section: "contact", key: "instagram", label: "Instagram URL", long: false },
      { section: "contact", key: "linkedin", label: "LinkedIn URL", long: false },
    ],
  },
  {
    section: "Footer",
    rows: [
      { section: "footer", key: "copyright", label: "Copyright Text", long: false },
    ],
  },
];

export default function SettingsAdmin() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const key = (section: string, k: string) => `${section}.${k}`;

  const fetchContent = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("site_content").select("*");
    const map: Record<string, string> = {};
    for (const row of data ?? []) map[key(row.section, row.key)] = row.value;
    setContent(map);
    setLoading(false);
  };

  useEffect(() => { fetchContent(); }, []);

  const handleChange = (section: string, k: string, value: string) => {
    setContent((prev) => ({ ...prev, [key(section, k)]: value }));
  };

  const handleSave = async (section: string, k: string, label: string) => {
    const fieldKey = key(section, k);
    setSaving((prev) => ({ ...prev, [fieldKey]: true }));
    const supabase = createClient();
    const { error } = await supabase
      .from("site_content")
      .upsert({ section, key: k, value: content[fieldKey] ?? "" }, { onConflict: "section,key" });
    if (error) toast.error("Save failed: " + error.message);
    else toast.success(`"${label}" saved!`);
    setSaving((prev) => ({ ...prev, [fieldKey]: false }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-capha-navy" style={{ fontFamily: "var(--font-bodoni)" }}>
            Settings
          </h1>
          <p className="text-capha-dark/60 mt-1 text-sm">Edit text and links displayed on the public website.</p>
        </div>
        <button
          onClick={fetchContent}
          className="flex items-center gap-2 text-capha-blue text-sm font-medium hover:text-capha-navy transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-capha-blue" size={32} />
        </div>
      ) : (
        <div className="space-y-6">
          {FIELDS.map((group) => (
            <div key={group.section} className="bg-white rounded-2xl border border-capha-blue/10 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-capha-blue/10 bg-capha-light/50">
                <h2 className="text-capha-navy font-bold">{group.section}</h2>
              </div>
              <div className="divide-y divide-capha-blue/5">
                {group.rows.map((row) => {
                  const fieldKey = key(row.section, row.key);
                  const isSaving = saving[fieldKey];
                  return (
                    <div key={fieldKey} className="px-6 py-5">
                      <div className="flex items-baseline justify-between mb-2">
                        <label htmlFor={fieldKey} className="text-sm font-semibold text-capha-navy">{row.label}</label>
                        {"hint" in row && row.hint && (
                          <span className="text-capha-dark/35 text-xs">{row.hint}</span>
                        )}
                      </div>
                      {row.long ? (
                        <textarea
                          id={fieldKey}
                          value={content[fieldKey] ?? ""}
                          onChange={(e) => handleChange(row.section, row.key, e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm resize-none"
                        />
                      ) : (
                        <input
                          id={fieldKey}
                          value={content[fieldKey] ?? ""}
                          onChange={(e) => handleChange(row.section, row.key, e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                        />
                      )}
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => handleSave(row.section, row.key, row.label)}
                          disabled={isSaving}
                          className="flex items-center gap-1.5 text-xs font-semibold bg-capha-navy text-white px-4 py-2 rounded-lg hover:bg-capha-blue transition-colors disabled:opacity-60"
                        >
                          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          {isSaving ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
