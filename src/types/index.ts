export type Mode = "regular" | "ai";

export type Provider = "anthropic" | "openai" | "google" | "openai-compat";

export type PresetKey =
  | "polish"
  | "professional"
  | "casual"
  | "bullets"
  | "summarize"
  | "email"
  | "translate"
  | "custom";

export type Theme = "" | "light" | "dark";

export interface Settings {
  mode: Mode;
  language: string;
  continuous: boolean;
  provider: Provider;
  model: string;
  baseUrl: string;
  apiKey: string;
  systemPrompt: string;
  theme: Theme;
  activePreset: PresetKey;
  translateTarget: string;
}

export interface Preset {
  label: string;
  description: string;
  prompt?: string;
  needsTarget?: boolean;
  useUserSystemPrompt?: boolean;
}

/* ---------- Web Speech API typings (lean) ---------- */
export interface SRResult {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
}
export interface SREvent extends Event {
  resultIndex: number;
  results: ArrayLike<SRResult>;
}
export interface SRErrorEvent extends Event {
  error: string;
}
export interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((e: Event) => void) | null;
  onend: ((e: Event) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onresult: ((e: SREvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: { new (): SpeechRecognitionInstance };
    webkitSpeechRecognition?: { new (): SpeechRecognitionInstance };
  }
}
