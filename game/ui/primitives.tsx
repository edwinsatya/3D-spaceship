"use client";

import { motion } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { audio } from "@/game/audio/audioManager";
import { StarIcon } from "./icons";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 shadow-[0_0_24px_rgba(125,249,255,0.45)] hover:from-cyan-300 hover:to-sky-400",
  secondary: "hud-panel text-white hover:border-cyan-300/70 hover:bg-cyan-400/10",
  ghost: "text-cyan-100/80 hover:text-white hover:bg-white/5",
};

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

/** Large, touch-friendly button with a click sound. */
export function GameButton({ variant = "primary", icon, className = "", children, onClick, ...props }: GameButtonProps) {
  return (
    <button
      type="button"
      className={`pointer-events-auto flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 py-3 short:min-h-10 short:px-4 short:py-2 font-display text-sm font-bold uppercase tracking-[0.12em] transition-[background,border-color,transform] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:text-base ${VARIANTS[variant]} ${className}`}
      onClick={(event) => {
        audio.play("click");
        onClick?.(event);
      }}
      {...props}
    >
      {icon && <span className="text-xl">{icon}</span>}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}

export function IconButton({ label, active, className = "", children, onClick, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`hud-panel pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl text-xl transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300 ${active ? "text-white" : "text-cyan-100/85"} ${className}`}
      onClick={(event) => {
        audio.play("click");
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

/** Timing of the result-screen star pop-in (seconds); sounds are scheduled to match. */
export const STAR_POP = { delay: 0.5, stagger: 0.35 } as const;

/** Three stars; `count` filled. Optional staggered pop-in animation. */
export function StarRow({
  count,
  size = "text-2xl",
  animate = false,
  label,
}: {
  count: number;
  size?: string;
  animate?: boolean;
  label?: string;
}) {
  return (
    <div className={`flex items-center gap-1 ${size}`} role="img" aria-label={label}>
      {[0, 1, 2].map((index) => {
        const filled = index < count;
        return (
          <motion.span
            key={index}
            initial={animate ? { scale: 0, rotate: -40, opacity: 0 } : false}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{
              delay: animate ? STAR_POP.delay + index * STAR_POP.stagger : 0,
              type: "spring",
              stiffness: 320,
              damping: 14,
            }}
            className={filled ? "text-star drop-shadow-[0_0_10px_rgba(255,216,77,0.75)]" : "text-white/20"}
          >
            <StarIcon filled={filled} />
          </motion.span>
        );
      })}
    </div>
  );
}

export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`hud-panel rounded-3xl ${className}`}>{children}</div>;
}
