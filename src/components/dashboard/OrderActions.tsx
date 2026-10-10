"use client";

import { Download, LoaderCircle, RotateCcw, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CartLine } from "@/lib/booking/schema";
import type { ClientPayment } from "@/lib/booking/gateways/types";
import { openCheckout, postJson } from "@/lib/client/checkout";
import { formatPaise } from "@/lib/domain/money";
import { useCart } from "@/stores/cart";
import { Button } from "@/components/ui/Button";

/** One-click re-order: refills the cart with the frozen box specs from a past order. */
export function ReorderButton({ lines }: { lines: CartLine[] }) {
  const router = useRouter();
  const replace = useCart((s) => s.replace);
  return (
    <Button
      variant="glass"
      size="sm"
      disabled={!lines.length}
      onClick={() => {
        replace(lines);
        router.push("/checkout");
      }}
    >
      <RotateCcw className="size-4" /> Re-order
    </Button>
  );
}

export function InvoiceLink({ orderId }: { orderId: string }) {
  return (
    <a href={`/api/orders/${orderId}/invoice`} className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm text-mist-muted hover:bg-ink/5 hover:text-mist">
      <Download className="size-4" /> Invoice
    </a>
  );
}

export function PayBalanceButton({ orderId, amount }: { orderId: string; amount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await postJson<{ payment: ClientPayment }>(`/api/orders/${orderId}/pay-balance`, { provider: "RAZORPAY" });
            if (!res.ok) return setError(res.error);
            if ((await openCheckout(res.data.payment)) === "paid") router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Payment failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Wallet className="size-4" />} Pay {formatPaise(amount)}
      </Button>
      {error && <p className="mt-1 text-xs text-tangerine-300">{error}</p>}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await postJson("/api/auth/logout", {});
        router.replace("/");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
