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
  | { type: "voucher"; voucherId: string; count: number };

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
  voucherEnabled: boolean;
  vouchers: Voucher[];
  earnBase: "PRE_TAX" | "POST_TAX";
  rules: Rule[]; // brand-level promo rules
};

export type SubBrand = {
  id: string;
  name: string;
  tierId: string;
  i18nKey?: string;
  i18nAuto?: boolean;
};

export type Voucher = {
  id: string;
  name: string;
  valueMode: "CASH" | "POINTS";
  valueCash: Money;
  valuePoints: number;
  i18nKey?: string;
  i18nAuto?: boolean;
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
  subBrands: SubBrand[];
  settings: ProgramSettings;
};

export type HotelOption = {
  id: string;
  name: string;
  nameI18nAuto?: boolean;
  programId: string;
  brandTierId: string;
  subBrandId?: string | null;
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
