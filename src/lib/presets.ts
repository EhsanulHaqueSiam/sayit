import type { Preset, PresetKey } from "@/types";

/**
 * Presets speak the writer's language, not the tool's.
 * `label` is the verb the user would reach for; `description` is a one-line
 * italic caption shown in the More-styles popover and on hover of the chips.
 */
export const PRESETS: Record<PresetKey, Preset> = {
  polish: {
    label: "Tidy",
    description: "Fix grammar and punctuation, preserve your voice.",
    prompt: `Fix grammar, capitalization, and punctuation in the transcript below. Add sensible paragraph breaks. Honor inline spoken commands like "delete that last line" or "make that more professional". Preserve the user's voice. Return ONLY the polished text — no preamble, no quotes.`,
  },
  professional: {
    label: "Formalize",
    description: "A clean, business-register rewrite.",
    prompt: `Rewrite the transcript in a clear, professional tone suitable for business communication. Fix grammar and punctuation. Tighten verbose phrasing. Preserve all substantive content. Return ONLY the rewritten text.`,
  },
  casual: {
    label: "Loosen",
    description: "A warm, conversational rewrite.",
    prompt: `Rewrite the transcript in a relaxed, natural, conversational tone — like a friendly message. Fix grammar. Keep it warm but not sloppy. Return ONLY the rewritten text.`,
  },
  bullets: {
    label: "To bullets",
    description: "Compress to a tight bullet list.",
    prompt: `Convert the transcript into a tight list of bullet points. Capture every substantive idea; drop filler. Use "- " as the bullet marker. Return ONLY the bullet list.`,
  },
  summarize: {
    label: "Distill",
    description: "Two to four sentences, key points only.",
    prompt: `Summarize the transcript in 2–4 sentences, capturing the key points and intent. Return ONLY the summary.`,
  },
  email: {
    label: "As email",
    description: "Structured email with an inferred subject line.",
    prompt: `Rewrite the transcript as a polished email. Infer a sensible subject line from the content. Format as:\n\nSubject: <subject>\n\n<body>\n\nReturn ONLY the formatted email.`,
  },
  translate: {
    label: "Translate",
    description: "Render in any BCP-47 target language.",
    needsTarget: true,
  },
  custom: {
    label: "Custom",
    description: "Run your own system prompt from Settings.",
    useUserSystemPrompt: true,
  },
};

export const DEFAULT_SYSTEM_PROMPT = `You are a dictation cleanup assistant. Take the user's raw speech transcript and:
- Fix grammar, capitalization, and punctuation
- Add sensible paragraph breaks
- Honor inline commands like "delete that last line", "scratch everything let's start over", "make that more professional", "translate this to Spanish"
- Preserve the user's voice and meaning; do not embellish or rewrite beyond what's needed
- Return ONLY the final polished text. No preamble, no commentary, no quotes.`;

export function resolvePresetPrompt(
  key: PresetKey,
  userSystemPrompt: string,
  translateTarget: string,
): string {
  const p = PRESETS[key];
  if (p.useUserSystemPrompt) return userSystemPrompt || DEFAULT_SYSTEM_PROMPT;
  if (p.needsTarget) {
    const target = translateTarget || "English";
    return `Translate the transcript into ${target}. Preserve tone and meaning. Fix any transcription errors. Return ONLY the translation.`;
  }
  return p.prompt || DEFAULT_SYSTEM_PROMPT;
}
