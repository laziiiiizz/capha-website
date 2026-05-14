"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Users, CalendarDays, FileText, ArrowRight, ClipboardList, CalendarClock, BookMarked, Settings } from "lucide-react";

const cards = [
  {
    href: "/admin/bookings",
    title: "Bookings",
    description: "Review appointment requests, confirm or cancel sessions, and notify students.",
    icon: ClipboardList,
    color: "from-capha-navy to-capha-blue",
    badgeKey: "pending",
  },
  {
    href: "/admin/calendar",
    title: "Calendar",
    description: "Block specific dates or time slots so students cannot book during those times.",
    icon: CalendarClock,
    color: "from-capha-blue to-teal-500",
  },
  {
    href: "/admin/members",
    title: "Members",
    description: "Add, edit, or remove leadership, advisors, and ambassadors.",
    icon: Users,
    color: "from-indigo-600 to-capha-blue",
  },
  {
    href: "/admin/events",
    title: "Events",
    description: "Update Zoom session details, meeting IDs, and upcoming event information.",
    icon: CalendarDays,
    color: "from-capha-blue to-capha-navy",
  },
  {
    href: "/admin/resources",
    title: "Resources",
    description: "Manage career-path steps and guidance for each healthcare track.",
    icon: BookMarked,
    color: "from-teal-600 to-capha-blue",
  },
  {
    href: "/admin/settings",
    title: "Settings",
    description: "Edit homepage text, hero headline, about section, and contact links.",
    icon: Settings,
    color: "from-capha-navy to-indigo-600",
  },
];

export default function AdminDashboard() {
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => setPending(count ?? 0));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-3xl font-bold text-capha-navy"
          style={{ fontFamily: "var(--font-bodoni)" }}
        >
          Dashboard
        </h1>
        <p className="text-capha-dark/55 mt-1 text-sm">
          What would you like to manage today?
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const badge = card.badgeKey === "pending" && pending && pending > 0
            ? `${pending} pending`
            : null;

          return (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-white border border-capha-blue/10 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className={`bg-gradient-to-r ${card.color} p-5 flex items-center justify-between`}>
                <Icon size={24} className="text-white" />
                {badge && (
                  <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1">
                    {badge}
                  </span>
                )}
              </div>
              <div className="p-5">
                <h2 className="text-capha-navy font-bold text-sm mb-1">{card.title}</h2>
                <p className="text-capha-dark/50 text-xs leading-relaxed">{card.description}</p>
                <div className="flex items-center gap-1 mt-4 text-capha-blue text-xs font-semibold group-hover:gap-2 transition-all">
                  Manage <ArrowRight size={13} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 bg-capha-navy/5 border border-capha-blue/10 p-5">
        <h3 className="text-capha-navy font-semibold text-sm mb-2">Quick Tips</h3>
        <ul className="space-y-1.5 text-capha-dark/55 text-xs">
          <li>• Confirm or cancel booking requests from <strong className="text-capha-navy">Bookings</strong> — students are emailed automatically.</li>
          <li>• Block holidays or unavailable days in <strong className="text-capha-navy">Calendar</strong> before students try to book.</li>
          <li>• Team member changes take effect on the public site immediately.</li>
        </ul>
      </div>
    </div>
  );
}
