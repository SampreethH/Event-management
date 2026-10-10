import type { Metadata } from "next";
import { ExperienceClient } from "./ExperienceClient";

export const metadata: Metadata = {
  title: "Midnight Foil box",
  description: "Spin the Midnight Foil party box in 3D and peek at the treats inside.",
};

export default function ExperiencePage() {
  return <ExperienceClient />;
}
