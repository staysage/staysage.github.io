import type { Rule } from "./types";
import { ruleTemplate } from "./defaults";

type Translator = (key: string, vars?: Record<string, unknown>) => string;

export const normalizeRules = (rules: Rule[]): Rule[] =>
  rules.map((rule): Rule =>
    rule.trigger.type === "milestone"
      ? {
          ...rule,
          trigger: { ...rule.trigger, metric: "nights" as const },
        }
      : rule
  );

export const buildRule = (
  triggerType: "per_night" | "per_stay" | "milestone" | "spend"
): Rule => {
  const base = ruleTemplate("");
  if (triggerType === "per_night") return { ...base, trigger: { type: "per_night" } };
  if (triggerType === "per_stay") return { ...base, trigger: { type: "per_stay" } };
  if (triggerType === "spend") {
    return { ...base, trigger: { type: "spend", amount: 1000, repeat: false } };
  }
  return { ...base, trigger: { type: "milestone", metric: "nights", threshold: 3 } };
};

export const autoRuleName = (
  t: Translator,
  rule: Rule,
  voucherNameById?: (id: string) => string | undefined
) => {
  const trigger = rule.trigger.type;
  const reward = rule.reward;
  if (trigger === "milestone") {
    return t("rule.auto.milestone", { nights: rule.trigger.threshold });
  }
  if (trigger === "spend") {
    return t("rule.auto.spend");
  }
  if (trigger === "per_stay") {
    if (reward.type === "points") {
      return t("rule.auto.perStay.points", { points: reward.points });
    }
    if (reward.type === "multiplier") {
      return t("rule.auto.perStay.multiplier", { multiplier: reward.z });
    }
    return t("rule.auto.perStay.voucher", {
      count: reward.count,
      name: voucherNameById?.(reward.voucherId) ?? t("ruleSummary.reward.voucher.unknown"),
    });
  }
  if (reward.type === "multiplier") {
    return t("rule.auto.perNight.multiplier", { multiplier: reward.z });
  }
  if (reward.type === "points") {
    return t("rule.auto.perNight.points", { points: reward.points });
  }
  return t("rule.auto.perNight.voucher", {
    count: reward.count,
    name: voucherNameById?.(reward.voucherId) ?? t("ruleSummary.reward.voucher.unknown"),
  });
};

export const ruleDisplayName = (
  t: Translator,
  rule: Rule,
  voucherNameById?: (id: string) => string | undefined
) => {
  const name = rule.name?.trim();
  return name ? name : autoRuleName(t, rule, voucherNameById);
};
