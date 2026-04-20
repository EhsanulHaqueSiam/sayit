import { Copy, Download, Loader2, SendToBack } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { PRESETS } from "@/lib/presets";
import type { PresetKey } from "@/types";
import { cn, downloadText, tsFilename } from "@/lib/utils";

interface Props {
  output: string;
  activePreset: PresetKey;
  runningPreset: PresetKey | null;
  errorMessage: string | null;
  onRunPreset: (key: PresetKey) => void;
  onCopy: () => void;
  onUseAsTranscript: () => void;
}

const PRESET_ORDER: PresetKey[] = [
  "polish",
  "professional",
  "casual",
  "bullets",
  "summarize",
  "email",
  "translate",
  "custom",
];

export function AIPanel({
  output,
  activePreset,
  runningPreset,
  errorMessage,
  onRunPreset,
  onCopy,
  onUseAsTranscript,
}: Props) {
  const running = runningPreset !== null;

  return (
    <article className="relative rounded-2xl overflow-hidden
                        border border-[var(--color-line)]
                        bg-[var(--color-paper-2)]
                        shadow-[0_1px_0_0_var(--color-line-soft)]">
      {/* Head */}
      <header className="flex items-center justify-between flex-wrap gap-3
                         px-5 md:px-6 py-3
                         border-b border-[var(--color-line-soft)]
                         bg-[var(--color-paper-3)]">
        <div className="flex items-center gap-3">
          <h2 className="font-display italic text-xl md:text-[22px] leading-none text-[var(--color-ink)]">
            AI output
          </h2>
          <span className="text-[var(--color-ink-faint)]" aria-hidden>·</span>
          <span className="text-[11px] uppercase tracking-[0.2em] font-mono text-[var(--color-ink-faint)]">
            {PRESETS[activePreset].label}
          </span>
        </div>
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
      </header>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5 px-5 md:px-6 py-3
                      border-b border-[var(--color-line-soft)]
                      bg-[var(--color-paper)]"
           role="toolbar"
           aria-label="AI presets">
        {PRESET_ORDER.map((key) => (
          <button
            key={key}
            onClick={() => onRunPreset(key)}
            disabled={running}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-mono transition-all",
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
      </div>

      {/* Output */}
      <div
        className="min-h-[220px] md:min-h-[280px] px-6 md:px-8 py-7
                   font-display text-[22px] md:text-[26px] leading-[1.5]
                   text-[var(--color-ink)] whitespace-pre-wrap"
      >
        {output ? (
          output
        ) : (
          <span className="italic text-[var(--color-ink-faint)] opacity-70">
            Pick an action above, or press Enter in the transcript…
          </span>
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
            className="flex items-center gap-2 px-6 md:px-8 py-3
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
            className="px-6 md:px-8 py-3 border-t border-[var(--color-line-soft)]
                       font-mono text-xs text-[var(--color-danger)] break-all"
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
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
        "inline-flex items-center px-2.5 py-1.5",
        "rounded-lg border border-transparent text-[var(--color-ink-dim)]",
        "hover:border-[var(--color-line)] hover:text-[var(--color-ink)]",
        "transition-colors text-xs font-mono",
        !showText && "w-8 justify-center",
      )}
    >
      {children}
    </button>
  );
}
