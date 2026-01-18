"use client";

import { Drawer } from "@/components/hotel/drawer";
import { InfoTip } from "@/components/hotel/info-tip";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/hotel/fields";
import { createTranslator, languageLocale } from "@/lib/i18n";
import type { FxRates, GlobalSettings, Language, SupportedCurrency } from "@/lib/hotel/types";

export function PreferencesDrawer({
  open,
  language,
  global,
  preferencesComplete,
  onClose,
  firstVisitMode,
  onFirstBrand,
  onLanguageChange,
  onCurrencyChange,
  onTaxModeChange,
  currencyMissing,
  taxModeMissing,
  languageOptions,
  supportedCurrencies,
  currencyLabel,
  refreshFxRates,
  fxRates,
  demoLines,
  onManageCountries,
  onResetTravel,
  onResetBrands,
}: {
  open: boolean;
  language: Language;
  global: GlobalSettings;
  preferencesComplete: boolean;
  onClose: () => void;
  firstVisitMode: boolean;
  onFirstBrand: () => void;
  onLanguageChange: (language: Language) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
  onTaxModeChange: (mode: GlobalSettings["taxInputMode"]) => void;
  currencyMissing: boolean;
  taxModeMissing: boolean;
  languageOptions: { value: Language; label: string }[];
  supportedCurrencies: SupportedCurrency[];
  currencyLabel: (code: SupportedCurrency) => string;
  refreshFxRates: (force?: boolean) => void;
  fxRates: FxRates | null;
  demoLines: string[];
  onManageCountries: () => void;
  onResetTravel: () => void;
  onResetBrands: () => void;
}) {
  const t = createTranslator(language);

  return (
    <Drawer
      open={open}
      title={t("drawer.preferences.title")}
      onClose={onClose}
      disableClose={!preferencesComplete || firstVisitMode}
      footer={
        <div className="flex items-center justify-end gap-2">
          {!preferencesComplete ? (
            <div className="mr-auto text-xs text-destructive">
              {t("drawer.preferences.requiredNotice")}
            </div>
          ) : null}
          {firstVisitMode ? (
            <Button
              className="rounded-2xl"
              onClick={onFirstBrand}
              disabled={!preferencesComplete}
            >
              {t("drawer.preferences.addBrand")}
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={onClose}
              disabled={!preferencesComplete}
            >
              {t("common.close")}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-6 md:grid-cols-[1fr_240px]">
          <div className="space-y-5">
            <SelectField
              label={t("drawer.preferences.language")}
              value={language}
              onChange={(v) => onLanguageChange(v as Language)}
              options={languageOptions}
            />

            <SelectField
              label={t("drawer.preferences.currency")}
              value={global.preferredCurrency ?? ""}
              onChange={(v) => onCurrencyChange(v as SupportedCurrency)}
              options={supportedCurrencies.map((c) => ({
                value: c,
                label: currencyLabel(c),
              }))}
              placeholder={t("drawer.preferences.currency.placeholder")}
              error={currencyMissing ? t("common.required") : undefined}
            />

            <SelectField
              label={
                <span className="inline-flex items-center gap-2">
                  {t("drawer.preferences.rateInputMode")}
                  <InfoTip
                    title={t("common.tip")}
                    ariaLabel={t("tips.rateInputMode")}
                    className="h-5 w-5"
                  >
                    {t("drawer.preferences.rateInputMode.tip")}
                  </InfoTip>
                </span>
              }
              value={global.taxInputMode ?? ""}
              onChange={(v) => onTaxModeChange(v as GlobalSettings["taxInputMode"])}
              options={[
                {
                  value: "PRE_TAX_PLUS_RATE",
                  label: t("drawer.preferences.rateInputMode.preTaxRate"),
                },
                {
                  value: "POST_TAX_PLUS_RATE",
                  label: t("drawer.preferences.rateInputMode.postTaxRate"),
                },
                {
                  value: "PRE_AND_POST",
                  label: t("drawer.preferences.rateInputMode.preAndPost"),
                },
              ]}
              placeholder={t("drawer.preferences.rateInputMode.placeholder")}
              error={taxModeMissing ? t("common.required") : undefined}
            />
          </div>
          <div className="self-start rounded-2xl border border-white/70 bg-gradient-to-br from-white/90 via-white/70 to-amber-50/60 p-4 text-sm shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("drawer.preferences.demo.title")}
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {demoLines.map((line) => (
                <div key={line} className="flex items-start gap-2 text-foreground/80">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400/70" />
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">{t("drawer.preferences.fxRates.title")}</div>
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={() => refreshFxRates(true)}
            >
              {t("common.refresh")}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {fxRates?.updatedAt
              ? t("drawer.preferences.fxRates.updatedAt", {
                  time: new Date(fxRates.updatedAt).toLocaleString(
                    languageLocale(language)
                  ),
                })
              : t("drawer.preferences.fxRates.notUpdated")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {supportedCurrencies.map((c) => (
              <div
                key={c}
                className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm"
              >
                <div className="text-xs text-muted-foreground">{c}</div>
                <div className="font-medium">{fxRates?.rates?.[c]?.toFixed(4) ?? "—"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-medium">{t("drawer.preferences.countries.title")}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("drawer.preferences.countries.subtitle")}
            </div>
          </div>
          <Button variant="secondary" className="rounded-2xl" onClick={onManageCountries}>
            {t("common.manage")}
          </Button>
        </div>

        <div className="h-px bg-border/50" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            {t("drawer.preferences.clear.subtitle")}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="destructive" className="rounded-2xl" onClick={onResetTravel}>
              {t("drawer.preferences.clear.travel")}
            </Button>
            <Button variant="destructive" className="rounded-2xl" onClick={onResetBrands}>
              {t("drawer.preferences.clear.brands")}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
