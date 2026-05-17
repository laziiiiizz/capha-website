"use server";

import { headers } from "next/headers";
import nodemailer from "nodemailer";
import { checkRateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

export async function sendContactMessage(data: ContactPayload) {
  // ── Rate limit: 5 submissions per IP per hour ─────────────────────────────
  const hdrs = await headers();
  const ip =
    hdrs.get("x-nf-client-connection-ip") ??
    hdrs.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
    "unknown";
  if (!checkRateLimit(`contact:${ip}`, 5, 60 * 60 * 1000)) {
    throw new Error("Too many requests. Please try again later.");
  }

  const name = data.name.trim().slice(0, 200);
  const email = data.email.trim().slice(0, 200);
  const message = data.message.trim().slice(0, 5000);

  if (!name || name.length < 2) throw new Error("Name is required.");
  if (!EMAIL_RE.test(email)) throw new Error("Invalid email address.");
  if (!message || message.length < 2) throw new Error("Message is required.");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"CAPHA Website" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    replyTo: email.replace(/[<>"]/g, "").trim(),
    subject: `New Message from ${email.replace(/[\r\n\t]/g, " ").trim().slice(0, 200)}`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#f4f8fb;padding:32px 16px;">
        <div style="background:#0b3c5d;padding:24px 32px;">
          <span style="color:white;font-size:20px;font-weight:700;">CAPHA</span>
          <span style="color:rgba(255,255,255,0.4);font-size:14px;margin-left:12px;">Contact Form</span>
        </div>
        <div style="background:white;padding:32px;">
          <h2 style="color:#0b3c5d;margin:0 0 20px;font-size:18px;">New message from the website</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:90px;">From</td><td style="padding:8px 0;color:#0b3c5d;font-weight:600;font-size:14px;">${esc(name)}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Email</td><td style="padding:8px 0;color:#0b3c5d;font-size:14px;"><a href="mailto:${esc(email)}" style="color:#328cc1;">${esc(email)}</a></td></tr>
          </table>
          <div style="margin-top:20px;background:#f4f8fb;padding:16px 20px;">
            <p style="color:#6b7280;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.05em;font-weight:600;">Message</p>
            <p style="color:#102542;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${esc(message)}</p>
          </div>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Reply directly to this email to respond to ${esc(name)}.</p>
        </div>
      </div>
    `,
  });
}
