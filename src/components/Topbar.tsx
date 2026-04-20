import { Settings2 } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import type { Mode, Theme } from "@/types";

interface Props {
  mode: Mode;
  theme: Theme;
  onToggleMode: () => void;
  onCycleTheme: () => void;
  onOpenSettings: () => void;
}

export function Topbar({
  mode,
  theme,
  onToggleMode,
  onCycleTheme,
  onOpenSettings,
}: Props) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between
                 px-6 md:px-10 py-5 border-b border-[var(--color-line-soft)]
                 bg-[color-mix(in_srgb,var(--color-paper)_82%,transparent)]
                 backdrop-blur-md"
    >
      <a
        href="/"
        className="group flex items-baseline gap-3 no-underline select-none"
      >
        <span className="font-display italic text-[28px] leading-none text-[var(--color-ink)]">
          SayIt
        </span>
        <span className="hidden md:inline text-[11px] uppercase tracking-[0.22em] font-mono text-[var(--color-ink-faint)]">
          voice → text, editorialised
        </span>
      </a>

      <nav className="flex items-center gap-2">
        <button
          onClick={onToggleMode}
          className={`px-3 py-2 rounded-full text-xs font-mono border transition-colors
                      ${
                        mode === "ai"
                          ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--color-accent-ink)]"
                          : "bg-[var(--color-paper-2)] border-[var(--color-line)] text-[var(--color-ink-dim)] hover:border-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                      }`}
          title="Toggle regular / AI mode"
          aria-pressed={mode === "ai"}
        >
          <span className="opacity-60">mode·</span>
          <strong className="font-medium">{mode === "ai" ? "AI" : "raw"}</strong>
        </button>

        <ThemeToggle theme={theme} onCycle={onCycleTheme} />

        <button
          onClick={onOpenSettings}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full
                     bg-[var(--color-paper-2)] border border-[var(--color-line)]
                     text-[var(--color-ink-dim)] text-xs font-mono
                     hover:border-[var(--color-ink-dim)] hover:text-[var(--color-ink)]
                     transition-colors"
          aria-label="Open settings"
        >
          <Settings2 size={14} strokeWidth={1.6} />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </nav>
    </header>
  );
}
