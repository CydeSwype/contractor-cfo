import type { FilingStatus, TaxEstimate } from './types/index.js';

// 2025 IRS figures
const SS_WAGE_BASE_2025 = 176100;
const STANDARD_DEDUCTION_2025: Record<FilingStatus, number> = {
  single: 15000,
  mfj: 30000,
  mfs: 15000,
  hoh: 22500,
};

// 2025 federal income tax brackets [rate, upperBound] — last entry is the top rate
const BRACKETS_2025: Record<FilingStatus, [number, number][]> = {
  single: [
    [0.10, 11925],
    [0.12, 48475],
    [0.22, 103350],
    [0.24, 197300],
    [0.32, 250525],
    [0.35, 626350],
    [0.37, Infinity],
  ],
  mfj: [
    [0.10, 23850],
    [0.12, 96950],
    [0.22, 206700],
    [0.24, 394600],
    [0.32, 501050],
    [0.35, 751600],
    [0.37, Infinity],
  ],
  mfs: [
    [0.10, 11925],
    [0.12, 48475],
    [0.22, 103350],
    [0.24, 197300],
    [0.32, 250525],
    [0.35, 375800],
    [0.37, Infinity],
  ],
  hoh: [
    [0.10, 17000],
    [0.12, 64850],
    [0.22, 103350],
    [0.24, 197300],
    [0.32, 250500],
    [0.35, 626350],
    [0.37, Infinity],
  ],
};

function applyBrackets(taxableIncome: number, filing: FilingStatus): number {
  if (taxableIncome <= 0) return 0;
  const brackets = BRACKETS_2025[filing];
  let tax = 0;
  let prev = 0;
  for (const [rate, upper] of brackets) {
    const chunk = Math.min(taxableIncome, upper) - prev;
    if (chunk <= 0) break;
    tax += chunk * rate;
    prev = upper;
    if (taxableIncome <= upper) break;
  }
  return tax;
}

function quarterlyDueDates(year: number): { quarter: number; label: string; dueDate: string }[] {
  return [
    { quarter: 1, label: 'Q1 (Jan–Mar)', dueDate: `${year}-04-15` },
    { quarter: 2, label: 'Q2 (Apr–May)', dueDate: `${year}-06-16` },
    { quarter: 3, label: 'Q3 (Jun–Aug)', dueDate: `${year}-09-15` },
    { quarter: 4, label: 'Q4 (Sep–Dec)', dueDate: `${year + 1}-01-15` },
  ];
}

export interface TaxEstimateInput {
  year: number;
  grossIncome: number;
  businessExpenses: number;
  filingStatus: FilingStatus;
  priorYearTax: number;
  stateRate?: number;
  otherIncome?: number;
  paymentsToDate?: number;
}

export function estimateQuarterlyTax(input: TaxEstimateInput): TaxEstimate {
  const {
    year,
    grossIncome,
    businessExpenses,
    filingStatus,
    priorYearTax,
    stateRate = 0,
    otherIncome = 0,
    paymentsToDate = 0,
  } = input;

  // Self-employment tax
  const netSEIncome = Math.max(0, grossIncome - businessExpenses);
  const seTaxBase = netSEIncome * 0.9235;

  // SS capped at wage base; Medicare uncapped; combined 15.3% below SS base
  let seTax = 0;
  if (seTaxBase <= SS_WAGE_BASE_2025) {
    seTax = seTaxBase * 0.153;
  } else {
    seTax = SS_WAGE_BASE_2025 * 0.124 + seTaxBase * 0.029;
  }

  // 50% of SE tax is deductible from AGI
  const seDeduction = seTax * 0.5;

  const standardDeduction = STANDARD_DEDUCTION_2025[filingStatus];
  const agi = Math.max(0, grossIncome + otherIncome - seDeduction);
  const taxableIncome = Math.max(0, agi - standardDeduction);

  const federalIncomeTax = applyBrackets(taxableIncome, filingStatus);

  // Simplified state tax: apply state rate to taxable income
  const stateIncomeTax = taxableIncome * stateRate;

  const totalEstimatedTax = federalIncomeTax + seTax + stateIncomeTax;

  // Safe harbor: 100% of prior year tax (110% if prior-year AGI > $150k)
  const safeHarborMultiplier = agi > 150000 ? 1.1 : 1.0;
  const safeHarborAnnual = priorYearTax * safeHarborMultiplier;

  const annualTarget = Math.max(totalEstimatedTax, safeHarborAnnual);
  const perQuarterPayment = annualTarget / 4;

  const recommendedReservePercent =
    grossIncome > 0 ? totalEstimatedTax / grossIncome : 0;

  const remainingLiability = Math.max(0, totalEstimatedTax - paymentsToDate);

  return {
    year,
    grossIncome,
    businessExpenses,
    netSEIncome,
    seTax,
    seDeduction,
    federalIncomeTax,
    stateIncomeTax,
    totalEstimatedTax,
    safeHarborAnnual,
    perQuarterPayment,
    recommendedReservePercent,
    quarterlyDueDates: quarterlyDueDates(year),
    paymentsToDate,
    remainingLiability,
  };
}
