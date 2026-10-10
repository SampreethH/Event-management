import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Festoon — Party-in-a-Box",
    short_name: "Festoon",
    description: "Design party boxes in 3D, SOS kits in 90 minutes, split the bill with friends.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050608",
    theme_color: "#050608",
    categories: ["food", "lifestyle", "shopping"],
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "SOS express kit", url: "/sos" },
      { name: "Build a box", url: "/build" },
    ],
  };
}
