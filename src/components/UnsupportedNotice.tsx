import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Copy, X, ExternalLink } from "lucide-react";
import type { SupportReason } from "@/lib/browser";

interface Props {
  reason: Exclude<SupportReason, "ok">;
  onDismiss: () => void;
  onCopied?: () => void;
}

/**
 * A warm, editorial banner that tells the user their browser can't run voice
 * dictation — with actionable next steps. Shown persistently at the top of
 * the app until dismissed.
 */
export function UnsupportedNotice({ reason, onDismiss, onCopied }: Props) {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    const url =
      typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <motion.section
      role="alert"
      aria-live="polite"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
      className="relative border-b border-[color-mix(in_srgb,var(--color-accent)_35%,var(--color-line))]
                 bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-paper))]
                 overflow-hidden"
    >
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-4
                      flex items-start md:items-center gap-4
                      flex-col md:flex-row">
        {/* Left: marker + copy */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span
            aria-hidden
            className="mt-1 inline-block w-[9px] h-[9px] rounded-full
                       bg-[var(--color-accent)] shrink-0
                       shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-accent)_20%,transparent)]"
          />
          <div className="text-[var(--color-ink)]">
            <p className="font-display italic text-[20px] md:text-[22px] leading-tight mb-1">
              {reason === "firefox"
                ? "Firefox can't run SayIt."
                : "This browser can't run SayIt."}
            </p>
            <p className="text-sm text-[var(--color-ink-dim)] leading-relaxed max-w-xl">
              SayIt uses your browser's built-in voice recognition, which only
              works in{" "}
              <strong className="text-[var(--color-ink)]">
                Chrome, Edge, Brave, or Arc
              </strong>
              . Open the page there to dictate — copy the link if it's easier
              to paste over.
            </p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="copied"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-mono text-[var(--color-accent)] mr-1"
              >
                link copied!
              </motion.span>
            ) : null}
          </AnimatePresence>

          <a
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noreferrer noopener"
            className="lift inline-flex items-center gap-2 px-3.5 py-2 rounded-full
                       bg-[var(--color-ink)] text-[var(--color-paper)]
                       font-mono text-xs font-medium
                       hover:bg-[color-mix(in_srgb,var(--color-ink)_90%,var(--color-accent))]
                       no-underline"
          >
            Get Chrome <ExternalLink size={12} strokeWidth={1.8} />
          </a>

          <button
            onClick={copyUrl}
            className="lift inline-flex items-center gap-1.5 px-3 py-2 rounded-full
                       border border-[var(--color-line)] text-[var(--color-ink-dim)]
                       hover:text-[var(--color-ink)] hover:border-[var(--color-ink-dim)]
                       font-mono text-xs"
          >
            <Copy size={12} strokeWidth={1.8} />
            Copy link
          </button>

          <button
            onClick={onDismiss}
            className="lift p-1.5 rounded-full text-[var(--color-ink-faint)]
                       hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-2)]"
            aria-label="Dismiss notice"
            title="Dismiss"
          >
            <X size={15} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </motion.section>
  );
}
