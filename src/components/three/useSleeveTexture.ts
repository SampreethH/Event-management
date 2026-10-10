"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mulberry32 } from "./capability";

/**
 * Paints the printed sleeve (colour, confetti pattern and the custom ribbon
 * text) onto a canvas texture. Avoids troika/CDN fonts entirely — it uses the
 * page's own display font from next/font.
 */
export function useSleeveTexture(color: string, accent: string, label: string): THREE.CanvasTexture | null {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Foil-like sheen band
    const sheen = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    sheen.addColorStop(0, "rgba(255,255,255,0.0)");
    sheen.addColorStop(0.45, "rgba(255,255,255,0.16)");
    sheen.addColorStop(0.55, "rgba(255,255,255,0.0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Confetti print, seeded so it doesn't reshuffle on every keystroke
    const rand = mulberry32(color.length * 977 + accent.charCodeAt(1));
    ctx.fillStyle = accent;
    for (let i = 0; i < 70; i++) {
      ctx.save();
      ctx.globalAlpha = 0.35 + rand() * 0.5;
      ctx.translate(rand() * canvas.width, rand() * canvas.height);
      ctx.rotate(rand() * Math.PI);
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 3 + rand() * 4, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.fillRect(-2, -8, 4, 16);
      ctx.restore();
    }

    // Label plate
    const text = label.trim() || "Festoon";
    const font = getComputedStyle(document.documentElement).getPropertyValue("--font-clash") || "sans-serif";
    ctx.fillStyle = "rgba(10,11,16,0.55)";
    ctx.fillRect(0, 88, canvas.width, 80);
    ctx.fillStyle = accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let size = 64;
    do {
      ctx.font = `700 ${size}px ${font}`;
      size -= 4;
    } while (ctx.measureText(text).width > canvas.width * 0.86 && size > 20);
    ctx.fillText(text, canvas.width / 2, 130);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [color, accent, label]);

  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}
