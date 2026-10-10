import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type GlassProps = ComponentProps<"div"> & {
  as?: "div" | "section" | "article" | "aside" | "header";
  strong?: boolean;
  prism?: boolean;
};

/** Frosted acrylic surface with luminous hairline, grain, and optional prismatic rim. */
export function Glass({ as: Tag = "div", strong, prism, className, ...rest }: GlassProps) {
  return <Tag className={cn(strong ? "glass-strong" : "glass", "grain relative rounded-glass", prism && "glass-prism", className)} {...rest} />;
}
