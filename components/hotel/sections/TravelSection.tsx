"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/hotel/info-tip";
import { NumberField, SelectField } from "@/components/hotel/fields";
import type { Country, GlobalSettings } from "@/lib/hotel/types";
import type { LocaleKey } from "@/lib/i18n";

type Translator = (
  key: LocaleKey,
  vars?: Record<string, string | number | null | undefined>
) => string;

export function TravelSection({
  t,
  global,
  countries,
  countryLabel,
  taxInputMode,
  onCountryChange,
  onNightsChange,
  onTaxRateChange,
}: {
  t: Translator;
  global: GlobalSettings;
  countries: Country[];
  countryLabel: (c: Country) => string;
  taxInputMode: "PRE_TAX_PLUS_RATE" | "POST_TAX_PLUS_RATE" | "PRE_AND_POST";
  onCountryChange: (countryId: string) => void;
  onNightsChange: (nights: number) => void;
  onTaxRateChange: (taxRatePercent: number) => void;
}) {
  return (
    <Card className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{t("section.travel.title")}</CardTitle>
          <InfoTip title={t("common.tip")} ariaLabel={t("tips.travel")}>
            {t("section.travel.tip")}
          </InfoTip>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SelectField
            label={t("travel.country")}
            value={global.countryId}
            onChange={onCountryChange}
            options={countries.map((c) => ({
              value: c.id,
              label: countryLabel(c),
            }))}
          />
          <NumberField
            label={t("travel.nights")}
            value={global.nights}
            step={1}
            onChange={onNightsChange}
          />
          {taxInputMode === "PRE_TAX_PLUS_RATE" ||
          taxInputMode === "POST_TAX_PLUS_RATE" ? (
            <NumberField
              label={t("travel.taxRate")}
              value={global.taxRate * 100}
              step={1}
              suffix="%"
              inputClassName="w-24 md:w-28"
              onChange={onTaxRateChange}
            />
          ) : (
            <div className="hidden md:block" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
