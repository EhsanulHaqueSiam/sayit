import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Copy,
  Download,
  Loader2,
  RefreshCcw,
  SendToBack,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PRESETS } from "@/lib/presets";
import type { PresetKey } from "@/types";
import { cn, downloadText, tsFilename } from "@/lib/utils";

interface Props {
  output: string;
  activePreset: PresetKey;
  runningPreset: PresetKey | null;
  errorMessage: string | null;
  onRunPreset: (key: PresetKey) => void;
  onRetry: () => void;
  onCopy: () => void;
  onUseAsTranscript: () => void;
}

/** Everyday actions on the chip row — covers the three distinct jobs a
 *  writer reaches for: tidy up, compress, translate. */
const PRIMARY_PRESETS: PresetKey[] = ["polish", "summarize", "translate"];

/** Rarer stylistic rewrites — tucked behind a dropdown to keep the chip
 *  row at the Miller/Cowan cap. */
const MORE_PRESETS: PresetKey[] = [
  "professional",
  "casual",
  "bullets",
  "email",
  "custom",
];

export function AIPanel({
  output,
  activePreset,
  runningPreset,
  errorMessage,
  onRunPreset,
  onRetry,
  onCopy,
  onUseAsTranscript,
}: Props) {
  const running = runningPreset !== null;
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const activeInMore = MORE_PRESETS.includes(activePreset);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const runAndClose = (key: PresetKey) => {
    onRunPreset(key);
    setMoreOpen(false);
  };

  return (
    <article className="relative pt-10 md:pt-14">
      {/* Editorial masthead — thin rules flanking a centered § preset label */}
      <div
        aria-hidden
        className="mb-6 md:mb-8 mx-auto w-full max-w-[520px] px-4
                   flex items-center gap-4
                   font-display italic text-[15px] md:text-[16px]
                   text-[var(--color-ink-faint)]"
      >
        <span className="flex-1 h-px bg-[var(--color-line)]" />
        <span className="whitespace-nowrap">
          § <span className="text-[var(--color-ink-dim)]">{PRESETS[activePreset].label}</span>
        </span>
        <span className="flex-1 h-px bg-[var(--color-line)]" />
      </div>

      {/* Toolbar — presets on the left, actions on the right */}
      <div
        className="flex items-center justify-between gap-3 flex-wrap mb-8"
        role="toolbar"
        aria-label="AI presets"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
        {PRIMARY_PRESETS.map((key) => (
          <button
            key={key}
            onClick={() => onRunPreset(key)}
            disabled={running}
            title={PRESETS[key].description}
            aria-label={`${PRESETS[key].label} — ${PRESETS[key].description}`}
            className={cn(
              "lift px-3 py-1 rounded-full text-xs font-mono",
              "border disabled:opacity-50 disabled:cursor-not-allowed",
              activePreset === key
                ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] border-[var(--color-accent)]"
                : "bg-transparent text-[var(--color-ink-dim)] border-[var(--color-line)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-dim)]",
              runningPreset === key && "animate-pulse",
            )}
          >
            {PRESETS[key].label}
            {key === "polish" && activePreset === "polish" && (
              <span className="ml-1.5 opacity-60 text-[10px]">↵</span>
            )}
            {key === "translate" && <span className="ml-1 opacity-60">→</span>}
          </button>
        ))}

        {/* More styles — popover. Shows active label inline when a hidden
            preset is running, so the user never loses track of state. */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setMoreOpen((v) => !v)}
            disabled={running}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            className={cn(
              "lift inline-flex items-center gap-1.5 px-3 py-1 rounded-full",
              "text-xs font-mono border",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              activeInMore
                ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] border-[var(--color-accent)]"
                : "bg-transparent text-[var(--color-ink-dim)] border-[var(--color-line)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-dim)]",
              activeInMore && runningPreset === activePreset && "animate-pulse",
            )}
          >
            <span className={cn(activeInMore ? "not-italic" : "font-display italic tracking-normal")}>
              {activeInMore ? PRESETS[activePreset].label : "More styles"}
            </span>
            <ChevronDown
              size={12}
              strokeWidth={1.8}
              className={cn("transition-transform duration-150", moreOpen && "rotate-180")}
            />
          </button>

          <AnimatePresence>
            {moreOpen && (
              <motion.div
                role="menu"
                // HW-accelerated transform string for the popover entrance.
                initial={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, transform: "translateY(-6px) scale(0.96)" }
                }
                animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
                exit={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, transform: "translateY(-4px) scale(0.98)" }
                }
                transition={{ duration: reducedMotion ? 0.16 : 0.26, ease: [0.23, 1, 0.32, 1] }}
                style={{ transformOrigin: "top right" }}
                className="absolute right-0 top-[calc(100%+6px)] z-30
                           min-w-[240px] py-2
                           bg-[var(--color-paper)]
                           border border-[var(--color-line)]
                           rounded-md
                           shadow-[0_12px_32px_-14px_color-mix(in_srgb,var(--color-ink)_38%,transparent)]"
              >
                <div
                  className="px-4 pt-1 pb-2 font-mono text-[9px] uppercase
                             tracking-[0.24em] text-[var(--color-ink-faint)]"
                >
                  · more styles
                </div>
                {MORE_PRESETS.map((key) => {
                  const active = activePreset === key;
                  return (
                    <button
                      key={key}
                      role="menuitem"
                      onClick={() => runAndClose(key)}
                      disabled={running}
                      className={cn(
                        "w-full text-left px-4 py-2.5",
                        "flex flex-col gap-0.5",
                        "hover:bg-[var(--color-paper-2)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-colors duration-120",
                      )}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span
                          className="font-display italic text-[17px] leading-tight
                                     text-[var(--color-ink)]"
                        >
                          {PRESETS[key].label}
                        </span>
                        {active && (
                          <span
                            className="font-mono not-italic text-[10px]
                                       tracking-[0.2em] uppercase
                                       text-[var(--color-accent)]"
                          >
                            · active
                          </span>
                        )}
                      </span>
                      <span
                        className="font-display italic text-[13px] leading-snug
                                   text-[var(--color-ink-faint)]"
                      >
                        {PRESETS[key].description}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-1.5">
          <HeadButton
            label="Download"
            onClick={() => downloadText(tsFilename("ai"), output)}
          >
            <Download size={14} strokeWidth={1.8} />
          </HeadButton>
          <HeadButton label="Move to transcript" onClick={onUseAsTranscript}>
            <SendToBack size={14} strokeWidth={1.8} />
          </HeadButton>
          <HeadButton label="Copy" onClick={onCopy} showText>
            <Copy size={14} strokeWidth={1.8} />
            <span className="ml-1.5">Copy</span>
          </HeadButton>
        </div>
      </div>

      {/* Output — a pull quote. Offset from the margin on md+ with an accent
          em-dash opener so it reads as a polished passage, not a form value.
          Each paragraph reveals with an inkBleed cascade (stagger 140ms,
          ease-out-expo) so the polished passage appears to write itself onto
          the page. */}
      <div
        className="min-h-[220px] md:min-h-[320px]
                   md:pl-[120px]"
      >
        {output ? (
          <div
            key={`${output.length}:${output.slice(0, 24)}`}
            className="relative max-w-[68ch]"
          >
            <motion.span
              aria-hidden
              // 0.9 instead of 0.8 — the em-dash should feel like it
              // emerges, not like it erupts from a point.
              initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: reducedMotion ? 0.2 : 0.44,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="hidden md:block absolute -left-12 top-1
                         font-display italic text-[32px] leading-none
                         text-[var(--color-accent)] select-none"
            >
              —
            </motion.span>
            <div
              className="font-display italic text-[24px] md:text-[30px]
                         leading-[1.5] tracking-[-0.005em]
                         text-[var(--color-ink)]"
            >
              {splitParagraphs(output).map((para, i) => (
                <motion.p
                  key={i}
                  initial={
                    reducedMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          y: 8,
                          filter: "blur(3px)",
                          letterSpacing: "-0.015em",
                        }
                  }
                  animate={
                    reducedMotion
                      ? { opacity: 1 }
                      : {
                          opacity: 1,
                          y: 0,
                          filter: "blur(0px)",
                          letterSpacing: "0em",
                        }
                  }
                  transition={{
                    duration: reducedMotion ? 0.2 : 0.52,
                    delay: reducedMotion ? 0 : 0.08 + i * 0.14,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="whitespace-pre-wrap mb-5 last:mb-0"
                >
                  {para}
                </motion.p>
              ))}
            </div>
          </div>
        ) : (
          <p
            className="max-w-[68ch] font-display italic
                       text-[18px] md:text-[20px] leading-[1.55]
                       text-[var(--color-ink-faint)]"
          >
            Pick an action above, or press Enter in the transcript…
          </p>
        )}
      </div>

      {/* Status strip */}
      <AnimatePresence>
        {running && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 mt-8 pt-4
                       border-t border-[var(--color-line-soft)]
                       font-mono text-xs text-[var(--color-ink-dim)]"
          >
            <Loader2 size={13} className="animate-spin" />
            Running {PRESETS[runningPreset!].label}…
          </motion.div>
        )}
        {!running && errorMessage && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start justify-between gap-3 mt-8 pt-4
                       border-t border-[var(--color-line-soft)]"
          >
            <p
              className="font-mono text-xs leading-snug
                         text-[var(--color-danger)]
                         break-words max-w-[60ch]"
            >
              {errorMessage}
            </p>
            <button
              onClick={onRetry}
              className="lift shrink-0 inline-flex items-center gap-1.5
                         px-2.5 py-1 rounded-full
                         border border-[var(--color-danger)]
                         text-[var(--color-danger)]
                         font-mono text-[11px] tracking-[0.06em]
                         hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]"
            >
              <RefreshCcw size={12} strokeWidth={1.8} />
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

/** Split on blank lines. Preserves line breaks within a paragraph so
 *  bullet lists and email bodies still render correctly. */
function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n+/).filter((p) => p.length > 0);
}

function HeadButton({
  label,
  children,
  onClick,
  showText,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  showText?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "lift inline-flex items-center px-2.5 py-1.5",
        "rounded-md border border-transparent text-[var(--color-ink-dim)]",
        "hover:border-[var(--color-line)] hover:text-[var(--color-ink)]",
        "text-xs font-mono",
        !showText && "w-8 justify-center",
      )}
    >
      {children}
    </button>
  );
}
