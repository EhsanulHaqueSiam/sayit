import type { Provider, Settings } from "@/types";
import { DEFAULT_SYSTEM_PROMPT } from "./presets";

export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-haiku-4-5",
  openai: "gpt-4o-mini",
  google: "gemini-2.0-flash",
  "openai-compat": "llama-3.3-70b-versatile",
};

export const STORAGE_SETTINGS = "sayit.settings.v2";
export const STORAGE_TRANSCRIPT = "sayit.transcript.v2";

export const INITIAL_SETTINGS: Settings = {
  mode: "regular",
  language: "en-US",
  continuous: true,
  provider: "anthropic",
  model: DEFAULT_MODELS.anthropic,
  baseUrl: "",
  apiKey: "",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  theme: "",
  activePreset: "polish",
  translateTarget: "English",
};
