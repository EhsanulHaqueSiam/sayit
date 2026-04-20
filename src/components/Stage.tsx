import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
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
          Outer wrapper handles page-load entrance; inner motion handles the
          idle bobbing so the two transforms don't fight. */}
      <div className="enter enter--pre-title relative z-10 mb-3 md:mb-5" aria-hidden>
      <motion.div
        className="flex items-center gap-2 text-[var(--color-ink-faint)]"
        animate={canDictate && !listening ? { y: [0, -3, 0] } : { y: 0 }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
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
      </div>

      {/* Wordmark as the button — wrapped in a static div so the page-load
          entrance (transform animation) doesn't fight Motion's scale. */}
      <div className="enter enter--wordmark relative z-10">
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
        className="group relative bg-transparent cursor-pointer
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
        {/* Wordmark text — fades out into blur when listening starts, returns
            with an inkBleed-like ease-out-expo reveal on release. */}
        <motion.span
          className="wordmark wordmark-pulse block text-[clamp(120px,21vw,252px)]"
          initial={false}
          animate={
            listening
              ? { opacity: 0, filter: "blur(4px)", letterSpacing: "-0.02em" }
              : { opacity: 1, filter: "blur(0px)", letterSpacing: "-0.04em" }
          }
          transition={
            listening
              ? { duration: 0.14, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.36, ease: [0.16, 1, 0.3, 1], delay: 0.16 }
          }
        >
          Say
          <span
            className="text-[var(--color-accent)] not-italic inline-block
                       transition-transform duration-300 ease-out
                       group-hover:scale-110"
          >
            .
          </span>
        </motion.span>

        {/* Live audio-wave overlay — emerges from center on listening start */}
        <WordmarkWave meter={meter} active={listening} />

        {/* Always-visible dotted underline that brightens on hover —
            the tap-affordance users missed. Hides during listening to give
            the wave full stage. */}
        <motion.span
          aria-hidden
          className="absolute left-8 right-8 bottom-1 h-[2px]
                     bg-transparent
                     bg-[repeating-linear-gradient(to_right,var(--color-ink-faint)_0_3px,transparent_3px_7px)]
                     group-hover:bg-[repeating-linear-gradient(to_right,var(--color-accent)_0_3px,transparent_3px_7px)]"
          initial={false}
          animate={{ opacity: listening ? 0 : 0.35 }}
          whileHover={listening ? undefined : { opacity: 0.75 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
      </div>

      {/* Ornament */}
      <div className="enter enter--ornament ornament mt-4 mb-5 w-full max-w-[520px] px-4">
        <span aria-hidden>§</span>
      </div>

      {/* Space keycap — secondary affordance */}
      <div className="enter enter--keycap flex items-center gap-4 flex-wrap justify-center">
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
        className="enter enter--status mt-7 flex items-center gap-3 text-[11px] tracking-[0.24em]
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

/**
 * Signature interaction — the audio-wave morph.
 *
 * Seven accent-colored bars layered over the wordmark. When `active` becomes
 * true, bars emerge from center outward (staggered 24ms per step, 280ms ease-
 * out-expo). While active, each bar's scaleY is written directly by the audio
 * meter — zero React renders. On release, bars collapse center-out in reverse
 * (220ms ease-out-quart), then the wordmark text fades back in.
 *
 * Reduced-motion: bars fade uniformly over 180ms; audio-driven scaleY stays
 * (it reflects real audio, not decoration).
 */
const BAR_COUNT = 7;
const CENTER_IDX = (BAR_COUNT - 1) / 2;

function WordmarkWave({
  meter,
  active,
}: {
  meter: AudioMeterApi;
  active: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!active) return;
    const phases = Array.from({ length: BAR_COUNT }, (_, i) => i * 0.7);
    return meter.attach((level) => {
      const t = performance.now() / 120;
      for (let i = 0; i < barRefs.current.length; i++) {
        const bar = barRefs.current[i];
        if (!bar) continue;
        // Center-weighted envelope: middle bars have more range than edges
        const weight = 1 - (Math.abs(i - CENTER_IDX) / (CENTER_IDX + 1)) * 0.45;
        const shimmer = 0.88 + 0.12 * Math.sin(t + phases[i]);
        const h = 0.2 + level * shimmer * weight * (1 - 0.2);
        bar.style.transform = `scaleY(${Math.max(0.2, Math.min(1, h))})`;
      }
    });
  }, [meter, active]);

  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center
                 gap-[clamp(6px,1.1vw,14px)] pointer-events-none"
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const distance = Math.abs(i - CENTER_IDX);
        // On reveal, center fires first. On hide, edges fire first (reverse).
        const stagger = reducedMotion
          ? 0
          : active
            ? distance * 0.024
            : (CENTER_IDX - distance) * 0.018;
        return (
          <motion.span
            key={i}
            initial={false}
            animate={{ opacity: active ? 1 : 0 }}
            transition={{
              duration: reducedMotion ? 0.18 : active ? 0.28 : 0.22,
              delay: stagger,
              ease: active ? [0.16, 1, 0.3, 1] : [0.22, 1, 0.36, 1],
            }}
            className="flex items-center justify-center"
            style={{
              width: "clamp(7px, 1.1vw, 14px)",
              height: "58%",
            }}
          >
            <span
              ref={(el) => {
                barRefs.current[i] = el;
              }}
              className="block w-full h-full rounded-full"
              style={{
                background: "var(--color-accent)",
                transformOrigin: "center",
                transform: "scaleY(0.2)",
                transition: "transform 60ms linear",
                willChange: "transform",
              }}
            />
          </motion.span>
        );
      })}
    </div>
  );
}
