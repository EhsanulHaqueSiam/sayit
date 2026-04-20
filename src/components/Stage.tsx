import { motion } from "motion/react";
import { Mic } from "lucide-react";
import { Keycap } from "./Keycap";
import type { Mode } from "@/types";
import type { AudioMeterApi } from "@/hooks/useAudioMeter";

interface Props {
  listening: boolean;
  spaceHeld: boolean;
  canDictate: boolean;
  mode: Mode;
  language: string;
  meter: AudioMeterApi;
  onToggle: () => void;
}

/**
 * Hero. The wordmark "Say." IS the primary button, but it previously had
 * no button affordance — users couldn't tell. The fix:
 *   1. A breathing italic pre-title above: "tap to speak" + mic icon.
 *   2. A persistent dotted underline under the wordmark.
 *   3. Strong hover state: scale, period glow, dashed frame fade-in.
 *   4. Focus ring for keyboard nav.
 *   5. Dropped the redundant "Click the word to toggle." footnote.
 */
export function Stage({
  listening,
  spaceHeld,
  canDictate,
  mode,
  language,
  meter,
  onToggle,
}: Props) {
  return (
    <section
      className={`relative flex flex-col items-center
                  pt-10 pb-12 md:pt-16 md:pb-16
                  ${listening ? "is-listening" : ""}`}
    >
      {/* Asymmetric editorial callouts floating at the corners */}
      <p
        className="hidden lg:block absolute top-10 left-8
                   side-note text-[15px] max-w-[180px] leading-snug rotate-[-1.5deg]"
        aria-hidden
      >
        Press &amp; hold,
        <br />
        words appear.
      </p>
      <p
        className="hidden lg:block absolute top-16 right-8
                   side-note text-[13px] text-right rotate-[1deg]
                   tabular font-mono uppercase tracking-[0.18em] not-italic"
        aria-hidden
      >
        v.0.1 · {language} · {mode === "ai" ? "AI" : "raw"}
      </p>

      {/* Thin editorial rule behind the wordmark */}
      <div
        aria-hidden
        className="absolute top-[50%] left-0 right-0 -translate-y-1/2
                   mx-auto w-[min(780px,72%)] h-px rule opacity-40"
      />

      {/* Pre-title — the annotation that makes Say. legibly interactive.
          Breathes gently up/down so the eye is drawn to it. */}
      <motion.div
        className="relative z-10 mb-3 md:mb-5 flex items-center gap-2
                   text-[var(--color-ink-faint)]"
        animate={canDictate && !listening ? { y: [0, -3, 0] } : { y: 0 }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      >
        <Mic size={14} strokeWidth={1.6} />
        <span className="font-display italic text-[15px] md:text-[17px] tracking-[0.01em]">
          tap to speak
        </span>
        <svg
          width="28"
          height="10"
          viewBox="0 0 28 10"
          fill="none"
          className="text-[var(--color-ink-faint)]"
        >
          <path
            d="M1 5 L24 5"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 3"
            strokeLinecap="round"
          />
          <path
            d="M20 1 L25 5 L20 9"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </motion.div>

      {/* Wordmark as the button */}
      <motion.button
        onClick={onToggle}
        initial={false}
        animate={{ scale: listening ? 1.012 : 1 }}
        whileHover={canDictate ? { scale: 1.018 } : undefined}
        whileTap={canDictate ? { scale: 0.985 } : undefined}
        transition={{ type: "spring", stiffness: 340, damping: 24 }}
        aria-pressed={listening}
        aria-label={listening ? "Stop dictation" : "Start dictation"}
        disabled={!canDictate}
        className="group relative z-10 bg-transparent cursor-pointer
                   text-[var(--color-ink)] px-6 py-3 rounded-[24px]
                   border border-transparent
                   hover:border-[color-mix(in_srgb,var(--color-ink-faint)_55%,transparent)]
                   hover:border-dashed
                   focus-visible:outline-none
                   focus-visible:border-[var(--color-accent)]
                   focus-visible:border-dashed
                   disabled:cursor-not-allowed disabled:opacity-40
                   transition-[border-color] duration-200"
      >
        <span className="wordmark wordmark-pulse block text-[clamp(120px,21vw,252px)]">
          Say
          <span
            className="text-[var(--color-accent)] not-italic inline-block
                       transition-transform duration-300 ease-out
                       group-hover:scale-110"
          >
            .
          </span>
        </span>

        {/* Always-visible dotted underline that brightens on hover —
            the tap-affordance users missed. */}
        <span
          aria-hidden
          className="absolute left-8 right-8 bottom-1 h-[2px]
                     bg-transparent
                     bg-[repeating-linear-gradient(to_right,var(--color-ink-faint)_0_3px,transparent_3px_7px)]
                     opacity-35
                     group-hover:opacity-75 group-hover:bg-[repeating-linear-gradient(to_right,var(--color-accent)_0_3px,transparent_3px_7px)]
                     transition-opacity duration-200"
        />

        {/* Sweep bar — only visible while actively listening */}
        <span
          aria-hidden
          className="wordmark-sweep absolute left-4 right-4 bottom-[-4px] h-[3px]
                     rounded-full bg-[var(--color-accent)] opacity-0"
          style={{
            opacity: listening ? 1 : 0,
            transform: listening ? undefined : "scaleX(0)",
          }}
        />
      </motion.button>

      {/* Ornament */}
      <div className="ornament mt-4 mb-5 w-full max-w-[520px] px-4">
        <span aria-hidden>§</span>
      </div>

      {/* Space keycap — secondary affordance */}
      <div className="flex items-center gap-4 flex-wrap justify-center">
        <span className="side-note text-[17px]">or hold</span>
        <Keycap
          pressed={listening || spaceHeld}
          disabled={!canDictate}
          label="Space"
          meter={meter}
        />
        <span className="side-note text-[17px]">to talk</span>
      </div>

      {/* Status line */}
      <div
        className="mt-7 flex items-center gap-3 text-[11px] tracking-[0.24em]
                   uppercase font-mono text-[var(--color-ink-faint)]"
      >
        <span
          className={`inline-flex items-center gap-2 ${
            listening ? "text-[var(--color-ink)]" : ""
          }`}
        >
          {listening && <span className="rec-dot" aria-hidden />}
          {listening ? "Listening" : canDictate ? "Ready" : "Unavailable"}
        </span>
        <span aria-hidden>/</span>
        <span className="lg:hidden">{language}</span>
        <span aria-hidden className="lg:hidden">/</span>
        <span>{mode === "ai" ? "AI polish" : "raw"}</span>
      </div>

      {/* Only shown in AI mode now — the Enter tip. The "click the word"
          footnote was redundant with the new pre-title above. */}
      {mode === "ai" && (
        <p className="mt-3 text-xs text-[var(--color-ink-faint)] text-center text-balance max-w-md">
          <kbd>Enter</kbd> in the transcript runs the active preset.
        </p>
      )}
    </section>
  );
}
