import { LANGUAGES, languageFlag } from "@/lib/languages";

interface Props {
  value: string;
  onChange: (value: string) => void;
  title?: string;
}

export function InlineLanguage({ value, onChange, title }: Props) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Language</span>
      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          // Return focus to the page so hold-Space keeps working after a pick.
          e.currentTarget.blur();
        }}
        title={title ?? "Change language on the fly"}
        className="appearance-none pl-3 pr-8 py-1.5
                   bg-[var(--color-paper-2)] border border-[var(--color-line)]
                   rounded-full text-xs font-mono text-[var(--color-ink-dim)]
                   hover:border-[var(--color-ink-dim)] hover:text-[var(--color-ink)]
                   focus:outline-none focus:border-[var(--color-accent)]
                   cursor-pointer transition-colors max-w-[200px]"
      >
        {LANGUAGES.map(([code, name]) => (
          <option key={code} value={code}>
            {languageFlag(code)} {name} — {code}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        width="10"
        height="10"
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-2.5 text-[var(--color-ink-faint)]"
      >
        <path
          d="M3 5l3 3 3-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </label>
  );
}
