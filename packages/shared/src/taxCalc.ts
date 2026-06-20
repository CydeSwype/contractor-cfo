import type { FilingStatus, TaxEstimate } from './types/index.js';

interface YearConstants {
  ssWageBase: number;
  standardDeduction: Record<FilingStatus, number>;
  brackets: Record<FilingStatus, [number, number][]>;
}

// Add a new entry here each October when IRS publishes the following year's figures.
// The last entry is used as a fallback for any year not explicitly listed.
const TAX_CONSTANTS: Record<number, YearConstants> = {
  2025: {
    ssWageBase: 176100,
    standardDeduction: { single: 15000, mfj: 30000, mfs: 15000, hoh: 22500 },
    brackets: {
      single: [[0.10,11925],[0.12,48475],[0.22,103350],[0.24,197300],[0.32,250525],[0.35,626350],[0.37,Infinity]],
      mfj:    [[0.10,23850],[0.12,96950],[0.22,206700],[0.24,394600],[0.32,501050],[0.35,751600],[0.37,Infinity]],
      mfs:    [[0.10,11925],[0.12,48475],[0.22,103350],[0.24,197300],[0.32,250525],[0.35,375800],[0.37,Infinity]],
      hoh:    [[0.10,17000],[0.12,64850],[0.22,103350],[0.24,197300],[0.32,250500],[0.35,626350],[0.37,Infinity]],
    },
  },
};

function getConstants(year: number): YearConstants {
  if (TAX_CONSTANTS[year]) return TAX_CONSTANTS[year];
  // Fall back to the most recent year we have; estimates will be close but not exact.
  const knownYears = Object.keys(TAX_CONSTANTS).map(Number).sort((a, b) => b - a);
  return TAX_CONSTANTS[knownYears[0]];
}

function applyBrackets(taxableIncome: number, filing: FilingStatus, brackets: [number, number][]): number {
  if (taxableIncome <= 0) return 0;
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

  const { ssWageBase, standardDeduction, brackets } = getConstants(year);

  const netSEIncome = Math.max(0, grossIncome - businessExpenses);
  const seTaxBase = netSEIncome * 0.9235;

  let seTax = 0;
  if (seTaxBase <= ssWageBase) {
    seTax = seTaxBase * 0.153;
  } else {
    seTax = ssWageBase * 0.124 + seTaxBase * 0.029;
  }

  const seDeduction = seTax * 0.5;
  const agi = Math.max(0, grossIncome + otherIncome - seDeduction);
  const taxableIncome = Math.max(0, agi - standardDeduction[filingStatus]);

  const federalIncomeTax = applyBrackets(taxableIncome, filingStatus, brackets[filingStatus]);
  const stateIncomeTax = taxableIncome * stateRate;
  const totalEstimatedTax = federalIncomeTax + seTax + stateIncomeTax;

  const safeHarborMultiplier = agi > 150000 ? 1.1 : 1.0;
  const safeHarborAnnual = priorYearTax * safeHarborMultiplier;
  const annualTarget = Math.max(totalEstimatedTax, safeHarborAnnual);
  const perQuarterPayment = annualTarget / 4;

  const recommendedReservePercent = grossIncome > 0 ? totalEstimatedTax / grossIncome : 0;
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
