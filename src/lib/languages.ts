export const LANGUAGES: ReadonlyArray<readonly [string, string]> = [
  ["en-US", "English (US)"],
  ["en-GB", "English (UK)"],
  ["en-AU", "English (AU)"],
  ["en-IN", "English (India)"],
  ["es-ES", "Español (España)"],
  ["es-MX", "Español (México)"],
  ["es-AR", "Español (Argentina)"],
  ["fr-FR", "Français"],
  ["fr-CA", "Français (Canada)"],
  ["de-DE", "Deutsch"],
  ["it-IT", "Italiano"],
  ["pt-BR", "Português (Brasil)"],
  ["pt-PT", "Português (Portugal)"],
  ["nl-NL", "Nederlands"],
  ["pl-PL", "Polski"],
  ["sv-SE", "Svenska"],
  ["no-NO", "Norsk"],
  ["da-DK", "Dansk"],
  ["fi-FI", "Suomi"],
  ["cs-CZ", "Čeština"],
  ["el-GR", "Ελληνικά"],
  ["tr-TR", "Türkçe"],
  ["ru-RU", "Русский"],
  ["uk-UA", "Українська"],
  ["ar-SA", "العربية"],
  ["he-IL", "עברית"],
  ["fa-IR", "فارسی"],
  ["hi-IN", "हिन्दी"],
  ["bn-BD", "বাংলা (বাংলাদেশ)"],
  ["bn-IN", "বাংলা (ভারত)"],
  ["ur-PK", "اردو"],
  ["ta-IN", "தமிழ்"],
  ["te-IN", "తెలుగు"],
  ["mr-IN", "मराठी"],
  ["th-TH", "ไทย"],
  ["vi-VN", "Tiếng Việt"],
  ["id-ID", "Bahasa Indonesia"],
  ["ms-MY", "Bahasa Melayu"],
  ["ja-JP", "日本語"],
  ["ko-KR", "한국어"],
  ["zh-CN", "中文 (普通话)"],
  ["zh-TW", "中文 (臺灣)"],
  ["zh-HK", "中文 (香港)"],
];

function toFlagEmoji(region: string): string {
  return region
    .toUpperCase()
    .replace(
      /[A-Z]/g,
      (char) => String.fromCodePoint(127397 + char.charCodeAt(0)),
    );
}

export function languageFlag(code: string): string {
  const parts = code.split("-");
  const region = parts.find((part) => /^[A-Z]{2}$/.test(part));
  if (!region) return "🌐";
  return toFlagEmoji(region);
}
