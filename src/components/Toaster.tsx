import { AnimatePresence, motion } from "motion/react";
import type { Toast } from "@/hooks/useToasts";

interface Props {
  toasts: Toast[];
}

export function Toaster({ toasts }: Props) {
  return (
    <div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50
                 flex flex-col items-center gap-2 pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className={`px-4 py-2 rounded-full font-mono text-xs
                        border bg-[var(--color-paper-2)]
                        shadow-[0_10px_30px_rgba(0,0,0,0.12)]
                        ${
                          t.kind === "err"
                            ? "border-[var(--color-danger)] text-[var(--color-danger)]"
                            : t.kind === "ok"
                              ? "border-[var(--color-ok)] text-[var(--color-ok)]"
                              : "border-[var(--color-line)] text-[var(--color-ink)]"
                        }`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
