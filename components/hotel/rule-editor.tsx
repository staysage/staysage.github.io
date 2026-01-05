"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import type { Language, Rule, SupportedCurrency } from "@/lib/hotel/types";
import { ruleSummary } from "@/lib/hotel/format";
import { NumberField, SelectField, TextField } from "@/components/hotel/fields";

export function RuleEditor({
  rule,
  currency,
  language = "zh",
  nameMode = "auto",
  autoName,
  onNameFocus,
  onUpdate,
  onRemove,
}: {
  rule: Rule;
  currency: SupportedCurrency;
  language?: Language;
  nameMode?: "auto" | "manual";
  autoName?: string;
  onNameFocus?: () => void;
  onUpdate: (patch: Partial<Rule>) => void;
  onRemove: () => void;
}) {
  const tt = (zh: string, en: string) => (language === "en" ? en : zh);
  const t = rule.trigger;
  const r = rule.reward;

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
                {tt("启用", "Enabled")}
              </Label>
            </div>
            <div className="text-xs text-muted-foreground">
            {ruleSummary(rule, currency, language)}
            </div>
          </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          title={tt("删除规则", "Delete rule")}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SelectField
          label={tt("触发器", "Trigger")}
          value={t.type}
          onChange={(v) => {
            if (v === "per_night") onUpdate({ trigger: { type: "per_night" } });
            else if (v === "per_stay") onUpdate({ trigger: { type: "per_stay" } });
            else if (v === "spend")
              onUpdate({ trigger: { type: "spend", amount: 1000, repeat: false } });
            else onUpdate({ trigger: { type: "milestone", metric: "nights", threshold: 3 } });
          }}
          options={[
            { value: "per_night", label: tt("每晚奖励", "Per night") },
            { value: "per_stay", label: tt("每次入住", "Per stay") },
            { value: "spend", label: tt("消费门槛", "Spend threshold") },
            { value: "milestone", label: tt("里程碑", "Milestone") },
          ]}
        />

        {t.type === "spend" ? (
          <>
            <NumberField
              label={tt(
                `消费阈值（税前，${currency}）`,
                `Spend threshold (pre-tax, ${currency})`
              )}
              value={t.amount}
              step={10}
              onChange={(v) => onUpdate({ trigger: { ...t, amount: Math.max(0, v) } })}
            />
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                checked={t.repeat}
                onCheckedChange={(v) => onUpdate({ trigger: { ...t, repeat: Boolean(v) } })}
                id={`rp-${rule.id}`}
              />
              <Label htmlFor={`rp-${rule.id}`} className="cursor-pointer text-sm">
                {tt("每满一次", "Repeat per threshold")}
              </Label>
            </div>
          </>
        ) : null}

        {t.type === "milestone" ? (
          <NumberField
            label={tt("阈值（≥N 晚）", "Threshold (≥N nights)")}
            value={t.threshold}
            step={1}
            onChange={(v) =>
              onUpdate({
                trigger: { ...t, metric: "nights", threshold: Math.max(1, Math.round(v)) },
              })
            }
          />
        ) : null}

        <SelectField
          label={tt("奖励类型", "Reward")}
          value={r.type}
          onChange={(v) => {
            if (v === "points") onUpdate({ reward: { type: "points", points: 1000 } });
            else if (v === "multiplier") onUpdate({ reward: { type: "multiplier", z: 2 } });
            else onUpdate({ reward: { type: "fn", count: 1 } });
          }}
          options={[
            { value: "points", label: tt("积分", "Points") },
            { value: "multiplier", label: tt("倍数", "Multiplier") },
            { value: "fn", label: tt("免费房晚", "FN (Free Night)") },
          ]}
        />

        {r.type === "points" ? (
          <NumberField
            label={tt("积分", "Points")}
            value={r.points}
            step={100}
            onChange={(v) => onUpdate({ reward: { ...r, points: Math.max(0, Math.round(v)) } })}
          />
        ) : null}

        {r.type === "multiplier" ? (
          <NumberField
            label={tt("倍数（基础积分）", "Multiplier (base points)")}
            value={r.z}
            step={0.5}
            onChange={(v) => onUpdate({ reward: { ...r, z: Math.max(1, v) } })}
          />
        ) : null}

        {r.type === "fn" ? (
          <NumberField
            label={tt("FN 数量（免费房晚）", "FN count (Free Night)")}
            value={r.count}
            step={1}
            onChange={(v) =>
              onUpdate({ reward: { ...r, count: Math.max(0, Math.round(v)) } })
            }
          />
        ) : null}
      </div>

      <TextField
        label={tt("规则名（可选）", "Rule name (optional)")}
        value={nameMode === "auto" ? autoName ?? "" : rule.name}
        onChange={(v) => onUpdate({ name: v })}
        onFocus={onNameFocus}
        placeholder={nameMode === "auto" ? tt("自动生成", "Auto") : undefined}
      />
    </div>
  );
}
