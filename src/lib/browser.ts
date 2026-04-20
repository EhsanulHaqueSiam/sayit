export function isFirefox(): boolean {
  if (typeof navigator === "undefined") return false;
  return /firefox/i.test(navigator.userAgent);
}

export function hasSpeechAPI(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export type SupportReason = "ok" | "firefox" | "no-api";

export function detectSupport(): SupportReason {
  if (isFirefox()) return "firefox"; // Firefox exposes the API behind a flag but has no backend
  if (!hasSpeechAPI()) return "no-api";
  return "ok";
}
