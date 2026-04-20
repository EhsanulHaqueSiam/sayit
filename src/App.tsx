import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Topbar } from "@/components/Topbar";
import { Stage } from "@/components/Stage";
import { TranscriptPanel, type TranscriptPanelHandle } from "@/components/TranscriptPanel";
import { AIPanel } from "@/components/AIPanel";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { Toaster } from "@/components/Toaster";
import { UnsupportedNotice } from "@/components/UnsupportedNotice";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useListenTimer } from "@/hooks/useListenTimer";
import { useAudioMeter } from "@/hooks/useAudioMeter";
import { useToasts } from "@/hooks/useToasts";
import { INITIAL_SETTINGS, STORAGE_SETTINGS } from "@/lib/constants";
import { resolvePresetPrompt } from "@/lib/presets";
import { callAI } from "@/lib/ai";
import { detectSupport } from "@/lib/browser";
import type { PresetKey, Settings, Theme } from "@/types";

const THEME_ORDER: Theme[] = ["", "dark", "light"];
const NOTICE_DISMISSED_KEY = "sayit.unsupported-dismissed.v1";
const LIVE_TRANSLATE_DEBOUNCE_MS = 180;

interface RunAIOptions {
  promptForTranslateTarget?: boolean;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  sourceText?: string;
  trackRunning?: boolean;
}

export default function App() {
  const [settings, setSettings] = useLocalStorage<Settings>(
    STORAGE_SETTINGS,
    INITIAL_SETTINGS,
  );
  const [transcript, setTranscript] = useState("");
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
  const { toasts, push, dismiss } = useToasts();
  const transcriptRef = useRef(transcript);
  const settingsRef = useRef(settings);
  const interimRef = useRef("");
  const liveTranslateTimerRef = useRef<number | null>(null);
  const liveTranslateInFlightRef = useRef(false);
  const liveTranslateQueuedRef = useRef(false);
  const lastLiveTranslateInputRef = useRef("");
  const liveTranslateSessionRef = useRef(0);
  const wasListeningRef = useRef(false);

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

  // Theme → <html data-theme>. On change, tag <html> with
  // .theme-transitioning for 360ms so color/bg/border animate smoothly
  // across the whole document, then remove so per-element hover
  // transitions aren't slowed down.
  const firstThemePaintRef = useRef(true);
  useLayoutEffect(() => {
    const html = document.documentElement;
    if (settings.theme) {
      html.dataset.theme = settings.theme;
    } else {
      delete html.dataset.theme;
    }
    if (firstThemePaintRef.current) {
      firstThemePaintRef.current = false;
      return;
    }
    html.classList.add("theme-transitioning");
    const timer = window.setTimeout(() => {
      html.classList.remove("theme-transitioning");
    }, 360);
    return () => window.clearTimeout(timer);
  }, [settings.theme]);

  // ---- AI runner (defined before hooks that reference it) ----
  const runAI = useCallback(
    async (preset: PresetKey, options: RunAIOptions = {}) => {
      const {
        promptForTranslateTarget = preset === "translate",
        showSuccessToast = true,
        showErrorToast = true,
        sourceText,
        trackRunning = true,
      } = options;
      const text = (sourceText ?? transcriptRef.current).trim();
      if (!text) {
        if (showErrorToast) {
          push("Nothing to run — record or type something first", "info");
        }
        return;
      }
      const s = settingsRef.current;
      let translateTarget = (s.translateTarget || "English").trim();
      if (preset === "translate" && promptForTranslateTarget) {
        const target = window.prompt(
          "Translate into which language?",
          translateTarget,
        );
        if (!target) return;
        translateTarget = target.trim();
      }
      update({ activePreset: preset, translateTarget });
      // Guard: empty API key would fail at the network layer with a cryptic
      // message. Stop here and nudge the user to Settings.
      if (!s.apiKey.trim()) {
        if (showErrorToast) {
          push("No API key set — add one in Settings to run presets", "err", {
            action: {
              label: "Open",
              onClick: () => setSettingsOpen(true),
            },
          });
        }
        return;
      }
      setAIError(null);
      if (trackRunning) setRunningPreset(preset);
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
        if (showSuccessToast) push("Done", "ok");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setAIError(msg);
        if (showErrorToast) push(msg, "err");
      } finally {
        if (trackRunning) setRunningPreset(null);
      }
    },
    [push, update],
  );

  const clearLiveTranslateTimer = useCallback(() => {
    if (liveTranslateTimerRef.current !== null) {
      window.clearTimeout(liveTranslateTimerRef.current);
      liveTranslateTimerRef.current = null;
    }
  }, []);

  const getLiveTranslateInput = useCallback(() => {
    const committed = transcriptRef.current.trim();
    const interim = interimRef.current.trim();
    if (!interim) return committed;
    return committed ? `${committed} ${interim}` : interim;
  }, []);

  const triggerLiveTranslate = useCallback(() => {
    const runNext = () => {
      const s = settingsRef.current;
      if (s.mode !== "ai" || s.activePreset !== "translate") return;
      const input = getLiveTranslateInput();
      if (!input) return;
      const dedupeKey = `${liveTranslateSessionRef.current}:${s.translateTarget}::${input}`;

      if (liveTranslateInFlightRef.current) {
        liveTranslateQueuedRef.current = true;
        return;
      }
      if (dedupeKey === lastLiveTranslateInputRef.current) return;

      liveTranslateInFlightRef.current = true;
      lastLiveTranslateInputRef.current = dedupeKey;
      void runAI("translate", {
        promptForTranslateTarget: false,
        showSuccessToast: false,
        showErrorToast: false,
        sourceText: input,
        trackRunning: false,
      }).finally(() => {
        liveTranslateInFlightRef.current = false;
        if (!liveTranslateQueuedRef.current) return;
        liveTranslateQueuedRef.current = false;
        const nextSettings = settingsRef.current;
        const nextInput = getLiveTranslateInput();
        const nextKey = `${liveTranslateSessionRef.current}:${nextSettings.translateTarget}::${nextInput}`;
        if (nextInput && nextKey !== lastLiveTranslateInputRef.current) {
          runNext();
        }
      });
    };

    runNext();
  }, [getLiveTranslateInput, runAI]);

  const scheduleLiveTranslate = useCallback(() => {
    const s = settingsRef.current;
    if (s.mode !== "ai" || s.activePreset !== "translate") return;
    if (!getLiveTranslateInput()) return;
    clearLiveTranslateTimer();
    liveTranslateTimerRef.current = window.setTimeout(() => {
      liveTranslateTimerRef.current = null;
      triggerLiveTranslate();
    }, LIVE_TRANSLATE_DEBOUNCE_MS);
  }, [clearLiveTranslateTimer, getLiveTranslateInput, triggerLiveTranslate]);

  // ---- Speech recognition ----
  // Hot path: push directly into the DOM via an imperative ref so no
  // top-level React render fires per interim/final event.
  const handleFinal = useCallback(
    (chunk: string) => {
      const trimmed = chunk.trim();
      if (!trimmed) return;
      interimRef.current = "";
      transcriptApiRef.current?.appendFinal(trimmed);
      scheduleLiveTranslate();
    },
    [scheduleLiveTranslate],
  );
  const handleInterim = useCallback((chunk: string) => {
    interimRef.current = chunk;
    transcriptApiRef.current?.setInterim(chunk);
    if (chunk.trim()) scheduleLiveTranslate();
  }, [scheduleLiveTranslate]);
  const handleSRError = useCallback(
    (err: string) => push(`Speech error: ${err}`, "err", 2400),
    [push],
  );
  const handleAutoEnd = useCallback(() => {
    const trailingInterim = interimRef.current.trim();
    if (trailingInterim) {
      transcriptApiRef.current?.appendFinal(trailingInterim);
    }
    transcriptApiRef.current?.clearInterim();
    transcriptApiRef.current?.releaseInsertionAnchor();
    interimRef.current = "";
    clearLiveTranslateTimer();
    const s = settingsRef.current;
    if (s.mode === "ai" && transcriptRef.current.trim()) {
      void runAI(s.activePreset, {
        promptForTranslateTarget: false,
        showSuccessToast: s.activePreset !== "translate",
      });
    }
  }, [clearLiveTranslateTimer, runAI]);

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

  // Listening → body.is-listening, so the ambient background and any
  // ancestor-scoped listening styles share a single source of truth.
  useEffect(() => {
    document.body.classList.toggle("is-listening", listening);
    return () => {
      document.body.classList.remove("is-listening");
    };
  }, [listening]);

  // Pause ambient CSS animations when the tab isn't visible.
  // CSS animations keep running in hidden tabs by default; toggling
  // body.tab-hidden flips animation-play-state to paused so background
  // tabs stop burning CPU on the 90s drift + 2.6s rail breath.
  useEffect(() => {
    const apply = () => {
      document.body.classList.toggle("tab-hidden", document.hidden);
    };
    apply();
    document.addEventListener("visibilitychange", apply);
    return () => {
      document.removeEventListener("visibilitychange", apply);
      document.body.classList.remove("tab-hidden");
    };
  }, []);

  // Preserve the user's scroll position across the listening toggle.
  // The Stage swap (FullStage ⇄ FocusStrip) and the transcript editor's
  // min-height change combine to shift document height by hundreds of
  // pixels. Without this, when dictation finishes the user's viewport
  // appears to "jump to the top" because the content above the transcript
  // grew. Browser scroll-anchoring should compensate, but Motion's
  // transform-based entry breaks anchor detection. We capture scrollY +
  // documentHeight on each toggle, and after the animation settles
  // (~620ms) we adjust scroll by the height delta so the user keeps
  // looking at the same content they were before.
  const scrollPreserveRef = useRef({ y: 0, h: 0 });
  const scrollPreserveTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const startY = window.scrollY;
    const startH = document.documentElement.scrollHeight;
    scrollPreserveRef.current = { y: startY, h: startH };

    if (scrollPreserveTimerRef.current !== null) {
      window.clearTimeout(scrollPreserveTimerRef.current);
    }
    scrollPreserveTimerRef.current = window.setTimeout(() => {
      scrollPreserveTimerRef.current = null;
      // Skip if user was already at the top — they meant to be there.
      if (startY <= 4) return;
      const endH = document.documentElement.scrollHeight;
      const delta = endH - startH;
      if (Math.abs(delta) < 8) return;
      const target = Math.max(0, startY + delta);
      // Skip if the browser already adjusted scroll (anchoring worked).
      if (Math.abs(window.scrollY - target) < 8) return;
      window.scrollTo({ top: target, behavior: "auto" });
    }, 620);

    return () => {
      if (scrollPreserveTimerRef.current !== null) {
        window.clearTimeout(scrollPreserveTimerRef.current);
        scrollPreserveTimerRef.current = null;
      }
    };
  }, [listening]);

  useEffect(() => {
    if (listening && !wasListeningRef.current) {
      liveTranslateSessionRef.current += 1;
      lastLiveTranslateInputRef.current = "";
      liveTranslateQueuedRef.current = false;
    }
    wasListeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    if (!listening || settings.mode !== "ai" || settings.activePreset !== "translate") {
      clearLiveTranslateTimer();
      liveTranslateQueuedRef.current = false;
      return;
    }
    scheduleLiveTranslate();
  }, [
    clearLiveTranslateTimer,
    listening,
    scheduleLiveTranslate,
    settings.activePreset,
    settings.mode,
    settings.translateTarget,
  ]);

  useEffect(() => {
    if (!listening || settings.mode !== "ai" || settings.activePreset !== "translate") return;
    if (!transcript.trim() && !interimRef.current.trim()) return;
    scheduleLiveTranslate();
  }, [listening, scheduleLiveTranslate, settings.activePreset, settings.mode, transcript]);

  useEffect(() => clearLiveTranslateTimer, [clearLiveTranslateTimer]);

  // ---- Hotkeys ----
  // Hold Space to talk, release to stop. Enabled over <select> so hitting
  // Space right after picking a language still works. Also enabled over
  // contenteditable so cursor-position dictation works while editing text.
  const spaceHeldRef = useRef(false);
  const spacePendingRef = useRef<{ fromEditable: boolean } | null>(null);
  const spaceFromEditableRef = useRef(false);
  const [spaceHeld, setSpaceHeld] = useState(false);

  // Morph window — while the wordmark's shared-layout animation is
  // running, pause any CSS keyframe transforms on the wordmark (breathe
  // etc.) so they don't fight Motion's layout interpolation. The window
  // opens on every listening/spaceHeld flip and closes after the spring
  // has had time to settle (~620ms covers the 550ms spring + slack).
  const morphClassTimerRef = useRef<number | null>(null);
  useEffect(() => {
    document.body.classList.add("is-morphing");
    if (morphClassTimerRef.current !== null) {
      window.clearTimeout(morphClassTimerRef.current);
    }
    morphClassTimerRef.current = window.setTimeout(() => {
      document.body.classList.remove("is-morphing");
      morphClassTimerRef.current = null;
    }, 620);
    return () => {
      if (morphClassTimerRef.current !== null) {
        window.clearTimeout(morphClassTimerRef.current);
        morphClassTimerRef.current = null;
      }
      document.body.classList.remove("is-morphing");
    };
  }, [listening, spaceHeld]);

  const insertSpaceIntoActiveEditor = useCallback(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !active.isContentEditable) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(" ");
    range.insertNode(node);
    const after = document.createRange();
    after.setStartAfter(node);
    after.collapse(true);
    selection.removeAllRanges();
    selection.addRange(after);
    active.dispatchEvent(new Event("input", { bubbles: true }));
  }, []);

  useEffect(() => {
    const isSpaceKey = (e: KeyboardEvent) => e.code === "Space" || e.key === " ";
    const inEditable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        Boolean(target.closest("[contenteditable='true']")));
    const inBlockedTextField = (target: EventTarget | null) =>
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
    const inSelect = (target: EventTarget | null) => target instanceof HTMLSelectElement;
    const inBlockedInteractive = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      Boolean(
        target.closest(
          "button,a,[role='button'],[role='checkbox'],[role='switch']",
        ),
      );

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isSpaceKey(e)) return;
      const target = e.target;
      const fromEditable = inEditable(target);
      const fromSelect = inSelect(target);
      if (
        !fromEditable &&
        !fromSelect &&
        (inBlockedTextField(target) || inBlockedInteractive(target))
      ) {
        return;
      }
      if (!canDictate) return;

      e.preventDefault();
      // If currently held-dictating, keep consuming repeats.
      if (spaceHeldRef.current) return;

      // Start dictation only on repeat => actual "hold", not tap.
      if (e.repeat) {
        if (listening) return;
        spacePendingRef.current = null;
        transcriptApiRef.current?.captureInsertionAnchor();
        spaceHeldRef.current = true;
        setSpaceHeld(true);
        start();
        return;
      }

      // Initial keydown: mark as pending tap/hold decision.
      if (!listening) {
        spacePendingRef.current = { fromEditable };
        spaceFromEditableRef.current = fromEditable;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!isSpaceKey(e)) return;
      if (!spaceHeldRef.current && !spacePendingRef.current) return;
      e.preventDefault();
      const wasHolding = spaceHeldRef.current;
      if (spaceHeldRef.current) {
        spaceHeldRef.current = false;
        setSpaceHeld(false);
        stop();
      }
      if (!wasHolding && spacePendingRef.current?.fromEditable) {
        insertSpaceIntoActiveEditor();
      }
      spacePendingRef.current = null;
      spaceFromEditableRef.current = false;
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, [canDictate, insertSpaceIntoActiveEditor, listening, start, stop]);

  useHotkeys(
    "escape",
    () => setSettingsOpen(false),
    { enabled: settingsOpen },
    [settingsOpen],
  );

  // If the window loses focus mid-hold (alt-tab, etc.), clear state.
  useEffect(() => {
    const blur = () => {
      spacePendingRef.current = null;
      spaceFromEditableRef.current = false;
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
    // Snapshot what we're about to wipe so the toast can restore it.
    const snapshot = {
      transcript: transcriptRef.current,
      aiOutput,
      aiError,
    };
    clearLiveTranslateTimer();
    liveTranslateQueuedRef.current = false;
    lastLiveTranslateInputRef.current = "";
    interimRef.current = "";
    transcriptApiRef.current?.reset();
    setTranscript("");
    setAIOutput("");
    setAIError(null);
    resetTimer();

    const hadContent =
      snapshot.transcript.trim().length > 0 || snapshot.aiOutput.trim().length > 0;
    if (!hadContent) return;

    push("Draft cleared", "info", {
      ttl: 8000,
      action: {
        label: "Undo",
        onClick: () => {
          transcriptApiRef.current?.setText(snapshot.transcript);
          setTranscript(snapshot.transcript);
          setAIOutput(snapshot.aiOutput);
          setAIError(snapshot.aiError);
        },
      },
    });
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
      <h1 className="sr-only">SayIt — voice dictation for writers</h1>
      <Topbar
        mode={settings.mode}
        theme={settings.theme}
        onToggleMode={() =>
          update({ mode: settings.mode === "ai" ? "regular" : "ai" })
        }
        onCycleTheme={cycleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        className="enter enter--topbar"
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

        <section className="enter enter--panels flex flex-col">
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
            <div className="focus-dim">
              <AIPanel
                output={aiOutput}
                activePreset={settings.activePreset}
                runningPreset={runningPreset}
                errorMessage={aiError}
                onRunPreset={(k) => void runAI(k)}
                onRetry={() => void runAI(settings.activePreset)}
                onCopy={() => void copyTarget("ai")}
                onUseAsTranscript={useAIAsTranscript}
              />
            </div>
          )}
        </section>
      </main>

      <footer
        className="focus-hide enter enter--footer py-6 border-t border-[var(--color-line-soft)]
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
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
