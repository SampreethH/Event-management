"use client";

import { Minus, Plus } from "lucide-react";

export function Stepper({ value, onChange, min = 1, max = 1000, step = 1, label }: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="glass inline-flex h-12 items-center rounded-full p-1" role="group" aria-label={label}>
      <button type="button" className="grid size-10 place-items-center rounded-full hover:bg-white/10" onClick={() => onChange(clamp(value - step))} aria-label={`Decrease ${label}`}>
        <Minus className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        className="w-16 bg-transparent text-center font-display text-lg font-bold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        aria-label={label}
      />
      <button type="button" className="grid size-10 place-items-center rounded-full hover:bg-white/10" onClick={() => onChange(clamp(value + step))} aria-label={`Increase ${label}`}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}
