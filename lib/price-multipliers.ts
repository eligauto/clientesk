export const MULTIPLIERS = {
  priceList: 1.8,
  priceCredit: 2.07,
  priceTransfer: 1.7,
  priceCash: 1.62,
} as const;

export function calcPrices(cost: number | null) {
  if (!cost || cost <= 0) return { priceList: null, priceCredit: null, priceTransfer: null, priceCash: null };
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    priceList:     round(cost * MULTIPLIERS.priceList),
    priceCredit:   round(cost * MULTIPLIERS.priceCredit),
    priceTransfer: round(cost * MULTIPLIERS.priceTransfer),
    priceCash:     round(cost * MULTIPLIERS.priceCash),
  };
}
