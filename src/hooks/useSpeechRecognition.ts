import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SpeechRecognitionInstance,
  SRErrorEvent,
  SREvent,
} from "@/types";

export interface SpeechRecognitionOptions {
  language: string;
  continuous: boolean;
  onFinal?: (chunk: string) => void;
  onInterim?: (chunk: string) => void;
  onError?: (kind: string) => void;
  onAutoEnd?: () => void;
}

export interface SpeechRecognitionApi {
  supported: boolean;
  listening: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

export function useSpeechRecognition(
  opts: SpeechRecognitionOptions,
): SpeechRecognitionApi {
  const { language, continuous, onFinal, onInterim, onError, onAutoEnd } = opts;

  const [listening, setListening] = useState(false);
  const recogRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldRestartRef = useRef(false);
  const listeningRef = useRef(false);

  const supported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const getOrCreate = useCallback((): SpeechRecognitionInstance | null => {
    if (recogRef.current) return recogRef.current;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return null;
    const r = new Ctor();
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = () => {
      listeningRef.current = true;
      setListening(true);
    };
    r.onerror = (e: SRErrorEvent) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      onError?.(e.error);
    };
    r.onend = () => {
      if (shouldRestartRef.current) {
        try {
          r.start();
          return;
        } catch {
          /* ignore restart failure and fall through to stop */
        }
      }
      listeningRef.current = false;
      setListening(false);
      onAutoEnd?.();
    };
    r.onresult = (event: SREvent) => {
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const txt = result[0].transcript;
        if (result.isFinal) onFinal?.(txt);
        else interimChunk += txt;
      }
      onInterim?.(interimChunk);
    };

    recogRef.current = r;
    return r;
  }, [onError, onFinal, onInterim, onAutoEnd]);

  const start = useCallback(() => {
    const r = getOrCreate();
    if (!r) return;
    r.lang = language;
    r.continuous = continuous;
    shouldRestartRef.current = continuous;
    try {
      r.start();
    } catch {
      /* already started */
    }
  }, [continuous, getOrCreate, language]);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    const r = recogRef.current;
    if (!r) return;
    try {
      r.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    if (listeningRef.current) stop();
    else start();
  }, [start, stop]);

  // If language changes while listening, restart with new locale.
  useEffect(() => {
    if (listeningRef.current) {
      stop();
      const id = window.setTimeout(start, 150);
      return () => window.clearTimeout(id);
    }
  }, [language, start, stop]);

  // Pre-warm: construct the recognition instance + attach handlers on mount
  // so the very first call to start() doesn't pay construction cost.
  useEffect(() => {
    getOrCreate();
  }, [getOrCreate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      try {
        recogRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return { supported, listening, start, stop, toggle };
}
