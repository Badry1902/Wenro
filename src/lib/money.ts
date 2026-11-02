/** Money is always integer minor units + currency. Never use floats for amounts. */
export type Money = { minor: number; currency: "EUR" | "USD" | "EGP" };

export function formatMoney({ minor, currency }: Money, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(minor / 100);
}

/**
 * Approximate amount in the visitor's currency, labelled as approximate in the UI.
 * The customer always pays the exact amount in the collection currency.
 */
export function approxDisplay(minor: number, rate: number | null, displayCurrency: string, locale: string) {
  if (!rate) return null;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: displayCurrency,
    maximumFractionDigits: 0,
  }).format((minor / 100) * rate);
}
