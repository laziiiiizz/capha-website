"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarClock,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  ClipboardList,
  BookMarked,
} from "lucide-react";
import { adminLogout } from "./login/actions";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarClock },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/resources", label: "Resources", icon: BookMarked },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Login page is full-screen — no sidebar wrapper
  if (pathname === "/admin/login") return <>{children}</>;

  const handleLogout = async () => {
    await adminLogout();
    router.push("/admin/login");
    router.refresh();
  };

  const isActive = (item: (typeof navItems)[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-capha-navy text-white w-64">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/20">
            <Image src="/logo.jpeg" alt="CAPHA" width={40} height={40} className="object-cover" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ fontFamily: "var(--font-bodoni)" }}>
              CAPHA Admin
            </p>
            <p className="text-white/40 text-xs">Management Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-white text-capha-navy shadow-md"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon size={18} />
              {item.label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 text-sm font-medium transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
        <Link
          href="/"
          className="mt-1 w-full flex items-center gap-3 px-4 py-2 rounded-xl text-white/40 hover:text-white/60 text-xs transition-all"
        >
          ← Back to website
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-capha-light overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 flex">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-capha-navy text-white border-b border-white/10">
          <button aria-label="Open navigation menu" onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-white/10">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm" style={{ fontFamily: "var(--font-bodoni)" }}>
            CAPHA Admin
          </span>
        </div>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
