// Representative state income tax rates, keyed by USPS state code.
//
// The estimator applies a single flat `stateRate` against federal taxable income
// (see taxCalc.ts), so each state is reduced to one representative rate:
//   - Flat-tax states use their exact statutory rate.
//   - Graduated states use the marginal rate a typical self-employed professional
//     hits in the ~$100k–$250k taxable-income range (not the very top bracket),
//     which keeps quarterly estimates realistic rather than worst-case.
//   - States with no tax on earned income are 0.
//
// These are approximations for planning, not a substitute for a tax pro. Local
// (city/county) income taxes — which exist in MD, IN, OH, PA, MI, NY (NYC/Yonkers),
// and a few others — are intentionally NOT modeled here; see Settings copy.
//
// Rates are decimals (0.093 = 9.3%). Review each October when states publish updates.

export interface StateInfo {
  code: string;
  name: string;
  rate: number;
  /** True where notable local (city/county) income taxes also apply on top of the state rate. */
  hasLocalIncomeTax?: boolean;
}

export const STATE_TAX_RATES: StateInfo[] = [
  { code: 'AL', name: 'Alabama', rate: 0.05, hasLocalIncomeTax: true },
  { code: 'AK', name: 'Alaska', rate: 0 },
  { code: 'AZ', name: 'Arizona', rate: 0.025 },
  { code: 'AR', name: 'Arkansas', rate: 0.039 },
  { code: 'CA', name: 'California', rate: 0.093 },
  { code: 'CO', name: 'Colorado', rate: 0.044 },
  { code: 'CT', name: 'Connecticut', rate: 0.05 },
  { code: 'DE', name: 'Delaware', rate: 0.066, hasLocalIncomeTax: true },
  { code: 'DC', name: 'District of Columbia', rate: 0.085 },
  { code: 'FL', name: 'Florida', rate: 0 },
  { code: 'GA', name: 'Georgia', rate: 0.0539 },
  { code: 'HI', name: 'Hawaii', rate: 0.079 },
  { code: 'ID', name: 'Idaho', rate: 0.058 },
  { code: 'IL', name: 'Illinois', rate: 0.0495 },
  { code: 'IN', name: 'Indiana', rate: 0.0305, hasLocalIncomeTax: true },
  { code: 'IA', name: 'Iowa', rate: 0.038, hasLocalIncomeTax: true },
  { code: 'KS', name: 'Kansas', rate: 0.057 },
  { code: 'KY', name: 'Kentucky', rate: 0.04, hasLocalIncomeTax: true },
  { code: 'LA', name: 'Louisiana', rate: 0.03 },
  { code: 'ME', name: 'Maine', rate: 0.0715 },
  { code: 'MD', name: 'Maryland', rate: 0.0475, hasLocalIncomeTax: true },
  { code: 'MA', name: 'Massachusetts', rate: 0.05 },
  { code: 'MI', name: 'Michigan', rate: 0.0425, hasLocalIncomeTax: true },
  { code: 'MN', name: 'Minnesota', rate: 0.0785 },
  { code: 'MS', name: 'Mississippi', rate: 0.044 },
  { code: 'MO', name: 'Missouri', rate: 0.048, hasLocalIncomeTax: true },
  { code: 'MT', name: 'Montana', rate: 0.059 },
  { code: 'NE', name: 'Nebraska', rate: 0.052 },
  { code: 'NV', name: 'Nevada', rate: 0 },
  { code: 'NH', name: 'New Hampshire', rate: 0 },
  { code: 'NJ', name: 'New Jersey', rate: 0.0637 },
  { code: 'NM', name: 'New Mexico', rate: 0.049 },
  { code: 'NY', name: 'New York', rate: 0.0685, hasLocalIncomeTax: true },
  { code: 'NC', name: 'North Carolina', rate: 0.045 },
  { code: 'ND', name: 'North Dakota', rate: 0.025 },
  { code: 'OH', name: 'Ohio', rate: 0.035, hasLocalIncomeTax: true },
  { code: 'OK', name: 'Oklahoma', rate: 0.0475 },
  { code: 'OR', name: 'Oregon', rate: 0.099, hasLocalIncomeTax: true },
  { code: 'PA', name: 'Pennsylvania', rate: 0.0307, hasLocalIncomeTax: true },
  { code: 'RI', name: 'Rhode Island', rate: 0.0599 },
  { code: 'SC', name: 'South Carolina', rate: 0.064 },
  { code: 'SD', name: 'South Dakota', rate: 0 },
  { code: 'TN', name: 'Tennessee', rate: 0 },
  { code: 'TX', name: 'Texas', rate: 0 },
  { code: 'UT', name: 'Utah', rate: 0.0455 },
  { code: 'VT', name: 'Vermont', rate: 0.066 },
  { code: 'VA', name: 'Virginia', rate: 0.0575 },
  { code: 'WA', name: 'Washington', rate: 0 },
  { code: 'WV', name: 'West Virginia', rate: 0.0512, hasLocalIncomeTax: true },
  { code: 'WI', name: 'Wisconsin', rate: 0.053 },
  { code: 'WY', name: 'Wyoming', rate: 0 },
];

const BY_CODE: Record<string, StateInfo> = Object.fromEntries(
  STATE_TAX_RATES.map(s => [s.code, s])
);

/** Look up a state's representative income tax rate (decimal). Returns 0 for unknown/empty. */
export function getStateRate(code: string | null | undefined): number {
  if (!code) return 0;
  return BY_CODE[code.toUpperCase()]?.rate ?? 0;
}

/** Look up full state info by code, or undefined if unknown. */
export function getStateInfo(code: string | null | undefined): StateInfo | undefined {
  if (!code) return undefined;
  return BY_CODE[code.toUpperCase()];
}
