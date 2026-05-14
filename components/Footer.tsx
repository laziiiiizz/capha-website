import Image from "next/image";
import { createClient } from "@/lib/supabase-server";

export default async function Footer() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("section", "footer")
    .eq("key", "copyright")
    .maybeSingle();

  const copyright = data?.value ?? "Central Asian Pre-Health Association. All Rights Reserved.";

  return (
    <footer className="bg-capha-dark text-white/60 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-full overflow-hidden">
            <Image src="/logo.jpeg" alt="CAPHA" fill className="object-cover" />
          </div>
          <span className="text-sm font-medium text-white/70">CAPHA</span>
        </div>
        <p className="text-sm text-center">
          © {new Date().getFullYear()} {copyright}
        </p>
        <div className="w-16" />
      </div>
    </footer>
  );
}
