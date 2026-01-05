import type { Language, Rule, SupportedCurrency } from "./types";

export function clampNum(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function fmtMoney(n: number, currency: SupportedCurrency) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export function fmtInt(n: number) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtPct(n: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(n);
}

export function zhe(netRatio: number, language: Language = "zh") {
  const z = netRatio * 10;
  return language === "en" ? `${z.toFixed(2)}x` : `${z.toFixed(2)} 折`;
}

export function ruleSummary(
  rule: Rule,
  currency: SupportedCurrency,
  language: Language = "zh"
) {
  const t = rule.trigger;
  const r = rule.reward;

  const trig =
    t.type === "per_night"
      ? language === "en"
        ? "Per night"
        : "每晚"
      : t.type === "per_stay"
        ? language === "en"
          ? "Per stay"
          : "每次入住"
        : t.type === "spend"
          ? language === "en"
            ? `Spend ≥ ${t.amount} ${currency}${t.repeat ? " (each threshold)" : ""}`
            : `消费≥${t.amount} ${currency}${t.repeat ? "（每满一次）" : ""}`
          : language === "en"
            ? `At ${t.threshold} nights`
            : `满${t.threshold}晚`;

  const rew =
    r.type === "points"
      ? language === "en"
        ? `+${r.points} pts`
        : `+${r.points} 点`
      : r.type === "multiplier"
        ? language === "en"
          ? `Base ×${r.z}`
          : `基础×${r.z}`
        : language === "en"
          ? `+${r.count} FN`
          : `+${r.count} FN（免费房晚）`;

  return `${trig} → ${rew}`;
}
