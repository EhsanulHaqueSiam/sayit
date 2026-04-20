import { Moon, Sun, Monitor } from "lucide-react";
import type { Theme } from "@/types";

interface Props {
  theme: Theme;
  onCycle: () => void;
}

export function ThemeToggle({ theme, onCycle }: Props) {
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const label =
    theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";
  return (
    <button
      onClick={onCycle}
      title={`Theme — ${label} (click to cycle)`}
      aria-label={`Theme: ${label}. Click to cycle.`}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-full
                 border border-[var(--color-line)] text-[var(--color-ink-dim)]
                 hover:border-[var(--color-ink-dim)] hover:text-[var(--color-ink)]
                 transition-colors text-xs font-mono bg-[var(--color-paper-2)]"
    >
      <Icon size={14} strokeWidth={1.6} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
