export const ONLYFANS_FEE_RATE = 0.2;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeIncome(gross: number, applyOfFee: boolean) {
  const fee = applyOfFee ? round2(gross * ONLYFANS_FEE_RATE) : 0;
  const net = round2(gross - fee);
  return { fee, net };
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("fr-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
