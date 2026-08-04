import { env, isSendGridConfigured } from "@/lib/env";
import { db } from "@/lib/db";
import type { NotificationType } from "@prisma/client";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: NotificationType;
  tenantId?: string | null;
  userId?: string | null;
}

let sgMailClient: typeof import("@sendgrid/mail") | null = null;

async function getSendGridClient() {
  if (!sgMailClient) {
    const mod = await import("@sendgrid/mail");
    mod.default.setApiKey(env.SENDGRID_API_KEY!);
    sgMailClient = mod.default as unknown as typeof import("@sendgrid/mail");
  }
  return sgMailClient;
}

/**
 * Sends an email via SendGrid when configured. When it isn't (e.g. during
 * local development, or because the SendGrid subscription has lapsed), the
 * email content — including OTP codes — is printed to the server console
 * instead, so the app keeps working end-to-end without erroring.
 *
 * Every attempt is also logged to the Notification table for auditing,
 * regardless of which path was used.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const { to, subject, html, text, type, tenantId = null, userId = null } = input;

  if (!isSendGridConfigured) {
    console.log(
      [
        "📧  [DEV EMAIL FALLBACK — SendGrid not configured]",
        `To:      ${to}`,
        `Subject: ${subject}`,
        "----------------------------------------------------",
        text,
        "----------------------------------------------------",
      ].join("\n")
    );

    await db.notification.create({
      data: {
        tenantId,
        userId,
        channel: "EMAIL",
        type,
        status: "SKIPPED_NO_PROVIDER",
        to,
        subject,
        body: text,
      },
    });
    return;
  }

  try {
    const sgMail = await getSendGridClient();
    await sgMail.send({
      to,
      from: env.SENDGRID_FROM_EMAIL!,
      subject,
      html,
      text,
    });

    await db.notification.create({
      data: {
        tenantId,
        userId,
        channel: "EMAIL",
        type,
        status: "SENT",
        to,
        subject,
        body: text,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown SendGrid error";
    console.error("❌ SendGrid send failed, falling back to console log:", message);
    console.log(`📧  [EMAIL — SEND FAILED, CONTENT BELOW]\nTo: ${to}\nSubject: ${subject}\n${text}`);

    await db.notification.create({
      data: {
        tenantId,
        userId,
        channel: "EMAIL",
        type,
        status: "FAILED",
        to,
        subject,
        body: text,
        errorMessage: message,
      },
    });
  }
}

export async function sendOtpEmail(params: {
  to: string;
  code: string;
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "LOGIN";
  userId: string;
  tenantId?: string | null;
}) {
  const purposeCopy: Record<string, { subject: string; intro: string }> = {
    EMAIL_VERIFICATION: {
      subject: "Verify your Queueva account",
      intro: "Use this code to verify your email address:",
    },
    PASSWORD_RESET: {
      subject: "Reset your Queueva password",
      intro: "Use this code to reset your password:",
    },
    LOGIN: {
      subject: "Your Queueva login code",
      intro: "Use this code to finish logging in:",
    },
  };
  const copy = purposeCopy[params.purpose];

  await sendEmail({
    to: params.to,
    subject: copy.subject,
    text: `${copy.intro}\n\n${params.code}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>${copy.intro}</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${params.code}</p><p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
    type: "OTP_VERIFICATION",
    userId: params.userId,
    tenantId: params.tenantId,
  });
}

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  shopName: string;
  userId: string;
  tenantId: string;
}) {
  await sendEmail({
    to: params.to,
    subject: `Welcome to Queueva, ${params.shopName}!`,
    text: `Hi ${params.name},\n\nYour shop "${params.shopName}" is set up on Queueva. You can now add services, invite staff, and start taking bookings.\n\n— The Queueva team`,
    html: `<p>Hi ${params.name},</p><p>Your shop "<strong>${params.shopName}</strong>" is set up on Queueva. You can now add services, invite staff, and start taking bookings.</p><p>— The Queueva team</p>`,
    type: "WELCOME",
    userId: params.userId,
    tenantId: params.tenantId,
  });
}

export async function sendStaffInviteEmail(params: {
  to: string;
  name: string;
  shopName: string;
  shopLoginUrl: string;
  tempPassword: string;
  userId: string;
  tenantId: string;
}) {
  await sendEmail({
    to: params.to,
    subject: `You've been added to ${params.shopName} on Queueva`,
    text: `Hi ${params.name},\n\nYou've been added as staff at "${params.shopName}" on Queueva.\n\nLog in at: ${params.shopLoginUrl}\nEmail: ${params.to}\nTemporary password: ${params.tempPassword}\n\nPlease log in and change your password soon.\n\n— The Queueva team`,
    html: `<p>Hi ${params.name},</p><p>You've been added as staff at "<strong>${params.shopName}</strong>" on Queueva.</p><p>Log in at: <a href="${params.shopLoginUrl}">${params.shopLoginUrl}</a><br/>Email: ${params.to}<br/>Temporary password: <strong>${params.tempPassword}</strong></p><p>Please log in and change your password soon.</p><p>— The Queueva team</p>`,
    type: "WELCOME",
    userId: params.userId,
    tenantId: params.tenantId,
  });
}

function formatApptTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

export async function sendAppointmentConfirmationEmail(params: {
  to: string;
  clientName: string;
  shopName: string;
  serviceName: string;
  startAt: Date;
  timeZone: string;
  userId: string;
  tenantId: string;
}) {
  const when = formatApptTime(params.startAt, params.timeZone);
  await sendEmail({
    to: params.to,
    subject: `Booking confirmed: ${params.serviceName} at ${params.shopName}`,
    text: `Hi ${params.clientName},\n\nYour booking is confirmed:\n\n${params.serviceName}\n${when}\nat ${params.shopName}\n\nSee you then!`,
    html: `<p>Hi ${params.clientName},</p><p>Your booking is confirmed:</p><p><strong>${params.serviceName}</strong><br/>${when}<br/>at ${params.shopName}</p><p>See you then!</p>`,
    type: "APPOINTMENT_CONFIRMATION",
    userId: params.userId,
    tenantId: params.tenantId,
  });
}

export async function sendAppointmentCanceledEmail(params: {
  to: string;
  clientName: string;
  shopName: string;
  serviceName: string;
  startAt: Date;
  timeZone: string;
  userId: string;
  tenantId: string;
}) {
  const when = formatApptTime(params.startAt, params.timeZone);
  await sendEmail({
    to: params.to,
    subject: `Booking canceled: ${params.serviceName} at ${params.shopName}`,
    text: `Hi ${params.clientName},\n\nYour booking has been canceled:\n\n${params.serviceName}\n${when}\nat ${params.shopName}\n\nYou can book a new time anytime.`,
    html: `<p>Hi ${params.clientName},</p><p>Your booking has been canceled:</p><p><strong>${params.serviceName}</strong><br/>${when}<br/>at ${params.shopName}</p><p>You can book a new time anytime.</p>`,
    type: "APPOINTMENT_CANCELED",
    userId: params.userId,
    tenantId: params.tenantId,
  });
}

export async function sendAppointmentReminderEmail(params: {
  to: string;
  clientName: string;
  shopName: string;
  serviceName: string;
  startAt: Date;
  timeZone: string;
  userId: string;
  tenantId: string;
}) {
  const when = formatApptTime(params.startAt, params.timeZone);
  await sendEmail({
    to: params.to,
    subject: `Reminder: ${params.serviceName} at ${params.shopName}`,
    text: `Hi ${params.clientName},\n\nJust a reminder about your upcoming booking:\n\n${params.serviceName}\n${when}\nat ${params.shopName}\n\nSee you soon!`,
    html: `<p>Hi ${params.clientName},</p><p>Just a reminder about your upcoming booking:</p><p><strong>${params.serviceName}</strong><br/>${when}<br/>at ${params.shopName}</p><p>See you soon!</p>`,
    type: "APPOINTMENT_REMINDER",
    userId: params.userId,
    tenantId: params.tenantId,
  });
}
