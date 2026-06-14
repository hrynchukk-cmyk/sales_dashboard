/** Currency / number formatting helpers (UAH). */

export function uah(value: number): string {
  return "₴" + Math.round(value).toLocaleString("uk-UA");
}

/** Compact form: ₴42к, ₴1.2к, ₴820к */
export function uahShort(value: number): string {
  if (Math.abs(value) >= 1000) {
    const k = value / 1000;
    const str = k >= 100 ? Math.round(k).toString() : k.toFixed(1).replace(/\.0$/, "");
    return `₴${str}к`;
  }
  return uah(value);
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}
