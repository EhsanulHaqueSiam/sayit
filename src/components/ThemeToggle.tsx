import { Moon, Sun, Monitor } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Theme } from "@/types";

interface Props {
  theme: Theme;
  onCycle: () => void;
}

export function ThemeToggle({ theme, onCycle }: Props) {
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const label =
    theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";
  const key = theme || "system";
  return (
    <button
      onClick={onCycle}
      title={`Theme — ${label} (click to cycle)`}
      aria-label={`Theme: ${label}. Click to cycle.`}
      className="lift inline-flex items-center gap-2 px-3 py-2 rounded-full
                 border border-[var(--color-line)] text-[var(--color-ink-dim)]
                 hover:border-[var(--color-ink-dim)] hover:text-[var(--color-ink)]
                 text-xs font-mono bg-[var(--color-paper-2)]
                 overflow-hidden"
    >
      {/* Icon crossfades + rotates subtly on theme cycle */}
      <span className="relative inline-flex items-center justify-center w-[14px] h-[14px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`icon-${key}`}
            initial={{ opacity: 0, rotate: -25, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 25, scale: 0.7 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inline-flex items-center justify-center"
          >
            <Icon size={14} strokeWidth={1.6} />
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="hidden sm:inline relative overflow-hidden min-w-[44px] text-left">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`label-${key}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block"
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
