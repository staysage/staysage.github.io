"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import type { Language, Rule, SupportedCurrency, Voucher } from "@/lib/hotel/types";
import { ruleSummary } from "@/lib/hotel/format";
import { createTranslator } from "@/lib/i18n";
import { NumberField, SelectField, TextField } from "@/components/hotel/fields";

export function RuleEditor({
  rule,
  currency,
  language = "zh",
  nameMode = "auto",
  autoName,
  onNameFocus,
  voucherEnabled = true,
  vouchers = [],
  onRequestVoucher,
  onUpdate,
  onRemove,
}: {
  rule: Rule;
  currency: SupportedCurrency;
  language?: Language;
  nameMode?: "auto" | "manual";
  autoName?: string;
  onNameFocus?: () => void;
  voucherEnabled?: boolean;
  vouchers?: Voucher[];
  onRequestVoucher?: () => void;
  onUpdate: (patch: Partial<Rule>) => void;
  onRemove: () => void;
}) {
  const t = createTranslator(language);
  const trigger = rule.trigger;
  const reward = rule.reward;
  const voucherMissing =
    reward.type === "voucher" &&
    !vouchers.some((voucher) => voucher.id === reward.voucherId);
  const voucherUnavailable =
    reward.type === "voucher" && (!voucherEnabled || voucherMissing);
  const rewardSelectValue =
    reward.type === "voucher"
      ? `voucher:${reward.voucherId}`
      : reward.type;

  return (
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={rule.enabled}
              onCheckedChange={(v) => onUpdate({ enabled: Boolean(v) })}
              id={`en-${rule.id}`}
            />
              <Label htmlFor={`en-${rule.id}`} className="cursor-pointer text-sm">
                {t("ruleEditor.enabled")}
              </Label>
            </div>
            <div className="text-xs text-muted-foreground">
            {ruleSummary(rule, currency, language, (id) =>
              vouchers.find((voucher) => voucher.id === id)?.name
            )}
            </div>
          </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          title={t("brand.rules.delete")}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SelectField
          label={t("ruleEditor.trigger")}
          value={trigger.type}
          onChange={(v) => {
            if (v === "per_night") onUpdate({ trigger: { type: "per_night" } });
            else if (v === "per_stay") onUpdate({ trigger: { type: "per_stay" } });
            else if (v === "spend")
              onUpdate({ trigger: { type: "spend", amount: 1000, repeat: false } });
            else onUpdate({ trigger: { type: "milestone", metric: "nights", threshold: 3 } });
          }}
          options={[
            { value: "per_night", label: t("ruleEditor.trigger.perNight") },
            { value: "per_stay", label: t("ruleEditor.trigger.perStay") },
            { value: "spend", label: t("ruleEditor.trigger.spend") },
            { value: "milestone", label: t("ruleEditor.trigger.milestone") },
          ]}
        />

        {trigger.type === "spend" ? (
          <>
            <NumberField
              label={t("ruleEditor.spendThreshold", { currency })}
              value={trigger.amount}
              step={10}
              onChange={(v) =>
                onUpdate({ trigger: { ...trigger, amount: Math.max(0, v) } })
              }
            />
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                checked={trigger.repeat}
                onCheckedChange={(v) =>
                  onUpdate({ trigger: { ...trigger, repeat: Boolean(v) } })
                }
                id={`rp-${rule.id}`}
              />
              <Label htmlFor={`rp-${rule.id}`} className="cursor-pointer text-sm">
                {t("ruleEditor.repeatThreshold")}
              </Label>
            </div>
          </>
        ) : null}

        {trigger.type === "milestone" ? (
          <NumberField
            label={t("ruleEditor.milestoneThreshold")}
            value={trigger.threshold}
            step={1}
            onChange={(v) =>
              onUpdate({
                trigger: {
                  ...trigger,
                  metric: "nights",
                  threshold: Math.max(1, Math.round(v)),
                },
              })
            }
          />
        ) : null}

        <SelectField
          label={t("ruleEditor.rewardType")}
          value={rewardSelectValue}
          onChange={(v) => {
            if (v === "points") onUpdate({ reward: { type: "points", points: 1000 } });
            else if (v === "multiplier") onUpdate({ reward: { type: "multiplier", z: 2 } });
            else if (v.startsWith("voucher:")) {
              const voucherId = v.replace("voucher:", "");
              onUpdate({ reward: { type: "voucher", voucherId, count: 1 } });
            }
          }}
          options={[
            { value: "points", label: t("ruleEditor.reward.points") },
            { value: "multiplier", label: t("ruleEditor.reward.multiplier") },
            ...vouchers.map((voucher) => ({
              value: `voucher:${voucher.id}`,
              label: voucher.name || t("ruleSummary.reward.voucher.unknown"),
            })),
          ]}
        />

        {reward.type === "points" ? (
          <NumberField
            label={t("ruleEditor.reward.points.label")}
            value={reward.points}
            step={100}
            onChange={(v) =>
              onUpdate({
                reward: { ...reward, points: Math.max(0, Math.round(v)) },
              })
            }
          />
        ) : null}

        {reward.type === "multiplier" ? (
          <NumberField
            label={t("ruleEditor.reward.multiplier.label")}
            value={reward.z}
            step={0.5}
            onChange={(v) =>
              onUpdate({ reward: { ...reward, z: Math.max(1, v) } })
            }
          />
        ) : null}

        {reward.type === "voucher" ? (
          <NumberField
            label={t("ruleEditor.reward.voucher.label")}
            value={reward.count}
            step={1}
            onChange={(v) =>
              onUpdate({ reward: { ...reward, count: Math.max(0, Math.round(v)) } })
            }
          />
        ) : null}
      </div>
      {voucherUnavailable ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span>{t("ruleEditor.reward.voucher.unavailable")}</span>
          {onRequestVoucher ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 rounded-lg"
              onClick={onRequestVoucher}
            >
              {t("ruleEditor.reward.voucher.action")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <TextField
        label={t("ruleEditor.name.label")}
        value={nameMode === "auto" ? autoName ?? "" : rule.name}
        onChange={(v) => onUpdate({ name: v })}
        onFocus={onNameFocus}
        placeholder={nameMode === "auto" ? t("ruleEditor.name.auto") : undefined}
      />
    </div>
  );
}
