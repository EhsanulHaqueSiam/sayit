import { motion } from "motion/react";
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
 * Hero. The wordmark "Say." is clickable, and a prominent keycap underneath
 * teaches the hold-Space affordance. Editorial ornaments frame the whole
 * composition.
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
                  pt-14 pb-12 md:pt-20 md:pb-16
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
        className="absolute top-[46%] left-0 right-0 -translate-y-1/2
                   mx-auto w-[min(780px,72%)] h-px rule opacity-50"
      />

      {/* Wordmark as the button */}
      <motion.button
        onClick={onToggle}
        layout
        initial={false}
        animate={{ scale: listening ? 1.012 : 1 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        aria-pressed={listening}
        aria-label={listening ? "Stop dictation" : "Start dictation"}
        disabled={!canDictate}
        className={`group relative z-10 bg-transparent border-0 cursor-pointer
                    text-[var(--color-ink)] px-4 py-2
                    disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="wordmark wordmark-pulse block text-[clamp(120px,21vw,252px)]">
          Say<span className="text-[var(--color-accent)] not-italic">.</span>
        </span>
        <span
          aria-hidden
          className="wordmark-sweep absolute left-4 right-4 bottom-2 h-[3px]
                     rounded-full bg-[var(--color-accent)] opacity-0"
          style={{
            opacity: listening ? 1 : 0,
            transform: listening ? undefined : "scaleX(0)",
          }}
        />
      </motion.button>

      {/* Ornament + keycap instruction */}
      <div className="ornament mt-2 mb-5 w-full max-w-[520px] px-4">
        <span aria-hidden>§</span>
      </div>

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

      <p className="mt-3 text-sm text-[var(--color-ink-faint)] text-center text-balance max-w-md">
        Click the word to toggle.
        {mode === "ai" && (
          <>
            {" "}
            <kbd>Enter</kbd> in the transcript runs the active preset.
          </>
        )}
      </p>
    </section>
  );
}
