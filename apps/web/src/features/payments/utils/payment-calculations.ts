export type PaymentCurrency = "USD" | "VES";

const VES_METHODS = new Set(["POS_BS", "PAGO_MOVIL"]);

export interface PaymentLineAmount {
  paymentMethod: string;
  currency: PaymentCurrency;
  amount: number;
}

export function getPaymentCurrency(paymentMethod: string): PaymentCurrency {
  return VES_METHODS.has(paymentMethod) ? "VES" : "USD";
}

export function calculatePaidUsdEquivalent(
  lines: PaymentLineAmount[],
  bcvExchangeRate: number,
): number {
  if (!Number.isFinite(bcvExchangeRate) || bcvExchangeRate <= 0) {
    return 0;
  }

  const total = lines.reduce((sum, line) => {
    const amount = Number.isFinite(line.amount) ? line.amount : 0;
    return sum + (line.currency === "VES" ? amount / bcvExchangeRate : amount);
  }, 0);

  return Math.round((total + Number.EPSILON) * 100) / 100;
}

export function paymentTotalsMatch(
  paidUsdEquivalent: number,
  expectedUsd: number,
): boolean {
  return Math.abs(paidUsdEquivalent - expectedUsd) < 0.005;
}

export function getMaxPaymentAmount(
  lines: PaymentLineAmount[],
  lineIndex: number,
  totalUsd: number,
  bcvExchangeRate: number,
): number {
  if (!Number.isFinite(totalUsd) || totalUsd <= 0) {
    return 0;
  }

  const otherLinesUsd = calculatePaidUsdEquivalent(
    lines.filter((_, index) => index !== lineIndex),
    bcvExchangeRate,
  );
  const remainingUsd = Math.max(totalUsd - otherLinesUsd, 0);
  const currency = getPaymentCurrency(lines[lineIndex]?.paymentMethod ?? "");
  const maxAmount =
    currency === "VES" ? remainingUsd * bcvExchangeRate : remainingUsd;

  return Math.floor((maxAmount + Number.EPSILON) * 100) / 100;
}
