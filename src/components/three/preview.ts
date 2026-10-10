import type { BoxSpec } from "@/lib/domain/box";
import { CATALOG_BY_ID } from "@/lib/domain/catalog";
import type { PreviewItem } from "./PartyItem";

/** Maps a box spec to the 3D props shown inside the preview box. */
export function toPreviewItems(spec: Pick<BoxSpec, "items">): PreviewItem[] {
  return Object.keys(spec.items).flatMap((id): PreviewItem[] => {
    const item = CATALOG_BY_ID.get(id);
    if (!item) return [];
    switch (item.category) {
      case "snack":
        return [{ kind: "snack", color: item.color }];
      case "cake":
        return [{ kind: "cake", color: item.color }];
      case "confectionery":
        return [{ kind: id.includes("macaron") ? "macaron" : "tin", color: item.color }];
      case "favor":
        return [{ kind: "gift", color: item.color, accent: "#FF5E5B" }];
      default:
        return [];
    }
  });
}
