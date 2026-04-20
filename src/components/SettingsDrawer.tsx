import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, Loader2, Lock, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Provider, Settings } from "@/types";
import { LANGUAGES, languageFlag } from "@/lib/languages";
import { DEFAULT_MODELS } from "@/lib/constants";
import { testAIKey } from "@/lib/ai";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onChange: (patch: Partial<Settings>) => void;
}

const EASE_OUT_QUART = [0.22, 1, 0.36, 1] as const;
const EASE_IN_QUART = [0.5, 0, 0.75, 0] as const;

export function SettingsDrawer({ open, settings, onClose, onChange }: Props) {
  const reduced = useReducedMotion();
  const stagger = reduced ? 0 : 0.03;

  const field = (idx: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduced ? 0.18 : 0.26,
      delay: reduced ? 0 : 0.12 + idx * stagger,
      ease: EASE_OUT_QUART,
    },
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="fixed inset-0 z-40"
          role="dialog"
          aria-label="Settings"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT_QUART }}
        >
          {/* Paper-dim backdrop — a warm ink veil, not glassmorphism */}
          <motion.div
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-ink)_42%,transparent)]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.div
            className="absolute right-0 top-0 bottom-0 w-[min(580px,100vw)]
                       bg-[var(--color-paper)]
                       border-l border-[var(--color-line)]
                       flex flex-col"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{
              x: 40,
              opacity: 0,
              transition: {
                duration: 0.2,
                ease: EASE_IN_QUART,
              },
            }}
            transition={{
              duration: reduced ? 0.18 : 0.28,
              ease: EASE_OUT_QUART,
            }}
          >
            {/* Editorial masthead */}
            <header
              className="relative flex items-end justify-between
                         px-8 pt-8 pb-5"
            >
              <div className="flex items-baseline gap-4">
                <span
                  className="font-mono text-[10px] tracking-[0.24em]
                             uppercase text-[var(--color-ink-faint)]"
                >
                  · §
                </span>
                <h2
                  className="font-display italic text-[34px] leading-none
                             tracking-[-0.02em] text-[var(--color-ink)]"
                >
                  Settings
                </h2>
              </div>
              <button
                onClick={onClose}
                className="lift group relative inline-flex items-center justify-center
                           w-9 h-9 rounded-full
                           text-[var(--color-ink-dim)]
                           hover:text-[var(--color-ink)]
                           focus-visible:outline-none"
                aria-label="Close settings"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full border border-dashed
                             border-[var(--color-line)]
                             group-hover:border-[var(--color-ink-dim)]
                             group-focus-visible:border-[var(--color-accent)]
                             transition-colors duration-150"
                />
                <X size={16} strokeWidth={1.6} />
              </button>
            </header>

            {/* Masthead rule — thin full-width, with a centered glyph */}
            <div aria-hidden className="relative h-px mx-8 bg-[var(--color-line)]">
              <span
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2
                           px-3 bg-[var(--color-paper)]
                           font-display italic text-[12px]
                           text-[var(--color-ink-faint)]"
              >
                &nbsp;&nbsp;&nbsp;
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8 flex flex-col gap-10">
              {/* ===== I. Dictation ===== */}
              <SectionHeader numeral="I." title="Dictation" />

              <motion.div {...field(0)}>
                <FieldRow
                  index="i"
                  label="Mode"
                  sidenote={
                    <>
                      <em>Regular</em> streams raw words live. <em>AI mode</em>{" "}
                      runs an LLM transform; the Translate preset updates live
                      as you speak.
                    </>
                  }
                >
                  <select
                    value={settings.mode}
                    onChange={(e) =>
                      onChange({ mode: e.target.value as Settings["mode"] })
                    }
                    className={inputCls}
                  >
                    <option value="regular">Regular — live, raw</option>
                    <option value="ai">AI — live transform</option>
                  </select>
                </FieldRow>
              </motion.div>

              <motion.div {...field(1)}>
                <FieldRow
                  index="ii"
                  label="Language"
                  mono="bcp-47"
                  sidenote="Passed to SpeechRecognition.lang. Change mid-dictation to swap on the fly."
                >
                  <select
                    value={settings.language}
                    onChange={(e) => onChange({ language: e.target.value })}
                    className={inputCls}
                  >
                    {LANGUAGES.map(([code, name]) => (
                      <option key={code} value={code}>
                        {languageFlag(code)} {name} — {code}
                      </option>
                    ))}
                  </select>
                </FieldRow>
              </motion.div>

              <motion.div {...field(2)}>
                <FieldRow index="iii" label="Continuous" compact>
                  <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.continuous}
                      onChange={(e) =>
                        onChange({ continuous: e.target.checked })
                      }
                      className="accent-[var(--color-accent)] w-4 h-4"
                    />
                    <span
                      className="font-display italic text-[17px]
                                 text-[var(--color-ink-dim)]"
                    >
                      keep listening until stopped
                    </span>
                  </label>
                </FieldRow>
              </motion.div>

              {/* ===== II. AI Provider ===== */}
              <motion.div {...field(3)}>
                <SectionHeader numeral="II." title="AI Provider" />
              </motion.div>

              <motion.div {...field(4)}>
                <FieldRow index="iv" label="Provider">
                  <select
                    value={settings.provider}
                    onChange={(e) => {
                      const provider = e.target.value as Provider;
                      const nextModel =
                        Object.values(DEFAULT_MODELS).includes(settings.model) ||
                        !settings.model
                          ? DEFAULT_MODELS[provider]
                          : settings.model;
                      onChange({ provider, model: nextModel });
                    }}
                    className={inputCls}
                  >
                    <option value="anthropic">Anthropic · Claude</option>
                    <option value="openai">OpenAI</option>
                    <option value="google">Google · Gemini</option>
                    <option value="openai-compat">
                      OpenAI-compatible (Groq, Together, Ollama…)
                    </option>
                  </select>
                </FieldRow>
              </motion.div>

              <motion.div {...field(5)}>
                <FieldRow index="v" label="Model" mono="string">
                  <input
                    type="text"
                    value={settings.model}
                    placeholder={DEFAULT_MODELS[settings.provider]}
                    onChange={(e) => onChange({ model: e.target.value })}
                    className={`${inputCls} font-mono text-[13px]`}
                  />
                </FieldRow>
              </motion.div>

              {settings.provider === "openai-compat" && (
                <motion.div {...field(6)}>
                  <FieldRow
                    index="vi"
                    label="Base URL"
                    mono="url"
                    sidenote={
                      <>
                        e.g. <code>https://api.groq.com/openai/v1</code> — for
                        Ollama, <code>http://localhost:11434/v1</code>.
                      </>
                    }
                  >
                    <input
                      type="text"
                      value={settings.baseUrl}
                      onChange={(e) => onChange({ baseUrl: e.target.value })}
                      placeholder="https://api.groq.com/openai/v1"
                      className={`${inputCls} font-mono text-[13px]`}
                    />
                  </FieldRow>
                </motion.div>
              )}

              <motion.div {...field(settings.provider === "openai-compat" ? 7 : 6)}>
                <FieldRow
                  index={settings.provider === "openai-compat" ? "vii" : "vi"}
                  label="API key"
                  trust={
                    <>
                      <Lock size={11} strokeWidth={1.9} aria-hidden />
                      <span>Stays on this device — goes direct to your provider.</span>
                    </>
                  }
                  sidenote={
                    <>
                      Kept in <code>localStorage</code> only, sent browser →
                      provider over HTTPS. We never see it, we don't run a
                      server.
                    </>
                  }
                >
                  <input
                    type="password"
                    autoComplete="off"
                    value={settings.apiKey}
                    onChange={(e) => onChange({ apiKey: e.target.value })}
                    placeholder="sk-…"
                    className={`${inputCls} font-mono text-[13px]`}
                  />
                  <APIKeyTrustControls
                    provider={settings.provider}
                    apiKey={settings.apiKey}
                    baseUrl={settings.baseUrl}
                  />
                </FieldRow>
              </motion.div>

              <motion.div {...field(settings.provider === "openai-compat" ? 8 : 7)}>
                <FieldRow
                  index={settings.provider === "openai-compat" ? "viii" : "vii"}
                  label="System prompt"
                  sidenote="Used by the Custom preset only."
                >
                  <textarea
                    value={settings.systemPrompt}
                    onChange={(e) =>
                      onChange({ systemPrompt: e.target.value })
                    }
                    rows={6}
                    className={`${inputCls} font-mono text-xs resize-y min-h-[140px] leading-[1.55]`}
                  />
                </FieldRow>
              </motion.div>

              {/* ===== III. Privacy note ===== */}
              <motion.div
                {...field(settings.provider === "openai-compat" ? 9 : 8)}
              >
                <SectionHeader numeral="III." title="Privacy" />
                <p
                  className="mt-5 font-display italic text-[17px] leading-[1.55]
                             text-[var(--color-ink-dim)]"
                >
                  <span
                    className="font-mono not-italic text-[10px] uppercase
                               tracking-[0.22em] text-[var(--color-ink-faint)]
                               mr-2 align-middle"
                  >
                    Note —
                  </span>
                  Speech recognition runs through Chrome, which streams your
                  audio to Google. For truly local dictation you'd need a
                  desktop app shipping Whisper — out of scope for a browser
                  build.
                </p>
              </motion.div>

              {/* Colophon */}
              <div
                aria-hidden
                className="mt-4 pt-6 border-t border-[var(--color-line-soft)]
                           flex items-center justify-between
                           font-mono text-[10px] uppercase tracking-[0.22em]
                           text-[var(--color-ink-faint)]"
              >
                <span>SayIt · v.0.1</span>
                <span className="font-display italic normal-case tracking-normal text-[14px]">
                  — fin —
                </span>
                <span>BYO model</span>
              </div>
            </div>
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

const inputCls = `w-full px-3.5 py-2.5 bg-[var(--color-paper-2)]
  border border-[var(--color-line)] rounded-md
  text-sm text-[var(--color-ink)]
  focus:outline-none
  focus:border-[var(--color-accent)]
  focus:bg-[var(--color-paper)]
  hover:border-[var(--color-ink-faint)]
  transition-colors duration-150`;

function SectionHeader({
  numeral,
  title,
}: {
  numeral: string;
  title: string;
}) {
  return (
    <div className="flex items-baseline gap-4">
      <span
        className="font-display italic text-[20px] leading-none
                   text-[var(--color-accent)] tabular"
      >
        {numeral}
      </span>
      <h3
        className="font-display italic text-[22px] leading-none
                   tracking-[-0.01em] text-[var(--color-ink)]"
      >
        {title}
      </h3>
      <span
        aria-hidden
        className="flex-1 h-px bg-[var(--color-line)]
                   translate-y-[-4px]"
      />
    </div>
  );
}

/**
 * Trust controls rendered directly beneath the API-key input:
 *   [Test key] ─ button that hits the provider's /models endpoint and
 *                reports success/failure inline without running a preset.
 *   [Where does this go? ⌄] ─ expandable editorial diagram showing the
 *                request route: browser → provider, never → any server
 *                we run.
 * All feedback is transient and non-modal. Reassurance, not ceremony.
 */
function APIKeyTrustControls({
  provider,
  apiKey,
  baseUrl,
}: {
  provider: Provider;
  apiKey: string;
  baseUrl: string;
}) {
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "testing" }
    | { kind: "ok"; message: string }
    | { kind: "err"; message: string }
  >({ kind: "idle" });
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  const runTest = async () => {
    if (status.kind === "testing") return;
    setStatus({ kind: "testing" });
    const res = await testAIKey({ provider, apiKey, baseUrl });
    setStatus({ kind: res.ok ? "ok" : "err", message: res.message });
    window.setTimeout(() => setStatus({ kind: "idle" }), 4800);
  };

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={runTest}
          disabled={status.kind === "testing"}
          className="lift inline-flex items-center gap-1.5
                     px-3 py-1 rounded-full
                     border border-[var(--color-line)]
                     text-[var(--color-ink-dim)]
                     hover:border-[var(--color-ink-dim)]
                     hover:text-[var(--color-ink)]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     font-mono text-[11px] tracking-[0.04em]"
        >
          {status.kind === "testing" ? (
            <>
              <Loader2 size={11} strokeWidth={1.8} className="animate-spin" />
              Testing…
            </>
          ) : (
            <>
              <Check size={11} strokeWidth={1.8} />
              Test key
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="lift inline-flex items-center gap-1.5
                     px-2.5 py-1 rounded-full
                     text-[var(--color-ink-faint)]
                     hover:text-[var(--color-ink-dim)]
                     font-display italic text-[14px] leading-none"
        >
          <span>Where does this go?</span>
          <ChevronDown
            size={11}
            strokeWidth={1.8}
            className={cn(
              "transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>

        {/* Inline test result — crossfades in beside the buttons */}
        <AnimatePresence>
          {(status.kind === "ok" || status.kind === "err") && (
            <motion.span
              key={status.kind + status.message}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "font-mono text-[11px] tracking-[0.04em]",
                status.kind === "ok"
                  ? "text-[var(--color-ok)]"
                  : "text-[var(--color-danger)]",
              )}
            >
              {status.kind === "ok" ? "✓" : "×"} {status.message}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* "Where does this go?" — disclosure with an editorial route diagram */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="disclosure"
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={
              reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }
            }
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{
              duration: reduced ? 0.18 : 0.34,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="overflow-hidden"
          >
            <div
              className="mt-1 rounded-md border border-[var(--color-line)]
                         bg-[color-mix(in_srgb,var(--color-paper-2)_60%,transparent)]
                         px-5 py-5"
            >
              <RouteDiagram provider={provider} />
              <p
                className="mt-4 font-display italic text-[14px] leading-[1.5]
                           text-[var(--color-ink-dim)] max-w-[52ch]"
              >
                SayIt is a static page. No backend, no relay server. Your key
                and prompts travel straight from this browser to your chosen
                provider over HTTPS. Revoke any time by clearing the field —
                nothing else needs to happen.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A small editorial route illustration: browser → provider, with a crossed-out
 *  "our server" trace so the no-intermediate-server claim is visual, not copy. */
function RouteDiagram({ provider }: { provider: Provider }) {
  const providerLabel =
    provider === "anthropic"
      ? "Anthropic"
      : provider === "openai"
        ? "OpenAI"
        : provider === "google"
          ? "Google"
          : "Your endpoint";

  return (
    <div aria-hidden className="relative">
      {/* Row 1 — actual route */}
      <div className="flex items-center gap-3 md:gap-4 flex-wrap">
        <RouteNode label="this browser" accent />
        <RouteArrow />
        <RouteNode label={providerLabel} accent />
        <span
          className="ml-2 font-mono text-[10px] uppercase tracking-[0.22em]
                     text-[var(--color-accent)]"
        >
          https · direct
        </span>
      </div>

      {/* Row 2 — absence of a server we run */}
      <div className="mt-4 flex items-center gap-3 md:gap-4 flex-wrap">
        <RouteNode label="this browser" muted />
        <RouteArrow muted crossed />
        <RouteNode label="our server" muted strike />
        <span
          className="ml-2 font-mono text-[10px] uppercase tracking-[0.22em]
                     text-[var(--color-ink-faint)]"
        >
          doesn't exist
        </span>
      </div>
    </div>
  );
}

function RouteNode({
  label,
  accent,
  muted,
  strike,
}: {
  label: string;
  accent?: boolean;
  muted?: boolean;
  strike?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1.5 rounded-md",
        "font-display italic text-[15px] leading-none",
        "border",
        accent &&
          "border-[var(--color-ink-dim)] text-[var(--color-ink)] bg-[var(--color-paper)]",
        muted &&
          "border-dashed border-[var(--color-line)] text-[var(--color-ink-faint)]",
        strike && "line-through decoration-[var(--color-ink-faint)]",
      )}
    >
      {label}
    </span>
  );
}

function RouteArrow({
  muted,
  crossed,
}: {
  muted?: boolean;
  crossed?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex items-center",
        muted ? "text-[var(--color-ink-faint)]" : "text-[var(--color-accent)]",
      )}
    >
      <svg width="44" height="12" viewBox="0 0 44 12" fill="none">
        <path
          d="M2 6 L38 6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray={muted ? "3 4" : undefined}
        />
        <path
          d="M34 2 L40 6 L34 10"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {crossed && (
        <span
          className="absolute left-1/2 top-1/2
                     -translate-x-1/2 -translate-y-1/2
                     text-[15px] font-mono text-[var(--color-ink-faint)]"
        >
          ×
        </span>
      )}
    </span>
  );
}

function FieldRow({
  index,
  label,
  mono,
  trust,
  sidenote,
  compact,
  children,
}: {
  index: string;
  label: string;
  mono?: string;
  /** Inline trust/reassurance hint rendered in the label row. Use for
   *  sensitive fields (API keys, tokens) where privacy belongs up top, not
   *  as an afterthought below the input. */
  trust?: ReactNode;
  sidenote?: ReactNode;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span
          className="font-mono text-[10px] tracking-[0.22em] uppercase
                     text-[var(--color-ink-faint)] w-7 shrink-0"
        >
          {index}.
        </span>
        <span
          className="font-display italic text-[19px] leading-none
                     text-[var(--color-ink)]"
        >
          {label}
        </span>
        {mono && (
          <span
            className="font-mono text-[10px] tracking-[0.2em] uppercase
                       text-[var(--color-ink-faint)]"
          >
            · {mono}
          </span>
        )}
        {trust && (
          <span
            className="ml-auto inline-flex items-center gap-1.5
                       font-mono text-[11px] tracking-[0.02em]
                       text-[var(--color-accent)]"
          >
            {trust}
          </span>
        )}
      </div>
      <div className={compact ? "pl-10" : "pl-10"}>{children}</div>
      {sidenote && (
        <p
          className="pl-10 font-display italic text-[14px] leading-[1.5]
                     text-[var(--color-ink-faint)] max-w-[46ch]"
        >
          {sidenote}
        </p>
      )}
    </div>
  );
}
