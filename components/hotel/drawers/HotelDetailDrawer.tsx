"use client";

import { Drawer } from "@/components/hotel/drawer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatRow } from "@/components/hotel/fields";
import { fmtInt, fmtMoney, zhe } from "@/lib/hotel/format";
import type { Calc, GlobalSettings, HotelOption, Language, Program, SupportedCurrency } from "@/lib/hotel/types";
import type { LocaleKey } from "@/lib/i18n";

type Translator = (
  key: LocaleKey,
  vars?: Record<string, string | number | null | undefined>
) => string;

export function HotelDetailDrawer({
  open,
  selectedHotel,
  selectedProgram,
  selectedCalc,
  currency,
  language,
  global,
  t,
  onClose,
  onEdit,
  brandColor,
  brandLogo,
  formatEliteLabel,
}: {
  open: boolean;
  selectedHotel: HotelOption | null;
  selectedProgram: Program | null;
  selectedCalc: Calc | null;
  currency: SupportedCurrency;
  language: Language;
  global: GlobalSettings;
  t: Translator;
  onClose: () => void;
  onEdit: (id: string) => void;
  brandColor: (program: Program) => string;
  brandLogo: (name: string) => { src: string; alt: string } | null;
  formatEliteLabel: (label: string) => string;
}) {
  return (
    <Drawer
      open={open}
      title={selectedHotel ? selectedHotel.name : t("dialog.hotel.title")}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" className="rounded-2xl" onClick={onClose}>
            {t("common.close")}
          </Button>
          {selectedHotel ? (
            <Button className="rounded-2xl" onClick={() => onEdit(selectedHotel.id)}>
              {t("dialog.hotel.edit")}
            </Button>
          ) : null}
        </div>
      }
    >
      {!selectedHotel ? (
        <div className="text-sm text-muted-foreground">{t("dialog.hotel.notFound")}</div>
      ) : !selectedProgram || !selectedCalc ? (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">{t("dialog.hotel.brandDeleted")}</div>
          <Button variant="secondary" className="rounded-2xl" onClick={() => onEdit(selectedHotel.id)}>
            {t("dialog.hotel.reassignBrand")}
          </Button>
        </div>
      ) : (() => {
        const tier =
          selectedProgram.brandTiers.find((t) => t.id === selectedHotel.brandTierId) ??
          selectedProgram.brandTiers[0];
        const elite =
          selectedProgram.eliteTiers.find((e) => e.id === selectedProgram.settings.eliteTierId) ??
          selectedProgram.eliteTiers[0];
        const logo = brandLogo(selectedProgram.name);
        const customLogo = selectedProgram.logoUrl?.trim();
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {t("dialog.hotel.brandLabel")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: brandColor(selectedProgram) }}
                    />
                    <div className="font-medium">{selectedProgram.name}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t("dialog.hotel.tierSummary", {
                      tier: tier?.label ?? "-",
                      elite: formatEliteLabel(elite?.label ?? "-"),
                    })}
                  </div>
                </div>
                {customLogo || logo ? (
                  <div className="h-[32px] w-[80px] flex items-center justify-end opacity-80">
                    <img
                      src={customLogo ?? logo!.src}
                      alt={selectedProgram.name}
                      className="h-full w-auto max-w-full object-contain"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <StatRow
                  title={t("calc.postTaxTotal")}
                  value={fmtMoney(selectedCalc.paidPostTax, currency, language)}
                />
                <StatRow
                  title={t("calc.preTaxTotal")}
                  value={fmtMoney(selectedCalc.paidPreTax, currency, language)}
                />
                <Separator />
                <StatRow
                  title={t("calc.basePoints")}
                  value={t("calc.points.unit", {
                    points: fmtInt(selectedCalc.basePoints, language),
                  })}
                />
                <StatRow
                  title={t("calc.eliteBonus")}
                  value={t("calc.points.unit", {
                    points: fmtInt(selectedCalc.eliteBonusPoints, language),
                  })}
                />
                <StatRow
                  title={t("calc.promoBonus")}
                  value={t("calc.points.unit", {
                    points: fmtInt(selectedCalc.promoExtraPoints, language),
                  })}
                />
              </div>
              <div className="space-y-2">
                <StatRow
                  title={t("calc.pointsValue")}
                  value={fmtMoney(selectedCalc.pointsValue, currency, language)}
                  sub={t("calc.pointsValue.sub", {
                    amount: selectedProgram.settings.pointValue.amount,
                    currency: selectedProgram.settings.pointValue.currency,
                  })}
                />
                <Separator />
                <StatRow
                  title={t("calc.avgPerNight")}
                  value={fmtMoney(
                    selectedCalc.netCost / Math.max(1, global.nights),
                    currency,
                    language
                  )}
                  sub={t("calc.effectiveDiscount.sub", {
                    value: zhe(selectedCalc.netPayRatio, language),
                  })}
                />
                <StatRow
                  title={t("calc.netCost")}
                  value={fmtMoney(selectedCalc.netCost, currency, language)}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </Drawer>
  );
}
