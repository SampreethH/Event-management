import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { TotpSetup } from "@/components/dashboard/TotpSetup";
import { Glass } from "@/components/ui/Glass";
import { getCurrentUser } from "@/lib/auth/session";
import { withUser } from "@/lib/server/db";

export default async function SecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/security");
  const record = await withUser(user, (tx) => tx.user.findUnique({ where: { id: user.id }, select: { totpEnabledAt: true } }));

  return (
    <div className="mx-auto max-w-xl px-4 pt-32 sm:px-6">
      <Glass strong className="p-7">
        <ShieldCheck className="size-8 text-mint-300" />
        <h1 className="mt-4 font-display text-3xl font-bold">2-step verification</h1>
        {record?.totpEnabledAt ? (
          <p className="mt-3 text-mist-muted">
            On since {record.totpEnabledAt.toLocaleDateString("en-IN")}. Every sign-in asks for a one-time code and your authenticator.
          </p>
        ) : (
          <>
            <p className="mt-3 mb-6 text-mist-muted">Add an authenticator app so a stolen phone number alone can&apos;t open your account.</p>
            <TotpSetup />
          </>
        )}
      </Glass>
    </div>
  );
}
