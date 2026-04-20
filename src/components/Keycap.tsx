import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { AudioMeter } from "./AudioMeter";
import type { AudioMeterApi } from "@/hooks/useAudioMeter";

interface Props {
  pressed: boolean;
  disabled?: boolean;
  label?: string;
  size?: "md" | "lg";
  /** Optional live audio meter — when provided, drives the in-keycap vis. */
  meter?: AudioMeterApi;
}

/**
 * An embossed "physical" keycap. Pulses a dashed hint ring while idle to
 * teach the user that Space is the primary affordance; depresses with a soft
 * spring + waveform when held.
 */
export function Keycap({ pressed, disabled, label = "Space", size = "lg", meter }: Props) {
  const width = size === "lg" ? "min-w-[180px]" : "min-w-[120px]";

  return (
    <div className={cn("relative inline-flex flex-col items-center", disabled && "opacity-40")}>
      {/* pulsing hint ring (only when idle + enabled) */}
      {!pressed && !disabled && (
        <span
          aria-hidden
          className="absolute inset-[-10px] rounded-2xl pointer-events-none
                     border border-dashed border-[var(--color-ink-faint)]/40
                     animate-[hintRing_3.6s_ease-in-out_infinite]"
        />
      )}

      <motion.div
        role="presentation"
        animate={
          pressed
            ? { y: 3, scale: 0.985 }
            : { y: 0, scale: 1 }
        }
        transition={{ type: "spring", stiffness: 500, damping: 26 }}
        className={cn(
          "relative inline-flex items-center justify-center gap-3 px-6 py-3",
          width,
          "rounded-xl font-mono tracking-[0.22em] uppercase text-[13px] font-semibold",
          "border border-[var(--color-line)]",
          "transition-colors duration-150",
          pressed
            ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] border-[var(--color-accent)] shadow-[0_0_0_0_transparent,inset_0_1px_3px_rgba(0,0,0,0.2)]"
            : "bg-gradient-to-b from-[var(--color-paper-2)] to-[var(--color-paper-3)] text-[var(--color-ink-dim)] shadow-[0_3px_0_0_var(--color-line),inset_0_-1px_0_color-mix(in_srgb,var(--color-ink)_5%,transparent)]",
        )}
      >
        {/* the ⎵ glyph */}
        <span className="text-[15px] leading-none" aria-hidden>
          ⎵
        </span>
        <span>{label}</span>
        {pressed &&
          (meter ? (
            <AudioMeter meter={meter} className="h-[14px] ml-1" bars={5} />
          ) : (
            <Waveform />
          ))}
      </motion.div>
    </div>
  );
}

function Waveform() {
  return (
    <div className="flex items-end gap-[3px] h-[14px] ml-1" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[2px] bg-current rounded-full origin-bottom"
          style={{
            height: "100%",
            animation: `wave 900ms ease-in-out infinite`,
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}
