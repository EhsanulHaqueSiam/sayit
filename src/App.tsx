import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Topbar } from "@/components/Topbar";
import { Stage } from "@/components/Stage";
import { TranscriptPanel, type TranscriptPanelHandle } from "@/components/TranscriptPanel";
import { AIPanel } from "@/components/AIPanel";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { Toaster } from "@/components/Toaster";
import { UnsupportedNotice } from "@/components/UnsupportedNotice";
import { useLocalStorage, usePersistentString } from "@/hooks/useLocalStorage";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useListenTimer } from "@/hooks/useListenTimer";
import { useAudioMeter } from "@/hooks/useAudioMeter";
import { useToasts } from "@/hooks/useToasts";
import { INITIAL_SETTINGS, STORAGE_SETTINGS, STORAGE_TRANSCRIPT } from "@/lib/constants";
import { resolvePresetPrompt } from "@/lib/presets";
import { callAI } from "@/lib/ai";
import { detectSupport } from "@/lib/browser";
import type { PresetKey, Settings, Theme } from "@/types";

const THEME_ORDER: Theme[] = ["", "dark", "light"];
const NOTICE_DISMISSED_KEY = "sayit.unsupported-dismissed.v1";

export default function App() {
  const [settings, setSettings] = useLocalStorage<Settings>(
    STORAGE_SETTINGS,
    INITIAL_SETTINGS,
  );
  const [transcript, setTranscript] = usePersistentString(STORAGE_TRANSCRIPT, "");
  const [aiOutput, setAIOutput] = useState("");
  const transcriptApiRef = useRef<TranscriptPanelHandle>(null);
  const [runningPreset, setRunningPreset] = useState<PresetKey | null>(null);
  const [aiError, setAIError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(NOTICE_DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const supportReason = useMemo(() => detectSupport(), []);
  const canDictate = supportReason === "ok";
  const { toasts, push } = useToasts();
  const transcriptRef = useRef(transcript);
  const settingsRef = useRef(settings);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const update = useCallback(
    (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })),
    [setSettings],
  );

  // Theme → <html data-theme>
  useLayoutEffect(() => {
    if (settings.theme) {
      document.documentElement.dataset.theme = settings.theme;
    } else {
      delete document.documentElement.dataset.theme;
    }
  }, [settings.theme]);

  // ---- AI runner (defined before hooks that reference it) ----
  const runAI = useCallback(
    async (preset: PresetKey) => {
      const text = transcriptRef.current.trim();
      if (!text) {
        push("Nothing to run — record or type something first", "info");
        return;
      }
      const s = settingsRef.current;
      let translateTarget = s.translateTarget;
      if (preset === "translate") {
        const target = window.prompt(
          "Translate into which language?",
          translateTarget || "English",
        );
        if (!target) return;
        translateTarget = target.trim();
      }
      update({ activePreset: preset, translateTarget });
      setAIError(null);
      setRunningPreset(preset);
      try {
        const out = await callAI({
          provider: s.provider,
          apiKey: s.apiKey,
          model: s.model,
          baseUrl: s.baseUrl,
          systemPrompt: resolvePresetPrompt(preset, s.systemPrompt, translateTarget),
          userText: text,
        });
        setAIOutput(out.trim());
        push("Done", "ok");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setAIError(msg);
        push(msg.slice(0, 120), "err", 2800);
      } finally {
        setRunningPreset(null);
      }
    },
    [push, update],
  );

  // ---- Speech recognition ----
  // Hot path: push directly into the DOM via an imperative ref so no
  // top-level React render fires per interim/final event.
  const handleFinal = useCallback((chunk: string) => {
    const trimmed = chunk.trim();
    if (!trimmed) return;
    transcriptApiRef.current?.appendFinal(trimmed);
  }, []);
  const handleInterim = useCallback((chunk: string) => {
    transcriptApiRef.current?.setInterim(chunk);
  }, []);
  const handleSRError = useCallback(
    (err: string) => push(`Speech error: ${err}`, "err", 2400),
    [push],
  );
  const handleAutoEnd = useCallback(() => {
    transcriptApiRef.current?.clearInterim();
    const s = settingsRef.current;
    if (s.mode === "ai" && transcriptRef.current.trim()) {
      void runAI(s.activePreset);
    }
  }, [runAI]);

  const dismissNotice = () => {
    setNoticeDismissed(true);
    try {
      localStorage.setItem(NOTICE_DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const { listening, start, stop, toggle } = useSpeechRecognition({
    language: settings.language,
    continuous: settings.continuous,
    onFinal: handleFinal,
    onInterim: handleInterim,
    onError: handleSRError,
    onAutoEnd: handleAutoEnd,
  });

  const { elapsed, reset: resetTimer } = useListenTimer(listening);
  const meter = useAudioMeter(listening && canDictate);

  // ---- Hotkeys ----
  // Hold Space to talk, release to stop. Enabled over <select> so hitting
  // Space right after picking a language still works. Still disabled over
  // inputs / textareas / contenteditable so typing a space inserts a space.
  const spaceHeldRef = useRef(false);
  const [spaceHeld, setSpaceHeld] = useState(false);

  useHotkeys(
    "space",
    (e) => {
      e.preventDefault();
      if (!canDictate) return;
      if (!listening && !spaceHeldRef.current) {
        spaceHeldRef.current = true;
        setSpaceHeld(true);
        start();
      }
    },
    {
      keydown: true,
      keyup: false,
      enableOnFormTags: ["select"],
      enableOnContentEditable: false,
      preventDefault: true,
    },
    [listening, start, canDictate],
  );

  useHotkeys(
    "space",
    () => {
      if (spaceHeldRef.current) {
        spaceHeldRef.current = false;
        setSpaceHeld(false);
        stop();
      }
    },
    {
      keydown: false,
      keyup: true,
      enableOnFormTags: ["select"],
      enableOnContentEditable: false,
    },
    [stop],
  );

  useHotkeys(
    "escape",
    () => setSettingsOpen(false),
    { enabled: settingsOpen },
    [settingsOpen],
  );

  // If the window loses focus mid-hold (alt-tab, etc.), clear state.
  useEffect(() => {
    const blur = () => {
      if (spaceHeldRef.current) {
        spaceHeldRef.current = false;
        setSpaceHeld(false);
        stop();
      }
    };
    window.addEventListener("blur", blur);
    return () => window.removeEventListener("blur", blur);
  }, [stop]);

  // ---- Actions ----
  const copyTarget = async (kind: "raw" | "ai") => {
    const text = (kind === "ai" ? aiOutput : transcript).trim();
    if (!text) {
      push("Nothing to copy", "info");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      push("Copied", "ok");
    } catch {
      push("Clipboard blocked", "err");
    }
  };

  const clearTranscript = () => {
    transcriptApiRef.current?.reset();
    setTranscript("");
    resetTimer();
  };

  const useAIAsTranscript = () => {
    if (!aiOutput.trim()) {
      push("No AI output yet", "info");
      return;
    }
    transcriptApiRef.current?.setText(aiOutput);
    setTranscript(aiOutput);
    push("Moved to transcript", "ok");
  };

  const cycleTheme = () => {
    const i = THEME_ORDER.indexOf(settings.theme);
    const next = THEME_ORDER[(i + 1) % THEME_ORDER.length];
    update({ theme: next });
    push(`Theme → ${next || "system"}`, "info");
  };

  const setLanguage = (lang: string) => {
    if (lang === settings.language) return;
    update({ language: lang });
    push(`Language → ${lang}`, "info", 1000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar
        mode={settings.mode}
        theme={settings.theme}
        onToggleMode={() =>
          update({ mode: settings.mode === "ai" ? "regular" : "ai" })
        }
        onCycleTheme={cycleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {!canDictate && !noticeDismissed && (
        <UnsupportedNotice
          reason={supportReason as "firefox" | "no-api"}
          onDismiss={dismissNotice}
          onCopied={() => push("Link copied — paste into Chrome", "ok")}
        />
      )}

      <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 md:px-8 pb-16">
        <Stage
          listening={listening}
          spaceHeld={spaceHeld}
          canDictate={canDictate}
          mode={settings.mode}
          language={settings.language}
          meter={meter}
          onToggle={() => {
            if (!canDictate) {
              push(
                supportReason === "firefox"
                  ? "Firefox can't run dictation — open in Chrome or Edge"
                  : "Web Speech API missing — try Chrome or Edge",
                "err",
                2400,
              );
              return;
            }
            toggle();
          }}
        />

        <section
          className={`grid gap-6 ${
            settings.mode === "ai" ? "lg:grid-cols-2" : ""
          }`}
        >
          <TranscriptPanel
            ref={transcriptApiRef}
            text={transcript}
            listening={listening}
            language={settings.language}
            elapsedMs={elapsed}
            onTextChange={setTranscript}
            onLanguageChange={setLanguage}
            onClear={clearTranscript}
            onCopy={() => void copyTarget("raw")}
            onEnter={
              settings.mode === "ai"
                ? () => void runAI(settings.activePreset)
                : undefined
            }
          />
          {settings.mode === "ai" && (
            <AIPanel
              output={aiOutput}
              activePreset={settings.activePreset}
              runningPreset={runningPreset}
              errorMessage={aiError}
              onRunPreset={(k) => void runAI(k)}
              onCopy={() => void copyTarget("ai")}
              onUseAsTranscript={useAIAsTranscript}
            />
          )}
        </section>
      </main>

      <footer
        className="py-6 border-t border-[var(--color-line-soft)]
                   text-center font-mono text-[11px] tracking-[0.2em]
                   uppercase text-[var(--color-ink-faint)]"
      >
        Web Speech · BYO model · No tracking
      </footer>

      <SettingsDrawer
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onChange={update}
      />
      <Toaster toasts={toasts} />
    </div>
  );
}
