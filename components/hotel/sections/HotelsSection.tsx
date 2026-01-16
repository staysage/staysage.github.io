"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/hotel/info-tip";
import { fmtMoney, zhe } from "@/lib/hotel/format";
import { Eye, Plus, Settings2, Trash2 } from "lucide-react";
import type {
  Calc,
  GlobalSettings,
  HotelOption,
  Language,
  Program,
  SupportedCurrency,
} from "@/lib/hotel/types";

type Translator = (key: string, vars?: Record<string, unknown>) => string;

export function HotelsSection({
  t,
  hotels,
  ranked,
  global,
  currency,
  language,
  programById,
  brandLogo,
  brandColor,
  onAddHotel,
  onRequireBrand,
  onOpenDetails,
  onEditHotel,
  onDeleteHotel,
}: {
  t: Translator;
  hotels: HotelOption[];
  ranked: { h: HotelOption; c: Calc }[];
  global: GlobalSettings;
  currency: SupportedCurrency;
  language: Language;
  programById: Map<string, Program>;
  brandLogo: (name: string) => { src: string; alt: string } | null;
  brandColor: (program: Program) => string;
  onAddHotel: () => void;
  onRequireBrand: () => void;
  onOpenDetails: (id: string) => void;
  onEditHotel: (id: string) => void;
  onDeleteHotel: (id: string) => void;
}) {
  const handleAdd = () => {
    if (programById.size === 0) {
      onRequireBrand();
      return;
    }
    onAddHotel();
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
        <CardHeader className="pb-3">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{t("section.hotels.title")}</CardTitle>
              <InfoTip title={t("section.hotels.howItWorks.title")} ariaLabel={t("tips.hotels")}>
                {t("section.hotels.howItWorks.body")}
              </InfoTip>
            </div>
            <Button className="rounded-2xl" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" /> {t("common.add.hotel")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hotels.length === 0 ? (
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-sm text-muted-foreground">
              {t("section.hotels.empty")}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ranked.map(({ h, c }, i) => {
                  const p = programById.get(h.programId);
                  const logo = p ? brandLogo(p.name) : null;
                  const customLogo = p?.logoUrl?.trim();
                  return (
                    <div
                      key={h.id}
                      className="rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur shadow-[0_12px_30px_-18px_rgba(15,23,42,0.25)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            {t("section.hotels.option")} #{i + 1}
                          </div>
                          <div className="text-lg font-semibold">{h.name}</div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            {p ? (
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: brandColor(p) }}
                              />
                            ) : null}
                            <span>{p?.name ?? "-"}</span>
                          </div>
                        </div>
                        {p && (customLogo || logo) ? (
                          <div className="h-[28px] w-[72px] flex items-center justify-end opacity-70">
                            <img
                              src={customLogo ?? logo!.src}
                              alt={p.name}
                              className="h-full w-auto max-w-full object-contain"
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("section.hotels.totalPostTax")}
                          </span>
                          <span className="text-sm font-semibold">
                            {fmtMoney(c.paidPostTax, currency, language)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("section.hotels.netCost")}
                          </span>
                          <span className="text-sm font-semibold">
                            {fmtMoney(c.netCost, currency, language)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("section.hotels.effectiveDiscount")}
                          </span>
                          <span className="text-sm font-semibold">
                            {zhe(c.netPayRatio, language)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("section.hotels.avgPerNight")}
                          </span>
                          <span className="text-sm font-semibold">
                            {fmtMoney(
                              c.netCost / Math.max(1, global.nights),
                              currency,
                              language
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="secondary"
                          className="rounded-2xl h-8 px-3"
                          onClick={() => onOpenDetails(h.id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {t("section.hotels.details")}
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="rounded-2xl h-8 w-8"
                          onClick={() => onEditHotel(h.id)}
                          title={t("common.edit")}
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-2xl h-8 w-8"
                          onClick={() => onDeleteHotel(h.id)}
                          title={t("common.delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <div />
    </div>
  );
}
