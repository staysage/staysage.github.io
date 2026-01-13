import type { Language } from "@/lib/hotel/types";
import { en } from "@/locales/en";
import { es } from "@/locales/es";
import { ja } from "@/locales/ja";
import { ko } from "@/locales/ko";
import { zh } from "@/locales/zh";
import { zhTw } from "@/locales/zh-TW";

export const messages = { en, es, ko, ja, zh, "zh-TW": zhTw };
export type LocaleKey = keyof typeof en;
type Params = Record<string, string | number | null | undefined>;

const STORAGE_KEY = "language";

export function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "zh";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "es" || stored === "ko" || stored === "ja") {
    return stored;
  }
  if (stored === "zh-TW") return "zh-TW";
  return "zh";
}

export function storeLanguage(language: Language) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // ignore storage failures
  }
}

function interpolate(template: string, params?: Params) {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = params[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function translate(language: Language, key: LocaleKey, params?: Params) {
  const dict = messages[language] ?? messages.zh;
  const template = dict[key] ?? messages.en[key] ?? key;
  return interpolate(template, params);
}

export function createTranslator(language: Language) {
  return (key: LocaleKey, params?: Params) => translate(language, key, params);
}

export function languageLocale(language: Language) {
  if (language === "en") return "en-US";
  if (language === "es") return "es-ES";
  if (language === "ko") return "ko-KR";
  if (language === "ja") return "ja-JP";
  if (language === "zh-TW") return "zh-TW";
  return "zh-CN";
}
