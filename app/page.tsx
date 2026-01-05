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
import { computeHotel } from "@/lib/hotel/calc";
import { fmtInt, fmtMoney, fmtPct, ruleSummary, zhe } from "@/lib/hotel/format";
import { defaultGlobal, defaultHotel, defaultPrograms, mkElite, mkTier, ruleTemplate, uid } from "@/lib/hotel/defaults";
import { loadPersistedState, persistState } from "@/lib/hotel/persistence";
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
 * - FN value is a brand hyperparameter; reward can directly choose FN.
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
  const [programs, setPrograms] = useState<Program[]>(defaultPrograms());
  const [hotels, setHotels] = useState<HotelOption[]>([]); // start from 0
  const [language, setLanguage] = useState<Language>("zh");
  const [hydrated, setHydrated] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

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
    { id: "us", name: "United States", taxRate: 0.08 },
    { id: "cn", name: "中国 China", taxRate: 0.1 },
    { id: "jp", name: "Japan", taxRate: 0.1 },
    { id: "sg", name: "Singapore", taxRate: 0.09 },
    { id: "gb", name: "United Kingdom", taxRate: 0.2 },
    { id: "eu", name: "Eurozone", taxRate: 0.2 },
    { id: "hk", name: "Hong Kong", taxRate: 0.0 },
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

  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const preferredCurrency = global.preferredCurrency;

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
    if (key.includes("marriott")) return "#B71C1C";
    if (key.includes("ihg") || key.includes("intercontinental")) return "#D32F2F";
    if (key.includes("hyatt")) return "#0B4EA2";
    if (key.includes("hilton")) return "#0057B8";
    if (key.includes("accor")) return "#C8A34E";
    if (key.includes("wyndham")) return "#0077C8";
    if (key.includes("shangri")) return "#F6C343";
    if (key.includes("atour")) return "#00A3A3";
    if (key.includes("h world") || key.includes("huazhu")) return "#4B326D";
    return "#94A3B8";
  };

  const buildBlankBrand = (): Program => {
    const elite = [mkElite("Member", 0)];
    return {
      id: uid(),
      name: t("新品牌", "New brand"),
      logoUrl: "",
      brandColor: pickRandomBrandColor(),
      currency: "USD",
      brandTiers: [mkTier(t("10x（默认）", "10x (default)"), 10)],
      eliteTiers: elite,
      settings: {
        eliteTierId: elite[0].id,
        pointValue: { amount: 0.008, currency: "USD" },
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
    const presets = defaultPrograms(true);
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
      return language === "en"
        ? `Milestone at ${rule.trigger.threshold} nights`
        : `满${rule.trigger.threshold}晚奖励`;
    }
    if (trigger === "spend") {
      return language === "en" ? "Spend reward" : "消费奖励";
    }
    if (trigger === "per_stay") {
      if (reward.type === "points") {
        return language === "en"
          ? `Per stay ${reward.points} pts`
          : `每次入住 ${reward.points} 积分`;
      }
      if (reward.type === "multiplier") {
        return language === "en"
          ? `Per stay ${reward.z}x points`
          : `每次入住 ${reward.z} 倍积分`;
      }
      return language === "en"
        ? `Per stay ${reward.count} FN`
        : `每次入住 ${reward.count} FN`;
    }
    if (reward.type === "multiplier") {
      return language === "en"
        ? `Per night ${reward.z}x points`
        : `每晚 ${reward.z} 倍积分`;
    }
    if (reward.type === "points") {
      return language === "en"
        ? `Per night ${reward.points} pts`
        : `每晚 ${reward.points} 积分`;
    }
    return language === "en"
      ? `Per night ${reward.count} FN`
      : `每晚 ${reward.count} FN`;
  };

  const ruleDisplayName = (rule: Rule) => {
    const name = rule.name?.trim();
    return name ? name : autoRuleName(rule);
  };

  const formatEliteLabel = (label: string) => {
    const hasZh = /[\u4e00-\u9fff]/.test(label);
    const hasEn = /[A-Za-z]/.test(label);
    if (hasZh && hasEn) return label;
    const map: Record<string, string> = {
      Member: "会员",
      Silver: "银卡",
      Gold: "金卡",
      Platinum: "白金",
      Titanium: "钛金",
      Ambassador: "大使",
      Diamond: "钻石",
      Discoverist: "探索者",
      Explorist: "冒险家",
      Globalist: "环球客",
    };
    const englishKey = Object.keys(map).find((key) => label.includes(key));
    if (hasEn && englishKey) return `${label} / ${map[englishKey]}`;
    if (hasZh) {
      const en = Object.entries(map).find(([, cn]) => label.includes(cn))?.[0];
      return en ? `${label} / ${en}` : label;
    }
    return label;
  };

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
    if (key.includes("marriott")) return { src: "/brands/marriott.svg", alt: "Marriott" };
    if (key.includes("ihg") || key.includes("intercontinental"))
      return { src: "/brands/ihg.svg", alt: "IHG" };
    if (key.includes("hyatt")) return { src: "/brands/hyatt.svg", alt: "Hyatt" };
    if (key.includes("hilton")) return { src: "/brands/hilton.svg", alt: "Hilton" };
    if (key.includes("accor")) return { src: "/brands/accor.svg", alt: "Accor" };
    if (key.includes("wyndham")) return { src: "/brands/wyndham.svg", alt: "Wyndham" };
    if (key.includes("shangri")) return { src: "/brands/shangrila.svg", alt: "Shangri-La" };
    if (key.includes("atour")) return { src: "/brands/atour.svg", alt: "Atour" };
    if (key.includes("h world") || key.includes("huazhu"))
      return { src: "/brands/h.png", alt: "H World" };
    return null;
  };

  const brandColor = (program?: Program | null) => {
    if (!program) return "#94A3B8";
    const custom = program.brandColor?.trim();
    return custom ? custom : colorByName(program.name);
  };

  React.useEffect(() => {
    const stored = loadPersistedState();
    if (stored) {
      const normalizedPrograms = stored.programs.map((program) => ({
        ...program,
        currency: program.currency ?? "USD",
        settings: {
          ...program.settings,
          pointValue:
            program.settings.pointValue?.amount !== undefined
              ? program.settings.pointValue
              : {
                  amount: (program.settings as any).pointValue ?? 0,
                  currency: program.currency ?? "USD",
                },
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
        preferredCurrency: stored.global.preferredCurrency ?? "USD",
        countryId: stored.global.countryId ?? "us",
        taxInputMode: stored.global.taxInputMode ?? "PRE_TAX_PLUS_RATE",
        taxRate: stored.global.taxRate ?? 0.1,
      });
      setPrograms(normalizedPrograms.length ? normalizedPrograms : defaultPrograms());
      setHotels(normalizedHotels);
      setLanguage(stored.language ?? "zh");
      setCountries(stored.countries ?? countries);
      setFxRates(stored.fxRates ?? null);
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
      ? t("删除品牌并移除酒店？", "Delete brand and remove hotels?")
      : t("删除品牌？", "Delete brand?");
    const message = linked.length
      ? t(
          `该品牌下已有 ${linked.length} 家酒店，删除后将一并移除相关酒店记录。`,
          `${linked.length} hotels are linked to this brand and will be removed.`
        )
      : t("此操作无法撤销。", "This action cannot be undone.");
    setConfirmState({
      title,
      message,
      confirmLabel: t("删除", "Delete"),
      cancelLabel: t("取消", "Cancel"),
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
      copy.name = language === "en" ? `${existing.name} Copy` : `${existing.name}（副本）`;
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
      if (language === "en") {
        return { ...h, name: "Hotel" };
      }
      return h;
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
      title: t("删除酒店？", "Delete hotel?"),
      message: t("此操作无法撤销。", "This action cannot be undone."),
      confirmLabel: t("删除", "Delete"),
      cancelLabel: t("取消", "Cancel"),
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
    triggerType?: "per_night" | "per_stay" | "milestone",
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
    const trimmedName = ruleDraftState.name.trim();
    const namedRule = trimmedName
      ? { ...ruleDraftState, name: trimmedName }
      : { ...ruleDraftState, name: autoRuleName(ruleDraftState) };
    const normalizedRule =
      namedRule.trigger.type === "milestone"
        ? { ...namedRule, trigger: { ...namedRule.trigger, metric: "nights" } }
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
        title: t("删除规则？", "Delete rule?"),
        message: t("此操作无法撤销。", "This action cannot be undone."),
        confirmLabel: t("删除", "Delete"),
        cancelLabel: t("取消", "Cancel"),
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
      title: t("删除规则？", "Delete rule?"),
      message: t("此操作无法撤销。", "This action cannot be undone."),
      confirmLabel: t("删除", "Delete"),
      cancelLabel: t("取消", "Cancel"),
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
                  {t("旅宿优选 Staysage", "Staysage")}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {t(
                  "一眼看清哪家更划算，住得明白、选得漂亮。",
                  "See which stay gives you the best value at a glance."
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:inline-flex items-center gap-1 rounded-2xl border border-white/70 bg-white/70 p-1 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.25)]">
                <Button
                    variant={language === "zh" ? "default" : "secondary"}
                    className="rounded-2xl h-8"
                    onClick={() => setLanguage("zh")}
                >
                  中文
                </Button>
                <Button
                    variant={language === "en" ? "default" : "secondary"}
                    className="rounded-2xl h-8"
                    onClick={() => setLanguage("en")}
                >
                  English
                </Button>
              </div>
              <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-2xl"
                  onClick={() => setPreferencesOpen(true)}
                  title={t("偏好设置", "Preferences")}
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <PageTabs
              page={page}
              setPage={setPage}
              travelLabel={t("旅行", "Travel")}
              brandsLabel={t("品牌与会员", "Brands & Members")}
          />
        </div>

        {/* Travel */}
        {page === "travel" ? (
            <Card className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{t("旅行", "Travel")}</CardTitle>
                  <InfoTip
                      title={t("小贴士", "Tip")}
                      ariaLabel={t("旅行提示", "Travel tip")}
                  >
                    {t(
                      "入住国家会带入默认税率，必要时可在偏好设置中调整。",
                      "Country sets a default tax rate. You can tweak it in preferences."
                    )}
                  </InfoTip>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <NumberField
                      label={t("入住房晚", "Nights")}
                      value={global.nights}
                      step={1}
                      onChange={(v) =>
                          setGlobal((g) => ({
                            ...g,
                            nights: Math.max(1, Math.round(v)),
                          }))
                      }
                  />
                  <SelectField
                      label={t("入住国家 / 地区", "Country / Region")}
                      value={global.countryId}
                      onChange={(v) => {
                        const country = countries.find((c) => c.id === v);
                        setGlobal((g) => ({
                          ...g,
                          countryId: v,
                          taxRate: country ? country.taxRate : g.taxRate,
                        }));
                      }}
                      options={countries.map((c) => ({ value: c.id, label: c.name }))}
                  />
                  {global.taxInputMode === "PRE_TAX_PLUS_RATE" ||
                  global.taxInputMode === "POST_TAX_PLUS_RATE" ? (
                      <NumberField
                          label={
                            <span className="inline-flex items-center gap-2">
                              {t("税率", "Tax rate")}
                              <InfoTip
                                  title={t("税率提示", "Tax rate tip")}
                                  ariaLabel={t("税率提示", "Tax rate tip")}
                                  className="h-5 w-5"
                              >
                                {t("例如 0.10 = 10%。", "e.g. 0.10 = 10%.")}
                              </InfoTip>
                            </span>
                          }
                          value={global.taxRate}
                          step={0.01}
                          onChange={(v) =>
                              setGlobal((g) => ({ ...g, taxRate: Math.max(0, v) }))
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
                      {t("品牌与会员", "Brands & Members")}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t(
                        "默认提供常见品牌，你可以按自己的使用习惯调整。",
                        "Start with popular brands and tailor them to your account."
                      )}
                    </div>
                  </div>
                  <Button className="rounded-2xl" onClick={openBrandDrawerNew}>
                    <Plus className="w-4 h-4 mr-2" /> {t("新增品牌", "Add brand")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {programs.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      {t("暂无品牌，请先新增。", "No brands yet. Add one to start.")}
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
                                    {t("暂无活动规则。", "No promo rules yet.")}
                                  </div>
                              )}
                              <SelectField
                                  label={t("当前会员等级", "Current tier")}
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
                                  title={t("编辑", "Edit")}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                  variant="secondary"
                                  size="icon"
                                  className="rounded-2xl"
                                  onClick={() => copyBrand(p.id)}
                                  title={t("复制", "Duplicate")}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-2xl"
                                  onClick={() => deleteBrand(p.id)}
                                  title={t("删除品牌（会移除相关酒店）", "Delete brand (removes linked hotels)")}
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
                              {t("编辑", "Edit")}
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
                    {t("去旅行 →", "Go to Travel →")}
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
                    <CardTitle className="text-base">{t("酒店方案", "Stays")}</CardTitle>
                    <InfoTip
                        title={t("如何计算", "How it works")}
                        ariaLabel={t("酒店对比提示", "Hotels tip")}
                    >
                      {t(
                        "净成本 = 税后总价 −（总积分 × 积分价值）。总积分由基础积分、精英加成与活动奖励（含 FN 折算）构成。",
                        "Net cost = post-tax total − (total points × point value). Total points = base + elite bonus + promo (incl. FN)."
                      )}
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
                      <Plus className="w-4 h-4 mr-2" /> {t("添加酒店", "Add hotel")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hotels.length === 0 ? (
                      <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-sm text-muted-foreground">
                        {t(
                          "目前没有酒店方案。点击右上角“添加酒店”开始录入。",
                          "No hotels yet. Click “Add hotel” to start."
                        )}
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
                                        {t("方案", "Option")} #{i + 1}
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
                                {t("总价（税后）", "Total (post-tax)")}
                              </span>
                                      <span className="text-sm font-semibold">
                                {fmtMoney(c.paidPostTax, currency)}
                              </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {t("净成本", "Net cost")}
                              </span>
                                      <span className="text-sm font-semibold">
                                {fmtMoney(c.netCost, currency)}
                              </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {t("等效折扣", "Effective discount")}
                              </span>
                                      <span className="text-sm font-semibold">
                                {zhe(c.netPayRatio, language)}
                              </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {t("每晚均价", "Avg per night")}
                              </span>
                                      <span className="text-sm font-semibold">
                                {fmtMoney(c.netCost / Math.max(1, global.nights), currency)}
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
                                      {t("查看详情", "Details")}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="rounded-2xl h-8 w-8"
                                        onClick={() => openHotelDrawerEdit(h.id)}
                                        title={t("编辑酒店", "Edit hotel")}
                                    >
                                      <Settings2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-2xl h-8 w-8"
                                        onClick={() => deleteHotel(h.id)}
                                        title={t("删除酒店", "Delete hotel")}
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
            title={selectedHotel ? selectedHotel.name : t("酒店详情", "Hotel details")}
            onClose={() => setHotelDetailOpen(false)}
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => setHotelDetailOpen(false)}
                >
                  {t("关闭", "Close")}
                </Button>
                {selectedHotel ? (
                  <Button
                      className="rounded-2xl"
                      onClick={() => {
                        setHotelDetailOpen(false);
                        openHotelDrawerEdit(selectedHotel.id);
                      }}
                  >
                    {t("编辑酒店", "Edit hotel")}
                  </Button>
                ) : null}
              </div>
            }
        >
          {!selectedHotel ? (
              <div className="text-sm text-muted-foreground">
                {t("未找到酒店。", "Hotel not found.")}
              </div>
          ) : !selectedProgram || !selectedCalc ? (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {t(
                    "该酒店引用的品牌已被删除。",
                    "The referenced brand for this hotel was deleted."
                  )}
                </div>
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => openHotelDrawerEdit(selectedHotel.id)}
                >
                  {t("重新选择品牌", "Reassign brand")}
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
                          {t("所属品牌", "Brand")}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: brandColor(selectedProgram) }}
                          />
                          <div className="font-medium">{selectedProgram.name}</div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {language === "en"
                            ? `${tier?.label ?? "-"} · Elite: ${formatEliteLabel(elite?.label ?? "-")}`
                            : `${tier?.label ?? "-"} · 精英：${formatEliteLabel(elite?.label ?? "-")}`}
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
                          title={t("税后总价", "Post-tax total")}
                          value={fmtMoney(selectedCalc.paidPostTax, currency)}
                      />
                      <StatRow
                          title={t("税前合计（计点）", "Pre-tax total (eligible)")}
                          value={fmtMoney(selectedCalc.paidPreTax, currency)}
                      />
                      <Separator />
                      <StatRow
                          title={t("基础积分", "Base points")}
                          value={
                            language === "en"
                              ? `${fmtInt(selectedCalc.basePoints)} pts`
                              : `${fmtInt(selectedCalc.basePoints)} 点`
                          }
                      />
                      <StatRow
                          title={t("精英加成", "Elite bonus")}
                          value={
                            language === "en"
                              ? `${fmtInt(selectedCalc.eliteBonusPoints)} pts`
                              : `${fmtInt(selectedCalc.eliteBonusPoints)} 点`
                          }
                      />
                      <StatRow
                          title={t("活动额外", "Promo bonus")}
                          value={
                            language === "en"
                              ? `${fmtInt(selectedCalc.promoExtraPoints)} pts`
                              : `${fmtInt(selectedCalc.promoExtraPoints)} 点`
                          }
                      />
                    </div>
                    <div className="space-y-2">
                      <StatRow
                          title={t("积分折现价值", "Points value")}
                          value={fmtMoney(selectedCalc.pointsValue, currency)}
                          sub={
                            language === "en"
                              ? `at ${selectedProgram.settings.pointValue.amount} ${selectedProgram.settings.pointValue.currency}/pt`
                              : `按 ${selectedProgram.settings.pointValue.amount} ${selectedProgram.settings.pointValue.currency}/点`
                          }
                      />
                      <Separator />
                      <StatRow
                          title={t("每晚均价", "Avg per night")}
                          value={fmtMoney(selectedCalc.netCost / Math.max(1, global.nights), currency)}
                          sub={
                            language === "en"
                              ? `Effective discount: ${zhe(selectedCalc.netPayRatio, language)}`
                              : `等效折扣：${zhe(selectedCalc.netPayRatio, language)}`
                          }
                      />
                      <StatRow
                          title={t("净成本", "Net cost")}
                          value={fmtMoney(selectedCalc.netCost, currency)}
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
            title={brandEditingId ? t("编辑品牌", "Edit brand") : t("新增品牌", "Add brand")}
            onClose={() => setBrandDrawerOpen(false)}
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => setBrandDrawerOpen(false)}
                >
                  {t("取消", "Cancel")}
                </Button>
                <Button className="rounded-2xl" onClick={saveBrandDraft}>
                  {t("保存", "Save")}
                </Button>
              </div>
            }
        >
          {brandDraftState ? (
              <div className="space-y-5">
                {!brandEditingId ? (
                    <SelectField
                        label={t("品牌模板", "Brand template")}
                        value={brandPresetId}
                        onChange={(v) => {
                          setBrandPresetId(v);
                          setBrandDraftState(buildPresetBrand(v));
                        }}
                        options={[
                          {
                            value: "marriott",
                            label: t("万豪 Marriott", "Marriott"),
                          },
                          {
                            value: "ihg",
                            label: t("洲际 IHG", "IHG"),
                          },
                          {
                            value: "hyatt",
                            label: t("凯悦 Hyatt", "Hyatt"),
                          },
                          {
                            value: "hilton",
                            label: t("希尔顿 Hilton", "Hilton"),
                          },
                          {
                            value: "accor",
                            label: t("雅高 Accor", "Accor"),
                          },
                          {
                            value: "wyndham",
                            label: t("温德姆 Wyndham", "Wyndham"),
                          },
                          {
                            value: "shangrila",
                            label: t("香格里拉 Shangri-La", "Shangri-La"),
                          },
                          {
                            value: "atour",
                            label: t("亚朵 Atour", "Atour"),
                          },
                          {
                            value: "huazhu",
                            label: t("华住会 H World", "H World"),
                          },
                          {
                            value: "custom",
                            label: t("自定义", "Custom"),
                          },
                        ]}
                    />
                ) : null}
                <TextField
                    label={t("品牌名称", "Brand name")}
                    value={brandDraftState.name}
                    onChange={(v) =>
                        setBrandDraftState((s) => (s ? { ...s, name: v } : s))
                    }
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TextField
                      label={t("品牌 Logo 链接（可选）", "Logo URL (optional)")}
                      value={brandDraftState.logoUrl ?? ""}
                      onChange={(v) =>
                          setBrandDraftState((s) => (s ? { ...s, logoUrl: v } : s))
                      }
                  />
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      {t("品牌色", "Brand color")}
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
                      {t("计点倍率档次", "Earning tiers")}
                    </div>
                    <InfoTip
                        title={t("小提示", "Tip")}
                        ariaLabel={t("计点倍率提示", "Tier tip")}
                    >
                      {t(
                        `倍率按每 1 ${brandDraftState.currency} 计算基础积分。建议以“10x / 5x”档位维护。`,
                        `Rates are base points per ${brandDraftState.currency}. Use tiers like “10x / 5x”.`
                      )}
                    </InfoTip>
                  </div>
                  <div className="space-y-2">
                    {brandDraftState.brandTiers.map((bt, idx) => (
                        <div
                            key={bt.id}
                            className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end"
                        >
                          <TextField
                              label={idx === 0 ? t("档次名", "Tier name") : ""}
                              value={bt.label}
                              onChange={(v) =>
                                  setBrandDraftState((s) =>
                                      s
                                          ? {
                                            ...s,
                                            brandTiers: s.brandTiers.map((x) =>
                                                x.id === bt.id ? { ...x, label: v } : x
                                            ),
                                          }
                                          : s
                                  )
                              }
                          />
                          <NumberField
                              label={idx === 0 ? t("倍率", "Rate") : ""}
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
                            <Trash2 className="w-4 h-4 mr-2" /> {t("删除档次", "Remove tier")}
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
                                        mkTier(t("新档次", "New tier"), 10),
                                      ],
                                    }
                                    : s
                            )
                        }
                    >
                      <Plus className="w-4 h-4 mr-2" /> {t("添加档次", "Add tier")}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">
                      {t("会员等级", "Elite tiers")}
                    </div>
                    <InfoTip
                        title={t("加成说明", "Bonus info")}
                        ariaLabel={t("精英加成提示", "Elite bonus tip")}
                    >
                      {t(
                        "加成基于基础积分，填写 0.5 表示 +50%。",
                        "Bonus applies to base points. 0.5 means +50%."
                      )}
                    </InfoTip>
                  </div>
                  <div className="space-y-2">
                    {brandDraftState.eliteTiers.map((e, idx) => (
                        <div
                            key={e.id}
                            className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end"
                        >
                          <TextField
                              label={idx === 0 ? t("等级名", "Tier name") : ""}
                              value={e.label}
                              onChange={(v) =>
                                  setBrandDraftState((s) =>
                                      s
                                          ? {
                                            ...s,
                                            eliteTiers: s.eliteTiers.map((x) =>
                                                x.id === e.id ? { ...x, label: v } : x
                                            ),
                                          }
                                          : s
                                  )
                              }
                          />
                          <NumberField
                              label={idx === 0 ? t("加成", "Bonus") : ""}
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
                            <Trash2 className="w-4 h-4 mr-2" /> {t("删除等级", "Remove tier")}
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
                                        mkElite(t("新等级", "New tier"), 0),
                                      ],
                                    }
                                    : s
                            )
                        }
                    >
                      <Plus className="w-4 h-4 mr-2" /> {t("添加等级", "Add tier")}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SelectField
                      label={t("品牌货币", "Brand currency")}
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
                      options={supportedCurrencies.map((c) => ({ value: c, label: c }))}
                  />
                  <SelectField
                      label={t("计点口径", "Earning basis")}
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
                        { value: "PRE_TAX", label: t("税前计点", "Pre-tax") },
                        { value: "POST_TAX", label: t("税后计点", "Post-tax") },
                      ]}
                  />
                  <MoneyField
                      label={t("积分价值", "Point value")}
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
                      currencyOptions={supportedCurrencies.map((c) => ({ value: c, label: c }))}
                  />
                  <SelectField
                      label={t("免费房晚估值", "FN valuation")}
                      value={brandDraftState.settings.fnValueMode}
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
                        { value: "CASH", label: t("现金", "Cash") },
                        { value: "POINTS", label: t("积分", "Points") },
                      ]}
                  />
                  {brandDraftState.settings.fnValueMode === "CASH" ? (
                      <MoneyField
                          label={t("免费房晚面值", "FN value")}
                          amount={brandDraftState.settings.fnValueCash.amount}
                          currency={brandDraftState.settings.fnValueCash.currency}
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
                            label: c,
                          }))}
                      />
                  ) : (
                      <NumberField
                          label={t("免费房晚等价积分", "FN equivalent points")}
                          value={brandDraftState.settings.fnValuePoints}
                          step={1000}
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
                  <div className="font-medium">{t("品牌活动", "Brand promos")}</div>
                  <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        className="rounded-2xl"
                        onClick={() => setBrandRulesOpen((v) => !v)}
                    >
                      {brandRulesOpen ? t("收起规则", "Collapse") : t("展开规则", "Expand")}
                    </Button>
                    <Select
                        key={`brand-rule-${brandRulePickerKey}`}
                        onValueChange={(v) => {
                          if (!v) return;
                          openRuleEditor(
                            "brand",
                            v as "per_night" | "per_stay" | "milestone" | "spend"
                          );
                          setBrandRulePickerKey((k) => k + 1);
                        }}
                    >
                      <SelectTrigger className="rounded-2xl bg-secondary text-secondary-foreground h-9 w-auto px-3 shadow-none border-0">
                        <SelectValue placeholder={t("添加规则", "Add rule")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_night">
                          {t("每晚奖励", "Per night")}
                        </SelectItem>
                        <SelectItem value="per_stay">
                          {t("每次入住", "Per stay")}
                        </SelectItem>
                        <SelectItem value="spend">
                          {t("消费门槛", "Spend threshold")}
                        </SelectItem>
                        <SelectItem value="milestone">
                          {t("里程碑", "Milestone")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {brandRulesOpen ? (
                    <div className="space-y-3">
                      {brandDraftState.settings.rules.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            {t("暂无规则。", "No rules yet.")}
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
                                    title={t("编辑规则", "Edit rule")}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-2xl"
                                        onClick={() =>
                                            setConfirmState({
                                              title: t("删除规则？", "Delete rule?"),
                                              message: t("此操作无法撤销。", "This action cannot be undone."),
                                              confirmLabel: t("删除", "Delete"),
                                              cancelLabel: t("取消", "Cancel"),
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
                                        title={t("删除规则", "Delete rule")}
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
                {t("加载中…", "Loading...")}
              </div>
          )}
        </Drawer>

        {/* Preferences Drawer */}
        <Drawer
            open={preferencesOpen}
            title={t("偏好设置", "Preferences")}
            onClose={() => setPreferencesOpen(false)}
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => setPreferencesOpen(false)}
                >
                  {t("关闭", "Close")}
                </Button>
              </div>
            }
        >
          <div className="space-y-5">
            <SelectField
                label={t("偏好货币", "Preferred currency")}
                value={preferredCurrency}
                onChange={(v) =>
                    setGlobal((g) => ({
                      ...g,
                      preferredCurrency: v as SupportedCurrency,
                    }))
                }
                options={supportedCurrencies.map((c) => ({ value: c, label: c }))}
            />

            <div className="md:hidden">
              <SelectField
                  label={t("语言", "Language")}
                  value={language}
                  onChange={(v) => setLanguage(v as Language)}
                  options={[
                    { value: "zh", label: "中文" },
                    { value: "en", label: "English" },
                  ]}
              />
            </div>

            <SelectField
                label={
                  <span className="inline-flex items-center gap-2">
                    {t("房费输入口径", "Rate input mode")}
                    <InfoTip
                        title={t("使用提示", "Tip")}
                        ariaLabel={t("房费输入口径提示", "Rate input mode tip")}
                        className="h-5 w-5"
                    >
                      {t(
                        "选择“税前 + 税后”时，主面板不再展示税率。",
                        "If you choose “Pre + post tax”, the tax rate field is hidden on the main panel."
                      )}
                    </InfoTip>
                  </span>
                }
                value={global.taxInputMode}
                onChange={(v) =>
                    setGlobal((g) => ({
                      ...g,
                      taxInputMode: v as GlobalSettings["taxInputMode"],
                    }))
                }
                options={[
                  {
                    value: "PRE_TAX_PLUS_RATE",
                    label: t("税前 + 税率", "Pre-tax + rate"),
                  },
                  {
                    value: "POST_TAX_PLUS_RATE",
                    label: t("税后 + 税率", "Post-tax + rate"),
                  },
                  {
                    value: "PRE_AND_POST",
                    label: t("税前 + 税后", "Pre + post tax"),
                  },
                ]}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{t("世界汇率", "World FX rates")}</div>
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => refreshFxRates(true)}
                >
                  {t("更新", "Refresh")}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {fxRates?.updatedAt
                    ? t(
                      `上次更新：${new Date(fxRates.updatedAt).toLocaleString()}`,
                      `Last updated: ${new Date(fxRates.updatedAt).toLocaleString()}`
                    )
                    : t("尚未更新", "Not updated yet")}
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
                <div className="font-medium">{t("国家 / 地区", "Countries / Regions")}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t("维护默认税率列表", "Manage default tax rates")}
                </div>
              </div>
              <Button
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={() => setCountryDrawerOpen(true)}
              >
                {t("管理", "Manage")}
              </Button>
            </div>

            <Separator />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="text-sm text-muted-foreground">
                {t("清理当前数据以重新开始。", "Clear current data to start fresh.")}
              </div>
              <div className="flex items-center gap-2">
                <Button
                    variant="destructive"
                    className="rounded-2xl"
                    onClick={() =>
                        setConfirmState({
                          title: t("重置旅行？", "Reset travel?"),
                          message: t(
                            "将清空酒店方案，并恢复入住房晚和国家默认值。",
                            "This will clear hotel stays and reset nights/country defaults."
                          ),
                          confirmLabel: t("重置", "Reset"),
                          cancelLabel: t("取消", "Cancel"),
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
                  {t("重置旅行", "Reset travel")}
                </Button>
                <Button
                    variant="destructive"
                    className="rounded-2xl"
                    onClick={() =>
                        setConfirmState({
                          title: t("重置品牌？", "Reset brands?"),
                          message: t(
                            "将恢复默认品牌，并清空已添加的酒店。",
                            "This will restore default brands and clear hotels."
                          ),
                          confirmLabel: t("重置", "Reset"),
                          cancelLabel: t("取消", "Cancel"),
                          destructive: true,
                          onConfirm: () => {
                            setPrograms(defaultPrograms());
                            setHotels([]);
                            setBrandPresetId("custom");
                            setConfirmState(null);
                          },
                        })
                    }
                >
                  {t("重置品牌", "Reset brands")}
                </Button>
              </div>
            </div>
          </div>
        </Drawer>

        {/* Country Drawer */}
        <Drawer
            open={countryDrawerOpen}
            title={t("国家 / 地区设置", "Countries / Regions")}
            onClose={() => setCountryDrawerOpen(false)}
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => setCountryDrawerOpen(false)}
                >
                  {t("完成", "Done")}
                </Button>
              </div>
            }
        >
          <div className="space-y-4">
            {countries.map((c) => (
                <div key={c.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                  <TextField
                      label={t("名称", "Name")}
                      value={c.name}
                      onChange={(v) =>
                          setCountries((prev) =>
                              prev.map((x) => (x.id === c.id ? { ...x, name: v } : x))
                          )
                      }
                  />
                  <NumberField
                      label={t("税率", "Tax rate")}
                      value={c.taxRate}
                      step={0.01}
                      onChange={(v) =>
                          setCountries((prev) =>
                              prev.map((x) =>
                                  x.id === c.id ? { ...x, taxRate: Math.max(0, v) } : x
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
                    <Trash2 className="w-4 h-4 mr-2" /> {t("删除", "Remove")}
                  </Button>
                </div>
            ))}
            <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() =>
                    setCountries((prev) => [
                      ...prev,
                      { id: uid(), name: t("新地区", "New region"), taxRate: 0.1 },
                    ])
                }
            >
              <Plus className="w-4 h-4 mr-2" /> {t("添加国家/地区", "Add region")}
            </Button>
          </div>
        </Drawer>

        {/* Hotel Drawer */}
        <Drawer
            open={hotelDrawerOpen}
            title={hotelEditingId ? t("编辑酒店", "Edit hotel") : t("新增酒店", "Add hotel")}
            onClose={() => setHotelDrawerOpen(false)}
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => setHotelDrawerOpen(false)}
                >
                  {t("取消", "Cancel")}
                </Button>
                <Button className="rounded-2xl" onClick={saveHotelDraft}>
                  {t("保存", "Save")}
                </Button>
              </div>
            }
        >
          {hotelDraftState ? (
              <div className="space-y-5">
                <TextField
                    label={t("酒店名", "Hotel name")}
                    value={hotelDraftState.name}
                    onChange={(v) =>
                        setHotelDraftState((s) => (s ? { ...s, name: v } : s))
                    }
                />

                <SelectField
                    label={t("选择品牌", "Brand")}
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
                          {t("请先选择品牌。", "Please select a brand first.")}
                        </div>
                    );

                  return (
                      <>
                        <SelectField
                            label={t("品牌档次（base 倍率）", "Brand tier (base rate)")}
                            value={hotelDraftState.brandTierId}
                            onChange={(v) =>
                                setHotelDraftState((s) =>
                                    s ? { ...s, brandTierId: v } : s
                                )
                            }
                            options={p.brandTiers.map((t) => ({
                              value: t.id,
                              label: `${t.label}（${t.ratePerUsd} pts/${p.currency}）`,
                            }))}
                        />
                        {global.taxInputMode === "PRE_TAX_PLUS_RATE" ? (
                            <MoneyField
                                label={t("税前房费/晚", "Pre-tax rate/night")}
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
                                  label: c,
                                }))}
                            />
                        ) : global.taxInputMode === "POST_TAX_PLUS_RATE" ? (
                            <MoneyField
                                label={t("税后房费/晚", "Post-tax rate/night")}
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
                                  label: c,
                                }))}
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <MoneyField
                                  label={t("税前房费/晚", "Pre-tax rate/night")}
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
                                    label: c,
                                  }))}
                              />
                              <MoneyField
                                  label={t("税后房费/晚", "Post-tax rate/night")}
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
                                    label: c,
                                  }))}
                              />
                            </div>
                        )}

                        <Separator />

                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium">{t("酒店活动", "Hotel promos")}</div>
                          <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                className="rounded-2xl"
                                onClick={() => setHotelRulesOpen((v) => !v)}
                            >
                              {hotelRulesOpen ? t("收起规则", "Collapse") : t("展开规则", "Expand")}
                            </Button>
                            <Select
                                key={`hotel-rule-${hotelRulePickerKey}`}
                                onValueChange={(v) => {
                                  if (!v) return;
                                  openRuleEditor(
                                    "hotel",
                                    v as "per_night" | "per_stay" | "milestone" | "spend"
                                  );
                                  setHotelRulePickerKey((k) => k + 1);
                                }}
                            >
                              <SelectTrigger className="rounded-2xl bg-secondary text-secondary-foreground h-9 w-auto px-3 shadow-none border-0">
                                <SelectValue placeholder={t("添加规则", "Add rule")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="per_night">
                                  {t("每晚奖励", "Per night")}
                                </SelectItem>
                                <SelectItem value="per_stay">
                                  {t("每次入住", "Per stay")}
                                </SelectItem>
                                <SelectItem value="spend">
                                  {t("消费门槛", "Spend threshold")}
                                </SelectItem>
                                <SelectItem value="milestone">
                                  {t("里程碑", "Milestone")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {hotelRulesOpen ? (
                            <div className="space-y-3">
                              {hotelDraftState.rules.length === 0 ? (
                                  <div className="text-sm text-muted-foreground">
                                    {t("暂无规则。", "No rules yet.")}
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
                                            title={t("编辑规则", "Edit rule")}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-2xl"
                                            onClick={() =>
                                                setConfirmState({
                                                  title: t("删除规则？", "Delete rule?"),
                                                  message: t("此操作无法撤销。", "This action cannot be undone."),
                                                  confirmLabel: t("删除", "Delete"),
                                                  cancelLabel: t("取消", "Cancel"),
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
                                            title={t("删除规则", "Delete rule")}
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
                {t("加载中…", "Loading...")}
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
                  {t("← 返回", "← Back")}
                </Button>
                <span>
                  {ruleContext?.ruleId ? t("编辑规则", "Edit rule") : t("新增规则", "Add rule")}
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
                  {t("取消", "Cancel")}
                </Button>
                <Button className="rounded-2xl" onClick={saveRuleDraft}>
                  {t("保存", "Save")}
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
                {t("加载中…", "Loading...")}
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
      </div>
  );
}
