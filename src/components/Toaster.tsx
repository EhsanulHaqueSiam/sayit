import { AnimatePresence, motion } from "motion/react";
import type { Toast } from "@/hooks/useToasts";

interface Props {
  toasts: Toast[];
  onDismiss?: (id: number) => void;
}

/** Editorial marginalia, not app chrome. A narrow card with an italic kind-
 *  label over a thin rule — like a footnote in a printed journal. */
const KIND_LABEL: Record<NonNullable<Toast["kind"]>, string> = {
  info: "note —",
  ok: "done —",
  err: "trouble —",
};

export function Toaster({ toasts, onDismiss }: Props) {
  return (
    <div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50
                 flex flex-col items-center gap-2.5"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const kind = t.kind ?? "info";
          const colorClass =
            kind === "err"
              ? "text-[var(--color-danger)]"
              : kind === "ok"
                ? "text-[var(--color-ok)]"
                : "text-[var(--color-ink-dim)]";
          const ruleClass =
            kind === "err"
              ? "bg-[color-mix(in_srgb,var(--color-danger)_55%,var(--color-line))]"
              : kind === "ok"
                ? "bg-[color-mix(in_srgb,var(--color-ok)_55%,var(--color-line))]"
                : "bg-[var(--color-line)]";
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex flex-col gap-1.5
                         min-w-[260px] max-w-[min(520px,calc(100vw-2rem))]
                         px-4 py-3 rounded-md
                         bg-[var(--color-paper)]
                         border border-[var(--color-line)]"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`font-display italic text-[13px] leading-none ${colorClass}`}
                >
                  {KIND_LABEL[kind]}
                </span>
                <span aria-hidden className={`flex-1 h-px ${ruleClass}`} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <span
                  className="font-sans text-[13px] leading-snug
                             text-[var(--color-ink)] break-words"
                >
                  {t.message}
                </span>
                {t.action && (
                  <button
                    onClick={() => {
                      t.action!.onClick();
                      onDismiss?.(t.id);
                    }}
                    className={`lift shrink-0 inline-flex items-center
                                px-2.5 py-1 rounded-full
                                border font-mono text-[11px] tracking-[0.06em]
                                hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)]
                                ${colorClass}`}
                    style={{ borderColor: "currentColor" }}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
