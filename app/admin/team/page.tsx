"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, X, Save, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Member = {
  id?: string;
  name: string;
  role: string;
  category: string;
  bio: string;
  email: string;
  photo_url: string;
  display_order: number;
};

const emptyMember: Member = {
  name: "",
  role: "",
  category: "founder",
  bio: "",
  email: "",
  photo_url: "",
  display_order: 0,
};

const categories = [
  { value: "founder", label: "Founder" },
  { value: "co-founder", label: "Co-Founder" },
  { value: "academic-director", label: "Academic Director" },
  { value: "advisor", label: "Advisor" },
  { value: "ambassador-coordinator", label: "Ambassador Coordinator" },
  { value: "ambassador", label: "Ambassador" },
];

const categoryColors: Record<string, string> = {
  founder: "bg-blue-100 text-blue-700",
  "co-founder": "bg-purple-100 text-purple-700",
  "academic-director": "bg-green-100 text-green-700",
  advisor: "bg-orange-100 text-orange-700",
  "ambassador-coordinator": "bg-pink-100 text-pink-700",
  ambassador: "bg-teal-100 text-teal-700",
};

export default function TeamAdmin() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member>(emptyMember);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [preview, setPreview] = useState<string>("");

  const fetchMembers = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("team_members")
      .select("*")
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
    const { error } = await supabase.storage
      .from("team-photos")
      .upload(filename, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploadingPhoto(false);
      return;
    }
    const { data } = supabase.storage.from("team-photos").getPublicUrl(filename);
    setEditing((prev) => ({ ...prev, photo_url: data.publicUrl }));
    setPreview(data.publicUrl);
    toast.success("Photo uploaded!");
    setUploadingPhoto(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const openNew = () => {
    setEditing(emptyMember);
    setPreview("");
    setOpen(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setPreview(m.photo_url);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!editing.name || !editing.role) {
      toast.error("Name and role are required.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { id, ...data } = editing;
    let error;
    if (id) {
      ({ error } = await supabase.from("team_members").update(data).eq("id", id));
    } else {
      ({ error } = await supabase.from("team_members").insert(data));
    }
    if (error) {
      toast.error("Save failed: " + error.message);
    } else {
      toast.success(id ? "Member updated!" : "Member added!");
      setOpen(false);
      fetchMembers();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this member?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success("Member removed"); fetchMembers(); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-capha-navy" style={{ fontFamily: "var(--font-bodoni)" }}>
            Team Members
          </h1>
          <p className="text-capha-dark/60 mt-1">{members.length} members total</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-capha-navy text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-capha-blue transition-colors"
        >
          <Plus size={16} />
          Add Member
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-capha-blue" size={32} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {members.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-capha-blue/10 shadow-sm overflow-hidden group"
            >
              <div className="relative h-48">
                {m.photo_url ? (
                  <Image
                    src={m.photo_url}
                    alt={m.name}
                    fill
                    className="object-cover object-top"
                    sizes="300px"
                  />
                ) : (
                  <div className="w-full h-full bg-capha-light flex items-center justify-center">
                    <span className="text-capha-navy/30 text-4xl font-bold">
                      {m.name[0]}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-capha-navy/0 group-hover:bg-capha-navy/30 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(m)}
                    className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow hover:bg-capha-blue/20 transition-colors"
                  >
                    <Pencil size={15} className="text-capha-navy" />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id!)}
                    className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={15} className="text-red-500" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <Badge className={`text-xs mb-2 ${categoryColors[m.category] ?? "bg-gray-100 text-gray-600"}`}>
                  {m.category}
                </Badge>
                <p className="text-capha-navy font-bold">{m.name}</p>
                <p className="text-capha-dark/60 text-sm">{m.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-bodoni)" }}>
              {editing.id ? "Edit Member" : "Add New Member"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            {/* Photo upload */}
            <div>
              <label className="block text-sm font-semibold text-capha-navy mb-2">Photo</label>
              <div
                {...getRootProps()}
                className={`relative border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-capha-blue bg-capha-blue/5"
                    : "border-capha-blue/20 hover:border-capha-blue/50"
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
            </div>

            {/* Fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-capha-navy mb-1">Name *</label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                  placeholder="Full Name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-capha-navy mb-1">Role *</label>
                <input
                  value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                  placeholder="e.g. Pre-Med Advisor"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-capha-navy mb-1">Category</label>
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-capha-navy mb-1">Display Order</label>
                <input
                  type="number"
                  value={editing.display_order}
                  onChange={(e) => setEditing({ ...editing, display_order: +e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-capha-navy mb-1">Email</label>
                <input
                  type="email"
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm"
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-capha-navy mb-1">Bio</label>
              <textarea
                value={editing.bio}
                onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-capha-blue/20 focus:outline-none focus:ring-2 focus:ring-capha-blue/30 text-sm resize-none"
                placeholder="Short bio..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-capha-navy text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-capha-blue transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Saving…" : "Save Member"}
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
