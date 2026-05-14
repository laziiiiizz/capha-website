import { createClient } from "@/lib/supabase-server";

export async function requireAuth(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
}
