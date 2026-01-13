"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Settings2, Pencil, Copy, Eye } from "lucide-react";
import { Drawer } from "@/components/hotel/drawer";
import { MoneyField, NumberField, SelectField, StatRow, TextField } from "@/components/hotel/fields";
import { RuleEditor } from "@/components/hotel/rule-editor";
import { PageTabs } from "@/components/hotel/page-tabs";
import { InfoTip } from "@/components/hotel/info-tip";
import { ConfirmDialog } from "@/components/hotel/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { computeHotel } from "@/lib/hotel/calc";
import { fmtInt, fmtMoney, fmtPct, ruleSummary, zhe } from "@/lib/hotel/format";
import { createTranslator, getStoredLanguage, languageLocale, storeLanguage } from "@/lib/i18n";
import {
  defaultGlobal,
  defaultHotel,
  defaultPrograms,
  getTierKeyFromLabel,
  getTierLabel,
  mkElite,
  mkTier,
  ruleTemplate,
  uid,
} from "@/lib/hotel/defaults";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Hotel Chooser — per your latest requirements
 *
 * UI
 * - Pages: Travel / Brands
 * - Edit/Add for Brand and Hotel use a right-side sliding Drawer (no extra deps)
 *
 * Modeling
 * - Compare staying at a hotel for N nights (one stay)
 * - Trigger: per_night | per_stay | spend | milestone
 * - Reward: points | multiplier(on base only) | fn
 * - Voucher value is a brand hyperparameter; reward can directly choose voucher.
 *
 * v1 simplifications
 * - Spend trigger uses pre-tax currency
 * - Tax rate only for pre/post conversion (no non-earning fees modeling)
 */

// -----------------------------
// Main
// -----------------------------

export default function HotelChooserAllPrograms() {
  const [page, setPage] = useState<"travel" | "brands">("travel");

  const [global, setGlobal] = useState<GlobalSettings>(defaultGlobal);
  const [programs, setPrograms] = useState<Program[]>(
    defaultPrograms(false, "zh")
  );
  const [hotels, setHotels] = useState<HotelOption[]>([]); // start from 0
  const [language, setLanguage] = useState<Language>("zh");
  const [hydrated, setHydrated] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [firstVisitPromptOpen, setFirstVisitPromptOpen] = useState(false);

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
    return {
      ...program,
      name: nextName,
      brandTiers: nextTiers,
      eliteTiers: nextElite,
    };
  };

  const applyAutoTranslations = (items: Program[], nextLanguage: Language) =>
    items.map((program) => applyAutoToProgram(program, nextLanguage));

  const handleLanguageChange = (next: Language) => {
    setLanguage(next);
    storeLanguage(next);
    if (typeof document !== "undefined") {
      document.cookie = `language=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }
    setPrograms((prev) => applyAutoTranslations(prev, next));
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

  const normalizeRules = (rules: Rule[]): Rule[] =>
    rules.map((rule): Rule =>
      rule.trigger.type === "milestone"
        ? {
            ...rule,
            trigger: { ...rule.trigger, metric: "nights" as const },
          }
        : rule
    );

  const buildRule = (
    triggerType: "per_night" | "per_stay" | "milestone" | "spend"
  ): Rule => {
    const base = ruleTemplate("");
    if (triggerType === "per_night") return { ...base, trigger: { type: "per_night" } };
    if (triggerType === "per_stay") return { ...base, trigger: { type: "per_stay" } };
    if (triggerType === "spend") {
      return { ...base, trigger: { type: "spend", amount: 1000, repeat: false } };
    }
    return { ...base, trigger: { type: "milestone", metric: "nights", threshold: 3 } };
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
      settings: {
        eliteTierId: elite[0].id,
        pointValue: { amount: 80, currency: "USD" },
        fnVoucherEnabled: true,
        fnValueMode: "CASH",
        fnValueCash: { amount: 300, currency: "USD" },
        fnValuePoints: 50000,
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
    return { ...clone, brandColor: clone.brandColor ?? colorByName(clone.name) };
  };

  const autoRuleName = (rule: Rule) => {
    const trigger = rule.trigger.type;
    const reward = rule.reward;
    if (trigger === "milestone") {
      return t("rule.auto.milestone", { nights: rule.trigger.threshold });
    }
    if (trigger === "spend") {
      return t("rule.auto.spend");
    }
    if (trigger === "per_stay") {
      if (reward.type === "points") {
        return t("rule.auto.perStay.points", { points: reward.points });
      }
      if (reward.type === "multiplier") {
        return t("rule.auto.perStay.multiplier", { multiplier: reward.z });
      }
      return t("rule.auto.perStay.fn", { count: reward.count });
    }
    if (reward.type === "multiplier") {
      return t("rule.auto.perNight.multiplier", { multiplier: reward.z });
    }
    if (reward.type === "points") {
      return t("rule.auto.perNight.points", { points: reward.points });
    }
    return t("rule.auto.perNight.fn", { count: reward.count });
  };

  const ruleDisplayName = (rule: Rule) => {
    const name = rule.name?.trim();
    return name ? name : autoRuleName(rule);
  };

  const eliteNameKeyMap: Record<string, string> = {
    member: "elite.name.member",
    silver: "elite.name.silver",
    gold: "elite.name.gold",
    platinum: "elite.name.platinum",
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
    铂金: "platinum",
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
      const normalizedPrograms = stored.programs.map((program) => {
        const presetId = program.presetId ?? inferPresetIdByName(program.name);
        const nameI18nKey = program.nameI18nKey ?? presetId;
        const nameI18nAuto =
          program.nameI18nAuto !== undefined
            ? program.nameI18nAuto
            : Boolean(nameI18nKey);
        return {
          ...program,
          presetId,
          nameI18nKey,
          nameI18nAuto,
          currency: program.currency ?? "USD",
          brandTiers: program.brandTiers.map((tier) => {
            const i18nKey = tier.i18nKey ?? getTierKeyFromLabel(tier.label);
            const i18nAuto =
              tier.i18nAuto !== undefined ? tier.i18nAuto : Boolean(i18nKey);
            return { ...tier, i18nKey, i18nAuto };
          }),
          eliteTiers: program.eliteTiers.map((elite) => {
            const i18nKey = elite.i18nKey ?? getEliteKeyFromLabel(elite.label);
            const i18nAuto =
              elite.i18nAuto !== undefined ? elite.i18nAuto : Boolean(i18nKey);
            return { ...elite, i18nKey, i18nAuto };
          }),
          settings: {
            ...program.settings,
            pointValue:
              program.settings.pointValue?.amount !== undefined
                ? program.settings.pointValue
                : {
                    amount: (program.settings as any).pointValue ?? 0,
                    currency: program.currency ?? "USD",
                  },
            fnVoucherEnabled:
              (program.settings as any).fnVoucherEnabled !== undefined
                ? (program.settings as any).fnVoucherEnabled
                : true,
            fnValueCash:
              (program.settings as any).fnValueCash?.amount !== undefined
                ? (program.settings as any).fnValueCash
                : {
                    amount: (program.settings as any).fnValue ?? 0,
                    currency: program.currency ?? "USD",
                  },
            fnValuePoints: (program.settings as any).fnValuePoints ?? 50000,
            earnBase: program.settings.earnBase ?? "PRE_TAX",
            rules: normalizeRules(program.settings.rules || []),
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
      const normalizedHotels = stored.hotels.map((hotel) => ({
        ...hotel,
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
        rules: normalizeRules(hotel.rules || []),
      }));
      setGlobal({
        ...stored.global,
        preferredCurrency: stored.global.preferredCurrency ?? null,
        countryId: stored.global.countryId ?? "us",
        taxInputMode: stored.global.taxInputMode ?? null,
        taxRate: stored.global.taxRate ?? 0.1,
      });
      const nextLanguage = preferredLanguage ?? stored.language ?? language;
      setPrograms(
        applyAutoTranslations(
          normalizedProgramsWithPointValue.length
            ? normalizedProgramsWithPointValue
            : defaultPrograms(false, nextLanguage),
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
        setPrograms(defaultPrograms(false, nextLanguage));
      }
    }
    const hasStoredPreferences = Boolean(
      stored?.global?.preferredCurrency && stored?.global?.taxInputMode
    );
    if (hasStoredPreferences && !preferencesSet) {
      persistPreferencesSet();
    }
    if (!preferencesSet && !hasStoredPreferences) {
      setFirstVisitPromptOpen(true);
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

  const [hotelDrawerOpen, setHotelDrawerOpen] = useState(false);
  const [hotelEditingId, setHotelEditingId] = useState<string | null>(null);

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
  const selectedProgram = selectedHotel ? programById.get(selectedHotel.programId) : null;
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

  const saveBrandDraft = () => {
    if (!brandDraftState) return;

    // ensure eliteTierId exists
    let eliteTierId = brandDraftState.settings.eliteTierId;
    if (!brandDraftState.eliteTiers.find((e) => e.id === eliteTierId)) {
      eliteTierId = brandDraftState.eliteTiers[0]?.id ?? uid();
    }

    const programCurrency = brandDraftState.currency ?? "USD";
    const normalized: Program = {
      ...brandDraftState,
      currency: programCurrency,
      settings: {
        ...brandDraftState.settings,
        eliteTierId,
        pointValue: {
          ...brandDraftState.settings.pointValue,
          currency: brandDraftState.settings.pointValue.currency ?? programCurrency,
        },
        fnValueCash: {
          ...brandDraftState.settings.fnValueCash,
          currency: brandDraftState.settings.fnValueCash.currency ?? programCurrency,
        },
      },
    };

    setPrograms((prev) => {
      const exists = prev.some((p) => p.id === normalized.id);
      return exists
          ? prev.map((p) => (p.id === normalized.id ? normalized : p))
          : [...prev, normalized];
    });

    setBrandDrawerOpen(false);
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
      return { ...h, name: t("hotel.defaultName") };
    }
    const existing = hotels.find((x) => x.id === hotelEditingId);
    return existing ? JSON.parse(JSON.stringify(existing)) : null;
  }, [hotelDrawerOpen, hotelEditingId, hotels, programs, language]);

  const [hotelDraftState, setHotelDraftState] = useState<HotelOption | null>(
      null
  );

  React.useEffect(() => {
    if (hotelDrawerOpen) setHotelDraftState(hotelDraft);
    else setHotelDraftState(null);
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
      const nextAuto = autoRuleName(nextRule);
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
    const nextAuto = autoRuleName(nextRule);
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
    const voucherEnabled = Boolean(program?.settings.fnVoucherEnabled);
    if (ruleDraftState.reward.type === "fn" && !voucherEnabled) {
      return;
    }
    const trimmedName = ruleDraftState.name.trim();
    const namedRule = trimmedName
      ? { ...ruleDraftState, name: trimmedName }
      : { ...ruleDraftState, name: autoRuleName(ruleDraftState) };
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
    if (!preferencesComplete) return;
    setPreferencesOpen(false);
  };

  const ruleDraftProgram =
    ruleContext?.scope === "brand"
      ? brandDraftState
      : ruleContext?.scope === "hotel" && hotelDraftState
        ? programById.get(hotelDraftState.programId) ?? null
        : null;
  const fnVoucherEnabled = Boolean(ruleDraftProgram?.settings.fnVoucherEnabled);
  const ruleFnBlocked = Boolean(
    ruleDraftState && ruleDraftState.reward.type === "fn" && !fnVoucherEnabled
  );

  const handleFnVoucherRequest = () => {
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
  // Render
  // -----------------------------

  return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.svg"
                  alt="Staysage"
                  className="h-9 w-9 rounded-2xl shadow-[0_10px_25px_-16px_rgba(15,23,42,0.4)]"
                />
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight bg-gradient-to-r from-rose-500 via-orange-400 to-teal-500 text-transparent bg-clip-text">
                  {t("app.title.full")}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("app.tagline")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:inline-flex items-center gap-1 rounded-2xl border border-white/70 bg-white/70 p-1 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.25)]">
                <Select
                    value={language}
                    onValueChange={(v) => handleLanguageChange(v as Language)}
                >
                  <SelectTrigger className="h-8 w-[160px] rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-2xl"
                  onClick={() => setPreferencesOpen(true)}
                  title={t("drawer.preferences.title")}
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <PageTabs
              page={page}
              setPage={setPage}
              travelLabel={t("app.tabs.travel")}
              brandsLabel={t("app.tabs.brands")}
          />
        </div>

        {/* Travel */}
        {page === "travel" ? (
            <Card className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{t("section.travel.title")}</CardTitle>
                  <InfoTip
                      title={t("common.tip")}
                      ariaLabel={t("tips.travel")}
                  >
                    {t("section.travel.tip")}
                  </InfoTip>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <SelectField
                      label={t("travel.country")}
                      value={global.countryId}
                      onChange={(v) => {
                        const country = countries.find((c) => c.id === v);
                        setGlobal((g) => ({
                          ...g,
                          countryId: v,
                          taxRate: country ? country.taxRate : g.taxRate,
                        }));
                      }}
                      options={countries.map((c) => ({
                        value: c.id,
                        label: countryLabel(c),
                      }))}
                  />
                  <NumberField
                      label={t("travel.nights")}
                      value={global.nights}
                      step={1}
                      onChange={(v) =>
                          setGlobal((g) => ({
                            ...g,
                            nights: Math.max(1, Math.round(v)),
                          }))
                      }
                  />
                  {taxInputMode === "PRE_TAX_PLUS_RATE" ||
                  taxInputMode === "POST_TAX_PLUS_RATE" ? (
                      <NumberField
                          label={t("travel.taxRate")}
                          value={global.taxRate * 100}
                          step={1}
                          suffix="%"
                          inputClassName="w-24 md:w-28"
                          onChange={(v) =>
                              setGlobal((g) => ({ ...g, taxRate: Math.max(0, v / 100) }))
                          }
                      />
                  ) : (
                      <div className="hidden md:block" />
                  )}
                </div>
              </CardContent>
            </Card>
        ) : null}

        {/* Brands */}
        {page === "brands" ? (
            <Card className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
              <CardHeader className="pb-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {t("section.brands.title")}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("section.brands.subtitle")}
                    </div>
                  </div>
                  <Button className="rounded-2xl" onClick={openBrandDrawerNew}>
                    <Plus className="w-4 h-4 mr-2" /> {t("common.add.brand")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {programs.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      {t("section.brands.empty")}
                    </div>
                ) : null}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {programs.map((p) => {
                    const elite =
                        p.eliteTiers.find((e) => e.id === p.settings.eliteTierId) ??
                        p.eliteTiers[0];
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
                                          {ruleDisplayName(rule)}
                                        </div>
                                    ))}
                                  </div>
                              ) : (
                                  <div className="text-xs text-muted-foreground">
                                    {t("list.noPromos")}
                                  </div>
                              )}
                              <SelectField
                                  label={t("brand.currentTier")}
                                  value={p.settings.eliteTierId}
                                  onChange={(v) =>
                                      setPrograms((prev) =>
                                          prev.map((x) =>
                                              x.id === p.id
                                                  ? {
                                                    ...x,
                                                    settings: { ...x.settings, eliteTierId: v },
                                                  }
                                                  : x
                                          )
                                      )
                                  }
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
                                  onClick={() => openBrandDrawerEdit(p.id)}
                                  title={t("common.edit")}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                  variant="secondary"
                                  size="icon"
                                  className="rounded-2xl"
                                  onClick={() => copyBrand(p.id)}
                                  title={t("common.duplicate")}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-2xl"
                                  onClick={() => deleteBrand(p.id)}
                                  title={t("brand.deleteWithHotels")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          {p && (p.logoUrl?.trim() || brandLogo(p.name)) ? (
                            <div className="md:hidden absolute top-3 right-3 h-[28px] w-[72px] flex items-center justify-end opacity-70">
                              <img
                                src={p.logoUrl?.trim() ?? brandLogo(p.name)!.src}
                                alt={p.name}
                                className="h-full w-auto max-w-full object-contain"
                              />
                            </div>
                          ) : null}
                          <div className="mt-3 flex items-center gap-2 md:hidden">
                            <Button
                                variant="secondary"
                                className="rounded-2xl h-8 px-3"
                                onClick={() => openBrandDrawerEdit(p.id)}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              {t("common.edit")}
                            </Button>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="rounded-2xl h-8 w-8"
                                onClick={() => copyBrand(p.id)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-2xl h-8 w-8"
                                onClick={() => deleteBrand(p.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          {(customLogo || logo) ? (
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
                  <Button className="rounded-2xl" onClick={() => setPage("travel")}>
                    {t("section.brands.cta")}
                  </Button>
                </div>
              </CardContent>
            </Card>
        ) : null}

        {/* Hotels */}
        {page === "travel" ? (
            <div className="space-y-4">
              <Card className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
                <CardHeader className="pb-3">
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{t("section.hotels.title")}</CardTitle>
                    <InfoTip
                        title={t("section.hotels.howItWorks.title")}
                        ariaLabel={t("tips.hotels")}
                    >
                      {t("section.hotels.howItWorks.body")}
                    </InfoTip>
                  </div>
                    <Button
                        className="rounded-2xl"
                        onClick={() => {
                          if (programs.length === 0) {
                            setPage("brands");
                            openBrandDrawerNew();
                            return;
                          }
                          openHotelDrawerNew();
                        }}
                    >
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
                                        onClick={() => openHotelDetail(h.id)}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      {t("section.hotels.details")}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="rounded-2xl h-8 w-8"
                                        onClick={() => openHotelDrawerEdit(h.id)}
                                        title={t("common.edit")}
                                    >
                                      <Settings2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-2xl h-8 w-8"
                                        onClick={() => deleteHotel(h.id)}
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
        ) : null}

        {/* Hotel Detail Drawer */}
        <Drawer
            open={hotelDetailOpen}
            title={selectedHotel ? selectedHotel.name : t("dialog.hotel.title")}
            onClose={() => setHotelDetailOpen(false)}
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => setHotelDetailOpen(false)}
                >
                  {t("common.close")}
                </Button>
                {selectedHotel ? (
                  <Button
                      className="rounded-2xl"
                      onClick={() => {
                        setHotelDetailOpen(false);
                        openHotelDrawerEdit(selectedHotel.id);
                      }}
                  >
                    {t("dialog.hotel.edit")}
                  </Button>
                ) : null}
              </div>
            }
        >
          {!selectedHotel ? (
              <div className="text-sm text-muted-foreground">
                {t("dialog.hotel.notFound")}
              </div>
          ) : !selectedProgram || !selectedCalc ? (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {t("dialog.hotel.brandDeleted")}
                </div>
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => openHotelDrawerEdit(selectedHotel.id)}
                >
                  {t("dialog.hotel.reassignBrand")}
                </Button>
              </div>
          ) : (() => {
            const tier =
              selectedProgram.brandTiers.find((t) => t.id === selectedHotel.brandTierId) ??
              selectedProgram.brandTiers[0];
            const elite =
              selectedProgram.eliteTiers.find(
                (e) => e.id === selectedProgram.settings.eliteTierId
              ) ?? selectedProgram.eliteTiers[0];
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
                          value={
                            t("calc.points.unit", {
                              points: fmtInt(selectedCalc.basePoints, language),
                            })
                          }
                      />
                      <StatRow
                          title={t("calc.eliteBonus")}
                          value={
                            t("calc.points.unit", {
                              points: fmtInt(selectedCalc.eliteBonusPoints, language),
                            })
                          }
                      />
                      <StatRow
                          title={t("calc.promoBonus")}
                          value={
                            t("calc.points.unit", {
                              points: fmtInt(selectedCalc.promoExtraPoints, language),
                            })
                          }
                      />
                    </div>
                    <div className="space-y-2">
                      <StatRow
                          title={t("calc.pointsValue")}
                          value={fmtMoney(selectedCalc.pointsValue, currency, language)}
                          sub={
                            t("calc.pointsValue.sub", {
                              amount: selectedProgram.settings.pointValue.amount,
                              currency: selectedProgram.settings.pointValue.currency,
                            })
                          }
                      />
                      <Separator />
                      <StatRow
                          title={t("calc.avgPerNight")}
                          value={fmtMoney(
                            selectedCalc.netCost / Math.max(1, global.nights),
                            currency,
                            language
                          )}
                          sub={
                            t("calc.effectiveDiscount.sub", {
                              value: zhe(selectedCalc.netPayRatio, language),
                            })
                          }
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

        {/* Brand Drawer */}
        <Drawer
            open={brandDrawerOpen}
            title={
              brandEditingId ? t("dialog.brand.edit.title") : t("dialog.brand.add.title")
            }
            onClose={() => setBrandDrawerOpen(false)}
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => setBrandDrawerOpen(false)}
                >
                  {t("dialog.brand.footer.cancel")}
                </Button>
                <Button className="rounded-2xl" onClick={saveBrandDraft}>
                  {t("dialog.brand.footer.save")}
                </Button>
              </div>
            }
        >
          {brandDraftState ? (
              <div className="space-y-5">
                {!brandEditingId ? (
                    <SelectField
                        label={t("brand.template")}
                        value={brandPresetId}
                        onChange={(v) => {
                          setBrandPresetId(v);
                          setBrandDraftState(buildPresetBrand(v));
                        }}
                        options={[
                          {
                            value: "marriott",
                            label: t("brand.preset.marriott"),
                          },
                          {
                            value: "ihg",
                            label: t("brand.preset.ihg"),
                          },
                          {
                            value: "hyatt",
                            label: t("brand.preset.hyatt"),
                          },
                          {
                            value: "hilton",
                            label: t("brand.preset.hilton"),
                          },
                          {
                            value: "accor",
                            label: t("brand.preset.accor"),
                          },
                          {
                            value: "wyndham",
                            label: t("brand.preset.wyndham"),
                          },
                          {
                            value: "shangrila",
                            label: t("brand.preset.shangrila"),
                          },
                          {
                            value: "atour",
                            label: t("brand.preset.atour"),
                          },
                          {
                            value: "huazhu",
                            label: t("brand.preset.huazhu"),
                          },
                          {
                            value: "custom",
                            label: t("brand.preset.custom"),
                          },
                        ]}
                    />
                ) : null}
                <TextField
                    label={t("brand.name")}
                    value={brandDraftState.name}
                    inputClassName={autoInputClass(brandDraftState.nameI18nAuto)}
                    onChange={(v) =>
                        setBrandDraftState((s) =>
                            s
                                ? { ...s, name: v, nameI18nAuto: false }
                                : s
                        )
                    }
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TextField
                      label={t("brand.logo")}
                      value={brandDraftState.logoUrl ?? ""}
                      onChange={(v) =>
                          setBrandDraftState((s) => (s ? { ...s, logoUrl: v } : s))
                      }
                  />
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      {t("brand.color")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                          type="color"
                          className="h-9 w-12 p-1"
                          value={brandDraftState.brandColor ?? "#94A3B8"}
                          onChange={(e) =>
                              setBrandDraftState((s) =>
                                  s ? { ...s, brandColor: e.target.value } : s
                              )
                          }
                      />
                      <Input
                          value={brandDraftState.brandColor ?? ""}
                          placeholder="#RRGGBB"
                          onChange={(e) =>
                              setBrandDraftState((s) =>
                                  s ? { ...s, brandColor: e.target.value } : s
                              )
                          }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">
                      {t("brand.tiers")}
                    </div>
                    <InfoTip
                        title={t("common.tip")}
                        ariaLabel={t("tips.tier")}
                    >
                      {t("brand.tiers.tip", { currency: brandDraftState.currency })}
                    </InfoTip>
                  </div>
                  <div className="space-y-2">
                    {brandDraftState.brandTiers.map((bt, idx) => (
                        <div
                            key={bt.id}
                            className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end"
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
                                                x.id === bt.id
                                                    ? { ...x, label: v, i18nAuto: false }
                                                    : x
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
                              onChange={(v) =>
                                  setBrandDraftState((s) =>
                                      s
                                          ? {
                                            ...s,
                                            brandTiers: s.brandTiers.map((x) =>
                                                x.id === bt.id
                                                    ? { ...x, ratePerUsd: Math.max(0, v) }
                                                    : x
                                            ),
                                          }
                                          : s
                                  )
                              }
                          />
                          <Button
                              variant="ghost"
                              className="rounded-2xl justify-start"
                              onClick={() =>
                                  setBrandDraftState((s) =>
                                      s
                                          ? {
                                            ...s,
                                            brandTiers: s.brandTiers.filter(
                                                (x) => x.id !== bt.id
                                            ),
                                          }
                                          : s
                                  )
                              }
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> {t("brand.tier.remove")}
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

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">
                      {t("brand.elite")}
                    </div>
                    <InfoTip
                        title={t("brand.elite.tip.title")}
                        ariaLabel={t("tips.elite")}
                    >
                      {t("brand.elite.tip")}
                    </InfoTip>
                  </div>
                  <div className="space-y-2">
                    {brandDraftState.eliteTiers.map((e, idx) => (
                        <div
                            key={e.id}
                            className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end"
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
                                                x.id === e.id
                                                    ? { ...x, label: v, i18nAuto: false }
                                                    : x
                                            ),
                                          }
                                          : s
                                  )
                              }
                          />
                          <NumberField
                              label={idx === 0 ? t("brand.elite.bonus") : ""}
                              value={e.bonusRate}
                              step={0.05}
                              onChange={(v) =>
                                  setBrandDraftState((s) =>
                                      s
                                          ? {
                                            ...s,
                                            eliteTiers: s.eliteTiers.map((x) =>
                                                x.id === e.id
                                                    ? { ...x, bonusRate: Math.max(0, v) }
                                                    : x
                                            ),
                                          }
                                          : s
                                  )
                              }
                          />
                          <Button
                              variant="ghost"
                              className="rounded-2xl justify-start"
                              onClick={() =>
                                  setBrandDraftState((s) =>
                                      s
                                          ? {
                                            ...s,
                                            eliteTiers: s.eliteTiers.filter(
                                                (x) => x.id !== e.id
                                            ),
                                          }
                                          : s
                                  )
                              }
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> {t("brand.elite.remove")}
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

                <Separator />

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
                            const cashAmount = convertAmount(
                              s.settings.fnValueCash.amount,
                              s.settings.fnValueCash.currency,
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
                                fnValueCash: {
                                  amount: Math.round(cashAmount),
                                  currency: nextCurrency,
                                },
                              },
                            };
                          })
                      }
                      options={supportedCurrencies.map((c) => ({
                        value: c,
                        label: currencyLabel(c),
                      }))}
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
                  <div className="md:col-span-2 flex items-center gap-2 pt-2">
                    <Checkbox
                        checked={brandDraftState.settings.fnVoucherEnabled}
                        onCheckedChange={(v) =>
                            setBrandDraftState((s) =>
                                s
                                    ? {
                                      ...s,
                                      settings: {
                                        ...s.settings,
                                        fnVoucherEnabled: Boolean(v),
                                      },
                                    }
                                    : s
                            )
                        }
                        id={`fnv-${brandDraftState.id}`}
                    />
                    <Label htmlFor={`fnv-${brandDraftState.id}`} className="text-sm">
                      {t("brand.fn.enabled")}
                    </Label>
                  </div>
                  <SelectField
                      label={t("brand.fnValue")}
                      value={brandDraftState.settings.fnValueMode}
                      disabled={!brandDraftState.settings.fnVoucherEnabled}
                      onChange={(v) =>
                          setBrandDraftState((s) =>
                              s
                                  ? {
                                    ...s,
                                    settings: { ...s.settings, fnValueMode: v as any },
                                  }
                                  : s
                          )
                      }
                      options={[
                        { value: "CASH", label: t("brand.fnValue.mode.cash") },
                        { value: "POINTS", label: t("brand.fnValue.mode.points") },
                      ]}
                  />
                  {brandDraftState.settings.fnValueMode === "CASH" ? (
                      <MoneyField
                          label={t("brand.fnValue.cash")}
                          amount={brandDraftState.settings.fnValueCash.amount}
                          currency={brandDraftState.settings.fnValueCash.currency}
                          disabled={!brandDraftState.settings.fnVoucherEnabled}
                          onAmountChange={(v) =>
                              setBrandDraftState((s) =>
                                  s
                                      ? {
                                        ...s,
                                        settings: {
                                          ...s.settings,
                                          fnValueCash: {
                                            ...s.settings.fnValueCash,
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
                                          fnValueCash: {
                                            ...s.settings.fnValueCash,
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
                  ) : (
                      <NumberField
                          label={t("brand.fnValue.points")}
                          value={brandDraftState.settings.fnValuePoints}
                          step={1000}
                          disabled={!brandDraftState.settings.fnVoucherEnabled}
                          onChange={(v) =>
                              setBrandDraftState((s) =>
                                  s
                                      ? {
                                        ...s,
                                        settings: {
                                          ...s.settings,
                                          fnValuePoints: Math.max(0, v),
                                        },
                                      }
                                      : s
                              )
                          }
                      />
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{t("brand.promos")}</div>
                  <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        className="rounded-2xl"
                        onClick={() => setBrandRulesOpen((v) => !v)}
                    >
                      {brandRulesOpen ? t("common.collapse") : t("common.expand")}
                    </Button>
                    <Select
                        key={`brand-rule-${brandRulePickerKey}`}
                        onValueChange={(v) => {
                          if (!v) return;
                          openRuleEditor("brand", v as any);
                          setBrandRulePickerKey((k) => k + 1);
                        }}
                    >
                      <SelectTrigger className="rounded-2xl bg-secondary text-secondary-foreground h-9 w-auto px-3 shadow-none border-0">
                        <SelectValue placeholder={t("brand.rules.addRule")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_night">
                          {t("brand.rules.type.perNight")}
                        </SelectItem>
                        <SelectItem value="per_stay">
                          {t("brand.rules.type.perStay")}
                        </SelectItem>
                        <SelectItem value="spend">
                          {t("brand.rules.type.spend")}
                        </SelectItem>
                        <SelectItem value="milestone">
                          {t("brand.rules.type.milestone")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {brandRulesOpen ? (
                    <div className="space-y-3">
                      {brandDraftState.settings.rules.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            {t("list.noRules")}
                          </div>
                      ) : null}
                      {brandDraftState.settings.rules.map((r) => (
                          <div
                              key={r.id}
                              className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.2)]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium">{ruleDisplayName(r)}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {ruleSummary(r, currency, language)}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="rounded-2xl"
                                    onClick={() => openRuleEditor("brand", undefined, r.id)}
                                    title={t("brand.rules.edit")}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-2xl"
                                        onClick={() =>
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
                                                            rules: s.settings.rules.filter(
                                                                (x) => x.id !== r.id
                                                            ),
                                                          },
                                                        }
                                                        : s
                                                );
                                                setConfirmState(null);
                                              },
                                            })
                                        }
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
          ) : (
              <div className="text-sm text-muted-foreground">
                {t("common.loading")}
              </div>
          )}
        </Drawer>

        {/* Preferences Drawer */}
        <Drawer
            open={preferencesOpen}
            title={t("drawer.preferences.title")}
            onClose={handlePreferencesClose}
            disableClose={!preferencesComplete}
            footer={
              <div className="flex items-center justify-end gap-2">
                {!preferencesComplete ? (
                  <div className="mr-auto text-xs text-destructive">
                    {t("drawer.preferences.requiredNotice")}
                  </div>
                ) : null}
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={handlePreferencesClose}
                    disabled={!preferencesComplete}
                >
                  {t("common.close")}
                </Button>
              </div>
            }
        >
          <div className="space-y-5">
            <div className="grid gap-6 md:grid-cols-[1fr_240px]">
              <div className="space-y-5">
                <SelectField
                    label={t("drawer.preferences.language")}
                    value={language}
                    onChange={(v) => handleLanguageChange(v as Language)}
                    options={languageOptions}
                />

                <SelectField
                    label={t("drawer.preferences.currency")}
                    value={global.preferredCurrency ?? ""}
                    onChange={(v) => {
                      persistPreferencesSet();
                      setGlobal((g) => ({
                        ...g,
                        preferredCurrency: v as SupportedCurrency,
                      }));
                    }}
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
                    onChange={(v) => {
                      persistPreferencesSet();
                      setGlobal((g) => ({
                        ...g,
                        taxInputMode: v as GlobalSettings["taxInputMode"],
                      }));
                    }}
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
              <div className="self-start rounded-2xl border border-white/70 bg-white/80 p-4 text-sm shadow-[0_12px_30px_-24px_rgba(15,23,42,0.35)]">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("drawer.preferences.demo.title")}
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  {demoLines().map((line) => (
                    <div key={line} className="text-muted-foreground">
                      {line}
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
                      <div className="font-medium">
                        {fxRates?.rates?.[c]?.toFixed(4) ?? "—"}
                      </div>
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
              <Button
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={() => setCountryDrawerOpen(true)}
              >
                {t("common.manage")}
              </Button>
            </div>

            <Separator />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="text-sm text-muted-foreground">
                {t("drawer.preferences.clear.subtitle")}
              </div>
              <div className="flex items-center gap-2">
                <Button
                    variant="destructive"
                    className="rounded-2xl"
                    onClick={() =>
                        setConfirmState({
                          title: t("confirm.reset.travel.title"),
                          message: t("confirm.reset.travel.message"),
                          confirmLabel: t("confirm.reset.label"),
                          cancelLabel: t("common.cancel"),
                          destructive: true,
                          onConfirm: () => {
                            setHotels([]);
                            setGlobal((g) => ({
                              ...g,
                              nights: defaultGlobal.nights,
                              countryId: defaultGlobal.countryId,
                              taxRate: defaultGlobal.taxRate,
                            }));
                            setConfirmState(null);
                          },
                        })
                    }
                >
                  {t("drawer.preferences.clear.travel")}
                </Button>
                <Button
                    variant="destructive"
                    className="rounded-2xl"
                    onClick={() =>
                        setConfirmState({
                          title: t("confirm.reset.brands.title"),
                          message: t("confirm.reset.brands.message"),
                          confirmLabel: t("confirm.reset.label"),
                          cancelLabel: t("common.cancel"),
                          destructive: true,
                          onConfirm: () => {
                            setPrograms(defaultPrograms(false, language));
                            setHotels([]);
                            setBrandPresetId("custom");
                            setConfirmState(null);
                          },
                        })
                    }
                >
                  {t("drawer.preferences.clear.brands")}
                </Button>
              </div>
            </div>
          </div>
        </Drawer>

        {/* Country Drawer */}
        <Drawer
            open={countryDrawerOpen}
            title={t("drawer.preferences.countries.drawerTitle")}
            onClose={() => setCountryDrawerOpen(false)}
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => setCountryDrawerOpen(false)}
                >
                  {t("dialog.country.done")}
                </Button>
              </div>
            }
        >
          <div className="space-y-4">
            {countries.map((c) => (
                <div key={c.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                  <TextField
                      label={t("country.name")}
                      value={
                        getDefaultCountryName(c) && isDefaultCountryName(c)
                          ? getDefaultCountryName(c) ?? c.name
                          : c.name
                      }
                      onChange={(v) =>
                          setCountries((prev) =>
                              prev.map((x) => (x.id === c.id ? { ...x, name: v } : x))
                          )
                      }
                  />
                    <NumberField
                      label={t("country.taxRate")}
                      value={c.taxRate * 100}
                      step={1}
                      inputClassName="w-24 md:w-28"
                      suffix="%"
                      onChange={(v) =>
                        setCountries((prev) =>
                          prev.map((x) =>
                                  x.id === c.id
                                    ? { ...x, taxRate: Math.max(0, v / 100) }
                                    : x
                              )
                          )
                      }
                  />
                  <Button
                      variant="ghost"
                      className="rounded-2xl justify-start"
                      onClick={() =>
                          setCountries((prev) => prev.filter((x) => x.id !== c.id))
                      }
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> {t("common.remove")}
                  </Button>
                </div>
            ))}
            <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() =>
                    setCountries((prev) => [
                      ...prev,
                      { id: uid(), name: t("country.new"), taxRate: 0.1 },
                    ])
                }
            >
              <Plus className="w-4 h-4 mr-2" /> {t("common.add.region")}
            </Button>
          </div>
        </Drawer>

        {/* Hotel Drawer */}
        <Drawer
            open={hotelDrawerOpen}
            title={
              hotelEditingId ? t("dialog.hotel.edit.title") : t("dialog.hotel.add.title")
            }
            onClose={() => setHotelDrawerOpen(false)}
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => setHotelDrawerOpen(false)}
                >
                  {t("dialog.hotel.footer.cancel")}
                </Button>
                <Button className="rounded-2xl" onClick={saveHotelDraft}>
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
                    onChange={(v) =>
                        setHotelDraftState((s) => (s ? { ...s, name: v } : s))
                    }
                />

                <SelectField
                    label={t("hotel.brand")}
                    value={hotelDraftState.programId}
                    onChange={(v) => {
                      const p = programById.get(v);
                      const tierId = p?.brandTiers[0]?.id ?? "";
                      setHotelDraftState((s) =>
                          s ? { ...s, programId: v, brandTierId: tierId } : s
                      );
                    }}
                    options={programs.map((p) => ({ value: p.id, label: p.name }))}
                />

                {(() => {
                  const p = programById.get(hotelDraftState.programId);
                  if (!p)
                    return (
                        <div className="text-sm text-muted-foreground">
                          {t("hotel.brand.empty")}
                        </div>
                    );

                  return (
                      <>
                        <SelectField
                            label={t("hotel.brand.tier")}
                            value={hotelDraftState.brandTierId}
                            onChange={(v) =>
                                setHotelDraftState((s) =>
                                    s ? { ...s, brandTierId: v } : s
                                )
                            }
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
                                currency={
                                  hotelDraftState.ratePreTax?.currency ?? preferredCurrency
                                }
                                onAmountChange={(v) =>
                                    setHotelDraftState((s) =>
                                        s
                                            ? {
                                              ...s,
                                              ratePreTax: {
                                                amount: Math.max(0, v),
                                                currency:
                                                    s.ratePreTax?.currency ?? preferredCurrency,
                                              },
                                            }
                                            : s
                                    )
                                }
                                onCurrencyChange={(v) =>
                                    setHotelDraftState((s) =>
                                        s
                                            ? {
                                              ...s,
                                              ratePreTax: {
                                                amount: s.ratePreTax?.amount ?? 0,
                                                currency: v as SupportedCurrency,
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
                        ) : taxInputMode === "POST_TAX_PLUS_RATE" ? (
                            <MoneyField
                                label={t("hotel.rate.postTax")}
                                amount={hotelDraftState.ratePostTax?.amount ?? 0}
                                currency={
                                  hotelDraftState.ratePostTax?.currency ?? preferredCurrency
                                }
                                onAmountChange={(v) =>
                                    setHotelDraftState((s) =>
                                        s
                                            ? {
                                              ...s,
                                              ratePostTax: {
                                                amount: Math.max(0, v),
                                                currency:
                                                    s.ratePostTax?.currency ?? preferredCurrency,
                                              },
                                            }
                                            : s
                                    )
                                }
                                onCurrencyChange={(v) =>
                                    setHotelDraftState((s) =>
                                        s
                                            ? {
                                              ...s,
                                              ratePostTax: {
                                                amount: s.ratePostTax?.amount ?? 0,
                                                currency: v as SupportedCurrency,
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
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <MoneyField
                                  label={t("hotel.rate.preTax")}
                                  amount={hotelDraftState.ratePreTax?.amount ?? 0}
                                  currency={
                                    hotelDraftState.ratePreTax?.currency ?? preferredCurrency
                                  }
                                  onAmountChange={(v) =>
                                      setHotelDraftState((s) =>
                                          s
                                              ? {
                                                ...s,
                                                ratePreTax: {
                                                  amount: Math.max(0, v),
                                                  currency:
                                                      s.ratePreTax?.currency ?? preferredCurrency,
                                                },
                                              }
                                              : s
                                      )
                                  }
                                  onCurrencyChange={(v) =>
                                      setHotelDraftState((s) =>
                                          s
                                              ? {
                                                ...s,
                                                ratePreTax: {
                                                  amount: s.ratePreTax?.amount ?? 0,
                                                  currency: v as SupportedCurrency,
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
                              <MoneyField
                                  label={t("hotel.rate.postTax")}
                                  amount={hotelDraftState.ratePostTax?.amount ?? 0}
                                  currency={
                                    hotelDraftState.ratePostTax?.currency ?? preferredCurrency
                                  }
                                  onAmountChange={(v) =>
                                      setHotelDraftState((s) =>
                                          s
                                              ? {
                                                ...s,
                                                ratePostTax: {
                                                  amount: Math.max(0, v),
                                                  currency:
                                                      s.ratePostTax?.currency ?? preferredCurrency,
                                                },
                                              }
                                              : s
                                      )
                                  }
                                  onCurrencyChange={(v) =>
                                      setHotelDraftState((s) =>
                                          s
                                              ? {
                                                ...s,
                                                ratePostTax: {
                                                  amount: s.ratePostTax?.amount ?? 0,
                                                  currency: v as SupportedCurrency,
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
                        )}

                        <Separator />

                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium">{t("hotel.promos")}</div>
                          <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                className="rounded-2xl"
                                onClick={() => setHotelRulesOpen((v) => !v)}
                            >
                              {hotelRulesOpen ? t("common.collapse") : t("common.expand")}
                            </Button>
                            <Select
                                key={`hotel-rule-${hotelRulePickerKey}`}
                                onValueChange={(v) => {
                                  if (!v) return;
                                  openRuleEditor("hotel", v as any);
                                  setHotelRulePickerKey((k) => k + 1);
                                }}
                            >
                              <SelectTrigger className="rounded-2xl bg-secondary text-secondary-foreground h-9 w-auto px-3 shadow-none border-0">
                                <SelectValue placeholder={t("hotel.rules.addRule")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="per_night">
                                  {t("hotel.rules.type.perNight")}
                                </SelectItem>
                                <SelectItem value="per_stay">
                                  {t("hotel.rules.type.perStay")}
                                </SelectItem>
                                <SelectItem value="spend">
                                  {t("hotel.rules.type.spend")}
                                </SelectItem>
                                <SelectItem value="milestone">
                                  {t("hotel.rules.type.milestone")}
                                </SelectItem>
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
                                        <div className="font-medium">{ruleDisplayName(r)}</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {ruleSummary(r, currency, language)}
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="rounded-2xl"
                                            onClick={() => openRuleEditor("hotel", undefined, r.id)}
                                            title={t("hotel.rules.edit")}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-2xl"
                                            onClick={() =>
                                                setConfirmState({
                                                  title: t("confirm.delete.rule"),
                                                  message: t("confirm.delete.notice"),
                                                  confirmLabel: t("common.delete"),
                                                  cancelLabel: t("common.cancel"),
                                                  destructive: true,
                                                  onConfirm: () => {
                                                    setHotelDraftState((s) =>
                                                        s
                                                            ? {
                                                              ...s,
                                                              rules: s.rules.filter((x) => x.id !== r.id),
                                                            }
                                                            : s
                                                    );
                                                    setConfirmState(null);
                                                  },
                                                })
                                            }
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
              <div className="text-sm text-muted-foreground">
                {t("common.loading")}
              </div>
          )}
        </Drawer>

        {/* Rule Drawer */}
        <Drawer
            open={ruleDrawerOpen}
            title={
              <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-2xl"
                    onClick={closeRuleDrawer}
                >
                  {t("dialog.rule.back")}
                </Button>
                <span>
                  {ruleContext?.ruleId ? t("dialog.rule.title.edit") : t("dialog.rule.title.add")}
                </span>
              </div>
            }
            onClose={closeRuleDrawer}
            zIndex={60}
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={closeRuleDrawer}
                >
                  {t("dialog.rule.footer.cancel")}
                </Button>
                <Button
                    className="rounded-2xl"
                    onClick={saveRuleDraft}
                    disabled={ruleFnBlocked}
                >
                  {t("dialog.rule.footer.save")}
                </Button>
              </div>
            }
        >
          {ruleDraftState ? (
              <RuleEditor
                  rule={ruleDraftState}
                  currency={currency}
                  language={language}
                  nameMode={ruleNameMode}
                  autoName={autoRuleName(ruleDraftState)}
                  onNameFocus={() => setRuleNameMode("manual")}
                  fnVoucherEnabled={fnVoucherEnabled}
                  onRequestFnVoucher={handleFnVoucherRequest}
                  onUpdate={(patch) =>
                      setRuleDraftState((s) => {
                        if (!s) return s;
                        if (ruleNameMode === "auto" && patch.name !== undefined) {
                          setRuleNameMode("manual");
                        }
                        return { ...s, ...patch };
                      })
                  }
                  onRemove={removeRuleDraft}
              />
          ) : (
              <div className="text-sm text-muted-foreground">
                {t("common.loading")}
              </div>
          )}
        </Drawer>
        <ConfirmDialog
            open={Boolean(confirmState)}
            title={confirmState?.title ?? ""}
            message={confirmState?.message ?? ""}
            confirmLabel={confirmState?.confirmLabel ?? ""}
            cancelLabel={confirmState?.cancelLabel ?? ""}
            destructive={confirmState?.destructive}
            onConfirm={() => confirmState?.onConfirm()}
            onCancel={() => setConfirmState(null)}
        />
        <ConfirmDialog
            open={firstVisitPromptOpen}
            title={t("dialog.quickSetup.title")}
            message={t("dialog.quickSetup.message")}
            confirmLabel={t("dialog.quickSetup.action")}
            cancelLabel=""
            showCancel={false}
            dismissible={false}
            onConfirm={() => {
              setFirstVisitPromptOpen(false);
              setPreferencesOpen(true);
            }}
            onCancel={() => {}}
        />
      </div>
  );
}
