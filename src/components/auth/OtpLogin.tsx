"use client";

import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { postJson } from "@/lib/client/checkout";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";

type Step = "identify" | "otp" | "totp" | "enroll";

const REASONS: Record<string, string> = {
  checkout: "Verify your number to lock in your slot. Your cart is saved.",
  save: "Verify to save designs to My Celebrations.",
};

/** Only same-site relative paths are honoured as post-login redirects. */
function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function OtpLogin({ next, reason }: { next?: string; reason?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState("");
  const [channel, setChannel] = useState<"WHATSAPP" | "SMS">("WHATSAPP");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [enroll, setEnroll] = useState<{ secret: string; uri: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEmail = identifier.includes("@");

  const finish = () => {
    router.replace(safeNext(next));
    router.refresh();
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const request = (e?: FormEvent) => {
    e?.preventDefault();
    return run(async () => {
      const res = await postJson<{ challengeId: string }>("/api/auth/otp/request", { identifier, channel: isEmail ? undefined : channel });
      if (!res.ok) return setError(res.error);
      setChallengeId(res.data.challengeId);
      setCode("");
      setStep("otp");
    });
  };

  const verify = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const res = await postJson<{ next: "done" | "totp" | "enroll-totp" }>("/api/auth/otp/verify", { challengeId, code, identifier });
      if (!res.ok) return setError(res.error);
      setCode("");
      if (res.data.next === "done") return finish();
      if (res.data.next === "totp") return setStep("totp");
      const setup = await postJson<{ secret: string; uri: string }>("/api/auth/totp/setup", {});
      if (!setup.ok) return setError(setup.error);
      setEnroll(setup.data);
      setStep("enroll");
    });
  };

  const verifyTotp = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const res = await postJson(step === "enroll" ? "/api/auth/totp/enable" : "/api/auth/totp/verify", { code });
      if (!res.ok) return setError(res.error);
      finish();
    });
  };

  const codeInput = (
    <input
      autoFocus
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="\d{6}"
      maxLength={6}
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className="glass h-16 w-full rounded-2xl text-center font-display text-3xl font-bold tracking-[0.5em] outline-none focus:border-champagne/60"
      aria-label="6-digit code"
    />
  );

  return (
    <Glass strong prism className="mx-auto w-full max-w-md p-7 sm:p-9">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-champagne/15 text-champagne">
          {step === "totp" || step === "enroll" ? <KeyRound className="size-5" /> : <ShieldCheck className="size-5" />}
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">
            {step === "identify" ? "Sign in" : step === "otp" ? "Enter your code" : step === "totp" ? "Authenticator code" : "Set up 2-step verification"}
          </h1>
          <p className="text-sm text-mist-muted">
            {step === "identify" && (reason ? REASONS[reason] : "No passwords — just a one-time code.")}
            {step === "otp" && `Sent to ${identifier}. Valid for 5 minutes.`}
            {step === "totp" && "Open your authenticator app for the current code."}
            {step === "enroll" && "Staff accounts require an authenticator app."}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
          {step === "identify" && (
            <form onSubmit={request} className="space-y-4">
              <input
                autoFocus
                required
                autoComplete="username"
                placeholder="Mobile number or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="glass h-14 w-full rounded-2xl px-4 outline-none placeholder:text-mist-faint focus:border-champagne/60"
              />
              {!isEmail && (
                <div className="flex gap-2 rounded-full bg-black/30 p-1 text-sm" role="radiogroup" aria-label="Send code via">
                  {(["WHATSAPP", "SMS"] as const).map((c) => (
                    <button key={c} type="button" role="radio" aria-checked={channel === c} onClick={() => setChannel(c)} className={cn("flex-1 rounded-full py-2 font-medium", channel === c ? "bg-white/10" : "text-mist-faint")}>
                      {c === "WHATSAPP" ? "WhatsApp" : "SMS"}
                    </button>
                  ))}
                </div>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={busy || identifier.trim().length < 5}>
                {busy ? <LoaderCircle className="size-5 animate-spin" /> : "Send code"}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verify} className="space-y-4">
              {codeInput}
              <Button type="submit" size="lg" className="w-full" disabled={busy || code.length !== 6}>
                {busy ? <LoaderCircle className="size-5 animate-spin" /> : "Verify"}
              </Button>
              <div className="flex justify-between text-sm text-mist-muted">
                <button type="button" onClick={() => setStep("identify")} className="hover:text-mist">
                  Change number
                </button>
                <button type="button" onClick={() => request()} disabled={busy} className="hover:text-mist">
                  Resend code
                </button>
              </div>
            </form>
          )}

          {(step === "totp" || step === "enroll") && (
            <form onSubmit={verifyTotp} className="space-y-4">
              {step === "enroll" && enroll && (
                <div className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm">
                  <p className="text-mist-muted">Add this key to Google Authenticator, 1Password or Authy, then enter the 6-digit code.</p>
                  <p className="font-mono text-base tracking-wider break-all text-champagne select-all">{enroll.secret.match(/.{1,4}/g)?.join(" ")}</p>
                  <a href={enroll.uri} className="inline-block text-xs text-lavender-300 underline">
                    Open in authenticator app
                  </a>
                </div>
              )}
              {codeInput}
              <Button type="submit" size="lg" className="w-full" disabled={busy || code.length !== 6}>
                {busy ? <LoaderCircle className="size-5 animate-spin" /> : step === "enroll" ? "Enable & continue" : "Verify"}
              </Button>
            </form>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p className="mt-4 text-center text-sm text-tangerine-300" role="alert">
          {error}
        </p>
      )}
    </Glass>
  );
}
