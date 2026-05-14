"use server";

import nodemailer from "nodemailer";
import { requireAuth } from "@/lib/auth-guard";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const wrap = (body: string) => `
  <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#f4f8fb;padding:32px 16px;">
    <div style="background:#0b3c5d;border-radius:16px 16px 0 0;padding:22px 32px;">
      <span style="color:white;font-size:18px;font-weight:700;">CAPHA</span>
      <span style="color:rgba(255,255,255,0.4);font-size:13px;margin-left:10px;">Mentorship Program</span>
    </div>
    <div style="background:white;border-radius:0 0 16px 16px;padding:32px;">
      ${body}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px;">
      Central Asian Pre-Health Association · ${process.env.EMAIL_USER}
    </p>
  </div>
`;

export async function sendStatusEmail(params: {
  studentName: string;
  studentEmail: string;
  advisorName: string;
  date: string;
  time: string;
  status: "confirmed" | "cancelled";
}) {
  await requireAuth();

  const { studentName, studentEmail, advisorName, date, time, status } = params;

  if (status === "confirmed") {
    await transporter.sendMail({
      from: `"CAPHA" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject: `Your mentorship session is confirmed — ${esc(advisorName)}`,
      html: wrap(`
        <h2 style="color:#0b3c5d;margin:0 0 8px;font-size:20px;">Session Confirmed!</h2>
        <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">
          Great news, <strong style="color:#0b3c5d;">${esc(studentName)}</strong>! Your mentorship session has been confirmed.
        </p>
        <div style="background:#f4f8fb;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;width:100px;">Advisor</td><td style="color:#0b3c5d;font-weight:600;font-size:14px;">${esc(advisorName)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Date</td><td style="color:#0b3c5d;font-weight:600;font-size:14px;">${esc(date)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Time</td><td style="color:#0b3c5d;font-weight:600;font-size:14px;">${esc(time)} EST</td></tr>
          </table>
        </div>
        <p style="color:#6b7280;font-size:13px;">Your advisor will reach out with the Zoom link. Reply to this email if you have any questions.</p>
      `),
    });
  } else {
    await transporter.sendMail({
      from: `"CAPHA" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject: `Your CAPHA mentorship session — update`,
      html: wrap(`
        <h2 style="color:#0b3c5d;margin:0 0 8px;font-size:20px;">Session Cancelled</h2>
        <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">
          Hi <strong style="color:#0b3c5d;">${esc(studentName)}</strong>, your session with ${esc(advisorName)} on ${esc(date)} at ${esc(time)} EST has been cancelled.
        </p>
        <p style="color:#6b7280;font-size:14px;">You're welcome to rebook at any time through the
          <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://capha.net"}/book" style="color:#328cc1;">CAPHA booking page</a>.
          We apologize for any inconvenience.
        </p>
        <p style="color:#6b7280;font-size:13px;margin-top:16px;">Questions? Email us at
          <a href="mailto:${process.env.EMAIL_USER}" style="color:#328cc1;">${process.env.EMAIL_USER}</a>.
        </p>
      `),
    });
  }
}
