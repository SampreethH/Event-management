import { EggOff, Leaf, Nut, WheatOff } from "lucide-react";
import type { DietaryBadges as Badges } from "@/lib/domain/box";
import { cn } from "@/lib/cn";

/** Live dietary chips. Inactive badges stay visible but dimmed so changes are noticeable. */
export function DietaryBadges({ badges, className }: { badges: Badges; className?: string }) {
  const items = [
    { on: badges.eggless, label: "100% Eggless", Icon: EggOff, tone: "text-mint-300 border-mint/40 bg-mint/10 shadow-glow-mint" },
    { on: badges.vegan, label: "Vegan", Icon: Leaf, tone: "text-mint-300 border-mint/40 bg-mint/10" },
    { on: badges.glutenFree, label: "Gluten-free", Icon: WheatOff, tone: "text-lavender-300 border-lavender/40 bg-lavender/10" },
  ];
  return (
    <ul className={cn("flex flex-wrap gap-2 font-sub", className)} aria-label="Dietary information">
      {items.map(({ on, label, Icon, tone }) => (
        <li
          key={label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-300",
            on ? tone : "border-ink/10 text-mist-faint line-through decoration-ink/20",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </li>
      ))}
      {badges.containsNuts && (
        <li
          className="inline-flex items-center gap-1.5 rounded-full border border-tangerine/50 bg-tangerine/15 px-3 py-1 text-xs font-semibold text-tangerine-300"
          title={`Contains nuts: ${badges.nutSources.join(", ")}`}
        >
          <Nut className="size-3.5" aria-hidden />
          Nut alert
        </li>
      )}
    </ul>
  );
}
