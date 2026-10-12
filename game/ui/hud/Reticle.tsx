"use client";

import { useEffect, useRef } from "react";
import { MOUSE } from "@/game/config/controls";

/**
 * Center marker (ship heading) plus a cursor ring that follows the mouse.
 * The ship steers towards the ring; a faint line shows the steering vector.
 */
export function Reticle({ showCursor }: { showCursor: boolean }) {
  const ring = useRef<HTMLDivElement>(null);
  const line = useRef<SVGLineElement>(null);

  useEffect(() => {
    if (!showCursor) return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      ring.current?.style.setProperty("transform", `translate(${event.clientX}px, ${event.clientY}px)`);
      if (line.current) {
        line.current.setAttribute("x1", String(cx));
        line.current.setAttribute("y1", String(cy));
        line.current.setAttribute("x2", String(event.clientX));
        line.current.setAttribute("y2", String(event.clientY));
        const reach = (Math.min(window.innerWidth, window.innerHeight) / 2) * MOUSE.fullDeflection;
        const deflection = Math.min(1, Math.hypot(event.clientX - cx, event.clientY - cy) / reach);
        line.current.style.opacity = String(deflection > MOUSE.deadzone ? 0.15 + deflection * 0.35 : 0);
      }
    };
    window.addEventListener("pointermove", onMove);
    document.body.style.cursor = "none";
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.body.style.cursor = "";
    };
  }, [showCursor]);

  return (
    <>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg width="44" height="44" viewBox="0 0 44 44" className="opacity-80" aria-hidden="true">
          <circle cx="22" cy="22" r="3" fill="#7df9ff" />
          <path d="M22 4v8M22 32v8M4 22h8M32 22h8" stroke="#7df9ff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      {showCursor && (
        <>
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            <line ref={line} stroke="#7df9ff" strokeWidth="1.5" strokeDasharray="4 6" style={{ opacity: 0 }} />
          </svg>
          <div ref={ring} className="absolute top-0 left-0" style={{ transform: "translate(-100px, -100px)" }}>
            <div className="h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-hud/90 shadow-[0_0_10px_rgba(125,249,255,0.6)]" />
          </div>
        </>
      )}
    </>
  );
}
