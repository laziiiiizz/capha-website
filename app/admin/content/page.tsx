"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Save, Loader2, RefreshCw } from "lucide-react";

type ContentRow = {
  id: string;
  section: string;
  key: string;
  value: string;
};

const defaultContent: Omit<ContentRow, "id">[] = [
  { section: "hero", key: "headline", value: "Supporting Future Central Asian Healthcare Leaders" },
  { section: "hero", key: "subtext", value: "CAPHA is a student-led organization dedicated to supporting Central Asian students in the U.S. who aspire to careers in healthcare. Through mentorship, workshops, and leadership opportunities, we foster academic and professional growth." },
  { section: "hero", key: "member_count", value: "95" },
  { section: "hero", key: "events_count", value: "20" },
  { section: "hero", key: "universities_count", value: "8" },
  { section: "events", key: "intro", value: "Stay connected with CAPHA! Join our upcoming virtual events, workshops, and mentorship sessions to grow your pre-health journey." },
  { section: "footer", key: "copyright", value: "Central Asian Pre-Health Association. All Rights Reserved." },
  { section: "contact", key: "email", value: "capha0925@gmail.com" },
  { section: "contact", key: "instagram", value: "https://www.instagram.com/capha_25?igsh=MTh3aXE4dW82YnU4dw==" },
  { section: "contact", key: "linkedin", value: "https://www.linkedin.com/company/central-asian-pre-health-association" },
];

const sectionLabels: Record<string, string> = {
  hero: "Hero Section",
  events: "Events Section",
  contact: "Contact & Social",
  footer: "Footer",
};

const keyLabels: Record<string, string> = {
  headline: "Main Headline",
  subtext: "Intro Paragraph",
  member_count: "Member Count (number only)",
  events_count: "Events Hosted (number only)",
  universities_count: "Universities (number only)",
  intro: "Intro Text",
  copyright: "Copyright Text",
  email: "Email Address",
  instagram: "Instagram URL",
  linkedin: "LinkedIn URL",
};

export default function ContentAdmin() {
  const [content, setContent] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const fetchContent = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("site_content").select("*").order("section");
    if (data && data.length > 0) {
      setContent(data);
    } else {
      setContent(defaultContent.map((c, i) => ({ ...c, id: String(i) })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchContent(); }, []);

  const handleChange = (id: string, value: string) => {
    setContent((prev) => prev.map((c) => c.id === id ? { ...c, value } : c));
  };

  const handleSave = async (row: ContentRow) => {
    setSaving((prev) => ({ ...prev, [row.id]: true }));
    const supabase = createClient();
    const { error } = await supabase
      .from("site_content")
      .upsert({ section: row.section, key: row.key, value: row.value }, { onConflict: "section,key" });
    if (error) toast.error("Save failed: " + error.message);
    else toast.success(`"${keyLabels[row.key] ?? row.key}" saved!`);
    setSaving((prev) => ({ ...prev, [row.id]: false }));
    fetchContent();
  };

  const grouped = content.reduce<Record<string, ContentRow[]>>((acc, c) => {
    (acc[c.section] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-capha-navy" style={{ fontFamily: "var(--font-bodoni)" }}>
            Site Content
          </h1>
          <p className="text-capha-dark/60 mt-1">Edit the text displayed on the public website.</p>
        </div>
        <button
          onClick={fetchContent}
          className="flex items-center gap-2 text-capha-blue text-sm font-medium hover:text-capha-navy transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-capha-blue" size={32} />
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([section, rows]) => (
            <div key={section} className="bg-white rounded-2xl border border-capha-blue/10 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-capha-blue/10 bg-capha-light/50">
                <h2 className="text-capha-navy font-bold">{sectionLabels[section] ?? section}</h2>
              </div>
              <div className="divide-y divide-capha-blue/5">
                {rows.map((row) => {
                  const isLong = row.value.length > 100;
                  return (
                    <div key={row.id} className="px-6 py-5">
                      <label className="block text-sm font-semibold text-capha-navy mb-2">
                        {keyLabels[row.key] ?? row.key}
                      </label>
                      {isLong ? (
                        <textarea
                          value={row.value}
                          onChange={(e) => handleChange(row.id, e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm resize-none"
                        />
                      ) : (
                        <input
                          value={row.value}
                          onChange={(e) => handleChange(row.id, e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                        />
                      )}
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => handleSave(row)}
                          disabled={saving[row.id]}
                          className="flex items-center gap-1.5 text-xs font-semibold bg-capha-navy text-white px-4 py-2 rounded-lg hover:bg-capha-blue transition-colors disabled:opacity-60"
                        >
                          {saving[row.id]
                            ? <Loader2 size={12} className="animate-spin" />
                            : <Save size={12} />
                          }
                          {saving[row.id] ? "Saving…" : "Save"}
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
