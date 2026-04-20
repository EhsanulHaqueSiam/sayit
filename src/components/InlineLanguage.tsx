import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { LANGUAGES, languageFlag } from "@/lib/languages";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  title?: string;
}

/**
 * Editorial-skinned language popover. Replaces the native <select>, which
 * rendered with OS chrome on macOS/Windows and broke the editorial surface.
 *
 * - Italic-serif preview pill with flag + language name + BCP-47 code
 * - Filter input inside the popover
 * - Scrollable list of languages with italic-serif names, mono codes
 * - Keyboard: Escape closes; arrow keys scroll the list natively
 * - Click-outside closes
 */
export function InlineLanguage({ value, onChange, title }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();

  const active = useMemo(
    () => LANGUAGES.find(([code]) => code === value),
    [value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      ([code, name]) =>
        code.toLowerCase().includes(q) || name.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    // Focus the filter input one tick after open so the opening transition
    // isn't interrupted by the focus ring appearing mid-animation.
    const t = window.setTimeout(() => searchRef.current?.focus(), 40);
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (code: string) => {
    onChange(code);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={title ?? "Change language on the fly"}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="lift inline-flex items-center gap-2 pl-2.5 pr-2 py-1.5
                   rounded-full bg-[var(--color-paper-2)]
                   border border-[var(--color-line)]
                   text-[var(--color-ink-dim)]
                   hover:border-[var(--color-ink-dim)]
                   hover:text-[var(--color-ink)]
                   font-mono text-[11px]"
      >
        <span className="text-[13px] leading-none" aria-hidden>
          {active ? languageFlag(active[0]) : "🌐"}
        </span>
        <span
          className="font-display italic normal-case tracking-normal
                     text-[14px] leading-none text-[var(--color-ink)]"
        >
          {active ? active[1] : "Language"}
        </span>
        <span className="text-[var(--color-ink-faint)]" aria-hidden>
          ·
        </span>
        <span className="uppercase tracking-[0.12em]">
          {active ? active[0] : ""}
        </span>
        <ChevronDown
          size={11}
          strokeWidth={1.8}
          className={cn(
            "transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -6, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -4, scale: 0.98 }
            }
            transition={{
              duration: reducedMotion ? 0.16 : 0.24,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ transformOrigin: "top left" }}
            className="absolute left-0 top-[calc(100%+6px)] z-30
                       w-[320px] max-w-[calc(100vw-2rem)]
                       bg-[var(--color-paper)]
                       border border-[var(--color-line)]
                       rounded-md overflow-hidden
                       shadow-[0_12px_32px_-14px_color-mix(in_srgb,var(--color-ink)_38%,transparent)]"
          >
            <div
              className="px-4 pt-3 pb-1 font-mono text-[9px] uppercase
                         tracking-[0.24em] text-[var(--color-ink-faint)]"
            >
              · language
            </div>
            <div className="px-3 pb-2">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter…"
                className="w-full px-2.5 py-1.5 rounded-md
                           bg-[var(--color-paper-2)]
                           border border-[var(--color-line)]
                           focus:outline-none
                           focus:border-[var(--color-accent)]
                           font-display italic text-[15px]
                           text-[var(--color-ink)]
                           placeholder:text-[var(--color-ink-faint)]"
              />
            </div>
            <ul
              className="max-h-[320px] overflow-y-auto pb-2"
              role="presentation"
            >
              {filtered.length === 0 && (
                <li
                  className="px-4 py-3 font-display italic text-[15px]
                             text-[var(--color-ink-faint)]"
                >
                  No matches.
                </li>
              )}
              {filtered.map(([code, name]) => {
                const isActive = code === value;
                return (
                  <li key={code} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onClick={() => pick(code)}
                      className={cn(
                        "w-full text-left px-4 py-2",
                        "flex items-baseline gap-2.5",
                        "hover:bg-[var(--color-paper-2)]",
                        "transition-colors duration-120",
                        isActive && "bg-[var(--color-paper-2)]",
                      )}
                    >
                      <span className="text-[14px] leading-none" aria-hidden>
                        {languageFlag(code)}
                      </span>
                      <span
                        className="flex-1 font-display italic text-[15px]
                                   leading-tight text-[var(--color-ink)]"
                      >
                        {name}
                      </span>
                      <span
                        className="font-mono text-[10px] uppercase
                                   tracking-[0.14em]
                                   text-[var(--color-ink-faint)]"
                      >
                        {code}
                      </span>
                      {isActive && (
                        <span
                          className="font-mono not-italic text-[9px]
                                     tracking-[0.2em] uppercase
                                     text-[var(--color-accent)]"
                        >
                          · active
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
