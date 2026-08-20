import type { DataSource } from "./types";

// Sample financials for a fictional mid-market company, in ₹ lakhs.
// 18 months of monthly P&L, monthly cashflow, and quarter-end balance sheets.

const months = [
  "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
  "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
];

const revenue = [412, 428, 465, 441, 472, 510, 498, 522, 561, 588, 645, 702, 618, 636, 689, 664, 707, 748];
const cogs = [231, 238, 256, 247, 262, 281, 277, 288, 306, 318, 352, 384, 340, 348, 372, 362, 383, 402];
const salaries = [86, 86, 88, 92, 92, 94, 96, 96, 101, 104, 104, 108, 116, 116, 118, 121, 121, 124];
const marketing = [28, 31, 39, 26, 33, 41, 36, 40, 52, 58, 74, 88, 44, 47, 55, 49, 56, 63];
const rentAdmin = [22, 22, 22, 23, 23, 23, 23, 24, 24, 24, 24, 26, 26, 26, 26, 27, 27, 27];
const otherOpex = [14, 15, 17, 15, 16, 18, 17, 18, 21, 22, 25, 29, 21, 22, 24, 23, 25, 27];
const interest = [9, 9, 9, 9, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7, 6, 6, 6, 6];

const pnlRecords = months.map((month, i) => {
  const grossProfit = revenue[i] - cogs[i];
  const opex = salaries[i] + marketing[i] + rentAdmin[i] + otherOpex[i];
  const ebitda = grossProfit - opex;
  const netProfit = ebitda - interest[i] - 6; // 6 = flat monthly depreciation
  return {
    month,
    revenue: revenue[i],
    cogs: cogs[i],
    gross_profit: grossProfit,
    salaries: salaries[i],
    marketing: marketing[i],
    rent_admin: rentAdmin[i],
    other_opex: otherOpex[i],
    ebitda,
    depreciation: 6,
    interest: interest[i],
    net_profit: netProfit,
  };
});

const cashflowRecords = months.map((month, i) => {
  const collections = Math.round(revenue[i] * (i % 3 === 2 ? 1.06 : 0.94));
  const supplierPayments = Math.round(cogs[i] * (i % 3 === 0 ? 1.08 : 0.97));
  const payrollAndOpex = salaries[i] + marketing[i] + rentAdmin[i] + otherOpex[i];
  const loanRepayment = 12;
  const capex = [0, 0, 18, 0, 0, 25, 0, 0, 14, 0, 0, 42, 0, 0, 20, 0, 0, 16][i];
  const netCash = collections - supplierPayments - payrollAndOpex - interest[i] - loanRepayment - capex;
  return {
    month,
    collections,
    supplier_payments: supplierPayments,
    payroll_and_opex: payrollAndOpex,
    interest_paid: interest[i],
    loan_repayment: loanRepayment,
    capex,
    net_cash_movement: netCash,
  };
});

// Running closing cash starting from ₹310 lakhs.
let cash = 310;
for (const r of cashflowRecords) {
  cash += r.net_cash_movement as number;
  (r as Record<string, string | number>).closing_cash = cash;
}

const balanceSheetRecords = [
  { quarter: "2025-Q1", cash: 322, receivables: 296, inventory: 342, fixed_assets: 418, total_assets: 1378, payables: 262, short_term_debt: 120, long_term_debt: 340, total_liabilities: 722, equity: 656 },
  { quarter: "2025-Q2", cash: 341, receivables: 318, inventory: 361, fixed_assets: 430, total_assets: 1450, payables: 278, short_term_debt: 112, long_term_debt: 328, total_liabilities: 718, equity: 732 },
  { quarter: "2025-Q3", cash: 372, receivables: 344, inventory: 384, fixed_assets: 428, total_assets: 1528, payables: 296, short_term_debt: 104, long_term_debt: 316, total_liabilities: 716, equity: 812 },
  { quarter: "2025-Q4", cash: 419, receivables: 391, inventory: 428, fixed_assets: 452, total_assets: 1690, payables: 334, short_term_debt: 96, long_term_debt: 304, total_liabilities: 734, equity: 956 },
  { quarter: "2026-Q1", cash: 447, receivables: 402, inventory: 436, fixed_assets: 458, total_assets: 1743, payables: 341, short_term_debt: 88, long_term_debt: 292, total_liabilities: 721, equity: 1022 },
  { quarter: "2026-Q2", cash: 486, receivables: 421, inventory: 449, fixed_assets: 462, total_assets: 1818, payables: 352, short_term_debt: 80, long_term_debt: 280, total_liabilities: 712, equity: 1106 },
];

export const SAMPLE_DATA_SOURCES: DataSource[] = [
  {
    id: "sample-pnl",
    name: "Meridian Retail — Monthly P&L",
    kind: "sample",
    description: "18 months of monthly profit & loss, Jan 2025 – Jun 2026 (₹ lakhs)",
    records: pnlRecords,
  },
  {
    id: "sample-cashflow",
    name: "Meridian Retail — Cashflow Ledger",
    kind: "sample",
    description: "Monthly inflows, outflows, and closing cash, Jan 2025 – Jun 2026 (₹ lakhs)",
    records: cashflowRecords,
  },
  {
    id: "sample-balance-sheet",
    name: "Meridian Retail — Balance Sheet",
    kind: "sample",
    description: "Quarter-end balance sheet snapshots, Q1 2025 – Q2 2026 (₹ lakhs)",
    records: balanceSheetRecords,
  },
];
