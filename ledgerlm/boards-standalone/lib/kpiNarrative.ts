import type { GovernedKpiGreenSection } from "./types";

export function governedPeriodCode(period: { year: number; month: number }) {
  return `YTD ${String(period.month).padStart(2, "0")}.${String(period.year).slice(-2)}`;
}

export function governedValue(
  value: number | null,
  unit: GovernedKpiGreenSection["unit"],
  difference = false,
) {
  if (value === null) return "—";
  if (unit === "percent") {
    const formatted = `${Math.abs(value * 100).toFixed(1)}`;
    return difference ? `${formatted} percentage points` : `${formatted}%`;
  }
  if (unit === "mUSD") {
    return `${Math.abs(value).toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} mUSD`;
  }
  return `${Math.round(Math.abs(value)).toLocaleString()} HC`;
}

function comparisonSentence(
  subject: string,
  actual: number | null,
  forecast: number | null,
  unit: GovernedKpiGreenSection["unit"],
  periodCode: string,
) {
  if (actual === null && forecast === null) {
    return `${subject}: no governed Actual or Forecast value is available for ${periodCode}.`;
  }
  if (actual === null) {
    return `${subject}: ${periodCode} Forecast is ${governedValue(forecast, unit)}; governed Actual is unavailable.`;
  }
  if (forecast === null) {
    return `${subject}: ${periodCode} Actual is ${governedValue(actual, unit)}; governed Forecast is unavailable.`;
  }
  const variance = actual - forecast;
  if (Math.abs(variance) < 1e-9) {
    return `${subject}: ${periodCode} Actual ${governedValue(actual, unit)} is in line with Forecast ${governedValue(forecast, unit)}.`;
  }
  return `${subject}: ${periodCode} Actual ${governedValue(actual, unit)} is ${variance > 0 ? "higher" : "lower"} by ${governedValue(variance, unit, true)} compared with Forecast ${governedValue(forecast, unit)}.`;
}

export function buildGovernedSectionNarrative(
  section: GovernedKpiGreenSection,
  period: { year: number; month: number },
) {
  const periodCode = governedPeriodCode(period);
  const subject = section.id === "capacity" ? "End Capacity" : section.title;
  const summary = `1) ${comparisonSentence(
    subject,
    section.total.actual,
    section.total.forecast,
    section.unit,
    periodCode,
  ).replace(`${subject}: `, "")}`;

  const details = section.breakdowns
    .filter((item) => item.value.actual !== null || item.value.forecast !== null)
    .map((item) =>
      comparisonSentence(
        item.label,
        item.value.actual,
        item.value.forecast,
        section.unit,
        periodCode,
      ),
    );

  if (section.comparisons && section.total.actual !== null) {
    const historical: string[] = [];
    if (section.comparisons.previousMonthYtd.actual !== null) {
      historical.push(
        `previous-month YTD Actual ${governedValue(
          section.comparisons.previousMonthYtd.actual,
          section.unit,
        )}`,
      );
    }
    if (section.comparisons.priorYearYtd.actual !== null) {
      historical.push(
        `prior-year YTD Actual ${governedValue(
          section.comparisons.priorYearYtd.actual,
          section.unit,
        )}`,
      );
    }
    if (historical.length) details.unshift(`Comparison: ${historical.join("; ")}.`);
  }

  return { summary, details };
}