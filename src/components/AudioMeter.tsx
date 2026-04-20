import { useEffect, useRef } from "react";
import type { AudioMeterApi } from "@/hooks/useAudioMeter";
import { cn } from "@/lib/utils";

interface Props {
  meter: AudioMeterApi;
  bars?: number;
  className?: string;
  /** Baseline bar height when silence (0–1). */
  idle?: number;
}

/**
 * A row of vertical bars that respond to the mic stream in real-time.
 *
 * Updates happen via direct `style.transform` writes inside the hook's
 * rAF loop — zero React renders while speaking.
 */
export function AudioMeter({ meter, bars = 5, className, idle = 0.22 }: Props) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    // Baseline phase offsets for a gentle "dancing" visual even at constant
    // input — each bar lags slightly to create motion.
    const phases = Array.from({ length: bars }, (_, i) => i * 0.8);

    return meter.attach((level) => {
      const t = performance.now() / 140;
      for (let i = 0; i < refs.current.length; i++) {
        const bar = refs.current[i];
        if (!bar) continue;
        const shimmer = 0.85 + 0.15 * Math.sin(t + phases[i]);
        const h = idle + level * shimmer * (1 - idle);
        bar.style.transform = `scaleY(${Math.max(idle, h)})`;
      }
    });
  }, [meter, bars, idle]);

  return (
    <div
      className={cn("flex items-end gap-[3px]", className)}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="w-[3px] h-full rounded-full bg-current origin-bottom will-change-transform"
          style={{
            transform: `scaleY(${idle})`,
            transition: "transform 60ms linear",
          }}
        />
      ))}
    </div>
  );
}
