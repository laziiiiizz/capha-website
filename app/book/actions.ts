"use server";

import { headers } from "next/headers";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_SLOTS = new Set([
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM",  "1:30 PM",  "2:00 PM",  "2:30 PM",
  "3:00 PM",  "3:30 PM",  "4:00 PM",  "4:30 PM",
  "5:00 PM",  "5:30 PM",
]);

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export interface BookingPayload {
  name: string;
  email: string;
  university: string;
  note?: string;
  advisorId: string;
  advisorName: string;
  advisorEmail: string;
  advisorRole: string;
  date: string;
  time: string;
}

export async function bookAppointment(data: BookingPayload) {
  // ── Rate limit: 3 submissions per IP per hour ─────────────────────────────
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(`book:${ip}`, 3, 60 * 60 * 1000)) {
    throw new Error("Too many requests. Please try again later.");
  }

  // ── Server-side validation ────────────────────────────────────────────────
  const studentName = data.name.trim().slice(0, 200);
  const studentEmail = data.email.trim().slice(0, 200);
  const university = data.university.trim().slice(0, 200);
  const note = (data.note ?? "").trim().slice(0, 2000);
  const date = data.date.trim();
  const time = data.time.trim();

  if (studentName.length < 2) throw new Error("Name is required.");
  if (!EMAIL_RE.test(studentEmail)) throw new Error("Invalid email address.");
  if (university.length < 2) throw new Error("University is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date.");
  if (!VALID_SLOTS.has(time)) throw new Error("Invalid time slot.");

  const today = new Date().toISOString().split("T")[0];
  if (date < today) throw new Error("Date must be in the future.");

  // ── Look up advisor from database — never trust client-supplied email ─────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: advisor } = await supabase
    .from("team_members")
    .select("name, email, role")
    .eq("id", data.advisorId)
    .in("category", ["advisor", "academic-director"])
    .maybeSingle();

  if (!advisor) throw new Error("Invalid advisor selected.");

  const advisorName = advisor.name;
  const advisorEmail = advisor.email;
  const advisorRole = advisor.role;

  // ── Save booking to database ──────────────────────────────────────────────
  await supabase.from("bookings").insert({
    student_name: studentName,
    student_email: studentEmail,
    university,
    note: note || null,
    advisor_id: data.advisorId,
    advisor_name: advisorName,
    advisor_email: advisorEmail,
    advisor_role: advisorRole,
    booking_date: date,
    booking_time: time,
    status: "pending",
  });

  // ── Send email notifications ──────────────────────────────────────────────
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const sharedDetails = `
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:130px;">Advisor</td><td style="padding:8px 0;color:#0b3c5d;font-weight:600;font-size:14px;">${esc(advisorName)} — ${esc(advisorRole)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Date</td><td style="padding:8px 0;color:#0b3c5d;font-weight:600;font-size:14px;">${esc(date)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Time (EST)</td><td style="padding:8px 0;color:#0b3c5d;font-weight:600;font-size:14px;">${esc(time)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Student</td><td style="padding:8px 0;color:#0b3c5d;font-weight:600;font-size:14px;">${esc(studentName)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Student Email</td><td style="padding:8px 0;color:#0b3c5d;font-weight:600;font-size:14px;">${esc(studentEmail)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">University</td><td style="padding:8px 0;color:#0b3c5d;font-weight:600;font-size:14px;">${esc(university)}</td></tr>
      ${note ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Note</td><td style="padding:8px 0;color:#0b3c5d;font-size:14px;">${esc(note)}</td></tr>` : ""}
    </table>
  `;

  const wrapper = (body: string) => `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#f4f8fb;padding:32px 16px;">
      <div style="background:#0b3c5d;border-radius:16px 16px 0 0;padding:24px 32px;display:flex;align-items:center;gap:12px;">
        <span style="color:white;font-size:20px;font-weight:700;letter-spacing:-0.5px;">CAPHA</span>
        <span style="color:rgba(255,255,255,0.4);font-size:14px;">Mentorship Program</span>
      </div>
      <div style="background:white;border-radius:0 0 16px 16px;padding:32px;">
        ${body}
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px;">
        Central Asian Pre-Health Association · ${process.env.EMAIL_USER}
      </p>
    </div>
  `;

  // Notify advisor (only if they have an email on record)
  if (advisorEmail) {
    await transporter.sendMail({
      from: `"CAPHA" <${process.env.EMAIL_USER}>`,
      to: advisorEmail,
      subject: `New Mentorship Request — ${esc(studentName)}`,
      html: wrapper(`
        <h2 style="color:#0b3c5d;margin:0 0 8px;font-size:20px;">New Appointment Request</h2>
        <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">A student has requested a mentorship session with you.</p>
        <div style="background:#f4f8fb;border-radius:12px;padding:16px 20px;">
          ${sharedDetails}
        </div>
        <p style="color:#6b7280;font-size:13px;margin-top:20px;">
          Please reply directly to the student at <a href="mailto:${esc(studentEmail)}" style="color:#328cc1;">${esc(studentEmail)}</a> to confirm the session.
        </p>
      `),
    });
  }

  // Confirm to student
  await transporter.sendMail({
    from: `"CAPHA" <${process.env.EMAIL_USER}>`,
    to: studentEmail,
    subject: `Your CAPHA Mentorship Request is Confirmed`,
    html: wrapper(`
      <h2 style="color:#0b3c5d;margin:0 0 8px;font-size:20px;">We received your request!</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">
        Your appointment request has been sent to <strong style="color:#0b3c5d;">${esc(advisorName)}</strong>.
        They will reach out to confirm your session.
      </p>
      <div style="background:#f4f8fb;border-radius:12px;padding:16px 20px;">
        ${sharedDetails}
      </div>
      <p style="color:#6b7280;font-size:13px;margin-top:20px;">
        If you have any questions, email us at
        <a href="mailto:${process.env.EMAIL_USER}" style="color:#328cc1;">${process.env.EMAIL_USER}</a>.
      </p>
    `),
  });
}
