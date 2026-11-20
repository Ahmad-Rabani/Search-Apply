import nodemailer from "nodemailer";
import { config } from "../config.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";

export async function createNotification(opts: {
  userId: string;
  type?: "agent" | "match" | "tailor" | "apply" | "system";
  title: string;
  body?: string;
  href?: string;
  meta?: Record<string, unknown>;
  email?: boolean;
}) {
  const doc = await Notification.create({
    userId: opts.userId,
    type: opts.type || "system",
    title: opts.title,
    body: opts.body || "",
    href: opts.href || "",
    meta: opts.meta,
  });

  if (opts.email) {
    void sendEmailToUser(opts.userId, opts.title, opts.body || "").catch((err) => {
      console.warn("[notify:email]", err instanceof Error ? err.message : err);
    });
  }

  return doc;
}

async function sendEmailToUser(userId: string, subject: string, body: string) {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    return { skipped: true as const, reason: "SMTP not configured" };
  }

  const user = await User.findById(userId);
  if (!user?.email) return { skipped: true as const, reason: "no email" };

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  await transporter.sendMail({
    from: config.smtpFrom || config.smtpUser,
    to: user.email,
    subject: `[Search&Apply] ${subject}`,
    text: body,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#10201d">
      <h2 style="margin:0 0 8px">${escapeHtml(subject)}</h2>
      <p style="white-space:pre-wrap">${escapeHtml(body)}</p>
      <p style="margin-top:20px"><a href="${config.clientOrigin}">Open Search&Apply</a></p>
    </div>`,
  });

  return { skipped: false as const };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
