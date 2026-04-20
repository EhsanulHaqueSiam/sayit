import type { Preset, PresetKey } from "@/types";

export const PRESETS: Record<PresetKey, Preset> = {
  polish: {
    label: "Polish",
    prompt: `Fix grammar, capitalization, and punctuation in the transcript below. Add sensible paragraph breaks. Honor inline spoken commands like "delete that last line" or "make that more professional". Preserve the user's voice. Return ONLY the polished text — no preamble, no quotes.`,
  },
  professional: {
    label: "Professional",
    prompt: `Rewrite the transcript in a clear, professional tone suitable for business communication. Fix grammar and punctuation. Tighten verbose phrasing. Preserve all substantive content. Return ONLY the rewritten text.`,
  },
  casual: {
    label: "Casual",
    prompt: `Rewrite the transcript in a relaxed, natural, conversational tone — like a friendly message. Fix grammar. Keep it warm but not sloppy. Return ONLY the rewritten text.`,
  },
  bullets: {
    label: "Bullets",
    prompt: `Convert the transcript into a tight list of bullet points. Capture every substantive idea; drop filler. Use "- " as the bullet marker. Return ONLY the bullet list.`,
  },
  summarize: {
    label: "Summarize",
    prompt: `Summarize the transcript in 2–4 sentences, capturing the key points and intent. Return ONLY the summary.`,
  },
  email: {
    label: "Email",
    prompt: `Rewrite the transcript as a polished email. Infer a sensible subject line from the content. Format as:\n\nSubject: <subject>\n\n<body>\n\nReturn ONLY the formatted email.`,
  },
  translate: {
    label: "Translate",
    needsTarget: true,
  },
  custom: {
    label: "Custom",
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
