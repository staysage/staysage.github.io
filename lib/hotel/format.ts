import { createTranslator, languageLocale } from "@/lib/i18n";
import type { Language, Rule, SupportedCurrency } from "./types";

export function clampNum(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function fmtMoney(
  n: number,
  currency: SupportedCurrency,
  language: Language = "zh"
) {
  return new Intl.NumberFormat(languageLocale(language), {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export function fmtInt(n: number, language: Language = "zh") {
  return new Intl.NumberFormat(languageLocale(language), {
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtPct(n: number, language: Language = "zh") {
  return new Intl.NumberFormat(languageLocale(language), {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(n);
}

export function zhe(netRatio: number, language: Language = "zh") {
  const t = createTranslator(language);
  const z = netRatio * 10;
  return t("format.discount", { value: z.toFixed(2) });
}

export function ruleSummary(
  rule: Rule,
  currency: SupportedCurrency,
  language: Language = "zh",
  voucherNameById?: (id: string) => string | undefined
) {
  const t = createTranslator(language);
  const trigger = rule.trigger;
  const reward = rule.reward;

  const trig =
    trigger.type === "per_night"
      ? t("ruleSummary.perNight")
      : trigger.type === "per_stay"
        ? t("ruleSummary.perStay")
        : trigger.type === "spend"
          ? t("ruleSummary.spend", {
              amount: trigger.amount,
              currency,
              repeat: trigger.repeat ? t("ruleSummary.spend.repeat") : "",
            })
          : t("ruleSummary.milestone", { threshold: trigger.threshold });

  const rew =
    reward.type === "points"
      ? t("ruleSummary.reward.points", { points: reward.points })
      : reward.type === "multiplier"
        ? t("ruleSummary.reward.multiplier", { multiplier: reward.z })
        : t("ruleSummary.reward.voucher", {
            count: reward.count,
            name: reward.voucherId
              ? voucherNameById?.(reward.voucherId) ?? t("ruleSummary.reward.voucher.unknown")
              : t("ruleSummary.reward.voucher.unknown"),
          });

  return `${trig} → ${rew}`;
}
