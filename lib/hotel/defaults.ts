import type {
  BrandTier,
  EliteTier,
  GlobalSettings,
  HotelOption,
  Money,
  Program,
  Rule,
  SupportedCurrency,
  Language,
} from "./types";
import { createTranslator } from "@/lib/i18n";
import type { LocaleKey } from "@/lib/i18n";

export const uid = () =>
  Math.random().toString(16).slice(2) + Date.now().toString(16);

export const defaultGlobal: GlobalSettings = {
  preferredCurrency: null,
  nights: 2,
  countryId: "us",
  taxInputMode: null,
  taxRate: 0.1,
};

function money(amount: number, currency: SupportedCurrency): Money {
  return { amount, currency };
}

export function ruleTemplate(name = ""): Rule {
  return {
    id: uid(),
    name,
    enabled: true,
    trigger: { type: "per_night" },
    reward: { type: "points", points: 1000 },
  };
}

export function mkTier(
  label: string,
  rate: number,
  options?: { i18nKey?: string; i18nAuto?: boolean }
): BrandTier {
  return {
    id: uid(),
    label,
    ratePerUsd: rate,
    i18nKey: options?.i18nKey,
    i18nAuto: options?.i18nAuto,
  };
}

export function mkElite(
  label: string,
  bonus: number,
  options?: { i18nKey?: string; i18nAuto?: boolean }
): EliteTier {
  return {
    id: uid(),
    label,
    bonusRate: bonus,
    i18nKey: options?.i18nKey,
    i18nAuto: options?.i18nAuto,
  };
}

type TierLabelSet = {
  en: string;
  zh: string;
  "zh-TW": string;
  es?: string;
  ko?: string;
  ja?: string;
};

const tierLabelMap: Record<string, TierLabelSet> = {
  "marriott.10x": {
    en: "10x (most brands)",
    zh: "10x（大多数品牌）",
    "zh-TW": "10x（大多數品牌）",
    es: "10x (la mayoria de marcas)",
    ko: "10x (대부분 브랜드)",
    ja: "10x（主要ブランド）",
  },
  "marriott.5x.ri": {
    en: "5x (Residence Inn/Element)",
    zh: "5x（Residence Inn/Element等）",
    "zh-TW": "5x（Residence Inn/Element等）",
    es: "5x (Residence Inn/Element)",
    ko: "5x (Residence Inn/Element)",
    ja: "5x（Residence Inn/Element）",
  },
  "marriott.4x.studiores": {
    en: "4x (StudioRes)",
    zh: "4x（StudioRes）",
    "zh-TW": "4x（StudioRes）",
    es: "4x (StudioRes)",
    ko: "4x (StudioRes)",
    ja: "4x（StudioRes）",
  },
  "marriott.2.5x.exec": {
    en: "2.5x (Marriott Executive Apartments)",
    zh: "2.5x（Marriott Executive Apartments）",
    "zh-TW": "2.5x（Marriott Executive Apartments）",
    es: "2.5x (Marriott Executive Apartments)",
    ko: "2.5x (Marriott Executive Apartments)",
    ja: "2.5x（Marriott Executive Apartments）",
  },
  "ihg.10x": {
    en: "10x (most brands)",
    zh: "10x（大多数品牌）",
    "zh-TW": "10x（大多數品牌）",
    es: "10x (la mayoria de marcas)",
    ko: "10x (대부분 브랜드)",
    ja: "10x（主要ブランド）",
  },
  "ihg.5x.staybridge": {
    en: "5x (Staybridge/Candlewood)",
    zh: "5x（Staybridge/Candlewood等）",
    "zh-TW": "5x（Staybridge/Candlewood等）",
    es: "5x (Staybridge/Candlewood)",
    ko: "5x (Staybridge/Candlewood)",
    ja: "5x（Staybridge/Candlewood）",
  },
  "hyatt.5x": {
    en: "5x (most brands)",
    zh: "5x（大多数品牌）",
    "zh-TW": "5x（大多數品牌）",
    es: "5x (la mayoria de marcas)",
    ko: "5x (대부분 브랜드)",
    ja: "5x（主要ブランド）",
  },
  "hyatt.2.5x.studios": {
    en: "2.5x (Hyatt Studios)",
    zh: "2.5x（Hyatt Studios）",
    "zh-TW": "2.5x（Hyatt Studios）",
    es: "2.5x (Hyatt Studios)",
    ko: "2.5x (Hyatt Studios)",
    ja: "2.5x（Hyatt Studios）",
  },
  "hilton.10x": {
    en: "10x (most brands)",
    zh: "10x（大多数品牌）",
    "zh-TW": "10x（大多數品牌）",
    es: "10x (la mayoria de marcas)",
    ko: "10x (대부분 브랜드)",
    ja: "10x（主要ブランド）",
  },
  "hilton.5x.tru": {
    en: "5x (Tru/Home2)",
    zh: "5x（Tru/Home2等）",
    "zh-TW": "5x（Tru/Home2等）",
    es: "5x (Tru/Home2)",
    ko: "5x (Tru/Home2)",
    ja: "5x（Tru/Home2）",
  },
  "hilton.3x.select": {
    en: "3x (select brands)",
    zh: "3x（部分品牌）",
    "zh-TW": "3x（部分品牌）",
    es: "3x (marcas seleccionadas)",
    ko: "3x (일부 브랜드)",
    ja: "3x（対象ブランド）",
  },
  "accor.10x": {
    en: "10x (most brands)",
    zh: "10x（大多数品牌）",
    "zh-TW": "10x（大多數品牌）",
    es: "10x (la mayoria de marcas)",
    ko: "10x (대부분 브랜드)",
    ja: "10x（主要ブランド）",
  },
  "wyndham.10x": {
    en: "10x (most brands)",
    zh: "10x（大多数品牌）",
    "zh-TW": "10x（大多數品牌）",
    es: "10x (la mayoria de marcas)",
    ko: "10x (대부분 브랜드)",
    ja: "10x（主要ブランド）",
  },
  "shangrila.10x": {
    en: "10x (most brands)",
    zh: "10x（大多数品牌）",
    "zh-TW": "10x（大多數品牌）",
    es: "10x (la mayoria de marcas)",
    ko: "10x (대부분 브랜드)",
    ja: "10x（主要ブランド）",
  },
  "atour.1x.cny": {
    en: "1x (1 CNY = 1 pt)",
    zh: "1x（每 1 CNY = 1 点）",
    "zh-TW": "1x（每 1 CNY = 1 點）",
    es: "1x (1 CNY = 1 punto)",
    ko: "1x (1 CNY = 1포인트)",
    ja: "1x（1 CNY = 1pt）",
  },
  "huazhu.1x.cny": {
    en: "1x (1 CNY = 1 pt)",
    zh: "1x（每 1 CNY = 1 点）",
    "zh-TW": "1x（每 1 CNY = 1 點）",
    es: "1x (1 CNY = 1 punto)",
    ko: "1x (1 CNY = 1포인트)",
    ja: "1x（1 CNY = 1pt）",
  },
};

const pickTierLabel = (labels: TierLabelSet, language: Language) => {
  if (language === "zh") return labels.zh;
  if (language === "zh-TW") return labels["zh-TW"];
  if (language === "es" && labels.es) return labels.es;
  if (language === "ko" && labels.ko) return labels.ko;
  if (language === "ja" && labels.ja) return labels.ja;
  return labels.en;
};

export function getTierLabel(key: string, language: Language) {
  const labels = tierLabelMap[key];
  return labels ? pickTierLabel(labels, language) : key;
}

export function getTierKeyFromLabel(label: string) {
  const entries = Object.entries(tierLabelMap);
  for (const [key, labels] of entries) {
    if (
      label === labels.en ||
      label === labels.zh ||
      label === labels["zh-TW"] ||
      label === labels.es ||
      label === labels.ko ||
      label === labels.ja
    ) {
      return key;
    }
  }
  return undefined;
}

export function defaultPrograms(
  includeExtras = false,
  language: Language = "zh"
): Program[] {
  const t = createTranslator(language);
  const bonusSuffix = (bonus: number) =>
    language === "zh" || language === "zh-TW"
      ? `（+${Math.round(bonus * 100)}%）`
      : ` (+${Math.round(bonus * 100)}%)`;
  const eliteLabel = (key: string, bonus: number) =>
    `${t(`elite.name.${key}` as LocaleKey)}${bonusSuffix(bonus)}`;
  const tier = (key: string, rate: number) =>
    mkTier(getTierLabel(key, language), rate, { i18nKey: key, i18nAuto: true });
  const brandNames = {
    marriott: t("brand.preset.marriott"),
    ihg: t("brand.preset.ihg"),
    hyatt: t("brand.preset.hyatt"),
    hilton: t("brand.preset.hilton"),
    accor: t("brand.preset.accor"),
    wyndham: t("brand.preset.wyndham"),
    shangrila: t("brand.preset.shangrila"),
    atour: t("brand.preset.atour"),
    huazhu: t("brand.preset.huazhu"),
  };
  const marriottTiers = [
    tier("marriott.10x", 10),
    tier("marriott.5x.ri", 5),
    tier("marriott.4x.studiores", 4),
    tier("marriott.2.5x.exec", 2.5),
  ];
  const marriottElite = [
    mkElite(eliteLabel("member", 0), 0, { i18nKey: "member", i18nAuto: true }),
    mkElite(eliteLabel("silver", 0.1), 0.1, { i18nKey: "silver", i18nAuto: true }),
    mkElite(eliteLabel("gold", 0.25), 0.25, { i18nKey: "gold", i18nAuto: true }),
    mkElite(eliteLabel("platinum", 0.5), 0.5, { i18nKey: "platinum", i18nAuto: true }),
    mkElite(eliteLabel("titanium", 0.75), 0.75, { i18nKey: "titanium", i18nAuto: true }),
    mkElite(eliteLabel("ambassador", 0.75), 0.75, { i18nKey: "ambassador", i18nAuto: true }),
  ];

  const ihgTiers = [tier("ihg.10x", 10), tier("ihg.5x.staybridge", 5)];
  const ihgElite = [
    mkElite(eliteLabel("member", 0), 0, { i18nKey: "member", i18nAuto: true }),
    mkElite(eliteLabel("silver", 0.2), 0.2, { i18nKey: "silver", i18nAuto: true }),
    mkElite(eliteLabel("gold", 0.4), 0.4, { i18nKey: "gold", i18nAuto: true }),
    mkElite(eliteLabel("platinum", 0.6), 0.6, { i18nKey: "platinum", i18nAuto: true }),
    mkElite(eliteLabel("diamond", 1.0), 1.0, { i18nKey: "diamond", i18nAuto: true }),
  ];

  const hyattTiers = [tier("hyatt.5x", 5), tier("hyatt.2.5x.studios", 2.5)];
  const hyattElite = [
    mkElite(eliteLabel("member", 0), 0, { i18nKey: "member", i18nAuto: true }),
    mkElite(eliteLabel("discoverist", 0.1), 0.1, { i18nKey: "discoverist", i18nAuto: true }),
    mkElite(eliteLabel("explorist", 0.2), 0.2, { i18nKey: "explorist", i18nAuto: true }),
    mkElite(eliteLabel("globalist", 0.3), 0.3, { i18nKey: "globalist", i18nAuto: true }),
  ];

  const hiltonTiers = [
    tier("hilton.10x", 10),
    tier("hilton.5x.tru", 5),
    tier("hilton.3x.select", 3),
  ];
  const hiltonElite = [
    mkElite(eliteLabel("member", 0), 0, { i18nKey: "member", i18nAuto: true }),
    mkElite(eliteLabel("silver", 0.2), 0.2, { i18nKey: "silver", i18nAuto: true }),
    mkElite(eliteLabel("gold", 0.8), 0.8, { i18nKey: "gold", i18nAuto: true }),
    mkElite(eliteLabel("diamond", 1.0), 1.0, { i18nKey: "diamond", i18nAuto: true }),
  ];

  const accorTiers = [tier("accor.10x", 10)];
  const accorElite = [
    mkElite(eliteLabel("member", 0), 0, { i18nKey: "member", i18nAuto: true }),
    mkElite(eliteLabel("silver", 0.1), 0.1, { i18nKey: "silver", i18nAuto: true }),
    mkElite(eliteLabel("gold", 0.25), 0.25, { i18nKey: "gold", i18nAuto: true }),
    mkElite(eliteLabel("platinum", 0.5), 0.5, { i18nKey: "platinum", i18nAuto: true }),
  ];

  const wyndhamTiers = [tier("wyndham.10x", 10)];
  const wyndhamElite = [
    mkElite(eliteLabel("member", 0), 0, { i18nKey: "member", i18nAuto: true }),
    mkElite(eliteLabel("gold", 0.1), 0.1, { i18nKey: "gold", i18nAuto: true }),
    mkElite(eliteLabel("platinum", 0.15), 0.15, { i18nKey: "platinum", i18nAuto: true }),
    mkElite(eliteLabel("diamond", 0.2), 0.2, { i18nKey: "diamond", i18nAuto: true }),
  ];

  const shangriLaTiers = [tier("shangrila.10x", 10)];
  const shangriLaElite = [
    mkElite(eliteLabel("member", 0), 0, { i18nKey: "member", i18nAuto: true }),
    mkElite(eliteLabel("jade", 0.25), 0.25, { i18nKey: "jade", i18nAuto: true }),
    mkElite(eliteLabel("diamond", 0.5), 0.5, { i18nKey: "diamond", i18nAuto: true }),
  ];

  const atourTiers = [tier("atour.1x.cny", 1)];
  const atourElite = [
    mkElite(eliteLabel("member", 0), 0, { i18nKey: "member", i18nAuto: true }),
    mkElite(eliteLabel("silver", 0), 0, { i18nKey: "silver", i18nAuto: true }),
    mkElite(eliteLabel("gold", 0), 0, { i18nKey: "gold", i18nAuto: true }),
    mkElite(eliteLabel("platinum", 0), 0, { i18nKey: "platinum", i18nAuto: true }),
    mkElite(eliteLabel("black", 1.0), 1.0, { i18nKey: "black", i18nAuto: true }),
  ];

  const huazhuTiers = [tier("huazhu.1x.cny", 1)];
  const huazhuElite = [
    mkElite(eliteLabel("star", 0), 0, { i18nKey: "star", i18nAuto: true }),
    mkElite(eliteLabel("silver", 1.0), 1.0, { i18nKey: "silver", i18nAuto: true }),
    mkElite(eliteLabel("gold", 1.5), 1.5, { i18nKey: "gold", i18nAuto: true }),
    mkElite(eliteLabel("platinum", 1.5), 1.5, { i18nKey: "platinum", i18nAuto: true }),
  ];

  const mkProgram = (
    presetId: string,
    name: string,
    tiers: BrandTier[],
    elite: EliteTier[],
    pointValue: number,
    fnCash: number
  ): Program => {
    const eliteTierId = elite[0]?.id ?? uid();
    return {
      id: uid(),
      name,
      presetId,
      nameI18nKey: presetId,
      nameI18nAuto: true,
      currency: "USD",
      brandTiers: tiers,
      eliteTiers: elite,
      settings: {
        eliteTierId,
        pointValue: money(pointValue, "USD"),
        fnVoucherEnabled: true,
        fnValueMode: "CASH",
        fnValueCash: money(fnCash, "USD"),
        fnValuePoints: 50000,
        earnBase: "PRE_TAX",
        rules: [],
      },
    };
  };

  const basePrograms = [
    mkProgram("marriott", brandNames.marriott, marriottTiers, marriottElite, 80, 400),
    mkProgram("ihg", brandNames.ihg, ihgTiers, ihgElite, 60, 250),
    mkProgram("hyatt", brandNames.hyatt, hyattTiers, hyattElite, 150, 450),
    mkProgram("hilton", brandNames.hilton, hiltonTiers, hiltonElite, 50, 300),
  ];
  if (!includeExtras) return basePrograms;
  return [
    ...basePrograms,
    mkProgram("accor", brandNames.accor, accorTiers, accorElite, 100, 300),
    mkProgram("wyndham", brandNames.wyndham, wyndhamTiers, wyndhamElite, 80, 280),
    mkProgram("shangrila", brandNames.shangrila, shangriLaTiers, shangriLaElite, 120, 350),
    {
      id: uid(),
      name: brandNames.atour,
      presetId: "atour",
      nameI18nKey: "atour",
      nameI18nAuto: true,
      currency: "CNY",
      brandTiers: atourTiers,
      eliteTiers: atourElite,
      settings: {
        eliteTierId: atourElite[0]?.id ?? uid(),
        pointValue: money(100, "CNY"),
        fnVoucherEnabled: true,
        fnValueMode: "POINTS",
        fnValueCash: money(0, "CNY"),
        fnValuePoints: 0,
        earnBase: "POST_TAX",
        rules: [],
      },
    },
    {
      id: uid(),
      name: brandNames.huazhu,
      presetId: "huazhu",
      nameI18nKey: "huazhu",
      nameI18nAuto: true,
      currency: "CNY",
      brandTiers: huazhuTiers,
      eliteTiers: huazhuElite,
      settings: {
        eliteTierId: huazhuElite[0]?.id ?? uid(),
        pointValue: money(100, "CNY"),
        fnVoucherEnabled: true,
        fnValueMode: "POINTS",
        fnValueCash: money(0, "CNY"),
        fnValuePoints: 0,
        earnBase: "POST_TAX",
        rules: [],
      },
    },
  ];
}

export function defaultHotel(
  programs: Program[],
  preferredCurrency: SupportedCurrency
): HotelOption {
  const p = programs[0];
  const tierId = p?.brandTiers[0]?.id ?? "";
  return {
    id: uid(),
    name: "酒店",
    programId: p?.id ?? "",
    brandTierId: tierId,
    ratePreTax: null,
    ratePostTax: { amount: 900, currency: preferredCurrency },
    rules: [],
  };
}
