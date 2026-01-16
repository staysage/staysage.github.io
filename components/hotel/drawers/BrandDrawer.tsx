"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Drawer } from "@/components/hotel/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InfoTip } from "@/components/hotel/info-tip";
import { MoneyField, NumberField, SelectField, TextField } from "@/components/hotel/fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { Language, Program, Rule, SupportedCurrency, Voucher } from "@/lib/hotel/types";
import { mkElite, mkTier, mkVoucher, uid } from "@/lib/hotel/defaults";
import { ruleDisplayName } from "@/lib/hotel/rules";
import { ruleSummary } from "@/lib/hotel/format";

type Translator = (key: string, vars?: Record<string, unknown>) => string;

export function BrandDrawer({
  open,
  brandEditingId,
  brandPresetId,
  brandDraftState,
  onClose,
  onSave,
  onPresetChange,
  setBrandDraftState,
  autoInputClass,
  convertAmount,
  supportedCurrencies,
  currencyLabel,
  currency,
  language,
  brandLogo,
  formatEliteLabel,
  brandRulesOpen,
  onToggleRules,
  brandRulePickerKey,
  onBumpRulePickerKey,
  onOpenRuleEditor,
  onRequestDeleteRule,
  t,
}: {
  open: boolean;
  brandEditingId: string | null;
  brandPresetId: string;
  brandDraftState: Program | null;
  onClose: () => void;
  onSave: () => void;
  onPresetChange: (preset: string) => void;
  setBrandDraftState: React.Dispatch<React.SetStateAction<Program | null>>;
  autoInputClass: (auto?: boolean) => string | undefined;
  convertAmount: (amount: number, from: SupportedCurrency, to: SupportedCurrency) => number;
  supportedCurrencies: SupportedCurrency[];
  currencyLabel: (code: SupportedCurrency) => string;
  currency: SupportedCurrency;
  language: Language;
  brandLogo?: (name: string) => { src: string; alt: string } | undefined;
  formatEliteLabel: (label: string) => string;
  brandRulesOpen: boolean;
  onToggleRules: () => void;
  brandRulePickerKey: number;
  onBumpRulePickerKey: () => void;
  onOpenRuleEditor: (
    triggerType?: "per_night" | "per_stay" | "milestone" | "spend",
    ruleId?: string
  ) => void;
  onRequestDeleteRule: (ruleId: string) => void;
  t: Translator;
}) {
  const isStepper = true;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep(0);
  }, [open, brandEditingId]);

  const presetOptions = useMemo(
    () => [
      { value: "marriott", label: t("brand.preset.marriott") },
      { value: "ihg", label: t("brand.preset.ihg") },
      { value: "hyatt", label: t("brand.preset.hyatt") },
      { value: "hilton", label: t("brand.preset.hilton") },
      { value: "accor", label: t("brand.preset.accor") },
      { value: "wyndham", label: t("brand.preset.wyndham") },
      { value: "shangrila", label: t("brand.preset.shangrila") },
      { value: "atour", label: t("brand.preset.atour") },
      { value: "huazhu", label: t("brand.preset.huazhu") },
      { value: "custom", label: t("brand.preset.custom") },
    ],
    [t]
  );

  const sections = useMemo(() => {
    if (!brandDraftState) return [] as { id: string; title: string; content: React.ReactNode }[];
    const items: { id: string; title: string; content: React.ReactNode }[] = [];

    if (!brandEditingId) {
      items.push({
        id: "template",
        title: t("brand.template"),
        content: (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-2">
              {presetOptions.map((option) => {
                const logo = brandLogo?.(option.value);
                const isSelected = brandPresetId === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onPresetChange(option.value);
                      if (!brandEditingId) {
                        setStep(1);
                      }
                    }}
                    className={`group rounded-2xl border px-3 py-3 text-left transition ${
                      isSelected
                        ? "border-foreground/60 bg-white"
                        : "border-white/70 bg-white/70 hover:border-foreground/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl border bg-white/80 flex items-center justify-center">
                        {logo ? (
                          <Image src={logo.src} alt={logo.alt} width={26} height={26} />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {option.value === "custom" ? "?" : "••"}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium leading-tight">{option.label}</div>
                        {option.value === "custom" ? (
                          <div className="text-xs text-muted-foreground">
                            {t("brand.preset.customHint")}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ),
      });
    }

    items.push({
      id: "base",
      title: t("brand.name"),
      content: (
        <div className="space-y-3">
          <TextField
            label={t("brand.name")}
            value={brandDraftState.name}
            inputClassName={autoInputClass(brandDraftState.nameI18nAuto)}
            onChange={(v) =>
              setBrandDraftState((s) => (s ? { ...s, name: v, nameI18nAuto: false } : s))
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField
              label={t("brand.logo")}
              value={brandDraftState.logoUrl ?? ""}
              onChange={(v) => setBrandDraftState((s) => (s ? { ...s, logoUrl: v } : s))}
            />
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">{t("brand.color")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="h-9 w-12 p-1"
                  value={brandDraftState.brandColor ?? "#94A3B8"}
                  onChange={(e) =>
                    setBrandDraftState((s) => (s ? { ...s, brandColor: e.target.value } : s))
                  }
                />
                <Input
                  value={brandDraftState.brandColor ?? ""}
                  placeholder="#RRGGBB"
                  onChange={(e) =>
                    setBrandDraftState((s) => (s ? { ...s, brandColor: e.target.value } : s))
                  }
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectField
              label={t("brand.currency")}
              value={brandDraftState.currency}
              onChange={(v) =>
                setBrandDraftState((s) => {
                  if (!s) return s;
                  const nextCurrency = v as SupportedCurrency;
                  const pointAmount = convertAmount(
                    s.settings.pointValue.amount,
                    s.settings.pointValue.currency,
                    nextCurrency
                  );
                  return {
                    ...s,
                    currency: nextCurrency,
                    settings: {
                      ...s.settings,
                      pointValue: {
                        amount: Number(pointAmount.toFixed(4)),
                        currency: nextCurrency,
                      },
                      vouchers: s.settings.vouchers.map((voucher) => ({
                        ...voucher,
                        valueCash: {
                          ...voucher.valueCash,
                          amount: Math.round(
                            convertAmount(
                              voucher.valueCash.amount,
                              voucher.valueCash.currency,
                              nextCurrency
                            )
                          ),
                          currency: nextCurrency,
                        },
                      })),
                    },
                  };
                })
              }
              options={supportedCurrencies.map((c) => ({ value: c, label: currencyLabel(c) }))}
            />
            <SelectField
              label={t("brand.earnBase")}
              value={brandDraftState.settings.earnBase}
              onChange={(v) =>
                setBrandDraftState((s) =>
                  s
                    ? {
                        ...s,
                        settings: {
                          ...s.settings,
                          earnBase: v as Program["settings"]["earnBase"],
                        },
                      }
                    : s
                )
              }
              options={[
                { value: "PRE_TAX", label: t("brand.earnBase.preTax") },
                { value: "POST_TAX", label: t("brand.earnBase.postTax") },
              ]}
            />
            <div className="md:col-span-2 max-w-md">
              <MoneyField
                label={t("brand.pointValue")}
                amount={brandDraftState.settings.pointValue.amount}
                currency={brandDraftState.settings.pointValue.currency}
                onAmountChange={(v) =>
                  setBrandDraftState((s) =>
                    s
                      ? {
                          ...s,
                          settings: {
                            ...s.settings,
                            pointValue: {
                              ...s.settings.pointValue,
                              amount: Math.max(0, v),
                            },
                          },
                        }
                      : s
                  )
                }
                onCurrencyChange={(v) =>
                  setBrandDraftState((s) =>
                    s
                      ? {
                          ...s,
                          settings: {
                            ...s.settings,
                            pointValue: {
                              ...s.settings.pointValue,
                              currency: v as SupportedCurrency,
                            },
                          },
                        }
                      : s
                  )
                }
                currencyOptions={supportedCurrencies.map((c) => ({
                  value: c,
                  label: currencyLabel(c),
                }))}
              />
            </div>
          </div>
        </div>
      ),
    });

    items.push({
      id: "tiers",
      title: t("brand.tiers"),
      content: (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="font-medium">{t("brand.tiers")}</div>
            <InfoTip title={t("common.tip")} ariaLabel={t("tips.tier")}
              >{t("brand.tiers.tip", { currency: brandDraftState.currency })}</InfoTip>
          </div>
          <div className="text-xs text-muted-foreground">{t("brand.tiers.note")}</div>
          <div className="space-y-2">
            {brandDraftState.brandTiers.map((bt, idx) => (
              <div
                key={bt.id}
                className="grid grid-cols-[minmax(0,1fr)_100px_90px] md:grid-cols-[minmax(0,1fr)_120px_140px] gap-2 items-end"
              >
                <TextField
                  label={idx === 0 ? t("brand.tier.name") : ""}
                  value={bt.label}
                  inputClassName={autoInputClass(bt.i18nAuto)}
                  onChange={(v) =>
                    setBrandDraftState((s) =>
                      s
                        ? {
                            ...s,
                            brandTiers: s.brandTiers.map((x) =>
                              x.id === bt.id ? { ...x, label: v, i18nAuto: false } : x
                            ),
                          }
                        : s
                    )
                  }
                />
                <NumberField
                  label={idx === 0 ? t("brand.tier.rate") : ""}
                  value={bt.ratePerUsd}
                  step={0.5}
                  inputClassName="w-full max-w-[120px]"
                  onChange={(v) =>
                    setBrandDraftState((s) =>
                      s
                        ? {
                            ...s,
                            brandTiers: s.brandTiers.map((x) =>
                              x.id === bt.id ? { ...x, ratePerUsd: Math.max(0, v) } : x
                            ),
                          }
                        : s
                    )
                  }
                />
                <Button
                  variant="ghost"
                  className="rounded-2xl justify-center px-2 md:justify-start md:px-3 whitespace-nowrap"
                  onClick={() =>
                    setBrandDraftState((s) =>
                      s
                        ? {
                            ...s,
                            brandTiers: s.brandTiers.filter((x) => x.id !== bt.id),
                          }
                        : s
                    )
                  }
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  <span className="text-xs">{t("brand.tier.remove")}</span>
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={() =>
                setBrandDraftState((s) =>
                  s
                    ? {
                        ...s,
                        brandTiers: [
                          ...s.brandTiers,
                          mkTier(t("brand.tier.new"), 10, { i18nAuto: false }),
                        ],
                      }
                    : s
                )
              }
            >
              <Plus className="w-4 h-4 mr-2" /> {t("brand.tier.add")}
            </Button>
          </div>
        </div>
      ),
    });

    items.push({
      id: "subBrands",
      title: t("brand.subBrands"),
      content: (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="font-medium">{t("brand.subBrands")}</div>
            <div className="text-xs text-muted-foreground">{t("brand.subBrand.optional")}</div>
          </div>
          {brandDraftState.subBrands.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t("brand.subBrand.empty")}</div>
          ) : null}
          <div className="space-y-2">
            {brandDraftState.subBrands.map((subBrand, idx) => (
              <div
                key={subBrand.id}
                className="grid grid-cols-[minmax(0,1fr)_140px_90px] md:grid-cols-[minmax(0,1fr)_200px_140px] gap-2 items-end"
              >
                <TextField
                  label={idx === 0 ? t("brand.subBrand.name") : ""}
                  value={subBrand.name}
                  inputClassName={autoInputClass(subBrand.i18nAuto)}
                  onChange={(v) =>
                    setBrandDraftState((s) =>
                      s
                        ? {
                            ...s,
                            subBrands: s.subBrands.map((x) =>
                              x.id === subBrand.id
                                ? { ...x, name: v, i18nAuto: false }
                                : x
                            ),
                          }
                        : s
                    )
                  }
                />
                <SelectField
                  label={idx === 0 ? t("brand.subBrand.tier") : ""}
                  value={subBrand.tierId}
                  onChange={(v) =>
                    setBrandDraftState((s) =>
                      s
                        ? {
                            ...s,
                            subBrands: s.subBrands.map((x) =>
                              x.id === subBrand.id ? { ...x, tierId: v } : x
                            ),
                          }
                        : s
                    )
                  }
                  options={brandDraftState.brandTiers.map((tier) => ({
                    value: tier.id,
                    label: tier.label,
                  }))}
                />
                <Button
                  variant="ghost"
                  className="rounded-2xl justify-center px-2 md:justify-start md:px-3 whitespace-nowrap"
                  onClick={() =>
                    setBrandDraftState((s) =>
                      s
                        ? {
                            ...s,
                            subBrands: s.subBrands.filter((x) => x.id !== subBrand.id),
                          }
                        : s
                    )
                  }
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  <span className="text-xs">{t("brand.subBrand.remove")}</span>
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={() =>
                setBrandDraftState((s) =>
                  s
                    ? {
                        ...s,
                        subBrands: [
                          ...s.subBrands,
                          {
                            id: uid(),
                            name: t("brand.subBrand.new"),
                            tierId: s.brandTiers[0]?.id ?? "",
                            i18nAuto: false,
                          },
                        ],
                      }
                    : s
                )
              }
            >
              <Plus className="w-4 h-4 mr-2" /> {t("brand.subBrand.add")}
            </Button>
          </div>
        </div>
      ),
    });

    items.push({
      id: "elite",
      title: t("brand.elite"),
      content: (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="font-medium">{t("brand.elite")}</div>
            <InfoTip title={t("brand.elite.tip.title")} ariaLabel={t("tips.elite")}
              >{t("brand.elite.tip")}</InfoTip>
          </div>
          <div className="space-y-2">
            {brandDraftState.eliteTiers.map((e, idx) => (
              <div
                key={e.id}
                className="grid grid-cols-[minmax(0,1fr)_100px_90px] md:grid-cols-[minmax(0,1fr)_120px_140px] gap-2 items-end"
              >
                <TextField
                  label={idx === 0 ? t("brand.elite.name") : ""}
                  value={e.label}
                  inputClassName={autoInputClass(e.i18nAuto)}
                  onChange={(v) =>
                    setBrandDraftState((s) =>
                      s
                        ? {
                            ...s,
                            eliteTiers: s.eliteTiers.map((x) =>
                              x.id === e.id ? { ...x, label: v, i18nAuto: false } : x
                            ),
                          }
                        : s
                    )
                  }
                />
                <NumberField
                  label={idx === 0 ? t("brand.elite.bonus") : ""}
                  value={Math.round(e.bonusRate * 1000) / 10}
                  step={1}
                  inputClassName="w-full max-w-[100px]"
                  onChange={(v) =>
                    setBrandDraftState((s) =>
                      s
                        ? {
                            ...s,
                            eliteTiers: s.eliteTiers.map((x) =>
                              x.id === e.id
                                ? { ...x, bonusRate: Math.max(0, v) / 100 }
                                : x
                            ),
                          }
                        : s
                    )
                  }
                  suffix="%"
                />
                <Button
                  variant="ghost"
                  className="rounded-2xl justify-center px-2 md:justify-start md:px-3 whitespace-nowrap"
                  onClick={() =>
                    setBrandDraftState((s) =>
                      s
                        ? {
                            ...s,
                            eliteTiers: s.eliteTiers.filter((x) => x.id !== e.id),
                          }
                        : s
                    )
                  }
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  <span className="text-xs">{t("brand.elite.remove")}</span>
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={() =>
                setBrandDraftState((s) =>
                  s
                    ? {
                        ...s,
                        eliteTiers: [
                          ...s.eliteTiers,
                          mkElite(t("brand.elite.new"), 0, { i18nAuto: false }),
                        ],
                      }
                    : s
                )
              }
            >
              <Plus className="w-4 h-4 mr-2" /> {t("brand.elite.add")}
            </Button>
          </div>
        </div>
      ),
    });

    items.push({
      id: "vouchers",
      title: t("brand.vouchers"),
      content: (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-medium">{t("brand.vouchers")}</div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={brandDraftState.settings.voucherEnabled}
                onCheckedChange={(v) =>
                  setBrandDraftState((s) => {
                    if (!s) return s;
                    const enable = Boolean(v);
                    const hasVoucher = s.settings.vouchers.length > 0;
                    return {
                      ...s,
                      settings: {
                        ...s.settings,
                        voucherEnabled: enable,
                        vouchers:
                          enable && !hasVoucher
                            ? [
                                mkVoucher(
                                  t("brand.voucher.default"),
                                  "POINTS",
                                  { amount: 0, currency: s.currency },
                                  0
                                ),
                              ]
                            : s.settings.vouchers,
                      },
                    };
                  })
                }
                id="voucher-enabled"
              />
              <Label htmlFor="voucher-enabled" className="cursor-pointer text-sm">
                {t("brand.voucher.enabled")}
              </Label>
            </div>
          </div>
          {brandDraftState.settings.voucherEnabled ? (
            <div className="max-w-[220px]">
              <SelectField
                label={t("brand.voucher.valueMode")}
                value={brandDraftState.settings.vouchers[0]?.valueMode ?? "POINTS"}
                onChange={(v) =>
                  setBrandDraftState((s) =>
                    s
                      ? {
                          ...s,
                          settings: {
                            ...s.settings,
                            vouchers: s.settings.vouchers.map((x) => ({
                              ...x,
                              valueMode: v as Voucher["valueMode"],
                            })),
                          },
                        }
                      : s
                  )
                }
                options={[
                  { value: "CASH", label: t("brand.voucher.mode.cash") },
                  { value: "POINTS", label: t("brand.voucher.mode.points") },
                ]}
              />
            </div>
          ) : null}
          {brandDraftState.settings.voucherEnabled ? (
            <div className="space-y-3">
              {brandDraftState.settings.vouchers.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t("brand.voucher.empty")}</div>
              ) : null}
              {brandDraftState.settings.vouchers.map((voucher, idx) => (
                <div
                  key={voucher.id}
                  className="grid grid-cols-[minmax(0,1fr)_120px_90px] lg:grid-cols-[minmax(0,1fr)_120px_90px] gap-2 items-end"
                >
                  <TextField
                    label={idx === 0 ? t("brand.voucher.name") : ""}
                    value={voucher.name}
                    onChange={(v) =>
                      setBrandDraftState((s) =>
                        s
                          ? {
                              ...s,
                              settings: {
                                ...s.settings,
                                vouchers: s.settings.vouchers.map((x) =>
                                  x.id === voucher.id ? { ...x, name: v } : x
                                ),
                              },
                            }
                          : s
                      )
                    }
                  />
                  {voucher.valueMode === "CASH" ? (
                    <NumberField
                      label={idx === 0 ? t("brand.voucher.value.cash") : ""}
                      value={voucher.valueCash.amount}
                      step={10}
                      inputClassName="w-full"
                      onChange={(v) =>
                        setBrandDraftState((s) =>
                          s
                            ? {
                                ...s,
                                settings: {
                                  ...s.settings,
                                  vouchers: s.settings.vouchers.map((x) =>
                                    x.id === voucher.id
                                      ? {
                                          ...x,
                                          valueCash: {
                                            ...x.valueCash,
                                            amount: Math.max(0, v),
                                          },
                                        }
                                      : x
                                  ),
                                },
                              }
                            : s
                        )
                      }
                      suffix={brandDraftState.currency}
                    />
                  ) : (
                    <NumberField
                      label={idx === 0 ? t("brand.voucher.value.points") : ""}
                      value={voucher.valuePoints}
                      step={1000}
                      inputClassName="w-full"
                      onChange={(v) =>
                        setBrandDraftState((s) =>
                          s
                            ? {
                                ...s,
                                settings: {
                                  ...s.settings,
                                  vouchers: s.settings.vouchers.map((x) =>
                                    x.id === voucher.id
                                      ? { ...x, valuePoints: Math.max(0, v) }
                                      : x
                                  ),
                                },
                              }
                            : s
                        )
                      }
                    />
                  )}
                  <Button
                    variant="ghost"
                    className="rounded-2xl justify-center px-2 lg:justify-start lg:px-3 whitespace-nowrap"
                    onClick={() =>
                      setBrandDraftState((s) =>
                        s
                          ? {
                              ...s,
                              settings: {
                                ...s.settings,
                                vouchers: s.settings.vouchers.filter((x) => x.id !== voucher.id),
                              },
                            }
                          : s
                      )
                    }
                  >
                    <Trash2 className="w-4 h-4 lg:mr-2" />
                    <span className="text-xs">{t("brand.voucher.remove")}</span>
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() =>
                  setBrandDraftState((s) =>
                    s
                      ? {
                          ...s,
                          settings: {
                            ...s.settings,
                            vouchers: [
                              ...s.settings.vouchers,
                              mkVoucher(
                                t("brand.voucher.new"),
                                (s.settings.vouchers[0]?.valueMode ??
                                  "POINTS") as Voucher["valueMode"],
                                { amount: 0, currency: s.currency },
                                0
                              ),
                            ],
                          },
                        }
                      : s
                  )
                }
              >
                <Plus className="w-4 h-4 mr-2" /> {t("brand.voucher.add")}
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{t("brand.voucher.disabled")}</div>
          )}
        </div>
      ),
    });

    items.push({
      id: "promos",
      title: t("brand.promos"),
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium">{t("brand.promos")}</div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="rounded-2xl" onClick={onToggleRules}>
                {brandRulesOpen ? t("common.collapse") : t("common.expand")}
              </Button>
              <Select
                key={`brand-rule-${brandRulePickerKey}`}
                onValueChange={(v) => {
                  if (!v) return;
                  onOpenRuleEditor(v as Rule["trigger"]["type"]);
                  onBumpRulePickerKey();
                }}
              >
                <SelectTrigger className="rounded-2xl bg-secondary text-secondary-foreground h-9 w-auto px-3 shadow-none border-0">
                  <SelectValue placeholder={t("brand.rules.addRule")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_night">{t("brand.rules.type.perNight")}</SelectItem>
                  <SelectItem value="per_stay">{t("brand.rules.type.perStay")}</SelectItem>
                  <SelectItem value="spend">{t("brand.rules.type.spend")}</SelectItem>
                  <SelectItem value="milestone">{t("brand.rules.type.milestone")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {brandRulesOpen ? (
            <div className="space-y-3">
              {brandDraftState.settings.rules.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t("list.noRules")}</div>
              ) : null}
              {brandDraftState.settings.rules.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.2)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">
                        {ruleDisplayName(t, r, (id) =>
                          brandDraftState?.settings.vouchers.find((voucher) => voucher.id === id)
                            ?.name
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {ruleSummary(r, currency, language, (id) =>
                          brandDraftState?.settings.vouchers.find((voucher) => voucher.id === id)
                            ?.name
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-2xl"
                        onClick={() => onOpenRuleEditor(undefined, r.id)}
                        title={t("brand.rules.edit")}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-2xl"
                        onClick={() => onRequestDeleteRule(r.id)}
                        title={t("brand.rules.delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ),
    });

    return items;
  }, [
    brandDraftState,
    brandEditingId,
    brandLogo,
    brandPresetId,
    brandRulesOpen,
    brandRulePickerKey,
    convertAmount,
    currency,
    currencyLabel,
    isStepper,
    language,
    onBumpRulePickerKey,
    onOpenRuleEditor,
    onPresetChange,
    onToggleRules,
    presetOptions,
    setBrandDraftState,
    supportedCurrencies,
    t,
  ]);

  const activeSection = sections[step] ?? sections[0];
  const totalSteps = sections.length;
  const stepHeader = isStepper ? (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>{t("common.step", { current: step + 1, total: totalSteps })}</span>
      <span>{activeSection?.title}</span>
    </div>
  ) : null;

  const footer = isStepper ? (
    <div className="flex items-center justify-between gap-2">
      {step > 0 ? (
        <Button variant="secondary" className="rounded-2xl" onClick={() => setStep(step - 1)}>
          {t("common.prev")}
        </Button>
      ) : (
        <Button variant="secondary" className="rounded-2xl" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      )}
      {step < totalSteps - 1 ? (
        activeSection?.id === "template" ? null : (
          <Button className="rounded-2xl" onClick={() => setStep(step + 1)}>
            {t("common.next")}
          </Button>
        )
      ) : (
        <Button className="rounded-2xl" onClick={onSave}>
          {t("dialog.brand.footer.save")}
        </Button>
      )}
    </div>
  ) : (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" className="rounded-2xl" onClick={onClose}>
        {t("dialog.brand.footer.cancel")}
      </Button>
      <Button className="rounded-2xl" onClick={onSave}>
        {t("dialog.brand.footer.save")}
      </Button>
    </div>
  );

  const previewLogo =
    brandDraftState?.logoUrl || (brandDraftState ? brandLogo?.(brandDraftState.name)?.src : "");
  const sharedHints = brandDraftState ? (
    <div className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/70 p-3 space-y-3">
      <div className="text-xs font-medium text-slate-500">{t("common.tip")}</div>
      <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-xs text-amber-900/80">
        <div className="font-medium text-amber-900">{t("brand.i18nAuto.title")}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="h-8 w-24 rounded-lg border border-dashed border-amber-300/80 bg-amber-50/70" />
          <span>{t("brand.i18nAuto.body")}</span>
        </div>
      </div>
      <div className="w-full max-w-[420px]">
        <div className="text-xs text-muted-foreground mb-2">{t("brand.preview.title")}</div>
        <div className="relative rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur shadow-[0_12px_30px_-18px_rgba(15,23,42,0.25)]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: brandDraftState.brandColor ?? "#94A3B8" }}
                />
                <div className="font-medium">
                  {brandDraftState.name || t("brand.preview.placeholder")}
                </div>
              </div>
              {brandDraftState.settings.rules.length ? (
                <div className="space-y-1">
                  {brandDraftState.settings.rules.slice(0, 2).map((rule) => (
                    <div key={rule.id} className="text-xs text-muted-foreground">
                      {ruleDisplayName(t, rule, (id) =>
                        brandDraftState.settings.vouchers.find((voucher) => voucher.id === id)
                          ?.name
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">{t("list.noPromos")}</div>
              )}
              <SelectField
                label={t("brand.currentTier")}
                value={brandDraftState.settings.eliteTierId}
                onChange={(v) =>
                  setBrandDraftState((s) =>
                    s ? { ...s, settings: { ...s.settings, eliteTierId: v } } : s
                  )
                }
                options={brandDraftState.eliteTiers.map((e) => ({
                  value: e.id,
                  label: formatEliteLabel(e.label),
                }))}
              />
            </div>
          </div>
          {previewLogo ? (
            <div className="absolute top-3 right-3 h-[28px] w-[72px] flex items-center justify-end opacity-70">
              <Image
                src={previewLogo}
                alt={brandDraftState.name || "Brand"}
                width={72}
                height={28}
                className="h-full w-auto max-w-full object-contain"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <Drawer
      open={open}
      title={brandEditingId ? t("dialog.brand.edit.title") : t("dialog.brand.add.title")}
      onClose={onClose}
      footer={footer}
    >
      {brandDraftState ? (
        <div className="space-y-4">
          {stepHeader}
          {activeSection?.id === "template" ? null : sharedHints}
          {isStepper ? (
            <div className="space-y-4">{activeSection?.content}</div>
          ) : (
            <div className="space-y-6">
              {sections.map((section, idx) => (
                <div key={section.id} className={idx === 0 ? "" : "pt-4 border-t"}>
                  <div className="text-sm font-medium mb-2">{section.title}</div>
                  {section.content}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
      )}
    </Drawer>
  );
}
