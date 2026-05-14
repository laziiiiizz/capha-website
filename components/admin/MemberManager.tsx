"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Upload, X, Save, Loader2, Users, Mail, Link2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Member = {
  id?: string;
  name: string;
  role: string;
  category: string;
  bio: string;
  email: string;
  photo_url: string;
  calendly_url: string;
  display_order: number;
};

type Category = { value: string; label: string };

const categoryColors: Record<string, string> = {
  founder: "bg-blue-100 text-blue-700",
  "co-founder": "bg-purple-100 text-purple-700",
  "academic-director": "bg-green-100 text-green-700",
  advisor: "bg-orange-100 text-orange-700",
  "ambassador-coordinator": "bg-pink-100 text-pink-700",
  ambassador: "bg-teal-100 text-teal-700",
};

interface Props {
  title: string;
  subtitle: string;
  filterCategories: string[];
  availableCategories: Category[];
  defaultCategory: string;
}

export default function MemberManager({
  title, subtitle, filterCategories, availableCategories, defaultCategory,
}: Props) {
  const emptyMember: Member = {
    name: "", role: "", category: defaultCategory, bio: "",
    email: "", photo_url: "", calendly_url: "", display_order: 0,
  };

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member>(emptyMember);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [preview, setPreview] = useState("");

  const fetchMembers = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .in("category", filterCategories)
      .order("display_order");
    setMembers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const filename = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("team-photos").upload(filename, file, { upsert: true });
    if (error) { toast.error("Upload failed: " + error.message); setUploadingPhoto(false); return; }
    const { data } = supabase.storage.from("team-photos").getPublicUrl(filename);
    setEditing((prev) => ({ ...prev, photo_url: data.publicUrl }));
    setPreview(data.publicUrl);
    toast.success("Photo uploaded!");
    setUploadingPhoto(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [] }, maxFiles: 1,
  });

  const openNew = () => { setEditing(emptyMember); setPreview(""); setOpen(true); };
  const openEdit = (m: Member) => { setEditing({ ...m }); setPreview(m.photo_url); setOpen(true); };

  const handleSave = async () => {
    if (!editing.name.trim() || !editing.role.trim()) {
      toast.error("Name and role are required.");
      return;
    }
    if (editing.calendly_url && !/^https:\/\/calendly\.com\//i.test(editing.calendly_url)) {
      toast.error("Calendly URL must start with https://calendly.com/");
      return;
    }
    if (editing.photo_url && !/^(https?:\/\/|\/)/.test(editing.photo_url)) {
      toast.error("Photo URL must be a valid https:// or /relative path.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { id, ...data } = editing;
    const { error } = id
      ? await supabase.from("team_members").update(data).eq("id", id)
      : await supabase.from("team_members").insert(data);
    if (error) toast.error("Save failed: " + error.message);
    else { toast.success(id ? "Member updated!" : "Member added!"); setOpen(false); fetchMembers(); }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success(`${name} removed`); fetchMembers(); }
  };

  // Category filter tabs — only show categories that have members
  const presentCategories = availableCategories.filter((c) =>
    members.some((m) => m.category === c.value)
  );
  const displayed =
    activeCategory === "All" ? members : members.filter((m) => m.category === activeCategory);

  const singularTitle = title.replace(/s$/, "");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-capha-navy" style={{ fontFamily: "var(--font-bodoni)" }}>
            {title}
          </h1>
          <p className="text-capha-dark/60 mt-1 text-sm">{subtitle} · {members.length} total</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-capha-navy text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-capha-blue transition-colors"
        >
          <Plus size={16} /> Add {singularTitle}
        </button>
      </div>

      {/* Category filter tabs */}
      {presentCategories.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setActiveCategory("All")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeCategory === "All"
                ? "bg-capha-navy text-white shadow-sm"
                : "bg-white border border-capha-blue/15 text-capha-dark/60 hover:border-capha-blue/40 hover:text-capha-navy"
            }`}
          >
            All ({members.length})
          </button>
          {presentCategories.map((c) => {
            const count = members.filter((m) => m.category === c.value).length;
            return (
              <button
                key={c.value}
                onClick={() => setActiveCategory(c.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === c.value
                    ? "bg-capha-navy text-white shadow-sm"
                    : "bg-white border border-capha-blue/15 text-capha-dark/60 hover:border-capha-blue/40 hover:text-capha-navy"
                }`}
              >
                {c.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Member list */}
      <div className="bg-white rounded-2xl border border-capha-blue/10 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-capha-blue" size={32} />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto mb-3 text-capha-dark/20" />
            <p className="text-capha-dark/40 text-sm mb-4">
              {members.length === 0
                ? `No ${title.toLowerCase()} yet. Add your first one to get started.`
                : `No members in this category.`}
            </p>
            {members.length === 0 && (
              <button
                onClick={openNew}
                className="inline-flex items-center gap-2 bg-capha-navy text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-capha-blue transition-colors text-sm"
              >
                <Plus size={15} /> Add First {singularTitle}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-capha-blue/5">
            {displayed.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-capha-light/30 transition-colors"
              >
                {/* Order number */}
                <span className="text-capha-dark/25 text-xs w-5 text-right flex-shrink-0">{i + 1}</span>

                {/* Photo */}
                <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-capha-light ring-2 ring-capha-blue/10">
                  {m.photo_url ? (
                    <Image src={m.photo_url} alt={m.name} fill className="object-cover object-top" sizes="44px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-capha-navy/40 font-bold text-sm">{m.name[0]}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-capha-navy font-bold text-sm">{m.name}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${categoryColors[m.category] ?? "bg-gray-100 text-gray-600"}`}>
                      {availableCategories.find((c) => c.value === m.category)?.label ?? m.category}
                    </span>
                  </div>
                  <p className="text-capha-dark/55 text-xs">{m.role}</p>
                  <div className="flex items-center gap-4 mt-0.5">
                    {m.email && (
                      <span className="text-capha-dark/35 text-xs flex items-center gap-1">
                        <Mail size={10} />{m.email}
                      </span>
                    )}
                    {m.calendly_url && (
                      <span className="text-capha-blue/60 text-xs flex items-center gap-1">
                        <Link2 size={10} />Calendly linked
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(m)}
                    className="flex items-center gap-1.5 bg-capha-light border border-capha-blue/15 text-capha-navy font-medium px-3 py-2 rounded-xl hover:bg-capha-blue/10 transition-colors text-xs"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    aria-label={`Delete ${m.name}`}
                    onClick={() => handleDelete(m.id!, m.name)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-capha-dark/25 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-bodoni)" }}>
              {editing.id ? `Edit ${singularTitle}` : `Add New ${singularTitle}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            {/* Photo upload */}
            <div>
              <label className="block text-sm font-semibold text-capha-navy mb-2">Photo</label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-capha-blue bg-capha-blue/5" : "border-capha-blue/20 hover:border-capha-blue/50"
                }`}
              >
                <input {...getInputProps()} />
                {preview ? (
                  <div className="relative w-32 h-32 mx-auto rounded-xl overflow-hidden">
                    <Image src={preview} alt="Preview" fill className="object-cover object-top" sizes="128px" />
                    {uploadingPhoto && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="animate-spin text-white" size={24} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6">
                    <Upload size={28} className="mx-auto text-capha-blue/50 mb-2" />
                    <p className="text-capha-navy/60 text-sm">
                      {isDragActive ? "Drop photo here…" : "Drag & drop or click to upload"}
                    </p>
                    <p className="text-capha-navy/30 text-xs mt-1">PNG, JPG, JPEG</p>
                  </div>
                )}
              </div>
              {preview && (
                <button
                  onClick={() => { setPreview(""); setEditing((p) => ({ ...p, photo_url: "" })); }}
                  className="mt-2 text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Remove photo
                </button>
              )}
            </div>

            {/* Fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="member-name" className="block text-sm font-semibold text-capha-navy mb-1">Name *</label>
                <input
                  id="member-name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                  placeholder="Full Name"
                />
              </div>
              <div>
                <label htmlFor="member-role" className="block text-sm font-semibold text-capha-navy mb-1">Role *</label>
                <input
                  id="member-role"
                  value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                  placeholder="e.g. Pre-Med Advisor"
                />
              </div>
              {availableCategories.length > 1 && (
                <div>
                  <label htmlFor="member-category" className="block text-sm font-semibold text-capha-navy mb-1">Category</label>
                  <select
                    id="member-category"
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm bg-white"
                  >
                    {availableCategories.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="member-order" className="block text-sm font-semibold text-capha-navy mb-1">Display Order</label>
                <input
                  id="member-order"
                  type="number"
                  value={editing.display_order}
                  onChange={(e) => setEditing({ ...editing, display_order: +e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                />
              </div>
              <div>
                <label htmlFor="member-email" className="block text-sm font-semibold text-capha-navy mb-1">Email</label>
                <input
                  id="member-email"
                  type="email"
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label htmlFor="member-calendly" className="block text-sm font-semibold text-capha-navy mb-1">Calendly URL</label>
                <input
                  id="member-calendly"
                  value={editing.calendly_url}
                  onChange={(e) => setEditing({ ...editing, calendly_url: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                  placeholder="https://calendly.com/..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="member-bio" className="block text-sm font-semibold text-capha-navy mb-1">Bio</label>
              <textarea
                id="member-bio"
                value={editing.bio}
                onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm resize-none"
                placeholder="Short bio..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || uploadingPhoto}
                className="flex items-center gap-2 bg-capha-navy text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-capha-blue transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Saving…" : `Save ${singularTitle}`}
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
