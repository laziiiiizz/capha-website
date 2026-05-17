// "use server" marks every exported function in this file as a Server Action.
// Server Actions run only on the server (never in the browser), so secrets like
// EMAIL_PASS and database writes are never exposed to users.
// Learn more: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
"use server";

import { headers } from "next/headers";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";

// A simple regex that checks for the basic shape of an email address (x@x.x).
// Full RFC-compliant email validation is overkill for a contact form.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A Set of the only time strings we accept. Using a Set makes the .has() lookup
// O(1) (instant) and prevents arbitrary time values from being submitted.
const VALID_SLOTS = new Set([
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM",  "1:30 PM",  "2:00 PM",  "2:30 PM",
  "3:00 PM",  "3:30 PM",  "4:00 PM",  "4:30 PM",
  "5:00 PM",  "5:30 PM",
]);

// HTML-escape user-supplied strings before putting them in email bodies.
// Without this, a name like "<script>alert(1)</script>" would inject HTML
// into the email — a form of Cross-Site Scripting (XSS).
// Learn more: https://owasp.org/www-community/attacks/xss/
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Strips carriage-return (\r), newline (\n) and tab (\t) characters from
// strings used in email headers (Subject, To, From).
// An attacker who can inject \r\n into a header can add fake headers or even
// a fake email body — this attack is called "email header injection".
// Learn more: https://owasp.org/www-community/attacks/Email_Header_Injection
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
  // headers() gives us access to the HTTP request headers on the server side.
  // We read the client IP from Netlify's header first, then fall back to the
  // standard x-forwarded-for header (set by proxies/load balancers).
  // Learn more: https://nextjs.org/docs/app/api-reference/functions/headers
  const hdrs = await headers();
  const ip =
    hdrs.get("x-nf-client-connection-ip") ??
    hdrs.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
    "unknown";

  // The key "book:<ip>" creates a separate bucket per IP so limits are per-user.
  // Allow 3 booking attempts per hour (3_600_000 ms).
  if (!checkRateLimit(`book:${ip}`, 3, 60 * 60 * 1000)) {
    throw new Error("Too many requests. Please try again later.");
  }

  // ── Server-side validation ────────────────────────────────────────────────
  // Even though the browser already validated the form with Zod, we MUST
  // re-validate on the server. A malicious user can bypass browser validation
  // entirely by sending a raw HTTP request with any data they like.
  const studentName = data.name.trim().slice(0, 200);
  const studentEmail = data.email.trim().slice(0, 200);
  const university = data.university.trim().slice(0, 200);
  const note = (data.note ?? "").trim().slice(0, 2000);
  const date = data.date.trim();
  const time = data.time.trim();

  if (studentName.length < 2) throw new Error("Name is required.");
  if (!EMAIL_RE.test(studentEmail)) throw new Error("Invalid email address.");
  if (university.length < 2) throw new Error("University is required.");
  // Dates must be in YYYY-MM-DD format — rejects freeform text like "next Monday".
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date.");
  if (!VALID_SLOTS.has(time)) throw new Error("Invalid time slot.");

  // Validate that the advisorId looks like a UUID before hitting the database.
  // This prevents SQL injection-style tricks and nonsense IDs being queried.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.advisorId)) {
    throw new Error("Invalid advisor.");
  }

  const today = new Date().toISOString().split("T")[0];
  if (date < today) throw new Error("Date must be in the future.");

  // ── Look up advisor from database — never trust client-supplied email ─────
  // The browser sends advisorEmail but we IGNORE it. We re-fetch the advisor
  // from the database using the advisorId. This means a user cannot craft a
  // request that sends email notifications to an arbitrary address they chose.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // We also check booking_eligible = true so someone can't book a hidden advisor
  // by guessing their UUID. If booking_eligible is false, maybeSingle() returns null.
  const { data: advisor } = await supabase
    .from("team_members")
    .select("name, email, role")
    .eq("id", data.advisorId)
    .eq("booking_eligible", true)
    .maybeSingle();

  if (!advisor) throw new Error("Invalid advisor selected.");

  // Use the server-fetched values from here on — not anything the client sent.
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
  // Always check for insert errors — silently swallowing them would let users
  // think they booked successfully even though nothing was saved.
  if (insertError) throw new Error("Failed to save booking. Please try again.");

  // ── Send email notifications ──────────────────────────────────────────────
  // nodemailer is a Node.js library for sending email. We use Gmail's SMTP
  // server with an app password stored in environment variables (never hardcoded).
  // Learn more: https://nodemailer.com/about/
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://capha.net";

  // wrapper() is a template helper that wraps any HTML body in a consistent
  // email layout (CAPHA header, white card, footer). accentColor is the thin
  // colored bar under the header — blue for students, gold for advisors/admins.
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

  // detailRow renders one table row. The `last` flag removes the bottom border
  // from the final row so there's no double-border at the bottom of the box.
  const detailRow = (label: string, value: string, last = false) => `
    <tr>
      <td style="padding:10px 0;${last ? "" : "border-bottom:1px solid #f1f5f9;"}color:#64748b;font-size:13px;width:130px;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;${last ? "" : "border-bottom:1px solid #f1f5f9;"}color:#0b3c5d;font-size:14px;font-weight:600;vertical-align:top;">${value}</td>
    </tr>
  `;

  // detailsBox takes an array of [label, value] pairs and renders them as a
  // tidy bordered table inside the email. It calls detailRow for each pair,
  // passing `true` as the last flag only for the final row.
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

  // Notify advisor: send them a "pending review" email so they know a request arrived.
  if (advisorEmail) {
    await transporter.sendMail({
      from: `"CAPHA" <${process.env.EMAIL_USER}>`,
      to: advisorEmail,
      // sanitizeHeader prevents CRLF injection in the Subject line.
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

  // Confirm receipt to student: let them know their request was received and is pending.
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

  // Build a deduplicated recipient list using a Set.
  // A Set automatically ignores duplicates, so if the org email happens to
  // match a team member's email it will only appear once.
  // Learn more: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
  const recipientSet = new Set<string>();
  if (process.env.EMAIL_USER) recipientSet.add(process.env.EMAIL_USER);
  for (const m of allMembers ?? []) {
    if (m.email) recipientSet.add(m.email as string);
  }
  // Remove the advisor from the broadcast list because they were already sent
  // a personal notification above — sending it twice would be redundant.
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

  // Promise.all fires all the sendMail calls at the same time (in parallel)
  // instead of one-by-one. For N recipients this is roughly N× faster because
  // we don't wait for each email to finish before starting the next.
  // Learn more: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
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
