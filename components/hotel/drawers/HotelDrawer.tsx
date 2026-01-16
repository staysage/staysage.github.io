"use client";

import { Drawer } from "@/components/hotel/drawer";
import { MoneyField, NumberField, SelectField, TextField } from "@/components/hotel/fields";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Pencil, Trash2 } from "lucide-react";
import type { HotelOption, Language, Program, SupportedCurrency } from "@/lib/hotel/types";
import { ruleDisplayName } from "@/lib/hotel/rules";
import { ruleSummary } from "@/lib/hotel/format";

type Translator = (key: string, vars?: Record<string, unknown>) => string;

export function HotelDrawer({
  open,
  hotelEditingId,
  hotelDraftState,
  programs,
  programById,
  preferredCurrency,
  supportedCurrencies,
  currencyLabel,
  taxInputMode,
  hotelRulesOpen,
  hotelRulePickerKey,
  onToggleRules,
  onBumpRulePickerKey,
  onOpenRuleEditor,
  onClose,
  onSave,
  onUpdateHotelDraft,
  onRequestDeleteRule,
  t,
  currency,
  language,
}: {
  open: boolean;
  hotelEditingId: string | null;
  hotelDraftState: HotelOption | null;
  programs: Program[];
  programById: Map<string, Program>;
  preferredCurrency: SupportedCurrency;
  supportedCurrencies: SupportedCurrency[];
  currencyLabel: (code: SupportedCurrency) => string;
  taxInputMode: "PRE_TAX_PLUS_RATE" | "POST_TAX_PLUS_RATE" | "PRE_AND_POST";
  hotelRulesOpen: boolean;
  hotelRulePickerKey: number;
  onToggleRules: () => void;
  onBumpRulePickerKey: () => void;
  onOpenRuleEditor: (
    triggerType?: "per_night" | "per_stay" | "milestone" | "spend",
    ruleId?: string
  ) => void;
  onClose: () => void;
  onSave: () => void;
  onUpdateHotelDraft: (patch: Partial<HotelOption>) => void;
  onRequestDeleteRule: (ruleId: string) => void;
  t: Translator;
  currency: SupportedCurrency;
  language: Language;
}) {
  return (
    <Drawer
      open={open}
      title={hotelEditingId ? t("dialog.hotel.edit.title") : t("dialog.hotel.add.title")}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" className="rounded-2xl" onClick={onClose}>
            {t("dialog.hotel.footer.cancel")}
          </Button>
          <Button className="rounded-2xl" onClick={onSave}>
            {t("dialog.hotel.footer.save")}
          </Button>
        </div>
      }
    >
      {hotelDraftState ? (
        <div className="space-y-5">
          <TextField
            label={t("hotel.name")}
            value={hotelDraftState.name}
            onChange={(v) => onUpdateHotelDraft({ name: v, nameI18nAuto: false })}
          />

          <SelectField
            label={t("hotel.brand")}
            value={hotelDraftState.programId}
            onChange={(v) => {
              const p = programById.get(v);
              const tierId = p?.brandTiers[0]?.id ?? "";
              const nextName = hotelDraftState.nameI18nAuto
                ? t("hotel.defaultName")
                : hotelDraftState.name;
              onUpdateHotelDraft({
                programId: v,
                brandTierId: tierId,
                subBrandId: null,
                name: nextName,
                nameI18nAuto: hotelDraftState.nameI18nAuto,
              });
            }}
            options={programs.map((p) => ({ value: p.id, label: p.name }))}
          />

          {(() => {
            const p = programById.get(hotelDraftState.programId);
            if (!p) {
              return <div className="text-sm text-muted-foreground">{t("hotel.brand.empty")}</div>;
            }

            return (
              <>
                {p.subBrands?.length ? (
                  <SelectField
                    label={t("hotel.subBrand")}
                    value={hotelDraftState.subBrandId ?? ""}
                    onChange={(v) => {
                      const prevSubBrand = p.subBrands.find(
                        (subBrand) => subBrand.id === hotelDraftState.subBrandId
                      );
                      const nextSubBrand = p.subBrands.find((subBrand) => subBrand.id === v);
                      const defaultName = t("hotel.defaultName");
                      const shouldRename =
                        !hotelDraftState.name ||
                        hotelDraftState.name === defaultName ||
                        (prevSubBrand && hotelDraftState.name === prevSubBrand.name);
                      onUpdateHotelDraft({
                        subBrandId: v || null,
                        brandTierId: nextSubBrand?.tierId ?? hotelDraftState.brandTierId,
                        name: v
                          ? shouldRename
                            ? nextSubBrand?.name ?? hotelDraftState.name
                            : hotelDraftState.name
                          : shouldRename
                            ? defaultName
                            : hotelDraftState.name,
                        nameI18nAuto: shouldRename ? true : hotelDraftState.nameI18nAuto,
                      });
                    }}
                    options={[
                      { value: "", label: t("hotel.subBrand.none") },
                      ...p.subBrands.map((subBrand) => ({
                        value: subBrand.id,
                        label: subBrand.name,
                      })),
                    ]}
                  />
                ) : null}
                <SelectField
                  label={t("hotel.brand.tier")}
                  value={hotelDraftState.brandTierId}
                  onChange={(v) => {
                    const subBrand = p.subBrands.find(
                      (sb) => sb.id === hotelDraftState.subBrandId
                    );
                    const resetName =
                      hotelDraftState.nameI18nAuto &&
                      subBrand &&
                      hotelDraftState.name === subBrand.name;
                    onUpdateHotelDraft({
                      brandTierId: v,
                      subBrandId: null,
                      name: resetName ? t("hotel.defaultName") : hotelDraftState.name,
                      nameI18nAuto: resetName ? true : hotelDraftState.nameI18nAuto,
                    });
                  }}
                  options={p.brandTiers.map((tier) => ({
                    value: tier.id,
                    label: t("hotel.brand.tier.option", {
                      label: tier.label,
                      rate: tier.ratePerUsd,
                      currency: p.currency,
                    }),
                  }))}
                />
                {taxInputMode === "PRE_TAX_PLUS_RATE" ? (
                  <MoneyField
                    label={t("hotel.rate.preTax")}
                    amount={hotelDraftState.ratePreTax?.amount ?? 0}
                    currency={hotelDraftState.ratePreTax?.currency ?? preferredCurrency}
                    onAmountChange={(v) =>
                      onUpdateHotelDraft({
                        ratePreTax: {
                          amount: Math.max(0, v),
                          currency: hotelDraftState.ratePreTax?.currency ?? preferredCurrency,
                        },
                      })
                    }
                    onCurrencyChange={(v) =>
                      onUpdateHotelDraft({
                        ratePreTax: {
                          amount: hotelDraftState.ratePreTax?.amount ?? 0,
                          currency: v as SupportedCurrency,
                        },
                      })
                    }
                    currencyOptions={supportedCurrencies.map((c) => ({
                      value: c,
                      label: currencyLabel(c),
                    }))}
                  />
                ) : taxInputMode === "POST_TAX_PLUS_RATE" ? (
                  <MoneyField
                    label={t("hotel.rate.postTax")}
                    amount={hotelDraftState.ratePostTax?.amount ?? 0}
                    currency={hotelDraftState.ratePostTax?.currency ?? preferredCurrency}
                    onAmountChange={(v) =>
                      onUpdateHotelDraft({
                        ratePostTax: {
                          amount: Math.max(0, v),
                          currency: hotelDraftState.ratePostTax?.currency ?? preferredCurrency,
                        },
                      })
                    }
                    onCurrencyChange={(v) =>
                      onUpdateHotelDraft({
                        ratePostTax: {
                          amount: hotelDraftState.ratePostTax?.amount ?? 0,
                          currency: v as SupportedCurrency,
                        },
                      })
                    }
                    currencyOptions={supportedCurrencies.map((c) => ({
                      value: c,
                      label: currencyLabel(c),
                    }))}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MoneyField
                      label={t("hotel.rate.preTax")}
                      amount={hotelDraftState.ratePreTax?.amount ?? 0}
                      currency={hotelDraftState.ratePreTax?.currency ?? preferredCurrency}
                      onAmountChange={(v) =>
                        onUpdateHotelDraft({
                          ratePreTax: {
                            amount: Math.max(0, v),
                            currency: hotelDraftState.ratePreTax?.currency ?? preferredCurrency,
                          },
                        })
                      }
                      onCurrencyChange={(v) =>
                        onUpdateHotelDraft({
                          ratePreTax: {
                            amount: hotelDraftState.ratePreTax?.amount ?? 0,
                            currency: v as SupportedCurrency,
                          },
                        })
                      }
                      currencyOptions={supportedCurrencies.map((c) => ({
                        value: c,
                        label: currencyLabel(c),
                      }))}
                    />
                    <MoneyField
                      label={t("hotel.rate.postTax")}
                      amount={hotelDraftState.ratePostTax?.amount ?? 0}
                      currency={hotelDraftState.ratePostTax?.currency ?? preferredCurrency}
                      onAmountChange={(v) =>
                        onUpdateHotelDraft({
                          ratePostTax: {
                            amount: Math.max(0, v),
                            currency: hotelDraftState.ratePostTax?.currency ?? preferredCurrency,
                          },
                        })
                      }
                      onCurrencyChange={(v) =>
                        onUpdateHotelDraft({
                          ratePostTax: {
                            amount: hotelDraftState.ratePostTax?.amount ?? 0,
                            currency: v as SupportedCurrency,
                          },
                        })
                      }
                      currencyOptions={supportedCurrencies.map((c) => ({
                        value: c,
                        label: currencyLabel(c),
                      }))}
                    />
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{t("hotel.promos")}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" className="rounded-2xl" onClick={onToggleRules}>
                      {hotelRulesOpen ? t("common.collapse") : t("common.expand")}
                    </Button>
                    <Select
                      key={`hotel-rule-${hotelRulePickerKey}`}
                      onValueChange={(v) => {
                        if (!v) return;
                        onOpenRuleEditor(v as any);
                        onBumpRulePickerKey();
                      }}
                    >
                      <SelectTrigger className="rounded-2xl bg-secondary text-secondary-foreground h-9 w-auto px-3 shadow-none border-0">
                        <SelectValue placeholder={t("hotel.rules.addRule")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_night">{t("hotel.rules.type.perNight")}</SelectItem>
                        <SelectItem value="per_stay">{t("hotel.rules.type.perStay")}</SelectItem>
                        <SelectItem value="spend">{t("hotel.rules.type.spend")}</SelectItem>
                        <SelectItem value="milestone">{t("hotel.rules.type.milestone")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hotelRulesOpen ? (
                  <div className="space-y-3">
                    {hotelDraftState.rules.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        {t("hotel.promos.empty")}
                      </div>
                    ) : null}
                    {hotelDraftState.rules.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.2)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">
                              {ruleDisplayName(t, r, (id) =>
                                p.settings.vouchers.find((voucher) => voucher.id === id)?.name
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {ruleSummary(r, currency, language, (id) =>
                                p.settings.vouchers.find((voucher) => voucher.id === id)?.name
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="rounded-2xl"
                              onClick={() => onOpenRuleEditor(undefined, r.id)}
                              title={t("hotel.rules.edit")}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-2xl"
                              onClick={() => onRequestDeleteRule(r.id)}
                              title={t("hotel.rules.delete")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            );
          })()}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
      )}
    </Drawer>
  );
}
