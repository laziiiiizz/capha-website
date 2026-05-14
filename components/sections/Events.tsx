"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Calendar, Clock, Video, UserCheck, ExternalLink, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase";

type DbEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  zoom_link: string;
  meeting_id: string;
  type: string;
};

type Advisor = {
  id: string;
  name: string;
  role: string;
};

const DEFAULT_ZOOM: DbEvent = {
  id: "",
  title: "Zoom Sessions",
  date: "March 7th",
  time: "EST 11:00 AM",
  description:
    "Join our monthly Zoom sessions where healthcare professionals share their journeys and advice for aspiring students.",
  zoom_link: "https://syracuseuniversity.zoom.us/j/9663439551",
  meeting_id: "966 343 9551",
  type: "zoom",
};


const DEFAULT_INTRO =
  "Stay connected with CAPHA! Join our upcoming virtual events, workshops, and mentorship sessions to grow your pre-health journey.";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function Events() {
  const [zoomEvent, setZoomEvent] = useState<DbEvent>(DEFAULT_ZOOM);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [intro, setIntro] = useState(DEFAULT_INTRO);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("events")
      .select("*")
      .eq("type", "zoom")
      .eq("is_active", true)
      .order("created_at")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data) setZoomEvent(data); });

    supabase
      .from("team_members")
      .select("id, name, role")
      .not("calendly_url", "is", null)
      .neq("calendly_url", "")
      .order("display_order")
      .then(({ data }) => { setAdvisors(data ?? []); });

    supabase
      .from("site_content")
      .select("value")
      .eq("section", "events")
      .eq("key", "intro")
      .maybeSingle()
      .then(({ data }) => { if (data) setIntro(data.value); });
  }, []);

  const meetingIdRaw = zoomEvent.meeting_id.replace(/\s/g, "");
  const phoneTaps = [
    { tel: `+16469313860,,${meetingIdRaw}#`, label: "US" },
    { tel: `+16468769923,,${meetingIdRaw}#`, label: "US – New York" },
  ];

  return (
    <section id="events" className="py-24 bg-capha-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-4 bg-capha-blue/10 text-capha-blue border-capha-blue/20 hover:bg-capha-blue/10">
            Upcoming Events
          </Badge>
          <h2
            className="text-4xl md:text-5xl font-bold text-capha-navy mb-4"
            style={{ fontFamily: "var(--font-bodoni)" }}
          >
            Events & Meetings
          </h2>
          <p className="text-capha-dark/60 text-lg max-w-2xl mx-auto">{intro}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Zoom Sessions Card */}
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="group bg-white rounded-2xl overflow-hidden border border-capha-blue/10 hover:border-capha-blue/30 transition-all duration-300"
          >
            <div className="bg-gradient-to-r from-capha-navy to-capha-blue p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                  <Calendar size={14} />
                  <span>{zoomEvent.date}</span>
                  <span className="mx-1">·</span>
                  <Clock size={14} />
                  <span>{zoomEvent.time}</span>
                </div>
                <h3
                  className="text-white text-2xl font-bold"
                  style={{ fontFamily: "var(--font-bodoni)" }}
                >
                  {zoomEvent.title}
                </h3>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <Video size={26} className="text-capha-gold" />
              </div>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-capha-dark/70 leading-relaxed">{zoomEvent.description}</p>

              <div className="bg-capha-light rounded-2xl p-4 space-y-3">
                <p className="text-capha-navy font-semibold text-sm">
                  Meeting ID: <span className="font-bold text-base">{zoomEvent.meeting_id}</span>
                </p>
                <div className="border-t border-capha-blue/10 pt-3">
                  <p className="text-capha-dark/50 text-xs font-semibold uppercase tracking-wide mb-2">
                    One-tap mobile (US)
                  </p>
                  <div className="space-y-1.5">
                    {phoneTaps.map((t) => (
                      <a
                        key={t.tel}
                        href={`tel:${t.tel}`}
                        className="flex items-center gap-2 text-capha-blue text-sm hover:text-capha-navy transition-colors"
                      >
                        <Phone size={13} />
                        <span className="font-mono">{t.tel}</span>
                        <Badge variant="outline" className="text-xs py-0 px-1.5">{t.label}</Badge>
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <a
                href={zoomEvent.zoom_link}
                target="_blank"
                rel="noopener noreferrer"
                className="group/btn flex items-center justify-center gap-2 w-full bg-capha-navy text-white font-semibold py-3 px-6 rounded-xl hover:bg-capha-blue transition-colors duration-200"
              >
                <Video size={16} />
                Join Meeting
                <ExternalLink size={14} className="opacity-60 group-hover/btn:opacity-100 transition" />
              </a>
            </div>
          </motion.div>

          {/* Mentorship Card */}
          <motion.div
            custom={1}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="group bg-white rounded-2xl overflow-hidden border border-capha-blue/10 hover:border-capha-blue/30 transition-all duration-300"
          >
            <div className="bg-gradient-to-r from-capha-blue to-capha-navy p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                  <Calendar size={14} />
                  <span>Ongoing</span>
                  <span className="mx-1">·</span>
                  <span>One-on-One</span>
                </div>
                <h3
                  className="text-white text-2xl font-bold"
                  style={{ fontFamily: "var(--font-bodoni)" }}
                >
                  CAPHA Mentorship
                </h3>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <UserCheck size={26} className="text-white" />
              </div>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-capha-dark/60 text-sm leading-relaxed">
                Book a one-on-one session directly with one of our advisors — each specializes
                in a different healthcare track.
              </p>

              {advisors.length === 0 ? (
                <p className="text-capha-dark/40 text-sm text-center py-2">
                  Advisors coming soon — check back shortly.
                </p>
              ) : (
                advisors.map((mentor) => (
                  <div
                    key={mentor.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-capha-blue/10"
                  >
                    <div className="w-9 h-9 rounded-full bg-capha-navy flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{initials(mentor.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-capha-navy font-semibold text-sm leading-tight">{mentor.name}</p>
                      <p className="text-capha-dark/50 text-xs mt-0.5">{mentor.role}</p>
                    </div>
                  </div>
                ))
              )}

              <a
                href="/book"
                className="group/btn flex items-center justify-center gap-2 w-full bg-capha-navy text-white font-semibold py-3 px-6 rounded-xl hover:bg-capha-blue transition-colors duration-200 mt-1"
              >
                <Calendar size={16} />
                Book a Session
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
