"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Send, CheckCircle } from "lucide-react";
import { sendContactMessage } from "@/app/contact/actions";
import { createClient } from "@/lib/supabase";

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M19 3A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H19M18.5 18.5V13.2A3.26 3.26 0 0 0 15.24 9.94C14.39 9.94 13.4 10.46 12.92 11.24V10.13H10.13V18.5H12.92V13.57C12.92 12.8 13.54 12.17 14.31 12.17A1.4 1.4 0 0 1 15.71 13.57V18.5H18.5M6.88 8.56A1.68 1.68 0 0 0 8.56 6.88C8.56 5.95 7.81 5.19 6.88 5.19A1.69 1.69 0 0 0 5.19 6.88C5.19 7.81 5.95 8.56 6.88 8.56M8.27 18.5V10.13H5.5V18.5H8.27Z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M7.8 2H16.2C19.4 2 22 4.6 22 7.8V16.2A5.8 5.8 0 0 1 16.2 22H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2M7.6 4A3.6 3.6 0 0 0 4 7.6V16.4C4 18.39 5.61 20 7.6 20H16.4A3.6 3.6 0 0 0 20 16.4V7.6C20 5.61 18.39 4 16.4 4H7.6M17.25 5.5A1.25 1.25 0 0 1 18.5 6.75A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75A1.25 1.25 0 0 1 17.25 5.5M12 7A5 5 0 0 1 17 12A5 5 0 0 1 12 17A5 5 0 0 1 7 12A5 5 0 0 1 12 7M12 9A3 3 0 0 0 9 12A3 3 0 0 0 12 15A3 3 0 0 0 15 12A3 3 0 0 0 12 9Z" />
  </svg>
);

type ContactLinks = {
  email: string;
  instagram: string;
  linkedin: string;
};

const DEFAULTS: ContactLinks = {
  email: "capha0925@gmail.com",
  instagram: "https://www.instagram.com/capha_25",
  linkedin: "https://www.linkedin.com/company/central-asian-pre-health-association",
};

function instagramHandle(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\//g, "");
    return path ? `@${path}` : url;
  } catch {
    return url;
  }
}

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [links, setLinks] = useState<ContactLinks>(DEFAULTS);

  useEffect(() => {
    createClient()
      .from("site_content")
      .select("key, value")
      .eq("section", "contact")
      .then(({ data }) => {
        if (!data?.length) return;
        const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
        setLinks((prev) => ({
          email: map.email ?? prev.email,
          instagram: map.instagram ?? prev.instagram,
          linkedin: map.linkedin ?? prev.linkedin,
        }));
      });
  }, []);

  const socials = [
    {
      label: "Email Us",
      description: links.email,
      href: `mailto:${links.email}`,
      Icon: Mail,
      bg: "from-capha-navy to-capha-blue",
    },
    {
      label: "LinkedIn",
      description: "Follow our page",
      href: links.linkedin,
      Icon: LinkedInIcon,
      bg: "from-[#0077b5] to-[#00a0dc]",
    },
    {
      label: "Instagram",
      description: instagramHandle(links.instagram),
      href: links.instagram,
      Icon: InstagramIcon,
      bg: "from-[#833ab4] via-[#fd1d1d] to-[#fcb045]",
    },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await sendContactMessage({ name: name.trim(), email: email.trim(), message: message.trim() });
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="py-24 bg-capha-navy relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-bodoni)" }}
          >
            Connect With Us
          </h2>
          <p className="text-white/55 text-lg mb-10 max-w-lg mx-auto">
            Have questions? Want to join? Send us a message and we will get back to you.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="mb-14"
        >
          {sent ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 border border-emerald-400/40 bg-emerald-400/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-emerald-400" size={26} />
              </div>
              <h3 className="text-white font-bold text-xl mb-2" style={{ fontFamily: "var(--font-bodoni)" }}>
                Message Sent!
              </h3>
              <p className="text-white/55 text-sm mb-5">
                Thanks, <strong className="text-white">{name}</strong>. We will get back to you at {email} soon.
              </p>
              <button
                onClick={() => { setSent(false); setName(""); setEmail(""); setMessage(""); }}
                className="text-capha-blue text-sm font-semibold hover:text-white transition-colors"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 text-left">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="contact-name" className="block text-white/60 text-xs font-semibold uppercase tracking-wide mb-1.5">Name</label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full bg-white/8 border border-white/15 px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-white/60 text-xs font-semibold uppercase tracking-wide mb-1.5">Email</label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-white/8 border border-white/15 px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-white/60 text-xs font-semibold uppercase tracking-wide mb-1.5">Message</label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="What would you like to share with CAPHA?"
                  className="w-full bg-white/8 border border-white/15 px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/40 transition-colors resize-none"
                />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="group w-full flex items-center justify-center gap-2 bg-white text-capha-navy font-bold py-3 px-6 hover:bg-capha-light transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  <>
                    Send Message
                    <Send size={15} className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {socials.map((s, i) => {
            const Icon = s.Icon;
            return (
              <motion.a
                key={s.label}
                href={s.href}
                target={s.href.startsWith("mailto") ? undefined : "_blank"}
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.45 }}
                whileHover={{ scale: 1.05, y: -4 }}
                className={`flex items-center gap-3 bg-gradient-to-r ${s.bg} text-white font-semibold px-6 py-4 shadow-xl min-w-[190px] justify-center hover:shadow-2xl transition-shadow`}
              >
                <Icon />
                <div className="text-left">
                  <p className="text-sm font-bold leading-tight">{s.label}</p>
                  <p className="text-white/65 text-xs">{s.description}</p>
                </div>
              </motion.a>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
