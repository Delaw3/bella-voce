import nodemailer from "nodemailer";
import type { SendMailOptions } from "nodemailer";
import path from "path";
import { buildWaitlistEmailTemplate } from "@/templates/waitlist-email-template";

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: SendMailOptions["attachments"];
};

type WaitlistMailPayload = {
  to: string;
  firstName: string;
  registrationId: string;
};

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

function ensureMailCredentials() {
  if (!emailUser || !emailPass) {
    throw new Error("Missing EMAIL_USER or EMAIL_PASS. Configure them in your environment.");
  }
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

export async function sendMail({ to, subject, text, html, attachments }: MailPayload) {
  ensureMailCredentials();

  return transporter.sendMail({
    from: `"Bella Voce Choir" <${emailUser}>`,
    to,
    subject,
    text,
    html,
    textEncoding: "base64",
    attachments,
  });
}

export async function sendWaitlistRegistrationMail({
  to,
  firstName,
  registrationId,
}: WaitlistMailPayload) {
  const template = buildWaitlistEmailTemplate({ firstName, registrationId });

  return sendMail({
    to,
    subject: template.subject,
    text: template.text,
    html: template.html,
    attachments: [
      {
        filename: "bella-voce-logo.png",
        path: path.join(process.cwd(), "public", "images", "bella-voce-logo.png"),
        cid: "bella-voce-logo",
      },
    ],
  });
}
