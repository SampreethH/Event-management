"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client/checkout";
import { Button } from "@/components/ui/Button";

export function TotpSetup() {
  const router = useRouter();
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!setup) {
    return (
      <Button
        onClick={async () => {
          const res = await postJson<{ secret: string; uri: string }>("/api/auth/totp/setup", {});
          if (res.ok) setSetup(res.data);
          else setError(res.error);
        }}
      >
        Set up authenticator app
      </Button>
    );
  }
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await postJson("/api/auth/totp/enable", { code });
        if (res.ok) router.refresh();
        else setError(res.error);
      }}
    >
      <p className="font-mono text-lg tracking-wider break-all text-champagne select-all">{setup.secret.match(/.{1,4}/g)?.join(" ")}</p>
      <a href={setup.uri} className="text-sm text-lavender-300 underline">
        Open in authenticator app
      </a>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="6-digit code"
        className="glass h-12 w-full rounded-2xl px-4 text-center font-display text-xl tracking-[0.4em] outline-none"
      />
      {error && <p className="text-sm text-tangerine-300">{error}</p>}
      <Button type="submit" disabled={code.length !== 6}>
        Enable 2-step verification
      </Button>
    </form>
  );
}
