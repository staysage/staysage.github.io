import type {
  BrandTier,
  EliteTier,
  GlobalSettings,
  HotelOption,
  Money,
  Program,
  Rule,
  SupportedCurrency,
} from "./types";

export const uid = () =>
  Math.random().toString(16).slice(2) + Date.now().toString(16);

export const defaultGlobal: GlobalSettings = {
  preferredCurrency: "USD",
  nights: 2,
  countryId: "us",
  taxInputMode: "PRE_TAX_PLUS_RATE",
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

export function mkTier(label: string, rate: number): BrandTier {
  return { id: uid(), label, ratePerUsd: rate };
}

export function mkElite(label: string, bonus: number): EliteTier {
  return { id: uid(), label, bonusRate: bonus };
}

export function defaultPrograms(includeExtras = false): Program[] {
  const marriottTiers = [
    mkTier("10x（大多数品牌）", 10),
    mkTier("5x（Residence Inn/Element等）", 5),
    mkTier("4x（StudioRes）", 4),
    mkTier("2.5x（Marriott Executive Apartments）", 2.5),
  ];
  const marriottElite = [
    mkElite("会员 Member", 0),
    mkElite("银卡 Silver（+10%）", 0.1),
    mkElite("金卡 Gold（+25%）", 0.25),
    mkElite("白金 Platinum（+50%）", 0.5),
    mkElite("钛金 Titanium（+75%）", 0.75),
    mkElite("大使 Titanium（+75%）", 0.75),
  ];

  const ihgTiers = [mkTier("10x（大多数品牌）", 10), mkTier("5x（Staybridge/Candlewood等）", 5)];
  const ihgElite = [
    mkElite("会员 Member", 0),
    mkElite("银卡 Silver（+20%）", 0.2),
    mkElite("金卡 Gold（+40%）", 0.4),
    mkElite("白金 Platinum（+60%）", 0.6),
    mkElite("钻石 Diamond（+100%）", 1.0),
  ];

  const hyattTiers = [mkTier("5x（大多数品牌）", 5), mkTier("2.5x（Hyatt Studios）", 2.5)];
  const hyattElite = [
    mkElite("会员 Member", 0),
    mkElite("探索者 Discoverist（+10%）", 0.1),
    mkElite("冒险家 Explorist（+20%）", 0.2),
    mkElite("环球客 Globalist（+30%）", 0.3),
  ];

  const hiltonTiers = [
    mkTier("10x（大多数品牌）", 10),
    mkTier("5x（Tru/Home2等）", 5),
    mkTier("3x（部分品牌）", 3),
  ];
  const hiltonElite = [
    mkElite("会员 Member", 0),
    mkElite("银卡 Silver（+20%）", 0.2),
    mkElite("金卡 Gold（+80%）", 0.8),
    mkElite("钻石 Diamond（+100%）", 1.0),
  ];

  const accorTiers = [mkTier("10x（大多数品牌）", 10)];
  const accorElite = [
    mkElite("会员 Member", 0),
    mkElite("银卡 Silver（+10%）", 0.1),
    mkElite("金卡 Gold（+25%）", 0.25),
    mkElite("白金 Platinum（+50%）", 0.5),
  ];

  const wyndhamTiers = [mkTier("10x（大多数品牌）", 10)];
  const wyndhamElite = [
    mkElite("会员 Member", 0),
    mkElite("金卡 Gold（+10%）", 0.1),
    mkElite("白金 Platinum（+15%）", 0.15),
    mkElite("钻石 Diamond（+20%）", 0.2),
  ];

  const shangriLaTiers = [mkTier("10x（大多数品牌）", 10)];
  const shangriLaElite = [
    mkElite("会员 Member", 0),
    mkElite("翡翠 Jade（+25%）", 0.25),
    mkElite("钻石 Diamond（+50%）", 0.5),
  ];

  const atourTiers = [mkTier("1x（每 1 CNY = 1 点）", 1)];
  const atourElite = [
    mkElite("会员 Member", 0),
    mkElite("银卡 Silver（+0%）", 0),
    mkElite("金卡 Gold（+0%）", 0),
    mkElite("铂金 Platinum（+0%）", 0),
    mkElite("黑金 Black（+100%）", 1.0),
  ];

  const huazhuTiers = [mkTier("1x（每 1 CNY = 1 点）", 1)];
  const huazhuElite = [
    mkElite("星会员 Star（+0%）", 0),
    mkElite("银卡 Silver（+100%）", 1.0),
    mkElite("金卡 Gold（+150%）", 1.5),
    mkElite("铂金 Platinum（+150%）", 1.5),
  ];

  const mkProgram = (
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
      currency: "USD",
      brandTiers: tiers,
      eliteTiers: elite,
      settings: {
        eliteTierId,
        pointValue: money(pointValue, "USD"),
        fnValueMode: "CASH",
        fnValueCash: money(fnCash, "USD"),
        fnValuePoints: 50000,
        earnBase: "PRE_TAX",
        rules: [],
      },
    };
  };

  const basePrograms = [
    mkProgram("万豪 Marriott Bonvoy", marriottTiers, marriottElite, 0.008, 400),
    mkProgram("洲际 IHG One Rewards", ihgTiers, ihgElite, 0.006, 250),
    mkProgram("凯悦 World of Hyatt", hyattTiers, hyattElite, 0.015, 450),
    mkProgram("希尔顿 Hilton Honors", hiltonTiers, hiltonElite, 0.005, 300),
  ];
  if (!includeExtras) return basePrograms;
  return [
    ...basePrograms,
    mkProgram("雅高 Accor Live Limitless", accorTiers, accorElite, 0.01, 300),
    mkProgram("温德姆 Wyndham Rewards", wyndhamTiers, wyndhamElite, 0.008, 280),
    mkProgram("香格里拉 Shangri-La Circle", shangriLaTiers, shangriLaElite, 0.012, 350),
    {
      id: uid(),
      name: "亚朵 Atour",
      currency: "CNY",
      brandTiers: atourTiers,
      eliteTiers: atourElite,
      settings: {
        eliteTierId: atourElite[0]?.id ?? uid(),
        pointValue: money(0.01, "CNY"),
        fnValueMode: "POINTS",
        fnValueCash: money(0, "CNY"),
        fnValuePoints: 0,
        earnBase: "POST_TAX",
        rules: [],
      },
    },
    {
      id: uid(),
      name: "华住会 H World",
      currency: "CNY",
      brandTiers: huazhuTiers,
      eliteTiers: huazhuElite,
      settings: {
        eliteTierId: huazhuElite[0]?.id ?? uid(),
        pointValue: money(0.01, "CNY"),
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
