import { AnimatePresence, motion } from "motion/react";
import { Mic } from "lucide-react";
import { AudioMeter } from "./AudioMeter";
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

const STAGE_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Hero / Focus switch. Not listening → full wordmark stage. Listening →
 * compact focus strip so the transcript can fill the viewport.
 */
export function Stage(props: Props) {
  // Dropped `mode="wait"` so both the full stage and focus strip can be
  // mounted briefly during the transition. This lets Motion's layoutId
  // morph the "Say." wordmark as a shared element between them — the
  // same glyph travels from hero-center at 252px down to the focus
  // strip at 40px, carrying the user's eye across the change.
  //
  // Anticipation: also swap when Space is just *held*, not only when
  // recognition has confirmed. The engine start can lag 10–100ms after
  // the physical key repeat — that gap is enough to make hold-Space feel
  // snappy. Starting the morph on `spaceHeld` eliminates the stall, and
  // the audio wave simply sits at idle scale for the ~50ms before the
  // meter catches up.
  const inFocusMode = props.listening || props.spaceHeld;
  return (
    <section className="relative">
      <AnimatePresence initial={false}>
        {inFocusMode ? (
          <FocusStrip key="focus" {...props} />
        ) : (
          <FullStage key="full" {...props} />
        )}
      </AnimatePresence>
    </section>
  );
}

// Strong ease-out — matches the --ease-out-strong CSS variable so the
// whole app speaks one motion language.
const CHILD_EXIT_EASE = [0.23, 1, 0.32, 1] as const;
const CHILD_EXIT_DUR = 0.2;

/** Per-child exit: fade out + 4px up-drift, staggered by `delay` seconds.
 *  `initial={false}` means Motion won't play an entry (CSS .enter--*
 *  handles first mount; coming back from focus mode also re-fires the
 *  CSS cascade because the wrapper remounts). Tighter timing so the
 *  stage clears BEFORE the wordmark's spring settles — the glyph then
 *  travels through a quiet field for its final ~230ms. */
const childExit = (delay: number) => ({
  initial: false as const,
  exit: {
    opacity: 0,
    transform: "translateY(-4px)",
    transition: { duration: CHILD_EXIT_DUR, delay, ease: CHILD_EXIT_EASE },
  },
});

function FullStage({
  listening,
  spaceHeld,
  canDictate,
  mode,
  language,
  meter,
  onToggle,
}: Props) {
  // No opacity fade on the wrapper — each non-wordmark child handles
  // its own fade so the wordmark span (layoutId) is never fighting an
  // inherited parent-opacity fade during its morph. The empty `exit`
  // keeps the wrapper in AnimatePresence's exit-tracking set so it
  // waits for all descendant child exits before unmounting.
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ transition: { when: "afterChildren", duration: 0 } }}
      transition={{
        duration: 0.5,
        ease: STAGE_EASE,
        delay: listening ? 0 : 0.12,
      }}
      className={`relative flex flex-col items-center
                  pt-10 pb-12 md:pt-16 md:pb-16
                  ${listening ? "is-listening" : ""}`}
    >
      {/* Thin editorial rule behind the wordmark */}
      <motion.div
        {...childExit(0.02)}
        aria-hidden
        className="absolute top-[50%] left-0 right-0 -translate-y-1/2
                   mx-auto w-[min(780px,72%)] h-px rule opacity-40"
      />

      {/* Pre-title — the annotation that makes Say. legibly interactive.
          Outer wrapper handles page-load entrance; inner motion handles the
          idle bobbing so the two transforms don't fight. */}
      <motion.div
        {...childExit(0)}
        className="enter enter--pre-title relative z-10 mb-3 md:mb-5"
        aria-hidden
      >
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
      </motion.div>

      {/* Wordmark as the button — wrapped in a static div so the page-load
          entrance (transform animation) doesn't fight Motion's scale.
          NOTE: no exit animation on this wrapper. The span inside uses
          layoutId to morph to the focus strip — it must stay at full
          opacity through the transition for the shared-element handoff
          to feel premium. */}
      <div className="enter enter--wordmark relative z-10">
      <motion.button
        onClick={onToggle}
        initial={false}
        whileHover={canDictate ? { scale: 1.018 } : undefined}
        whileTap={canDictate ? { scale: 0.97 } : undefined}
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
        {/* Wordmark text — crossfades out upward when listening starts.
            We tried layoutId for the shared-element morph, but Motion
            animates size via transform: scale(), and at a ~6.3× font-size
            delta (252px → 40px) the text rasters stretch to catastrophic
            blur. Native font rendering requires rasters at each target
            size — so the big and small wordmarks are separate elements
            that crossfade in reverse directions (big fades up and out,
            small fades in from below) to preserve the directional feel
            without the blur artifact. */}
        <motion.span
          className="wordmark wordmark-pulse block text-[clamp(120px,21vw,252px)]"
          initial={false}
          exit={{
            opacity: 0,
            transform: "translateY(-24px) scale(0.96)",
            transition: { duration: 0.32, ease: [0.23, 1, 0.32, 1] },
          }}
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

        {/* Always-visible dotted underline that brightens on hover — the
            tap-affordance users missed. */}
        <motion.span
          aria-hidden
          className="absolute left-8 right-8 bottom-1 h-[2px]
                     bg-transparent
                     bg-[repeating-linear-gradient(to_right,var(--color-ink-faint)_0_3px,transparent_3px_7px)]
                     group-hover:bg-[repeating-linear-gradient(to_right,var(--color-accent)_0_3px,transparent_3px_7px)]"
          initial={false}
          animate={{ opacity: 0.35 }}
          whileHover={{ opacity: 0.75 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.button>
      </div>

      {/* Ornament */}
      <motion.div
        {...childExit(0.03)}
        className="enter enter--ornament ornament mt-4 mb-5 w-full max-w-[520px] px-4"
      >
        <span aria-hidden>§</span>
      </motion.div>

      {/* Space keycap — secondary affordance */}
      <motion.div
        {...childExit(0.06)}
        className="enter enter--keycap flex items-center gap-4 flex-wrap justify-center"
      >
        <span className="side-note text-[17px]">or hold</span>
        <Keycap
          pressed={listening || spaceHeld}
          disabled={!canDictate}
          label="Space"
          meter={meter}
        />
        <span className="side-note text-[17px]">to talk</span>
      </motion.div>

      {/* Space-tap-vs-hold teaching — surfaces the hidden behaviour */}
      <motion.p
        {...childExit(0.08)}
        className="enter enter--status mt-2 text-[13px]
                   font-display italic text-[var(--color-ink-faint)]
                   text-center max-w-[42ch]"
      >
        In the editor: hold Space to dictate at the cursor, tap Space for a
        space.
      </motion.p>

      {/* Status line */}
      <motion.div
        {...childExit(0.1)}
        className="enter enter--status mt-4 flex items-center gap-3 text-[11px] tracking-[0.24em]
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
      </motion.div>

      {/* Only shown in AI mode now — the Enter tip. The "click the word"
          footnote was redundant with the new pre-title above. */}
      {mode === "ai" && (
        <motion.p
          {...childExit(0.12)}
          className="mt-3 text-xs text-[var(--color-ink-faint)] text-center text-balance max-w-md"
        >
          <kbd>Enter</kbd> in the transcript runs the active preset.
        </motion.p>
      )}

      {/* Trust ribbon — surfaces the privacy story on first paint instead
          of burying it in an 11px footer */}
      <motion.div
        {...childExit(0.14)}
        className="enter enter--status mt-6 flex items-center gap-3
                   font-display italic text-[14px] md:text-[15px]
                   leading-snug text-[var(--color-ink-faint)]
                   max-w-[56ch] text-center tracking-[0.002em]"
      >
        <span
          aria-hidden
          className="hidden sm:inline-flex h-px w-10 bg-[var(--color-line)]"
        />
        <span>
          No server. Your key talks directly to your provider. Stored on this
          device only.
        </span>
        <span
          aria-hidden
          className="hidden sm:inline-flex h-px w-10 bg-[var(--color-line)]"
        />
      </motion.div>
    </motion.div>
  );
}

/**
 * Compact listening bar — replaces the full Stage while dictation is active.
 * Gives the transcript the full viewport and keeps the live wave visible as
 * reassurance that voice is being captured.
 */
function FocusStrip({
  meter,
  onToggle,
  canDictate,
  spaceHeld,
}: Props) {
  return (
    // No wrapper opacity fade — the wordmark morph IS the entrance.
    // Supporting children (wave, hint) handle their own entry/exit.
    // Keeping the wrapper mounted in a transparent state gives the
    // morph a single focal object with no competing fade.
    <motion.div
      className="relative is-listening flex items-center justify-center
                 gap-5 md:gap-8 pt-6 pb-4 md:pt-8 md:pb-5"
    >
      {/* Tiny italic "Say." mini-wordmark — the morph target. Motion's
          layoutId carries the same glyph from the hero here. */}
      <button
        onClick={onToggle}
        disabled={!canDictate}
        aria-label="Stop dictation"
        className="lift group inline-flex items-baseline gap-2
                   bg-transparent cursor-pointer text-[var(--color-ink)]
                   px-2 py-1 rounded-md focus-visible:outline-none"
      >
        {/* Small wordmark enters from below as the big one fades out
            above. Same directional language as a morph, sharp at both
            ends because each wordmark renders at its native font-size. */}
        <motion.span
          className="wordmark font-display italic
                     text-[32px] md:text-[40px] leading-none
                     tracking-[-0.03em] whitespace-nowrap"
          initial={{
            opacity: 0,
            transform: "translateY(18px) scale(0.92)",
          }}
          animate={{
            opacity: 1,
            transform: "translateY(0px) scale(1)",
          }}
          exit={{
            opacity: 0,
            transform: "translateY(10px) scale(0.94)",
            transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
          }}
          transition={{
            duration: 0.38,
            delay: 0.12,
            ease: [0.23, 1, 0.32, 1],
          }}
        >
          Say
          <span className="text-[var(--color-accent)] not-italic">.</span>
        </motion.span>
      </button>

      {/* Live audio wave — anchored AFTER the wordmark has committed to
          its new position, so the eye finishes the glyph handoff before
          new content competes for focus. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{
          duration: 0.32,
          delay: 0.3,
          ease: [0.23, 1, 0.32, 1],
        }}
        className="flex items-center h-[44px] md:h-[52px]
                   text-[var(--color-accent)]"
      >
        <AudioMeter meter={meter} bars={13} className="h-full gap-[4px]" idle={0.12} />
      </motion.div>

      {/* Rec label + release hint — the final polish, arrives last */}
      <motion.div
        initial={{ opacity: 0, transform: "translateY(4px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        exit={{ opacity: 0, transform: "translateY(4px)" }}
        transition={{
          duration: 0.24,
          delay: 0.4,
          ease: [0.23, 1, 0.32, 1],
        }}
        className="flex items-center gap-3 md:gap-5"
      >
        <span
          className="inline-flex items-center gap-2
                     font-display italic text-[16px] md:text-[19px]
                     text-[var(--color-ink)]"
        >
          <span className="rec-dot" aria-hidden />
          listening
        </span>
        <span
          aria-hidden
          className="hidden md:inline text-[var(--color-line)] text-lg"
        >
          /
        </span>
        <span
          className="hidden md:inline-flex items-center gap-1.5
                     font-mono text-[10px] uppercase tracking-[0.22em]
                     text-[var(--color-ink-faint)]"
        >
          {spaceHeld ? (
            <>
              release <kbd>Space</kbd> to stop
            </>
          ) : (
            <>
              click <em className="font-display not-italic">Say.</em> to stop
            </>
          )}
        </span>
      </motion.div>
    </motion.div>
  );
}

