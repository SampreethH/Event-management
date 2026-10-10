"use client";

import dynamic from "next/dynamic";

// WebGL is client-only; load the whole experience without SSR.
const FestoonExperience = dynamic(() => import("@/components/FestoonExperience"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#050608]" />,
});

export function ExperienceClient() {
  return <FestoonExperience />;
}
