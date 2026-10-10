import type { Paise } from "@/lib/domain/money";

export type ProviderName = "RAZORPAY" | "STRIPE";
export type PaymentPurpose = "full" | "deposit" | "balance" | "split";

export interface CreatePaymentInput {
  orderId: string;
  reference: string;
  amount: Paise;
  currency: string;
  purpose: PaymentPurpose;
  description: string;
  /** Where the browser lands after a hosted checkout. */
  returnPath: string;
  idempotencyKey: string;
  prefill?: { name?: string; contact?: string };
  metadata?: Record<string, string>;
}

/** What the browser needs to open checkout. Never contains secrets. */
export type ClientPayment =
  | {
      provider: "RAZORPAY";
      keyId: string;
      orderId: string;
      amount: Paise;
      currency: string;
      description: string;
      prefill?: { name?: string; contact?: string };
    }
  | { provider: "STRIPE"; checkoutUrl: string };

export interface PaymentGateway {
  readonly provider: ProviderName;
  create(input: CreatePaymentInput): Promise<{ providerRef: string; client: ClientPayment }>;
}

export class GatewayError extends Error {}
