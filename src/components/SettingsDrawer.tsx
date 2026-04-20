import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { Provider, Settings } from "@/types";
import { LANGUAGES, languageFlag } from "@/lib/languages";
import { DEFAULT_MODELS } from "@/lib/constants";

interface Props {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onChange: (patch: Partial<Settings>) => void;
}

export function SettingsDrawer({ open, settings, onClose, onChange }: Props) {
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
        >
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.div
            className="absolute right-0 top-0 bottom-0 w-[min(500px,100vw)]
                       bg-[var(--color-paper)] border-l border-[var(--color-line)]
                       flex flex-col"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          >
            <header className="flex items-center justify-between
                               px-6 py-5 border-b border-[var(--color-line-soft)]">
              <h2 className="font-display italic text-2xl text-[var(--color-ink)]">
                Settings
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-[var(--color-ink-dim)]
                           hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-2)]
                           transition-colors"
                aria-label="Close settings"
              >
                <X size={18} strokeWidth={1.6} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
              <Field label="Mode" hint="Regular streams raw words live. AI mode runs LLM transforms; Translate preset can update live while you speak.">
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
              </Field>

              <Field label="Language" hint="BCP-47 tag passed to SpeechRecognition.lang">
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
              </Field>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.continuous}
                  onChange={(e) => onChange({ continuous: e.target.checked })}
                  className="accent-[var(--color-accent)] w-4 h-4"
                />
                <span className="text-sm text-[var(--color-ink)]">
                  Continuous recognition
                </span>
                <span className="text-xs text-[var(--color-ink-faint)]">
                  keeps listening until you stop
                </span>
              </label>

              <fieldset className="border border-[var(--color-line)] rounded-xl p-5 flex flex-col gap-4">
                <legend className="px-2 text-[10px] uppercase tracking-[0.2em] font-mono text-[var(--color-ink-faint)]">
                  AI provider
                </legend>

                <Field label="Provider">
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
                </Field>

                <Field label="Model">
                  <input
                    type="text"
                    value={settings.model}
                    placeholder={DEFAULT_MODELS[settings.provider]}
                    onChange={(e) => onChange({ model: e.target.value })}
                    className={inputCls}
                  />
                </Field>

                {settings.provider === "openai-compat" && (
                  <Field
                    label="Base URL"
                    hint="e.g. https://api.groq.com/openai/v1 — for Ollama, http://localhost:11434/v1"
                  >
                    <input
                      type="text"
                      value={settings.baseUrl}
                      onChange={(e) => onChange({ baseUrl: e.target.value })}
                      placeholder="https://api.groq.com/openai/v1"
                      className={inputCls}
                    />
                  </Field>
                )}

                <Field
                  label="API key"
                  hint="Stored in localStorage. Sent directly to the provider over HTTPS — never to us."
                >
                  <input
                    type="password"
                    autoComplete="off"
                    value={settings.apiKey}
                    onChange={(e) => onChange({ apiKey: e.target.value })}
                    placeholder="sk-…"
                    className={inputCls}
                  />
                </Field>

                <Field
                  label="System prompt"
                  hint="Used by the Custom preset."
                >
                  <textarea
                    value={settings.systemPrompt}
                    onChange={(e) =>
                      onChange({ systemPrompt: e.target.value })
                    }
                    rows={6}
                    className={`${inputCls} font-mono text-xs resize-y min-h-[120px]`}
                  />
                </Field>
              </fieldset>

              <p className="text-xs text-[var(--color-ink-faint)] leading-relaxed border-l-2 border-[var(--color-accent)] pl-3">
                <strong className="text-[var(--color-ink-dim)]">
                  Privacy note.
                </strong>{" "}
                Speech recognition runs through Chrome, which streams your audio
                to Google. For truly local dictation you'd need a desktop app
                shipping Whisper — out of scope for a browser build.
              </p>
            </div>
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

const inputCls = `w-full px-3 py-2.5 bg-[var(--color-paper-2)]
  border border-[var(--color-line)] rounded-lg
  text-sm text-[var(--color-ink)]
  focus:outline-none focus:border-[var(--color-accent)]
  transition-colors`;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--color-ink-dim)]">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-[11px] text-[var(--color-ink-faint)] leading-relaxed">
          {hint}
        </span>
      )}
    </label>
  );
}
