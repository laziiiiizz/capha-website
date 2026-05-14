"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function adminLogin(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: "Invalid email or password." };
  return { ok: true };
}

export async function adminLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
