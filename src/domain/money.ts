const CENTS_PER_UNIT = 100;

/** Formats integer cents as a currency string. Uses integer math for the split, never floats for money. */
export function formatCents(cents: number, locale: string): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / CENTS_PER_UNIT);
  const fraction = String(abs % CENTS_PER_UNIT).padStart(2, "0");
  const grouped = new Intl.NumberFormat(locale, {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(whole);
  const decimal = locale.startsWith("es") ? "," : ".";
  return `${sign}$${grouped}${decimal}${fraction}`;
}
