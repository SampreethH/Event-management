import "server-only";
import { env } from "@/lib/server/env";

export type DeliveryChannel = "SMS" | "WHATSAPP" | "EMAIL";

/**
 * Sends a one-time code. Phone codes go via the configured OTP_PROVIDER
 * (WhatsApp Cloud API authentication template, or Twilio SMS); email codes go
 * via Resend. `console` logs the code and is refused in production by env().
 */
export async function deliverOtp(channel: DeliveryChannel, to: string, code: string): Promise<void> {
  const e = env();

  if (e.OTP_PROVIDER === "console") {
    console.info(`[otp:${channel}] ${to.replace(/.(?=.{3})/g, "•")} → ${code}`);
    return;
  }

  if (channel === "EMAIL") {
    if (!e.RESEND_API_KEY || !e.EMAIL_FROM) throw new Error("Email OTP is not configured");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: e.EMAIL_FROM,
        to,
        subject: `${code} is your Festoon sign-in code`,
        text: `Your Festoon code is ${code}. It expires in 5 minutes. If you didn't request it, ignore this email.`,
      }),
    });
    if (!res.ok) throw new Error(`Email delivery failed (${res.status})`);
    return;
  }

  if (channel === "WHATSAPP" || e.OTP_PROVIDER === "whatsapp") {
    if (!e.WHATSAPP_CLOUD_TOKEN || !e.WHATSAPP_PHONE_NUMBER_ID) throw new Error("WhatsApp OTP is not configured");
    // Meta requires a pre-approved AUTHENTICATION template with a copy-code button.
    const res = await fetch(`https://graph.facebook.com/v21.0/${e.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${e.WHATSAPP_CLOUD_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ""),
        type: "template",
        template: {
          name: e.WHATSAPP_OTP_TEMPLATE,
          language: { code: "en" },
          components: [
            { type: "body", parameters: [{ type: "text", text: code }] },
            { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
          ],
        },
      }),
    });
    if (!res.ok) throw new Error(`WhatsApp delivery failed (${res.status})`);
    return;
  }

  if (!e.TWILIO_ACCOUNT_SID || !e.TWILIO_AUTH_TOKEN || !e.TWILIO_FROM) throw new Error("SMS OTP is not configured");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${e.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${e.TWILIO_ACCOUNT_SID}:${e.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: e.TWILIO_FROM, Body: `${code} is your Festoon code. Valid for 5 minutes.` }),
  });
  if (!res.ok) throw new Error(`SMS delivery failed (${res.status})`);
}
