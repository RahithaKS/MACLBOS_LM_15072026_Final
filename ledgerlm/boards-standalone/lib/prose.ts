/**
 * Tidy model-written prose for reading. The model wraps figures in quotation
 * marks ("34622.59" mINR) and leaves them unformatted; readers expect 34,623.
 * Only bare figures are touched — years, period labels (Jun-26), percentages
 * and ratios read correctly as they are.
 *
 * Applied at the edges — on-screen sections, PPT and PDF exports — so stored
 * reports keep the model's raw text and the rule can change without a re-run.
 */
export function tidyProse(text: string): string {
  let out = String(text ?? "");
  // Quotes wrapped around a numeric token, straight or curly.
  out = out.replace(/["“”‘’']\s*([-−+]?[\d,]+(?:\.\d+)?%?)\s*["“”‘’']/g, "$1");
  // Bare figures: 4+ integer digits (with or without existing separators),
  // optionally with decimals. Not percentages, not years, not period suffixes.
  out = out.replace(
    /(?<![\w.,\-\/])([-−]?)(\d{1,3}(?:,\d{3})+|\d{4,})(\.\d+)?(?![\w%,\-\/])/g,
    (m, sign: string, whole: string, frac: string | undefined, offset: number, str: string) => {
      const digits = whole.replace(/,/g, "");
      // A plain four-digit integer in the calendar range is a year, not a sum —
      // unless a unit follows it ("2000 mINR"), which settles it.
      const unitFollows = /^\s*(?:m?INR|m?USD|mn|million|bn|billion|crore|lakh|k)\b/i.test(
        str.slice(offset + m.length),
      );
      if (!frac && !unitFollows && digits.length === 4 && +digits >= 1900 && +digits <= 2100) return m;
      const n = Number(digits + (frac ?? ""));
      if (!Number.isFinite(n)) return m;
      const formatted = n.toLocaleString(undefined, { maximumFractionDigits: 0 });
      return `${sign === "−" ? "-" : sign}${formatted}`;
    },
  );
  return out;
}
