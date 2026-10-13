"use client";

import type { ReactNode } from "react";

/** One labelled row of the Settings screen. */
export function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-white/5 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6 short:py-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="text-xs leading-snug text-white/60">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

/** A choice among a few options (segmented buttons). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-white/5 p-1" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            option.value === value ? "bg-hud text-slate-900" : "text-white/80 hover:bg-white/10"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition-colors ${checked ? "bg-hud" : "bg-white/20"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

/** 0..1 (or any range) slider with the value shown as a percentage or multiplier. */
export function Slider({
  value,
  onChange,
  label,
  min = 0,
  max = 1,
  step = 0.05,
  format = (current: number) => `${Math.round(current * 100)}%`,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
}) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-36 accent-cyan-300 sm:w-44"
      />
      <span className="w-12 text-right text-xs font-bold tabular-nums text-white/80">{format(value)}</span>
    </label>
  );
}
