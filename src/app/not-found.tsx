import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="grid min-h-[70svh] place-items-center px-4 pt-28 text-center">
      <div>
        <p className="font-display text-8xl font-semibold text-gradient-gold">404</p>
        <p className="mt-4 text-lg text-mist-muted">This party moved. Let&apos;s find you another one.</p>
        <ButtonLink href="/" className="mt-8">
          Back home
        </ButtonLink>
      </div>
    </div>
  );
}
