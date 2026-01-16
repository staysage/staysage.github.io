"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/hotel/fields";
import { Separator } from "@/components/ui/separator";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import type { Program } from "@/lib/hotel/types";
import { ruleDisplayName } from "@/lib/hotel/rules";

type Translator = (key: string, vars?: Record<string, unknown>) => string;

export function BrandsSection({
  t,
  programs,
  brandColor,
  brandLogo,
  formatEliteLabel,
  onAddBrand,
  onEditBrand,
  onCopyBrand,
  onDeleteBrand,
  onEliteTierChange,
  onGoTravel,
}: {
  t: Translator;
  programs: Program[];
  brandColor: (program: Program) => string;
  brandLogo: (name: string) => { src: string; alt: string } | null;
  formatEliteLabel: (label: string) => string;
  onAddBrand: () => void;
  onEditBrand: (id: string) => void;
  onCopyBrand: (id: string) => void;
  onDeleteBrand: (id: string) => void;
  onEliteTierChange: (programId: string, eliteTierId: string) => void;
  onGoTravel: () => void;
}) {
  return (
    <Card className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
      <CardHeader className="pb-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t("section.brands.title")}</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              {t("section.brands.subtitle")}
            </div>
          </div>
          <Button className="rounded-2xl" onClick={onAddBrand}>
            <Plus className="w-4 h-4 mr-2" /> {t("common.add.brand")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {programs.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("section.brands.empty")}</div>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {programs.map((p) => {
            const logo = brandLogo(p.name);
            const customLogo = p.logoUrl?.trim();
            return (
              <div
                key={p.id}
                className="relative rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur shadow-[0_12px_30px_-18px_rgba(15,23,42,0.25)]"
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
                    {p.settings.rules.length ? (
                      <div className="space-y-1">
                        {p.settings.rules.map((rule) => (
                          <div key={rule.id} className="text-xs text-muted-foreground">
                            {ruleDisplayName(t, rule, (id) =>
                              p.settings.vouchers.find((voucher) => voucher.id === id)?.name
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">{t("list.noPromos")}</div>
                    )}
                    <SelectField
                      label={t("brand.currentTier")}
                      value={p.settings.eliteTierId}
                      onChange={(v) => onEliteTierChange(p.id, v)}
                      options={p.eliteTiers.map((e) => ({
                        value: e.id,
                        label: formatEliteLabel(e.label),
                      }))}
                    />
                  </div>
                  <div className="hidden md:flex gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="rounded-2xl"
                      onClick={() => onEditBrand(p.id)}
                      title={t("common.edit")}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="rounded-2xl"
                      onClick={() => onCopyBrand(p.id)}
                      title={t("common.duplicate")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-2xl"
                      onClick={() => onDeleteBrand(p.id)}
                      title={t("brand.deleteWithHotels")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {p && (customLogo || brandLogo(p.name)) ? (
                  <div className="md:hidden absolute top-3 right-3 h-[28px] w-[72px] flex items-center justify-end opacity-70">
                    <img
                      src={customLogo ?? brandLogo(p.name)!.src}
                      alt={p.name}
                      className="h-full w-auto max-w-full object-contain"
                    />
                  </div>
                ) : null}
                <div className="mt-3 flex items-center gap-2 md:hidden">
                  <Button
                    variant="secondary"
                    className="rounded-2xl h-8 px-3"
                    onClick={() => onEditBrand(p.id)}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-2xl h-8 w-8"
                    onClick={() => onCopyBrand(p.id)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-2xl h-8 w-8"
                    onClick={() => onDeleteBrand(p.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {customLogo || logo ? (
                  <div className="hidden md:flex absolute bottom-3 right-3 w-[72px] h-[32px] opacity-70 items-center justify-end">
                    {customLogo ? (
                      <img
                        src={customLogo}
                        alt={p.name}
                        className="h-full w-auto max-w-full object-contain"
                      />
                    ) : (
                      <img
                        src={logo!.src}
                        alt={logo!.alt}
                        className="h-full w-auto max-w-full object-contain"
                      />
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <Separator />
        <div className="flex justify-end">
          <Button className="rounded-2xl" onClick={onGoTravel}>
            {t("section.brands.cta")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
