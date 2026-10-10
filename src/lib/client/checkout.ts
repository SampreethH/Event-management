"use client";

import type { ClientPayment } from "@/lib/booking/gateways/types";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void };

let scriptPromise: Promise<void> | null = null;

function loadRazorpay(): Promise<void> {
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Couldn't load Razorpay"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Opens the right hosted checkout for a server-created payment.
 * Resolves "paid" once Razorpay's signature is verified server-side, or
 * "redirect" when the browser is leaving for Stripe Checkout.
 */
export async function openCheckout(payment: ClientPayment, brand = "Festoon"): Promise<"paid" | "dismissed" | "redirect"> {
  if (payment.provider === "STRIPE") {
    window.location.assign(payment.checkoutUrl);
    return "redirect";
  }
  await loadRazorpay();
  const Razorpay = (window as unknown as { Razorpay: RazorpayCtor }).Razorpay;
  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: payment.keyId,
      order_id: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      name: brand,
      description: payment.description,
      prefill: payment.prefill,
      theme: { color: "#F5D061", backdrop_color: "#050608" },
      modal: { ondismiss: () => resolve("dismissed") },
      handler: async (res: RazorpayResponse) => {
        const ok = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(res),
        });
        if (ok.ok) resolve("paid");
        else reject(new Error("We couldn't verify the payment. If you were charged, it will reconcile automatically."));
      },
    });
    rzp.on("payment.failed", () => resolve("dismissed"));
    rzp.open();
  });
}

export async function postJson<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string; data?: unknown }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, data: data as T };
  return { ok: false, status: res.status, error: (data as { error?: string }).error ?? "Something went wrong", data };
}
