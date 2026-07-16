// Types are erased at build time, so a star re-export is safe for bundlers.
export * from './types/index.js';

// Value-bearing modules use explicit named re-exports. The CommonJS output of
// `export *` becomes a dynamic loop that bundlers (Rollup/Vite) can't statically
// analyze for named exports, which breaks runtime imports in the client.
export { estimateQuarterlyTax } from './taxCalc.js';
export type { TaxEstimateInput } from './taxCalc.js';
export { STATE_TAX_RATES, getStateRate, getStateInfo } from './stateTax.js';
export type { StateInfo } from './stateTax.js';
