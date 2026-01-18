"use client";

import React, { useMemo, useState } from "react";
import { computeHotel } from "@/lib/hotel/calc";
import { fmtPct } from "@/lib/hotel/format";
import { createTranslator, getStoredLanguage, storeLanguage } from "@/lib/i18n";
import {
  defaultGlobal,
  defaultHotel,
  defaultPrograms,
  getTierKeyFromLabel,
  getTierLabel,
  mkElite,
  mkTier,
  uid,
} from "@/lib/hotel/defaults";
import { autoRuleName, buildRule, normalizeRules } from "@/lib/hotel/rules";
import {
  loadPersistedState,
  loadPreferencesSet,
  persistPreferencesSet,
  persistState,
} from "@/lib/hotel/persistence";
import type {
  Calc,
  Country,
  FxRates,
  GlobalSettings,
  HotelOption,
  Language,
  Program,
  Rule,
  SupportedCurrency,
} from "@/lib/hotel/types";

export function useHotelState() {
  const [page, setPage] = useState<"travel" | "brands">("travel");

  const [global, setGlobal] = useState<GlobalSettings>(defaultGlobal);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [hotels, setHotels] = useState<HotelOption[]>([]); // start from 0
  const [language, setLanguage] = useState<Language>("zh");
  const [hydrated, setHydrated] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [firstVisitFlow, setFirstVisitFlow] = useState(false);
  const [firstBrandFlow, setFirstBrandFlow] = useState(false);

  const [brandRulesOpen, setBrandRulesOpen] = useState(true);
  const [hotelRulesOpen, setHotelRulesOpen] = useState(true);
  const [brandRulePickerKey, setBrandRulePickerKey] = useState(0);
  const [hotelRulePickerKey, setHotelRulePickerKey] = useState(0);
  const [ruleDrawerOpen, setRuleDrawerOpen] = useState(false);
  const [ruleDraftState, setRuleDraftState] = useState<Rule | null>(null);
  const [ruleContext, setRuleContext] = useState<
      | { scope: "brand"; ruleId?: string }
      | { scope: "hotel"; ruleId?: string }
      | null
  >(null);
  const [ruleNameMode, setRuleNameMode] = useState<"auto" | "manual">("auto");
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    destructive?: boolean;
    showCancel?: boolean;
    dismissible?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [brandPresetId, setBrandPresetId] = useState("custom");
  const [hotelDetailOpen, setHotelDetailOpen] = useState(false);
  const [hotelDetailId, setHotelDetailId] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([
    { id: "us", name: "美国", taxRate: 0.08 },
    { id: "cn", name: "中国", taxRate: 0.1 },
    { id: "jp", name: "日本", taxRate: 0.1 },
    { id: "sg", name: "新加坡", taxRate: 0.09 },
    { id: "gb", name: "英国", taxRate: 0.2 },
    { id: "eu", name: "欧元区", taxRate: 0.2 },
    { id: "hk", name: "香港", taxRate: 0.0 },
  ]);
  const [countryDrawerOpen, setCountryDrawerOpen] = useState(false);
  const [fxRates, setFxRates] = useState<FxRates | null>(null);
  const supportedCurrencies: SupportedCurrency[] = [
    "USD",
    "CNY",
    "HKD",
    "GBP",
    "EUR",
    "SGD",
  ];

  const presetNameLookup = useMemo(() => {
    const map = new Map<string, string>();
    const languages: Language[] = ["zh", "zh-TW", "en", "es", "ko", "ja"];
    languages.forEach((lang) => {
      defaultPrograms(true, lang).forEach((program) => {
        if (program.presetId) {
          map.set(program.name, program.presetId);
        }
      });
    });
    return map;
  }, []);

  const inferPresetIdByName = (name: string) => presetNameLookup.get(name);

  const languageOptions: { value: Language; label: string }[] = [
    { value: "zh", label: "🇨🇳 简体中文" },
    { value: "zh-TW", label: "🇭🇰 繁體中文" },
    { value: "en", label: "🇺🇸 English" },
    { value: "es", label: "🇪🇸 Español" },
    { value: "ko", label: "🇰🇷 한국어" },
    { value: "ja", label: "🇯🇵 日本語" },
  ];

  const currencyNames: Record<Language, Record<SupportedCurrency, string>> = {
    zh: { USD: "美元", CNY: "人民币", HKD: "港币", GBP: "英镑", EUR: "欧元", SGD: "新元" },
    "zh-TW": {
      USD: "美元",
      CNY: "人民幣",
      HKD: "港幣",
      GBP: "英鎊",
      EUR: "歐元",
      SGD: "新幣",
    },
    en: {
      USD: "US dollar",
      CNY: "Chinese yuan",
      HKD: "Hong Kong dollar",
      GBP: "British pound",
      EUR: "Euro",
      SGD: "Singapore dollar",
    },
    es: {
      USD: "dolar estadounidense",
      CNY: "yuan chino",
      HKD: "dolar de Hong Kong",
      GBP: "libra esterlina",
      EUR: "euro",
      SGD: "dolar de Singapur",
    },
    ko: {
      USD: "미국 달러",
      CNY: "중국 위안",
      HKD: "홍콩 달러",
      GBP: "영국 파운드",
      EUR: "유로",
      SGD: "싱가포르 달러",
    },
    ja: {
      USD: "米ドル",
      CNY: "中国元",
      HKD: "香港ドル",
      GBP: "英ポンド",
      EUR: "ユーロ",
      SGD: "シンガポールドル",
    },
  };

  const countryNames: Record<Language, Record<string, string>> = {
    zh: {
      us: "美国",
      cn: "中国",
      jp: "日本",
      sg: "新加坡",
      gb: "英国",
      eu: "欧元区",
      hk: "香港",
    },
    "zh-TW": {
      us: "美國",
      cn: "中國",
      jp: "日本",
      sg: "新加坡",
      gb: "英國",
      eu: "歐元區",
      hk: "香港",
    },
    en: {
      us: "United States",
      cn: "China",
      jp: "Japan",
      sg: "Singapore",
      gb: "United Kingdom",
      eu: "Eurozone",
      hk: "Hong Kong",
    },
    es: {
      us: "Estados Unidos",
      cn: "China",
      jp: "Japon",
      sg: "Singapur",
      gb: "Reino Unido",
      eu: "Zona euro",
      hk: "Hong Kong",
    },
    ko: {
      us: "미국",
      cn: "중국",
      jp: "일본",
      sg: "싱가포르",
      gb: "영국",
      eu: "유로존",
      hk: "홍콩",
    },
    ja: {
      us: "アメリカ合衆国",
      cn: "中国",
      jp: "日本",
      sg: "シンガポール",
      gb: "イギリス",
      eu: "ユーロ圏",
      hk: "香港",
    },
  };

  const currencyLabel = (code: SupportedCurrency) => code;

  const getDefaultCountryName = (country: Country) =>
    countryNames[language]?.[country.id];

  const isDefaultCountryName = (country: Country) => {
    const names = Object.values(countryNames)
      .map((map) => map[country.id])
      .filter(Boolean);
    return names.includes(country.name);
  };

  const t = useMemo(() => createTranslator(language), [language]);
  const preferredCurrency = global.preferredCurrency ?? "USD";
  const taxInputMode = global.taxInputMode ?? "PRE_TAX_PLUS_RATE";
  const preferencesComplete = Boolean(global.preferredCurrency && global.taxInputMode);
  const currencyMissing = !global.preferredCurrency;
  const taxModeMissing = !global.taxInputMode;
  const demoCurrency = global.preferredCurrency ?? "USD";
  const demoCurrencyLabel = currencyLabel(demoCurrency);
  const demoRate = 120;
  const demoTaxRatePct = `${Math.round(global.taxRate * 100)}%`;
  const demoPostTaxRate = Math.round(demoRate * (1 + Math.max(0, global.taxRate)));

  const countryLabel = (country: Country) => {
    const name = getDefaultCountryName(country);
    if (name && isDefaultCountryName(country)) return name;
    return country.name;
  };

  const demoLines = () => {
    if (taxInputMode === "PRE_TAX_PLUS_RATE") {
      return [
        t("drawer.preferences.demo.defaultCurrency", { currency: demoCurrencyLabel }),
        t("drawer.preferences.demo.preTaxRate", {
          amount: demoRate,
          currency: demoCurrencyLabel,
        }),
        t("drawer.preferences.demo.taxRate", { rate: demoTaxRatePct }),
      ];
    }
    if (taxInputMode === "POST_TAX_PLUS_RATE") {
      return [
        t("drawer.preferences.demo.defaultCurrency", { currency: demoCurrencyLabel }),
        t("drawer.preferences.demo.postTaxRate", {
          amount: demoPostTaxRate,
          currency: demoCurrencyLabel,
        }),
        t("drawer.preferences.demo.taxRate", { rate: demoTaxRatePct }),
      ];
    }
    return [
      t("drawer.preferences.demo.defaultCurrency", { currency: demoCurrencyLabel }),
      t("drawer.preferences.demo.preTaxRate", {
        amount: demoRate,
        currency: demoCurrencyLabel,
      }),
      t("drawer.preferences.demo.postTaxRate", {
        amount: demoPostTaxRate,
        currency: demoCurrencyLabel,
      }),
    ];
  };

  const applyAutoToProgram = (program: Program, nextLanguage: Language) => {
    const tt = createTranslator(nextLanguage);
    const nextName =
      program.nameI18nAuto && program.nameI18nKey
        ? tt(`brand.preset.${program.nameI18nKey}` as any)
        : program.name;
    const nextTiers = program.brandTiers.map((tier) =>
      tier.i18nAuto && tier.i18nKey
        ? { ...tier, label: getTierLabel(tier.i18nKey, nextLanguage) }
        : tier
    );
    const nextElite = program.eliteTiers.map((elite) =>
      elite.i18nAuto && elite.i18nKey
        ? {
            ...elite,
            label: buildEliteLabel(elite.i18nKey, elite.bonusRate, nextLanguage),
          }
        : elite
    );
    const nextSubBrands = (program.subBrands ?? []).map((subBrand) =>
      subBrand.i18nAuto && subBrand.i18nKey
        ? { ...subBrand, name: tt(`subbrand.${subBrand.i18nKey}` as any) }
        : subBrand
    );
    return {
      ...program,
      name: nextName,
      brandTiers: nextTiers,
      eliteTiers: nextElite,
      subBrands: nextSubBrands,
    };
  };

  const applyAutoTranslations = (items: Program[], nextLanguage: Language) =>
    items.map((program) => applyAutoToProgram(program, nextLanguage));

  const buildDefaultHotelName = (
    programName: string | undefined,
    tt: (key: string, vars?: Record<string, unknown>) => string,
    nextLanguage: Language
  ) => {
    const base = tt("hotel.defaultName");
    if (!programName) return base;
    if (nextLanguage === "zh" || nextLanguage === "zh-TW") {
      return `${programName}${base}`;
    }
    return `${programName} ${base}`.trim();
  };

  const applyAutoToHotels = (
    items: HotelOption[],
    programs: Program[],
    nextLanguage: Language
  ) => {
    const tt = createTranslator(nextLanguage);
    const programMap = new Map(programs.map((program) => [program.id, program]));
    return items.map((hotel) => {
      if (!hotel.nameI18nAuto) return hotel;
      const program = programMap.get(hotel.programId);
      if (hotel.subBrandId && program?.subBrands?.length) {
        const subBrand = program.subBrands.find(
          (item) => item.id === hotel.subBrandId
        );
        if (subBrand?.name) return { ...hotel, name: subBrand.name };
      }
      return {
        ...hotel,
        name: buildDefaultHotelName(program?.name, tt, nextLanguage),
      };
    });
  };

  const handleLanguageChange = (next: Language) => {
    setLanguage(next);
    storeLanguage(next);
    if (typeof document !== "undefined") {
      document.cookie = `language=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }
    setPrograms((prev) => {
      const nextPrograms = applyAutoTranslations(prev, next);
      setHotels((prevHotels) => applyAutoToHotels(prevHotels, nextPrograms, next));
      return nextPrograms;
    });
  };

  const convertAmount = (
    amount: number,
    from: SupportedCurrency,
    to: SupportedCurrency
  ) => {
    if (from === to) return amount;
    if (!fxRates?.rates) return amount;
    const rates = fxRates.rates;
    if (from === "USD") return amount * (rates[to] ?? 1);
    if (to === "USD") return amount / (rates[from] ?? 1);
    return (amount / (rates[from] ?? 1)) * (rates[to] ?? 1);
  };

  const refreshFxRates = async (force = false) => {
    const now = Date.now();
    if (!force && fxRates?.updatedAt && now - fxRates.updatedAt < 24 * 60 * 60 * 1000) {
      return;
    }
    try {
      const targets = supportedCurrencies.join(",");
      const res = await fetch(
        `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${targets}`
      );
      const data = await res.json();
      const rates: Record<SupportedCurrency, number> = {
        USD: 1,
        CNY: data.rates.CNY ?? 1,
        HKD: data.rates.HKD ?? 1,
        GBP: data.rates.GBP ?? 1,
        EUR: data.rates.EUR ?? 1,
        SGD: data.rates.SGD ?? 1,
      };
      setFxRates({ base: "USD", rates, updatedAt: now });
    } catch {
      // keep existing rates on failure
    }
  };

  const brandColorPalette = [
    "#B71C1C",
    "#D32F2F",
    "#0B4EA2",
    "#0057B8",
    "#C8A34E",
    "#0077C8",
    "#F6C343",
    "#00A3A3",
    "#4B326D",
    "#6B7280",
  ];

  const pickRandomBrandColor = () =>
    brandColorPalette[Math.floor(Math.random() * brandColorPalette.length)];

  const colorByName = (name: string) => {
    const key = name.toLowerCase();
    const has = (...tokens: string[]) =>
      tokens.some((token) => key.includes(token) || name.includes(token));
    if (has("marriott", "万豪", "萬豪")) return "#B71C1C";
    if (has("ihg", "intercontinental", "洲际", "洲際")) return "#D32F2F";
    if (has("hyatt", "凯悦", "凱悅")) return "#0B4EA2";
    if (has("hilton", "希尔顿", "希爾頓")) return "#0057B8";
    if (has("accor", "雅高")) return "#C8A34E";
    if (has("wyndham", "温德姆", "溫德姆")) return "#0077C8";
    if (has("shangri", "香格里拉")) return "#F6C343";
    if (has("atour", "亚朵", "亞朵")) return "#00A3A3";
    if (has("h world", "huazhu", "华住", "華住")) return "#4B326D";
    return "#94A3B8";
  };

  const buildBlankBrand = (): Program => {
    const elite = [mkElite("Member", 0)];
    return {
      id: uid(),
      name: t("brand.new"),
      nameI18nAuto: false,
      logoUrl: "",
      brandColor: pickRandomBrandColor(),
      currency: "USD",
      brandTiers: [mkTier(t("brand.tier.default"), 10, { i18nAuto: false })],
      eliteTiers: elite,
      subBrands: [],
      settings: {
        eliteTierId: elite[0].id,
        pointValue: { amount: 80, currency: "USD" },
        voucherEnabled: false,
        vouchers: [],
        earnBase: "PRE_TAX",
        rules: [],
      },
    };
  };

  const buildPresetBrand = (preset: string): Program => {
    if (preset === "custom") return buildBlankBrand();
    const presets = defaultPrograms(true, language);
    const map: Record<string, Program | undefined> = {
      marriott: presets[0],
      ihg: presets[1],
      hyatt: presets[2],
      hilton: presets[3],
      accor: presets[4],
      wyndham: presets[5],
      shangrila: presets[6],
      atour: presets[7],
      huazhu: presets[8],
    };
    const presetBrand = map[preset];
    if (!presetBrand) return buildBlankBrand();
    const clone = JSON.parse(JSON.stringify(presetBrand)) as Program;
    const logo = brandLogo(clone.name);
    return {
      ...clone,
      brandColor: clone.brandColor ?? colorByName(clone.name),
      logoUrl: clone.logoUrl ?? logo?.src ?? "",
    };
  };

  const eliteNameKeyMap: Record<string, string> = {
    member: "elite.name.member",
    silver: "elite.name.silver",
    gold: "elite.name.gold",
    platinum: "elite.name.platinum",
    platinum_atour: "elite.name.platinum_atour",
    titanium: "elite.name.titanium",
    ambassador: "elite.name.ambassador",
    diamond: "elite.name.diamond",
    discoverist: "elite.name.discoverist",
    explorist: "elite.name.explorist",
    globalist: "elite.name.globalist",
    jade: "elite.name.jade",
    black: "elite.name.black",
    star: "elite.name.star",
  };
  const eliteNameAliases: Record<string, string> = {
    会员: "member",
    星会员: "star",
    银卡: "silver",
    金卡: "gold",
    白金: "platinum",
    铂金: "platinum_atour",
    钛金: "titanium",
    大使: "ambassador",
    钻石: "diamond",
    探索者: "discoverist",
    冒险家: "explorist",
    环球客: "globalist",
    翡翠: "jade",
    黑金: "black",
  };
  const getEliteKeyFromLabel = (label: string) => {
    const englishMatch = Object.keys(eliteNameKeyMap).find((key) =>
      label.toLowerCase().includes(key)
    );
    const aliasMatch = Object.keys(eliteNameAliases).find((key) =>
      label.includes(key)
    );
    return englishMatch ?? (aliasMatch ? eliteNameAliases[aliasMatch] : undefined);
  };
  const eliteBonusSuffix = (bonusRate: number, lang: Language) => {
    const value = `+${Math.round(bonusRate * 100)}%`;
    return lang === "zh" || lang === "zh-TW" ? `（${value}）` : ` (${value})`;
  };
  const buildEliteLabel = (key: string, bonusRate: number, lang: Language) =>
    `${createTranslator(lang)(eliteNameKeyMap[key] as any)}${eliteBonusSuffix(
      bonusRate,
      lang
    )}`;
  const formatEliteLabel = (label: string) => {
    const eliteKey = getEliteKeyFromLabel(label);
    if (!eliteKey) return label;
    const localized = t(eliteNameKeyMap[eliteKey]);
    const bonusValue = label.match(/[+-]?\d+%/)?.[0];
    if (!bonusValue) return localized;
    const bonus =
      language === "zh" || language === "zh-TW"
        ? `（${bonusValue}）`
        : `(${bonusValue})`;
    return language === "zh" || language === "zh-TW"
      ? `${localized}${bonus}`
      : `${localized} ${bonus}`;
  };

  const autoInputClass = (enabled?: boolean) =>
    enabled
      ? "border-dashed border-amber-300/80 bg-amber-50/70 focus-visible:ring-amber-200"
      : undefined;

  const brandBadge = (name: string) => {
    const key = name.toLowerCase();
    const map: { test: RegExp; label: string; gradient: string }[] = [
      { test: /marriott/, label: "MH", gradient: "from-amber-400 to-rose-400" },
      { test: /\bihg\b|intercontinental/, label: "IHG", gradient: "from-sky-400 to-indigo-500" },
      { test: /hyatt/, label: "HY", gradient: "from-emerald-400 to-cyan-500" },
      { test: /hilton/, label: "HL", gradient: "from-blue-400 to-violet-500" },
      { test: /accor/, label: "ALL", gradient: "from-orange-400 to-fuchsia-500" },
      { test: /wyndham/, label: "WY", gradient: "from-red-400 to-orange-500" },
      { test: /shangri|shangri-la/, label: "SL", gradient: "from-teal-400 to-sky-500" },
      { test: /atour/, label: "AT", gradient: "from-rose-400 to-amber-400" },
      { test: /h world|huazhu/, label: "HW", gradient: "from-lime-400 to-emerald-500" },
    ];
    const hit = map.find((item) => item.test.test(key));
    if (hit) return hit;
    const english = name.replace(/[^A-Za-z ]/g, " ").trim();
    const parts = english.split(/\s+/).filter(Boolean);
    let label = "HT";
    if (parts.length >= 2) {
      label = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    } else if (parts.length === 1) {
      label = parts[0].slice(0, 2).toUpperCase();
    }
    return { label, gradient: "from-slate-400 to-slate-600" };
  };

  const brandLogo = (name: string) => {
    const key = name.toLowerCase();
    const has = (...tokens: string[]) =>
      tokens.some((token) => key.includes(token) || name.includes(token));
    if (has("marriott", "万豪", "萬豪")) {
      return { src: "/brands/marriott.svg", alt: "Marriott" };
    }
    if (has("ihg", "intercontinental", "洲际", "洲際")) {
      return { src: "/brands/ihg.svg", alt: "IHG" };
    }
    if (has("hyatt", "凯悦", "凱悅")) {
      return { src: "/brands/hyatt.svg", alt: "Hyatt" };
    }
    if (has("hilton", "希尔顿", "希爾頓")) {
      return { src: "/brands/hilton.svg", alt: "Hilton" };
    }
    if (has("accor", "雅高")) {
      return { src: "/brands/accor.svg", alt: "Accor" };
    }
    if (has("wyndham", "温德姆", "溫德姆")) {
      return { src: "/brands/wyndham.svg", alt: "Wyndham" };
    }
    if (has("shangri", "香格里拉")) {
      return { src: "/brands/shangrila.svg", alt: "Shangri-La" };
    }
    if (has("atour", "亚朵", "亞朵")) {
      return { src: "/brands/atour.svg", alt: "Atour" };
    }
    if (has("h world", "huazhu", "华住", "華住")) {
      return { src: "/brands/h.png", alt: "H World" };
    }
    return null;
  };

  const brandColor = (program?: Program | null) => {
    if (!program) return "#94A3B8";
    const custom = program.brandColor?.trim();
    return custom ? custom : colorByName(program.name);
  };

  React.useEffect(() => {
    const stored = loadPersistedState();
    const preferencesSet = loadPreferencesSet();
    const cookieLanguage =
      typeof document !== "undefined"
        ? document.cookie
            .split("; ")
            .find((row) => row.startsWith("language="))
            ?.split("=")[1]
        : undefined;
    const preferredLanguage =
      cookieLanguage === "en" ||
      cookieLanguage === "es" ||
      cookieLanguage === "ko" ||
      cookieLanguage === "ja" ||
      cookieLanguage === "zh-TW" ||
      cookieLanguage === "zh"
        ? (cookieLanguage as Language)
        : undefined;
    if (stored) {
      const normalizePointValue = (amount: number) =>
        amount > 0 && amount <= 1 ? amount * 10000 : amount;
      const nextLanguage = preferredLanguage ?? stored.language ?? language;
      const tt = createTranslator(nextLanguage);
      const presetDefaults = new Map(
        defaultPrograms(true, nextLanguage).map((program) => [
          program.presetId ?? "",
          program,
        ])
      );
      const normalizedPrograms = stored.programs.map((program) => {
        const presetId = program.presetId ?? inferPresetIdByName(program.name);
        const nameI18nKey = program.nameI18nKey ?? presetId;
        const nameI18nAuto =
          program.nameI18nAuto !== undefined
            ? program.nameI18nAuto
            : Boolean(nameI18nKey);
        const legacyVoucherEnabled =
          (program.settings as any).voucherEnabled ??
          (program.settings as any).fnVoucherEnabled ??
          false;
        const legacyVouchers = (program.settings as any).vouchers ?? [];
        const legacyMode = (program.settings as any).fnValueMode ?? "CASH";
        const legacyCash =
          (program.settings as any).fnValueCash?.amount !== undefined
            ? (program.settings as any).fnValueCash
            : {
                amount: (program.settings as any).fnValue ?? 0,
                currency: program.currency ?? "USD",
              };
        const legacyPoints = (program.settings as any).fnValuePoints ?? 0;
        const presetFallback = presetId ? presetDefaults.get(presetId) : undefined;
        const nextVouchers =
          legacyVouchers.length > 0
            ? legacyVouchers
            : presetFallback?.settings.vouchers?.length
              ? presetFallback.settings.vouchers
              : legacyVoucherEnabled
                ? [
                    {
                      id: uid(),
                      name: tt("brand.voucher.default"),
                      valueMode: legacyMode,
                      valueCash: legacyCash,
                      valuePoints: legacyPoints,
                    },
                  ]
                : [];
        const voucherEnabled =
          (program.settings as any).voucherEnabled !== undefined
            ? Boolean((program.settings as any).voucherEnabled)
            : presetFallback?.settings.voucherEnabled ?? legacyVoucherEnabled;
        const normalizedVouchers = nextVouchers.map((voucher: any) => ({
          id: voucher.id ?? uid(),
          name: voucher.name ?? tt("brand.voucher.default"),
          valueMode: voucher.valueMode ?? "CASH",
          valueCash: voucher.valueCash ?? legacyCash,
          valuePoints: voucher.valuePoints ?? 0,
          i18nKey: voucher.i18nKey,
          i18nAuto: voucher.i18nAuto,
        }));
        const normalizedSubBrands = (program.subBrands ?? []).map((subBrand: any) => {
          const i18nKey = subBrand.i18nKey;
          const i18nAuto =
            subBrand.i18nAuto !== undefined ? subBrand.i18nAuto : Boolean(i18nKey);
          const tierId = program.brandTiers.some((tier) => tier.id === subBrand.tierId)
            ? subBrand.tierId
            : program.brandTiers[0]?.id ?? "";
          return {
            id: subBrand.id ?? uid(),
            name: subBrand.name ?? "",
            tierId,
            i18nKey,
            i18nAuto,
          };
        });
        return {
          ...program,
          presetId,
          nameI18nKey,
          nameI18nAuto,
          currency: program.currency ?? "USD",
          brandTiers: program.brandTiers.map((tier) => {
            const i18nKey = tier.i18nKey ?? getTierKeyFromLabel(tier.label);
            const isNumericTier = /^\d+(\.\d+)?x$/i.test(tier.label.trim());
            const i18nAuto =
              tier.i18nAuto !== undefined
                ? tier.i18nAuto
                : Boolean(i18nKey) && !isNumericTier;
            return { ...tier, i18nKey, i18nAuto };
          }),
          eliteTiers: program.eliteTiers.map((elite) => {
            const i18nKey = elite.i18nKey ?? getEliteKeyFromLabel(elite.label);
            const i18nAuto =
              elite.i18nAuto !== undefined ? elite.i18nAuto : Boolean(i18nKey);
            return { ...elite, i18nKey, i18nAuto };
          }),
          subBrands: normalizedSubBrands,
          settings: {
            ...program.settings,
            pointValue:
              program.settings.pointValue?.amount !== undefined
                ? program.settings.pointValue
                : {
                    amount: (program.settings as any).pointValue ?? 0,
                    currency: program.currency ?? "USD",
                  },
            voucherEnabled,
            vouchers: normalizedVouchers.map((voucher) => ({
              ...voucher,
              valueCash: {
                ...voucher.valueCash,
                currency:
                  voucher.valueCash?.currency ?? program.currency ?? "USD",
              },
            })),
            earnBase: program.settings.earnBase ?? "PRE_TAX",
            rules: program.settings.rules || [],
          },
        };
      });
      const normalizedProgramsWithPointValue = normalizedPrograms.map((program) => ({
        ...program,
        settings: {
          ...program.settings,
          pointValue: {
            ...program.settings.pointValue,
            amount: normalizePointValue(program.settings.pointValue.amount),
          },
        },
      }));
      const programById = new Map(
        normalizedProgramsWithPointValue.map((program) => [program.id, program])
      );
      const normalizeRulesWithVoucher = (rules: Rule[], voucherId?: string) =>
        normalizeRules(rules).map((rule) => {
          const rewardType = (rule.reward as any)?.type;
          if (rewardType !== "fn") return rule;
          return {
            ...rule,
            reward: {
              type: "voucher",
              voucherId: voucherId ?? "",
              count: Math.max(0, (rule.reward as any).count ?? 0),
            },
          };
        });
      const normalizedProgramsWithRules = normalizedProgramsWithPointValue.map(
        (program) => ({
          ...program,
          settings: {
            ...program.settings,
            rules: normalizeRulesWithVoucher(
              program.settings.rules || [],
              program.settings.vouchers[0]?.id
            ),
          },
        })
      );
      const normalizedHotels = stored.hotels.map((hotel) => {
        const program = programById.get(hotel.programId);
        const voucherId = program?.settings.vouchers[0]?.id;
        const subBrandId = (hotel as any).subBrandId ?? null;
        const hasSubBrand =
          subBrandId && program?.subBrands?.some((subBrand) => subBrand.id === subBrandId);
        const baseTierId = program?.brandTiers?.[0]?.id ?? "";
        const normalizedTierId =
          program && program.brandTiers.some((tier) => tier.id === hotel.brandTierId)
            ? hotel.brandTierId
            : baseTierId;
        const subBrandTierId = hasSubBrand
          ? program?.subBrands.find((subBrand) => subBrand.id === subBrandId)?.tierId
          : undefined;
        const autoName =
          (hotel as any).nameI18nAuto ??
          Boolean(
            (hasSubBrand &&
              program?.subBrands.find((subBrand) => subBrand.id === subBrandId)?.name ===
                hotel.name) ||
              hotel.name === t("hotel.defaultName")
          );
        return {
          ...hotel,
          nameI18nAuto: autoName,
          ratePreTax:
            (hotel as any).ratePreTax?.amount !== undefined
              ? (hotel as any).ratePreTax
              : null,
          ratePostTax:
            (hotel as any).ratePostTax?.amount !== undefined
              ? (hotel as any).ratePostTax
              : {
                  amount: (hotel as any).roomRatePerNight ?? 0,
                  currency: stored.global.preferredCurrency ?? "USD",
                },
          brandTierId: subBrandTierId ?? normalizedTierId,
          subBrandId: hasSubBrand ? subBrandId : null,
          rules: normalizeRulesWithVoucher(hotel.rules || [], voucherId),
        };
      });
      setGlobal({
        ...stored.global,
        preferredCurrency: stored.global.preferredCurrency ?? null,
        countryId: stored.global.countryId ?? "us",
        taxInputMode: stored.global.taxInputMode ?? null,
        taxRate: stored.global.taxRate ?? 0.1,
      });
      setPrograms(
        applyAutoTranslations(
          normalizedProgramsWithRules.length ? normalizedProgramsWithRules : [],
          nextLanguage
        )
      );
      setHotels(normalizedHotels);
      handleLanguageChange(preferredLanguage ?? stored.language ?? "zh");
      setCountries(stored.countries ?? countries);
      setFxRates(stored.fxRates ?? null);
    } else {
      const storedLanguage = getStoredLanguage();
      const nextLanguage = preferredLanguage ?? storedLanguage;
      if (nextLanguage && nextLanguage !== language) {
        handleLanguageChange(nextLanguage);
      }
    }
    const hasStoredPreferences = Boolean(
      stored?.global?.preferredCurrency && stored?.global?.taxInputMode
    );
    if (hasStoredPreferences && !preferencesSet) {
      persistPreferencesSet();
    }
    if (!preferencesSet && !hasStoredPreferences) {
      setPreferencesOpen(true);
      setFirstVisitFlow(true);
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    refreshFxRates(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, fxRates?.updatedAt]);

  React.useEffect(() => {
    if (!countries.find((c) => c.id === global.countryId) && countries.length) {
      setGlobal((g) => ({
        ...g,
        countryId: countries[0].id,
        taxRate: countries[0].taxRate,
      }));
    }
  }, [countries, global.countryId]);

  React.useEffect(() => {
    if (!hydrated) return;
    persistState({
      version: 1,
      global,
      programs,
      hotels,
      language,
      countries,
      fxRates: fxRates ?? undefined,
    });
  }, [hydrated, global, programs, hotels, language, countries, fxRates]);

  // Drawer state
  const [brandDrawerOpen, setBrandDrawerOpen] = useState(false);
  const [brandEditingId, setBrandEditingId] = useState<string | null>(null);
  const [brandSubBrandFocusKey, setBrandSubBrandFocusKey] = useState(0);
  const [returnToHotelAfterBrand, setReturnToHotelAfterBrand] = useState(false);

  const [hotelDrawerOpen, setHotelDrawerOpen] = useState(false);
  const [hotelEditingId, setHotelEditingId] = useState<string | null>(null);
  const [hotelResumeStep, setHotelResumeStep] = useState<1 | 2 | 3 | null>(null);

  // Derived
  const currency = preferredCurrency;

  const programById = useMemo(() => {
    const m = new Map<string, Program>();
    programs.forEach((p) => m.set(p.id, p));
    return m;
  }, [programs]);

  const ranked = useMemo(() => {
    return hotels
        .map((h) => {
          const p = programById.get(h.programId);
          if (!p) {
            return {
              h,
              c: {
                paidPostTax: 0,
                paidPreTax: 0,
                basePoints: 0,
                eliteBonusPoints: 0,
                promoExtraPoints: 0,
                totalPoints: 0,
                pointsValue: 0,
                netCost: Infinity,
                rebateRate: 0,
                netPayRatio: 1,
              } as Calc,
            };
          }
          return { h, c: computeHotel(global, p, h, fxRates ?? undefined) };
        })
        .sort((a, b) => a.c.netCost - b.c.netCost);
  }, [hotels, programById, global]);

  const selectedHotel = useMemo(
    () => (hotelDetailId ? hotels.find((h) => h.id === hotelDetailId) ?? null : null),
    [hotelDetailId, hotels]
  );
  const selectedProgram = selectedHotel
    ? programById.get(selectedHotel.programId) ?? null
    : null;
  const selectedCalc =
    selectedHotel && selectedProgram
      ? computeHotel(global, selectedProgram, selectedHotel, fxRates ?? undefined)
      : null;

  // -----------------------------
  // Brand drawer helpers
  // -----------------------------

  const brandDraft: Program | null = useMemo(() => {
    if (!brandDrawerOpen) return null;
    if (!brandEditingId) {
      return buildBlankBrand();
    }
    const existing = programs.find((x) => x.id === brandEditingId);
    return existing ? JSON.parse(JSON.stringify(existing)) : null;
  }, [brandDrawerOpen, brandEditingId, programs, language]);

  const [brandDraftState, setBrandDraftState] = useState<Program | null>(null);

  // Sync draft when opening
  React.useEffect(() => {
    if (brandDrawerOpen) setBrandDraftState(brandDraft);
    else setBrandDraftState(null);
    if (!brandDrawerOpen) {
      setRuleDrawerOpen(false);
      setRuleDraftState(null);
      setRuleContext(null);
    }
    if (brandDrawerOpen && !brandEditingId) {
      setBrandPresetId("custom");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandDrawerOpen, brandEditingId]);

  React.useEffect(() => {
    if (!brandDraftState) return;
    setBrandDraftState((s) => (s ? applyAutoToProgram(s, language) : s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const openBrandDrawerNew = () => {
    setBrandEditingId(null);
    setBrandDrawerOpen(true);
  };

  const openBrandDrawerEdit = (id: string) => {
    setBrandEditingId(id);
    setBrandDrawerOpen(true);
  };

  const openBrandDrawerSubBrand = (id: string) => {
    if (hotelDraftState) {
      setHotelDraftOverride(hotelDraftState);
    }
    setReturnToHotelAfterBrand(true);
    setHotelResumeStep(2);
    setBrandEditingId(id);
    setBrandDrawerOpen(true);
    setBrandSubBrandFocusKey((v) => v + 1);
    setHotelDrawerOpen(false);
  };

  const closeBrandDrawer = () => {
    setBrandDrawerOpen(false);
    if (returnToHotelAfterBrand) {
      setReturnToHotelAfterBrand(false);
      setHotelDrawerOpen(true);
    }
  };

  const normalizeBrandDraft = (draft: Program): Program => {
    let eliteTierId = draft.settings.eliteTierId;
    if (!draft.eliteTiers.find((e) => e.id === eliteTierId)) {
      eliteTierId = draft.eliteTiers[0]?.id ?? uid();
    }

    const programCurrency = draft.currency ?? "USD";
    return {
      ...draft,
      currency: programCurrency,
      settings: {
        ...draft.settings,
        eliteTierId,
        pointValue: {
          ...draft.settings.pointValue,
          currency: draft.settings.pointValue.currency ?? programCurrency,
        },
        vouchers: draft.settings.vouchers.map((voucher) => ({
          ...voucher,
          valueCash: {
            ...voucher.valueCash,
            currency: voucher.valueCash.currency ?? programCurrency,
          },
        })),
      },
    };
  };

  const updateBrandDraft = () => {
    if (!brandDraftState) return;
    const normalized = normalizeBrandDraft(brandDraftState);
    setPrograms((prev) => {
      const exists = prev.some((p) => p.id === normalized.id);
      return exists
        ? prev.map((p) => (p.id === normalized.id ? normalized : p))
        : [...prev, normalized];
    });
    if (returnToHotelAfterBrand) {
      setReturnToHotelAfterBrand(false);
      setBrandDrawerOpen(false);
      setHotelDrawerOpen(true);
    }
  };

  const saveBrandDraft = () => {
    if (!brandDraftState) return;
    const normalized = normalizeBrandDraft(brandDraftState);

    setPrograms((prev) => {
      const exists = prev.some((p) => p.id === normalized.id);
      if (!exists && prev.length === 0 && firstBrandFlow) {
        setConfirmState({
          title: t("dialog.firstBrand.title"),
          message: t("dialog.firstBrand.message"),
          confirmLabel: t("dialog.firstBrand.action"),
          cancelLabel: "",
          showCancel: false,
          dismissible: false,
          onConfirm: () => {
            setConfirmState(null);
          },
        });
        setFirstBrandFlow(false);
      }
      return exists
        ? prev.map((p) => (p.id === normalized.id ? normalized : p))
        : [...prev, normalized];
    });

    setBrandDrawerOpen(false);
    if (returnToHotelAfterBrand) {
      setReturnToHotelAfterBrand(false);
      setHotelDrawerOpen(true);
    }
  };

  const deleteBrand = (id: string) => {
    const linked = hotels.filter((h) => h.programId === id);
    const title = linked.length
      ? t("confirm.delete.brand.withHotels")
      : t("confirm.delete.brand");
    const message = linked.length
      ? t("confirm.delete.brand.linked", { count: linked.length })
      : t("confirm.delete.notice");
    setConfirmState({
      title,
      message,
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      destructive: true,
      onConfirm: () => {
        setPrograms((prev) => prev.filter((p) => p.id !== id));
        setHotels((prev) => prev.filter((h) => h.programId !== id));
        setConfirmState(null);
      },
    });
  };

  const copyBrand = (id: string) => {
    setPrograms((prev) => {
      const existing = prev.find((p) => p.id === id);
      if (!existing) return prev;
      const copy = JSON.parse(JSON.stringify(existing)) as Program;
      copy.id = uid();
      copy.name = t("brand.copy", { name: existing.name });
      copy.nameI18nAuto = false;
      copy.nameI18nKey = undefined;
      return [...prev, copy];
    });
  };

  // -----------------------------
  // Hotel drawer helpers
  // -----------------------------

  const hotelDraft: HotelOption | null = useMemo(() => {
    if (!hotelDrawerOpen) return null;
    if (!hotelEditingId) {
      const h = defaultHotel(programs, preferredCurrency);
      return {
        ...h,
        name: buildDefaultHotelName(programs[0]?.name, t, language),
        nameI18nAuto: true,
      };
    }
    const existing = hotels.find((x) => x.id === hotelEditingId);
    return existing ? JSON.parse(JSON.stringify(existing)) : null;
  }, [hotelDrawerOpen, hotelEditingId, hotels, programs, language]);

  const [hotelDraftState, setHotelDraftState] = useState<HotelOption | null>(null);
  const [hotelDraftOverride, setHotelDraftOverride] = useState<HotelOption | null>(null);

  React.useEffect(() => {
    if (hotelDrawerOpen) {
      if (hotelDraftOverride) {
        setHotelDraftState(hotelDraftOverride);
        setHotelDraftOverride(null);
      } else {
        setHotelDraftState(hotelDraft);
      }
    } else {
      setHotelDraftState(null);
    }
    if (!hotelDrawerOpen) {
      setRuleDrawerOpen(false);
      setRuleDraftState(null);
      setRuleContext(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelDrawerOpen, hotelEditingId]);

  const openHotelDrawerNew = () => {
    setHotelEditingId(null);
    setHotelDrawerOpen(true);
  };

  const openHotelDrawerEdit = (id: string) => {
    setHotelEditingId(id);
    setHotelDrawerOpen(true);
  };

  const openHotelDetail = (id: string) => {
    setHotelDetailId(id);
    setHotelDetailOpen(true);
  };

  const saveHotelDraft = () => {
    if (!hotelDraftState) return;
    const normalized = { ...hotelDraftState };

    if (normalized.ratePreTax && !normalized.ratePreTax.currency) {
      normalized.ratePreTax = {
        ...normalized.ratePreTax,
        currency: preferredCurrency,
      };
    }
    if (normalized.ratePostTax && !normalized.ratePostTax.currency) {
      normalized.ratePostTax = {
        ...normalized.ratePostTax,
        currency: preferredCurrency,
      };
    }

    // ensure tier belongs to program
    const p = programById.get(normalized.programId);
    if (p && !p.brandTiers.some((t) => t.id === normalized.brandTierId)) {
      normalized.brandTierId = p.brandTiers[0]?.id ?? "";
    }
    if (p) {
      if (
        normalized.subBrandId &&
        !p.subBrands.some((subBrand) => subBrand.id === normalized.subBrandId)
      ) {
        normalized.subBrandId = null;
      }
      if (normalized.subBrandId) {
        const subBrand = p.subBrands.find((s) => s.id === normalized.subBrandId);
        if (subBrand?.tierId) {
          normalized.brandTierId = subBrand.tierId;
        }
      }
    }

    setHotels((prev) => {
      const exists = prev.some((h) => h.id === normalized.id);
      return exists
          ? prev.map((h) => (h.id === normalized.id ? normalized : h))
          : [...prev, normalized];
    });

    setHotelDrawerOpen(false);
  };

  const deleteHotel = (id: string) => {
    setConfirmState({
      title: t("confirm.delete.hotel"),
      message: t("confirm.delete.notice"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      destructive: true,
      onConfirm: () => {
        setHotels((prev) => prev.filter((h) => h.id !== id));
        setConfirmState(null);
      },
    });
  };

  // -----------------------------
  // Rule drawer helpers
  // -----------------------------

  const openRuleEditor = (
    scope: "brand" | "hotel",
    triggerType?: "per_night" | "per_stay" | "milestone" | "spend",
    ruleId?: string
  ) => {
    if (scope === "brand") {
      if (!brandDraftState) return;
      const existing = ruleId
        ? brandDraftState.settings.rules.find((r) => r.id === ruleId)
        : null;
      const nextRule = existing
        ? JSON.parse(JSON.stringify(existing))
        : buildRule(triggerType ?? "per_night");
      const nextAuto = autoRuleName(t, nextRule, (id) =>
        brandDraftState.settings.vouchers.find((voucher) => voucher.id === id)?.name
      );
      const manual =
        Boolean(existing?.name?.trim()) && existing?.name?.trim() !== nextAuto;
      setRuleNameMode(manual ? "manual" : "auto");
      setRuleDraftState(nextRule);
      setRuleContext({ scope: "brand", ruleId: existing?.id });
      setRuleDrawerOpen(true);
      setBrandRulesOpen(true);
      return;
    }

    if (!hotelDraftState) return;
    const existing = ruleId ? hotelDraftState.rules.find((r) => r.id === ruleId) : null;
    const nextRule = existing
      ? JSON.parse(JSON.stringify(existing))
      : buildRule(triggerType ?? "per_night");
    const program = programById.get(hotelDraftState.programId);
    const nextAuto = autoRuleName(t, nextRule, (id) =>
      program?.settings.vouchers.find((voucher) => voucher.id === id)?.name
    );
    const manual =
      Boolean(existing?.name?.trim()) && existing?.name?.trim() !== nextAuto;
    setRuleNameMode(manual ? "manual" : "auto");
    setRuleDraftState(nextRule);
    setRuleContext({ scope: "hotel", ruleId: existing?.id });
    setRuleDrawerOpen(true);
    setHotelRulesOpen(true);
  };

  const closeRuleDrawer = () => {
    setRuleDrawerOpen(false);
    setRuleDraftState(null);
    setRuleContext(null);
    setRuleNameMode("auto");
  };

  const saveRuleDraft = () => {
    if (!ruleDraftState || !ruleContext) return;
    const program =
      ruleContext.scope === "brand"
        ? brandDraftState
        : hotelDraftState
          ? programById.get(hotelDraftState.programId) ?? null
          : null;
    const voucherEnabled = Boolean(program?.settings.voucherEnabled);
    if (ruleDraftState.reward.type === "voucher" && !voucherEnabled) {
      return;
    }
    const trimmedName = ruleDraftState.name.trim();
    const namedRule = trimmedName
      ? { ...ruleDraftState, name: trimmedName }
      : {
          ...ruleDraftState,
          name: autoRuleName(
            t,
            ruleDraftState,
            ruleContext.scope === "brand"
              ? (id) =>
                  brandDraftState?.settings.vouchers.find(
                    (voucher) => voucher.id === id
                  )?.name
              : (id) =>
                  hotelDraftState
                    ? programById
                        .get(hotelDraftState.programId)
                        ?.settings.vouchers.find(
                          (voucher) => voucher.id === id
                        )?.name
                    : undefined
          ),
        };
    const normalizedRule: Rule =
      namedRule.trigger.type === "milestone"
        ? { ...namedRule, trigger: { ...namedRule.trigger, metric: "nights" as const } }
        : namedRule;

    if (ruleContext.scope === "brand") {
      setBrandDraftState((s) => {
        if (!s) return s;
        const rules = s.settings.rules;
        const exists = ruleContext.ruleId
          ? rules.some((r) => r.id === ruleContext.ruleId)
          : false;
        const nextRules = exists
          ? rules.map((r) => (r.id === ruleContext.ruleId ? normalizedRule : r))
          : [...rules, normalizedRule];
        return {
          ...s,
          settings: { ...s.settings, rules: nextRules },
        };
      });
      closeRuleDrawer();
      return;
    }

    setHotelDraftState((s) => {
      if (!s) return s;
      const rules = s.rules;
      const exists = ruleContext.ruleId
        ? rules.some((r) => r.id === ruleContext.ruleId)
        : false;
      const nextRules = exists
        ? rules.map((r) => (r.id === ruleContext.ruleId ? normalizedRule : r))
        : [...rules, normalizedRule];
      return { ...s, rules: nextRules };
    });
    closeRuleDrawer();
  };

  const removeRuleDraft = () => {
    if (!ruleContext?.ruleId) {
      closeRuleDrawer();
      return;
    }

    if (ruleContext.scope === "brand") {
      setConfirmState({
        title: t("confirm.delete.rule"),
        message: t("confirm.delete.notice"),
        confirmLabel: t("common.delete"),
        cancelLabel: t("common.cancel"),
        destructive: true,
        onConfirm: () => {
          setBrandDraftState((s) =>
            s
              ? {
                  ...s,
                  settings: {
                    ...s.settings,
                    rules: s.settings.rules.filter((r) => r.id !== ruleContext.ruleId),
                  },
                }
              : s
          );
          setConfirmState(null);
          closeRuleDrawer();
        },
      });
      return;
    }

    setConfirmState({
      title: t("confirm.delete.rule"),
      message: t("confirm.delete.notice"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      destructive: true,
      onConfirm: () => {
        setHotelDraftState((s) =>
          s ? { ...s, rules: s.rules.filter((r) => r.id !== ruleContext.ruleId) } : s
        );
        setConfirmState(null);
        closeRuleDrawer();
      },
    });
  };

  const handlePreferencesClose = () => {
    if (!preferencesComplete || firstVisitFlow) return;
    setPreferencesOpen(false);
  };

  const startFirstBrandFlow = () => {
    if (!preferencesComplete) return;
    setPreferencesOpen(false);
    setFirstVisitFlow(false);
    setFirstBrandFlow(true);
    setPage("brands");
    openBrandDrawerNew();
  };

  const ruleDraftProgram =
    ruleContext?.scope === "brand"
      ? brandDraftState
      : ruleContext?.scope === "hotel" && hotelDraftState
        ? programById.get(hotelDraftState.programId) ?? null
        : null;
  const voucherEnabled = Boolean(ruleDraftProgram?.settings.voucherEnabled);
  const voucherMissing = Boolean(
    ruleDraftState &&
      ruleDraftState.reward.type === "voucher" &&
      !ruleDraftProgram?.settings.vouchers.some(
        (voucher) => voucher.id === ruleDraftState.reward.voucherId
      )
  );
  const ruleVoucherBlocked = Boolean(
    ruleDraftState && ruleDraftState.reward.type === "voucher" && (!voucherEnabled || voucherMissing)
  );

  const handleVoucherRequest = () => {
    if (!ruleContext) return;
    closeRuleDrawer();
    if (ruleContext.scope === "brand") return;
    const programId = hotelDraftState?.programId;
    if (!programId) return;
    setHotelDrawerOpen(false);
    setBrandEditingId(programId);
    setBrandDrawerOpen(true);
  };

  // -----------------------------

  return {
    t,
    page,
    setPage,
    global,
    setGlobal,
    programs,
    setPrograms,
    hotels,
    setHotels,
    language,
    setLanguage,
    handleLanguageChange,
    languageOptions,
    preferencesOpen,
    setPreferencesOpen,
    firstVisitFlow,
    startFirstBrandFlow,
    brandRulesOpen,
    setBrandRulesOpen,
    hotelRulesOpen,
    setHotelRulesOpen,
    brandRulePickerKey,
    setBrandRulePickerKey,
    hotelRulePickerKey,
    setHotelRulePickerKey,
    ruleDrawerOpen,
    setRuleDrawerOpen,
    ruleDraftState,
    setRuleDraftState,
    ruleContext,
    setRuleContext,
    ruleNameMode,
    setRuleNameMode,
    confirmState,
    setConfirmState,
    brandPresetId,
    setBrandPresetId,
    hotelDetailOpen,
    setHotelDetailOpen,
    hotelDetailId,
    setHotelDetailId,
    countries,
    setCountries,
    countryDrawerOpen,
    setCountryDrawerOpen,
    fxRates,
    setFxRates,
    supportedCurrencies,
    currencyLabel,
    demoLines,
    countryLabel,
    getDefaultCountryName,
    isDefaultCountryName,
    taxInputMode,
    preferencesComplete,
    currencyMissing,
    taxModeMissing,
    preferredCurrency,
    currency,
    programById,
    ranked,
    selectedHotel,
    selectedProgram,
    selectedCalc,
    brandDrawerOpen,
    setBrandDrawerOpen,
    brandEditingId,
    setBrandEditingId,
    brandSubBrandFocusKey,
    returnToHotelAfterBrand,
    brandDraftState,
    setBrandDraftState,
    hotelDrawerOpen,
    setHotelDrawerOpen,
    hotelEditingId,
    setHotelEditingId,
    hotelDraftState,
    setHotelDraftState,
    openBrandDrawerNew,
    openBrandDrawerEdit,
    openBrandDrawerSubBrand,
    closeBrandDrawer,
    updateBrandDraft,
    hotelResumeStep,
    setHotelResumeStep,
    openHotelDrawerNew,
    openHotelDrawerEdit,
    openHotelDetail,
    saveBrandDraft,
    saveHotelDraft,
    deleteBrand,
    deleteHotel,
    copyBrand,
    buildPresetBrand,
    autoInputClass,
    convertAmount,
    refreshFxRates,
    handlePreferencesClose,
    openRuleEditor,
    autoRuleName,
    closeRuleDrawer,
    saveRuleDraft,
    removeRuleDraft,
    ruleDraftProgram,
    voucherEnabled,
    ruleVoucherBlocked,
    handleVoucherRequest,
    brandColor,
    brandLogo,
    formatEliteLabel,
    persistPreferencesSet,
    defaultGlobal,
    defaultPrograms,
    uid,
  };
}
