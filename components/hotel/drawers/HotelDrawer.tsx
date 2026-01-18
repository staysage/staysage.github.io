"use client";

import { Drawer } from "@/components/hotel/drawer";
import { MoneyField, SelectField, TextField } from "@/components/hotel/fields";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Pencil, Trash2 } from "lucide-react";
import type { HotelOption, Language, Program, SupportedCurrency } from "@/lib/hotel/types";
import { ruleDisplayName } from "@/lib/hotel/rules";
import { ruleSummary } from "@/lib/hotel/format";
import type { LocaleKey } from "@/lib/i18n";
import React from "react";

type Translator = (
  key: LocaleKey,
  vars?: Record<string, string | number | null | undefined>
) => string;

type Step = 1 | 2 | 3;

export function HotelDrawer({
  open,
  hotelEditingId,
  hotelDraftState,
  programs,
  programById,
  brandLogo,
  brandColor,
  formatEliteLabel,
  preferredCurrency,
  supportedCurrencies,
  currencyLabel,
  taxInputMode,
  hotelRulePickerKey,
  onBumpRulePickerKey,
  onOpenRuleEditor,
  onClose,
  onSave,
  onUpdateHotelDraft,
  onRequestAddSubBrand,
  resumeStep,
  onConsumeResumeStep,
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
  brandLogo: (name: string) => { src: string; alt: string } | null;
  brandColor: (program?: Program | null) => string;
  formatEliteLabel: (label: string) => string;
  preferredCurrency: SupportedCurrency;
  supportedCurrencies: SupportedCurrency[];
  currencyLabel: (code: SupportedCurrency) => string;
  taxInputMode: "PRE_TAX_PLUS_RATE" | "POST_TAX_PLUS_RATE" | "PRE_AND_POST";
  hotelRulePickerKey: number;
  onBumpRulePickerKey: () => void;
  onOpenRuleEditor: (
    triggerType?: "per_night" | "per_stay" | "milestone" | "spend",
    ruleId?: string
  ) => void;
  onClose: () => void;
  onSave: () => void;
  onUpdateHotelDraft: (patch: Partial<HotelOption>) => void;
  onRequestAddSubBrand?: (programId: string) => void;
  resumeStep?: Step | null;
  onConsumeResumeStep?: () => void;
  onRequestDeleteRule: (ruleId: string) => void;
  t: Translator;
  currency: SupportedCurrency;
  language: Language;
}) {
  const [step, setStep] = React.useState<Step>(1);
  const resumeAppliedRef = React.useRef(false);

  React.useEffect(() => {
    if (!open) return;
    if (resumeStep) {
      setStep(resumeStep);
      resumeAppliedRef.current = true;
      onConsumeResumeStep?.();
      return;
    }
    if (resumeAppliedRef.current) {
      resumeAppliedRef.current = false;
      return;
    }
    setStep(hotelEditingId ? 2 : 1);
  }, [open, hotelEditingId, resumeStep]);

  const totalSteps = 3;
  const stepLabel = step === 1 ? t("hotel.step.brand") : step === 2 ? t("hotel.step.basic") : t("hotel.step.promos");

  const renderStepHeader = () => (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">
        {t("common.step", { current: step, total: totalSteps })}
      </div>
      <div className="text-sm font-medium">{stepLabel}</div>
    </div>
  );

  const buildDefaultHotelName = (programName?: string) => {
    const base = t("hotel.defaultName");
    if (!programName) return base;
    if (language === "zh" || language === "zh-TW") {
      return `${programName}${base}`;
    }
    return `${programName} ${base}`.trim();
  };

  return (
    <Drawer
      open={open}
      title={hotelEditingId ? t("dialog.hotel.edit.title") : t("dialog.hotel.add.title")}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          {step === 1 ? (
            <Button variant="secondary" className="rounded-2xl" onClick={onClose}>
              {t("dialog.hotel.footer.cancel")}
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => setStep(step === 2 ? 1 : 2)}
              >
                {t("common.prev")}
              </Button>
              {step === 3 ? (
                <Button className="rounded-2xl" onClick={onSave}>
                  {t("dialog.hotel.footer.save")}
                </Button>
              ) : (
                <Button className="rounded-2xl" onClick={() => setStep(3)}>
                  {t("common.next")}
                </Button>
              )}
            </>
          )}
        </div>
      }
    >
      {hotelDraftState ? (
        <div className="space-y-5">
          {renderStepHeader()}
          {step === 1 ? (
            <div className="space-y-3">
              <div className="text-sm font-medium">{t("hotel.brand")}</div>
              {programs.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t("hotel.brand.empty")}</div>
              ) : null}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {programs.map((p) => {
                  const logo = brandLogo(p.name);
                  const eliteTier =
                    p.eliteTiers.find((tier) => tier.id === p.settings.eliteTierId) ??
                    p.eliteTiers[0];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const tierId = p.brandTiers[0]?.id ?? "";
                        onUpdateHotelDraft({
                          programId: p.id,
                          brandTierId: tierId,
                          subBrandId: null,
                          name: buildDefaultHotelName(p.name),
                          nameI18nAuto: true,
                        });
                        setStep(2);
                      }}
                      className="relative rounded-2xl border border-white/70 bg-white/70 p-4 text-left shadow-[0_12px_30px_-18px_rgba(15,23,42,0.2)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: brandColor(p) }}
                            />
                            <div className="font-medium">{p.name}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("brand.elite")}: {eliteTier ? formatEliteLabel(eliteTier.label) : "-"}
                          </div>
                        </div>
                        {logo ? (
                          <div className="h-[28px] w-[72px] flex items-center justify-end opacity-70">
                            <img
                              src={logo.src}
                              alt={logo.alt}
                              className="h-full w-auto max-w-full object-contain"
                            />
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : step === 2 ? (
            (() => {
              const p = programById.get(hotelDraftState.programId);
              if (!p) {
                return <div className="text-sm text-muted-foreground">{t("hotel.brand.empty")}</div>;
              }

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {p.subBrands?.length ? (
                      <SelectField
                        label={t("hotel.subBrand")}
                        value={hotelDraftState.subBrandId ?? "none"}
                        onChange={(v) => {
                          if (v === "none") {
                          const defaultName = buildDefaultHotelName(p.name);
                          const prevSubBrand = p.subBrands.find(
                            (subBrand) => subBrand.id === hotelDraftState.subBrandId
                          );
                            const shouldRename =
                              !hotelDraftState.name ||
                              hotelDraftState.name === defaultName ||
                              (prevSubBrand && hotelDraftState.name === prevSubBrand.name);
                            onUpdateHotelDraft({
                              subBrandId: null,
                              name: shouldRename ? defaultName : hotelDraftState.name,
                              nameI18nAuto: shouldRename ? true : hotelDraftState.nameI18nAuto,
                            });
                            return;
                          }
                          const prevSubBrand = p.subBrands.find(
                            (subBrand) => subBrand.id === hotelDraftState.subBrandId
                          );
                          const nextSubBrand = p.subBrands.find((subBrand) => subBrand.id === v);
                        const defaultName = buildDefaultHotelName(p.name);
                          const shouldRename =
                            !hotelDraftState.name ||
                            hotelDraftState.name === defaultName ||
                            (prevSubBrand && hotelDraftState.name === prevSubBrand.name);
                          onUpdateHotelDraft({
                            subBrandId: v,
                            brandTierId: nextSubBrand?.tierId ?? hotelDraftState.brandTierId,
                            name: shouldRename
                              ? nextSubBrand?.name ?? hotelDraftState.name
                              : hotelDraftState.name,
                            nameI18nAuto: shouldRename ? true : hotelDraftState.nameI18nAuto,
                          });
                        }}
                        options={[
                          { value: "none", label: t("hotel.subBrand.none") },
                          ...p.subBrands.map((subBrand) => ({
                            value: subBrand.id,
                            label: subBrand.name,
                          })),
                        ]}
                      />
                    ) : (
                      <div />
                    )}
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
                          name: resetName
                            ? buildDefaultHotelName(p.name)
                            : hotelDraftState.name,
                          nameI18nAuto: resetName ? true : hotelDraftState.nameI18nAuto,
                        });
                      }}
                      disabled={Boolean(hotelDraftState.subBrandId)}
                      options={p.brandTiers.map((tier) => ({
                        value: tier.id,
                        label: tier.label,
                      }))}
                    />
                  </div>
                  {p.subBrands?.length ? (
                    <div className="text-xs text-muted-foreground">
                      <span>{t("hotel.subBrand.help.prefix")}</span>{" "}
                      <button
                        type="button"
                        className="underline underline-offset-4 hover:text-foreground"
                        onClick={() => onRequestAddSubBrand?.(p.id)}
                      >
                        {t("hotel.subBrand.help.link")}
                      </button>{" "}
                      <span>{t("hotel.subBrand.help.suffix")}</span>
                    </div>
                  ) : null}
                  <TextField
                    label={t("hotel.name")}
                    value={hotelDraftState.name}
                    onChange={(v) => onUpdateHotelDraft({ name: v, nameI18nAuto: false })}
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
                </div>
              );
            })()
          ) : (
            (() => {
              const p = programById.get(hotelDraftState.programId);
              if (!p) {
                return <div className="text-sm text-muted-foreground">{t("hotel.brand.empty")}</div>;
              }

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{t("hotel.promos")}</div>
                    <div className="flex items-center gap-2">
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

                  <div className="space-y-3">
                    {hotelDraftState.rules.length === 0 ? (
                      <div className="text-sm text-muted-foreground">{t("hotel.promos.empty")}</div>
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
                </div>
              );
            })()
          )}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
      )}
    </Drawer>
  );
}
