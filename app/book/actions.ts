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

function sanitizeHeader(s: string): string {
  return s.replace(/[\r\n\t]/g, " ").trim().slice(0, 200);
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
  const hdrs = await headers();
  const ip =
    hdrs.get("x-nf-client-connection-ip") ??
    hdrs.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
    "unknown";
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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.advisorId)) {
    throw new Error("Invalid advisor.");
  }

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
    .eq("booking_eligible", true)
    .maybeSingle();

  if (!advisor) throw new Error("Invalid advisor selected.");

  const advisorName = advisor.name;
  const advisorEmail = advisor.email;
  const advisorRole = advisor.role;

  // ── Save booking to database ──────────────────────────────────────────────
  const { error: insertError } = await supabase.from("bookings").insert({
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
  if (insertError) throw new Error("Failed to save booking. Please try again.");

  // ── Send email notifications ──────────────────────────────────────────────
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://capha.net";

  const wrapper = (accentColor: string, body: string) => `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f1f5f9;padding:32px 16px;">
      <div style="background:#0b3c5d;padding:26px 36px;border-radius:8px 8px 0 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <tr>
            <td><img src="${siteUrl}/logo.jpeg" alt="CAPHA" style="height:40px;width:auto;display:block;" /></td>
            <td align="right"><span style="color:rgba(255,255,255,0.45);font-size:11px;text-transform:uppercase;letter-spacing:1.5px;">Mentorship Program</span></td>
          </tr>
        </table>
        <div style="height:3px;background:${accentColor};margin-top:16px;border-radius:2px;"></div>
      </div>
      <div style="background:white;padding:36px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;">
        ${body}
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:12px;margin:20px 0 0;">
        Central Asian Pre-Health Association &nbsp;&middot;&nbsp;
        <a href="mailto:${process.env.EMAIL_USER}" style="color:#94a3b8;text-decoration:none;">${process.env.EMAIL_USER}</a>
      </p>
    </div>
  `;

  const detailRow = (label: string, value: string, last = false) => `
    <tr>
      <td style="padding:10px 0;${last ? "" : "border-bottom:1px solid #f1f5f9;"}color:#64748b;font-size:13px;width:130px;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;${last ? "" : "border-bottom:1px solid #f1f5f9;"}color:#0b3c5d;font-size:14px;font-weight:600;vertical-align:top;">${value}</td>
    </tr>
  `;

  const detailsBox = (rows: [string, string][]) => `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:4px 20px;margin:20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${rows.map(([l, v], i) => detailRow(l, v, i === rows.length - 1)).join("")}
      </table>
    </div>
  `;

  const studentRows: [string, string][] = [
    ["Advisor", `${esc(advisorName)} &mdash; ${esc(advisorRole)}`],
    ["Date", esc(date)],
    ["Time (EST)", esc(time)],
    ["University", esc(university)],
    ...(note ? [["Note", esc(note)] as [string, string]] : []),
  ];

  const advisorRows: [string, string][] = [
    ["Student", esc(studentName)],
    ["Email", `<a href="mailto:${esc(studentEmail)}" style="color:#328cc1;font-weight:600;">${esc(studentEmail)}</a>`],
    ["University", esc(university)],
    ["Date", esc(date)],
    ["Time (EST)", esc(time)],
    ...(note ? [["Note", esc(note)] as [string, string]] : []),
  ];

  // Notify advisor
  if (advisorEmail) {
    await transporter.sendMail({
      from: `"CAPHA" <${process.env.EMAIL_USER}>`,
      to: advisorEmail,
      subject: `New Mentorship Request — ${sanitizeHeader(studentName)} | ${date}`,
      html: wrapper("#d9b310", `
        <h2 style="color:#0b3c5d;margin:0 0 6px;font-size:22px;font-weight:700;">New Mentorship Request</h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 4px;">Dear ${esc(advisorName)},</p>
        <p style="color:#64748b;font-size:14px;margin:0 0 8px;">
          A student has submitted a mentorship session request. Please review the details below.
        </p>
        ${detailsBox(advisorRows)}
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px 18px;margin-bottom:20px;">
          <p style="color:#92400e;font-size:13px;margin:0;">
            This request is <strong>pending review</strong> by the CAPHA team. You will receive a separate confirmation once the booking is approved.
          </p>
        </div>
        <p style="color:#64748b;font-size:13px;margin:0;">
          Best regards,<br/>
          <strong style="color:#0b3c5d;">CAPHA Administration</strong>
        </p>
      `),
    });
  }

  // Confirm receipt to student
  await transporter.sendMail({
    from: `"CAPHA" <${process.env.EMAIL_USER}>`,
    to: studentEmail,
    subject: `Appointment Request Received — ${sanitizeHeader(advisorName)} | ${date}`,
    html: wrapper("#328cc1", `
      <h2 style="color:#0b3c5d;margin:0 0 6px;font-size:22px;font-weight:700;">Request Received</h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 4px;">Dear ${esc(studentName)},</p>
      <p style="color:#64748b;font-size:14px;margin:0 0 8px;">
        Thank you for submitting a mentorship session request with CAPHA. We have received your request and it is currently <strong style="color:#0b3c5d;">pending review</strong>.
      </p>
      ${detailsBox(studentRows)}
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:14px 18px;margin-bottom:20px;">
        <p style="color:#1e40af;font-size:13px;margin:0;">
          You will receive a confirmation email once your session has been approved. Please allow 1&ndash;2 business days for a response.
        </p>
      </div>
      <p style="color:#64748b;font-size:13px;margin:0;">
        If you have any questions, please contact us at
        <a href="mailto:${process.env.EMAIL_USER}" style="color:#328cc1;">${process.env.EMAIL_USER}</a>.
      </p>
      <p style="color:#64748b;font-size:13px;margin:16px 0 0;">
        Best regards,<br/>
        <strong style="color:#0b3c5d;">CAPHA Mentorship Team</strong>
      </p>
    `),
  });

  // Notify all CAPHA leaders of new booking
  const { data: allMembers } = await supabase
    .from("team_members")
    .select("email")
    .not("email", "is", null)
    .neq("email", "");

  // Build deduplicated recipient list: all leader emails + org email, minus advisor (already notified)
  const recipientSet = new Set<string>();
  if (process.env.EMAIL_USER) recipientSet.add(process.env.EMAIL_USER);
  for (const m of allMembers ?? []) {
    if (m.email) recipientSet.add(m.email as string);
  }
  if (advisorEmail) recipientSet.delete(advisorEmail);

  const adminHtml = wrapper("#d9b310", `
    <h2 style="color:#0b3c5d;margin:0 0 6px;font-size:22px;font-weight:700;">New Booking Submitted</h2>
    <p style="color:#64748b;font-size:14px;margin:0 0 8px;">A new mentorship appointment request requires your review.</p>
    ${detailsBox([
      ["Student", esc(studentName)],
      ["Student Email", `<a href="mailto:${esc(studentEmail)}" style="color:#328cc1;">${esc(studentEmail)}</a>`],
      ["University", esc(university)],
      ["Advisor", `${esc(advisorName)} &mdash; ${esc(advisorRole)}`],
      ["Date", esc(date)],
      ["Time (EST)", esc(time)],
      ...(note ? [["Note", esc(note)] as [string, string]] : []),
    ])}
    <p style="color:#64748b;font-size:13px;margin:0;">
      Log in to the <a href="${siteUrl}/admin/bookings" style="color:#328cc1;">admin panel</a> to confirm or cancel this booking.
    </p>
  `);

  await Promise.all(
    Array.from(recipientSet).map((to) =>
      transporter.sendMail({
        from: `"CAPHA" <${process.env.EMAIL_USER}>`,
        to,
        subject: `[New Booking] ${sanitizeHeader(studentName)} → ${sanitizeHeader(advisorName)} on ${date}`,
        html: adminHtml,
      })
    )
  );
}
