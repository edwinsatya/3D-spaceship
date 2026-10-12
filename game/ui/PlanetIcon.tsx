import { useId } from "react";
import { BODIES, type BodyId } from "@/game/data/planets";

interface PlanetIconProps {
  id: BodyId;
  /** CSS px, or SVG user units when nested inside another SVG (with x/y). */
  size?: number;
  x?: number;
  y?: number;
  dimmed?: boolean;
}

/** Flat, gradient-shaded planet badge for the map, encyclopedia and toasts. */
export function PlanetIcon({ id, size = 48, x, y, dimmed = false }: PlanetIconProps) {
  const gradientId = useId();
  const body = BODIES[id];
  const [light, dark] = body.iconColors;
  const hasRing = id === "saturn" || id === "uranus";
  const tilt = id === "uranus" ? 80 : -18;
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="-1.3 -1.3 2.6 2.6"
      aria-hidden="true"
      className={dimmed ? "opacity-35 grayscale" : undefined}
    >
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="32%" r="75%">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
      </defs>
      {id === "sun" && <circle r="1.2" fill={light} opacity="0.25" />}
      {hasRing && (
        <ellipse rx="1.25" ry="0.32" fill="none" stroke={light} strokeOpacity="0.55" strokeWidth="0.12" transform={`rotate(${tilt})`} />
      )}
      <circle r={id === "sun" ? 0.95 : 0.8} fill={`url(#${gradientId})`} />
      {hasRing && (
        <path
          d="M -1.25 0 A 1.25 0.32 0 0 0 1.25 0"
          fill="none"
          stroke={light}
          strokeOpacity="0.85"
          strokeWidth="0.12"
          transform={`rotate(${tilt})`}
        />
      )}
    </svg>
  );
}
