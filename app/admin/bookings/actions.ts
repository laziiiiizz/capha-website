// "use server" means every exported function here runs only on the server.
// This file handles admin actions — sending confirmation/cancellation emails
// after an admin approves or rejects a booking in the dashboard.
// Learn more: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
"use server";

import nodemailer from "nodemailer";
import { requireAuth } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase-server";

// HTML-escapes user data before embedding it in email bodies to prevent XSS.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Removes \r \n \t from strings used in email Subject/From/To headers to prevent
// email header injection attacks.
// Learn more: https://owasp.org/www-community/attacks/Email_Header_Injection
function sanitizeHeader(s: string): string {
  return s.replace(/[\r\n\t]/g, " ").trim().slice(0, 200);
}

// The nodemailer transporter is created once at module level (outside the function)
// so it is reused across calls instead of being recreated on every email send.
// Learn more: https://nodemailer.com/about/
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://capha.net";

// Shared email layout wrapper. accentColor is the thin stripe under the header
// (green for confirmed, red for cancelled). body is the inner HTML content.
const wrap = (accentColor: string, body: string) => `
  <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f1f5f9;padding:32px 16px;">
    <div style="background:#0b3c5d;padding:26px 36px;border-radius:8px 8px 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td><img src="${SITE_URL}/logo.jpeg" alt="CAPHA" style="height:40px;width:auto;display:block;" /></td>
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

// detailsBox renders a list of [label, value] pairs as a styled HTML table.
// Each row gets a bottom border except the last one (checked with the index i).
const detailsBox = (rows: [string, string][]) => `
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:4px 20px;margin:20px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rows.map(([l, v], i) => `
        <tr>
          <td style="padding:10px 0;${i < rows.length - 1 ? "border-bottom:1px solid #f1f5f9;" : ""}color:#64748b;font-size:13px;width:130px;vertical-align:top;">${l}</td>
          <td style="padding:10px 0;${i < rows.length - 1 ? "border-bottom:1px solid #f1f5f9;" : ""}color:#0b3c5d;font-size:14px;font-weight:600;vertical-align:top;">${v}</td>
        </tr>
      `).join("")}
    </table>
  </div>
`;

export async function sendStatusEmail(bookingId: string, status: "confirmed" | "cancelled") {
  // requireAuth throws an error if there is no valid admin session, which stops
  // the function immediately. This prevents any unauthenticated caller (e.g. a
  // crafted HTTP request) from triggering email sends or reading booking data.
  await requireAuth();

  // We fetch the booking from the database using the bookingId rather than
  // accepting the booking details as function arguments. This means an admin
  // cannot manipulate names, emails, or dates by passing crafted values —
  // the email content always reflects what is actually stored in the database.
  const supabase = await createClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("student_name, student_email, advisor_name, advisor_email, advisor_role, booking_date, booking_time")
    .eq("id", bookingId)
    .single();

  if (!b) throw new Error("Booking not found.");

  const studentName = b.student_name as string;
  const studentEmail = b.student_email as string;
  const advisorName = b.advisor_name as string;
  const advisorEmail = b.advisor_email as string;
  const advisorRole = b.advisor_role as string;
  const date = b.booking_date as string;
  const time = b.booking_time as string;

  const sessionRows: [string, string][] = [
    ["Advisor", `${esc(advisorName)} &mdash; ${esc(advisorRole)}`],
    ["Date", esc(date)],
    ["Time (EST)", esc(time)],
  ];

  const advisorSessionRows: [string, string][] = [
    ["Student", esc(studentName)],
    ["Email", `<a href="mailto:${esc(studentEmail)}" style="color:#328cc1;">${esc(studentEmail)}</a>`],
    ["Date", esc(date)],
    ["Time (EST)", esc(time)],
  ];

  if (status === "confirmed") {
    // Always email the student first — this is the most important notification.
    await transporter.sendMail({
      from: `"CAPHA" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject: `Appointment Confirmed — ${sanitizeHeader(advisorName)} | ${date}`,
      html: wrap("#22c55e", `
        <h2 style="color:#0b3c5d;margin:0 0 6px;font-size:22px;font-weight:700;">Appointment Confirmed</h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 4px;">Dear ${esc(studentName)},</p>
        <p style="color:#64748b;font-size:14px;margin:0 0 8px;">
          Your mentorship session with <strong style="color:#0b3c5d;">${esc(advisorName)}</strong> has been officially confirmed.
        </p>
        ${detailsBox(sessionRows)}
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:14px 18px;margin-bottom:20px;">
          <p style="color:#166534;font-size:13px;margin:0;">
            Your advisor will be in touch with you regarding the session format and meeting link. Please ensure you are available at the confirmed date and time.
          </p>
        </div>
        <p style="color:#64748b;font-size:13px;margin:0;">
          If you need to make any changes, contact us at
          <a href="mailto:${process.env.EMAIL_USER}" style="color:#328cc1;">${process.env.EMAIL_USER}</a>.
        </p>
        <p style="color:#64748b;font-size:13px;margin:16px 0 0;">
          Best regards,<br/>
          <strong style="color:#0b3c5d;">CAPHA Mentorship Team</strong>
        </p>
      `),
    });

    // Only email the advisor if they have an email address in the database.
    // Some team members may be added without an email, so we guard against null.
    if (advisorEmail) {
      await transporter.sendMail({
        from: `"CAPHA" <${process.env.EMAIL_USER}>`,
        to: advisorEmail,
        subject: `Session Confirmed — ${sanitizeHeader(studentName)} | ${date}`,
        html: wrap("#22c55e", `
          <h2 style="color:#0b3c5d;margin:0 0 6px;font-size:22px;font-weight:700;">Session Confirmed</h2>
          <p style="color:#64748b;font-size:14px;margin:0 0 4px;">Dear ${esc(advisorName)},</p>
          <p style="color:#64748b;font-size:14px;margin:0 0 8px;">
            The following mentorship session has been confirmed and the student has been notified.
          </p>
          ${detailsBox(advisorSessionRows)}
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:14px 18px;margin-bottom:20px;">
            <p style="color:#166534;font-size:13px;margin:0;">
              Please reach out to <a href="mailto:${esc(studentEmail)}" style="color:#166534;font-weight:600;">${esc(studentEmail)}</a> to provide the meeting link and any session details.
            </p>
          </div>
          <p style="color:#64748b;font-size:13px;margin:0;">
            Best regards,<br/>
            <strong style="color:#0b3c5d;">CAPHA Administration</strong>
          </p>
        `),
      });
    }
  } else {
    // Cancellation path — notify the student their booking was cancelled.
    await transporter.sendMail({
      from: `"CAPHA" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject: `Appointment Cancelled — ${sanitizeHeader(advisorName)} | ${date}`,
      html: wrap("#ef4444", `
        <h2 style="color:#0b3c5d;margin:0 0 6px;font-size:22px;font-weight:700;">Appointment Cancelled</h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 4px;">Dear ${esc(studentName)},</p>
        <p style="color:#64748b;font-size:14px;margin:0 0 8px;">
          We regret to inform you that your mentorship session with <strong style="color:#0b3c5d;">${esc(advisorName)}</strong> on ${esc(date)} at ${esc(time)} EST has been cancelled.
        </p>
        ${detailsBox(sessionRows)}
        <p style="color:#64748b;font-size:14px;margin:0 0 20px;">
          You are welcome to submit a new booking request at any time through the
          <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://capha.net"}/book" style="color:#328cc1;">CAPHA booking page</a>.
          We apologize for any inconvenience.
        </p>
        <p style="color:#64748b;font-size:13px;margin:0;">
          For further assistance, please contact us at
          <a href="mailto:${process.env.EMAIL_USER}" style="color:#328cc1;">${process.env.EMAIL_USER}</a>.
        </p>
        <p style="color:#64748b;font-size:13px;margin:16px 0 0;">
          Best regards,<br/>
          <strong style="color:#0b3c5d;">CAPHA Mentorship Team</strong>
        </p>
      `),
    });

    // Also notify the advisor so they know the session is off.
    if (advisorEmail) {
      await transporter.sendMail({
        from: `"CAPHA" <${process.env.EMAIL_USER}>`,
        to: advisorEmail,
        subject: `Session Cancelled — ${sanitizeHeader(studentName)} | ${date}`,
        html: wrap("#ef4444", `
          <h2 style="color:#0b3c5d;margin:0 0 6px;font-size:22px;font-weight:700;">Session Cancelled</h2>
          <p style="color:#64748b;font-size:14px;margin:0 0 4px;">Dear ${esc(advisorName)},</p>
          <p style="color:#64748b;font-size:14px;margin:0 0 8px;">
            The following mentorship session has been cancelled. The student has been notified.
          </p>
          ${detailsBox(advisorSessionRows)}
          <p style="color:#64748b;font-size:13px;margin:0;">
            Best regards,<br/>
            <strong style="color:#0b3c5d;">CAPHA Administration</strong>
          </p>
        `),
      });
    }
  }
}
