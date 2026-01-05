import type {
  Calc,
  FxRates,
  GlobalSettings,
  HotelOption,
  Program,
  Reward,
  SupportedCurrency,
  Trigger,
} from "./types";

function convertCurrency(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
  fx?: FxRates
): number {
  if (from === to) return amount;
  if (!fx) return amount;
  if (fx.base === from && fx.rates[to]) return amount * fx.rates[to];
  if (fx.base === to && fx.rates[from]) return amount / fx.rates[from];
  const fromRate = fx.rates[from];
  const toRate = fx.rates[to];
  if (!fromRate || !toRate) return amount;
  return (amount / fromRate) * toRate;
}

function countTriggerTimes(
  trigger: Trigger,
  nights: number,
  spendCurrency: number
): number {
  const stayCount = 1; // simplified: one stay

  switch (trigger.type) {
    case "per_night":
      return nights;
    case "per_stay":
      return stayCount;
    case "spend": {
      const amt = Math.max(0, trigger.amount);
      if (amt <= 0) return 0;
      if (spendCurrency < amt) return 0;
      return trigger.repeat ? Math.floor(spendCurrency / amt) : 1;
    }
    case "milestone": {
      const th = Math.max(1, Math.round(trigger.threshold || 1));
      const metricVal = trigger.metric === "nights" ? nights : stayCount;
      return metricVal >= th ? 1 : 0;
    }
    default:
      return 0;
  }
}

function rewardToExtraPoints(
  reward: Reward,
  times: number,
  basePoints: number,
  fnValuePoints: number
): number {
  switch (reward.type) {
    case "points":
      return Math.max(0, reward.points) * times;
    case "multiplier": {
      const z = Math.max(1, reward.z || 1);
      // multiplier applies ONCE to base points in our model. Trigger times ignored.
      return basePoints * (z - 1);
    }
    case "fn":
      return Math.max(0, reward.count) * fnValuePoints * times;
    default:
      return 0;
  }
}

export function computeHotel(
  global: GlobalSettings,
  program: Program,
  hotel: HotelOption,
  fx?: FxRates
): Calc {
  const nights = Math.max(1, Math.round(global.nights || 1));
  const taxRate = Math.max(0, global.taxRate);

  // Price conversion (pre-tax vs post-tax)
  let preTax = 0;
  let postTax = 0;
  if (global.taxInputMode === "PRE_TAX_PLUS_RATE") {
    const rate = Math.max(0, hotel.ratePreTax?.amount ?? 0);
    preTax = rate * nights;
    postTax = preTax * (1 + taxRate);
  } else if (global.taxInputMode === "POST_TAX_PLUS_RATE") {
    const rate = Math.max(0, hotel.ratePostTax?.amount ?? 0);
    postTax = rate * nights;
    preTax = postTax / (1 + taxRate);
  } else {
    const pre = Math.max(0, hotel.ratePreTax?.amount ?? 0);
    const post = Math.max(0, hotel.ratePostTax?.amount ?? 0);
    preTax = pre * nights;
    postTax = post * nights;
  }

  const hotelCurrency =
    hotel.ratePostTax?.currency ??
    hotel.ratePreTax?.currency ??
    global.preferredCurrency;
  const earnBase = program.settings.earnBase === "POST_TAX" ? postTax : preTax;
  const earnBaseBrand = convertCurrency(
    earnBase,
    hotelCurrency,
    program.currency,
    fx
  );

  const tier =
      program.brandTiers.find((x) => x.id === hotel.brandTierId) ??
      program.brandTiers[0];
  const baseRate = tier?.ratePerUsd ?? 10;

  const eliteTier =
    program.eliteTiers.find((x) => x.id === program.settings.eliteTierId) ??
    program.eliteTiers[0];
  const eliteBonusRate = eliteTier?.bonusRate ?? 0;

  const basePoints = earnBaseBrand * baseRate;
  const eliteBonusPoints = basePoints * eliteBonusRate;

  // FN => points
  const pointValue = Math.max(0, program.settings.pointValue.amount);
  const pointValueCurrency = program.settings.pointValue.currency;
  const fnValuePoints =
    program.settings.fnValueMode === "POINTS"
      ? Math.max(0, program.settings.fnValuePoints)
      : pointValue > 0
        ? convertCurrency(
            Math.max(0, program.settings.fnValueCash.amount),
            program.settings.fnValueCash.currency,
            pointValueCurrency,
            fx
          ) / pointValue
        : 0;

  const spendCurrency = convertCurrency(
    preTax,
    hotelCurrency,
    global.preferredCurrency,
    fx
  );

  const allRules = [...(program.settings.rules || []), ...(hotel.rules || [])].filter(
    (r) => r.enabled
  );

  let promoExtraPoints = 0;
  for (const rule of allRules) {
    const times = countTriggerTimes(rule.trigger, nights, spendCurrency);
    promoExtraPoints += rewardToExtraPoints(
      rule.reward,
      times,
      basePoints,
      fnValuePoints
    );
  }

  const totalPoints = basePoints + eliteBonusPoints + promoExtraPoints;
  const pointValuePreferred = convertCurrency(
    pointValue,
    pointValueCurrency,
    global.preferredCurrency,
    fx
  );
  const pointsValue = totalPoints * pointValuePreferred;

  const paidPostTax = convertCurrency(
    postTax,
    hotelCurrency,
    global.preferredCurrency,
    fx
  );
  const paidPreTax = convertCurrency(
    preTax,
    hotelCurrency,
    global.preferredCurrency,
    fx
  );
  const netCost = paidPostTax - pointsValue;
  const rebateRate = paidPostTax > 0 ? pointsValue / paidPostTax : 0;
  const netPayRatio = paidPostTax > 0 ? netCost / paidPostTax : 1;

  return {
    paidPostTax,
    paidPreTax,
    basePoints,
    eliteBonusPoints,
    promoExtraPoints,
    totalPoints,
    pointsValue,
    netCost,
    rebateRate,
    netPayRatio,
  };
}
