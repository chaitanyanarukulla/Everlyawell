/**
 * pricing-calculator.ts
 *
 * Core pricing utility functions. These are intentionally pure and
 * side-effect-free to allow deterministic unit testing without browser context.
 *
 * Business rules encoded here:
 *  - Discounts apply before tax
 *  - Shipping is excluded from discounts
 *  - Rounding uses standard "round half up" to 2 decimal places
 */



/**
 * Rounds a floating-point value to exactly 2 decimal places.
 * Uses multiply-round-divide to avoid JS floating-point drift.
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

