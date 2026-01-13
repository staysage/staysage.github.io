export type SupportedCurrency = "USD" | "CNY" | "HKD" | "GBP" | "EUR" | "SGD";

export type Language = "zh" | "en" | "es" | "ko" | "ja" | "zh-TW";

export type Money = {
  amount: number;
  currency: SupportedCurrency;
};

export type Country = {
  id: string;
  name: string;
  taxRate: number;
};

export type FxRates = {
  base: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
  updatedAt: number;
};

export type GlobalSettings = {
  preferredCurrency: SupportedCurrency | null;
  // Night count is used globally but shown only on Hotels page top
  nights: number;
  countryId: string;
  taxInputMode: "PRE_TAX_PLUS_RATE" | "POST_TAX_PLUS_RATE" | "PRE_AND_POST" | null;
  taxRate: number;
};

export type Trigger =
  | { type: "per_night" }
  | { type: "per_stay" }
  | { type: "spend"; amount: number; repeat: boolean }
  | { type: "milestone"; metric: "stay" | "nights"; threshold: number };

export type Reward =
  | { type: "points"; points: number }
  | { type: "multiplier"; z: number }
  | { type: "fn"; count: number };

export type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: Trigger;
  reward: Reward;
};

export type BrandTier = {
  id: string;
  label: string;
  ratePerUsd: number;
  i18nKey?: string;
  i18nAuto?: boolean;
};

export type EliteTier = {
  id: string;
  label: string;
  bonusRate: number;
  i18nKey?: string;
  i18nAuto?: boolean;
};

export type ProgramSettings = {
  eliteTierId: string;
  pointValue: Money; // currency per 10k points
  fnVoucherEnabled: boolean;
  fnValueMode: "CASH" | "POINTS";
  fnValueCash: Money; // if CASH => currency
  fnValuePoints: number; // if POINTS => points
  earnBase: "PRE_TAX" | "POST_TAX";
  rules: Rule[]; // brand-level promo rules
};

export type Program = {
  id: string;
  name: string;
  nameI18nKey?: string;
  nameI18nAuto?: boolean;
  presetId?: string;
  logoUrl?: string;
  brandColor?: string;
  currency: SupportedCurrency;
  brandTiers: BrandTier[];
  eliteTiers: EliteTier[];
  settings: ProgramSettings;
};

export type HotelOption = {
  id: string;
  name: string;
  programId: string;
  brandTierId: string;
  ratePreTax: Money | null;
  ratePostTax: Money | null;
  rules: Rule[]; // hotel-specific rules
};

export type Calc = {
  paidPostTax: number;
  paidPreTax: number;
  basePoints: number;
  eliteBonusPoints: number;
  promoExtraPoints: number;
  totalPoints: number;
  pointsValue: number;
  netCost: number;
  rebateRate: number;
  netPayRatio: number;
};
