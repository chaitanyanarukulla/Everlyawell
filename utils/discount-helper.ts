/**
 * discount-helper.ts
 *
 * Encapsulates the business rules for discount selection and calculation.
 * Keeping these functions pure and independently testable is critical —
 * the highest-risk business logic lives here.
 *
 * Business rules:
 *  1. Volume discount applies per identical SKU only
 *  2. Buy 5 same SKU → 1 free item; Buy 10 same SKU → 2 free items
 *  3. Discounts are mutually exclusive
 *  4. System selects whichever discount produces higher savings
 *  5. On tie, promo code wins (better UX — customer applied intentionally)
 */

import discountConfig from '../mocks/discount-config.json';

export interface CartLineItem {
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface DiscountResult {
  amount: number;
  source: 'volume' | 'promo' | 'none';
}

// ---------------------------------------------------------------------------
// Volume Discount Logic
// ---------------------------------------------------------------------------

/**
 * Returns the applicable volume discount for a single cart line item.
 * Reads thresholds from the admin-controlled discount-config.json.
 *
 * Note: Only single SKU lines are evaluated. Mixed-SKU aggregation is
 * explicitly NOT supported per current business rules.
 */
export function calculateVolumeDiscount(item: CartLineItem): number {
  const { volumeDiscounts } = discountConfig;

  // Sort descending by minQuantity so we match the highest applicable tier first
  const sortedTiers = [...volumeDiscounts]
    .filter((tier) => tier.active)
    .sort((a, b) => b.minQuantity - a.minQuantity);

  for (const tier of sortedTiers) {
    if (item.quantity >= tier.minQuantity) {
      return roundCurrencyLocal(tier.freeItemCount * item.unitPrice);
    }
  }

  return 0;
}


// ---------------------------------------------------------------------------
// Discount Selection Logic
// ---------------------------------------------------------------------------

/**
 * Selects the best discount given a volume discount amount and a promo discount amount.
 * Implements mutually exclusive discount rule — only one is applied.
 *
 * On tie: promo wins, as it represents a deliberate customer action.
 */
export function selectBestDiscount({
  volumeDiscount,
  promoDiscount,
}: {
  volumeDiscount: number;
  promoDiscount: number;
}): DiscountResult {
  if (promoDiscount >= volumeDiscount && promoDiscount > 0) {
    return { amount: promoDiscount, source: 'promo' };
  }
  if (volumeDiscount > 0) {
    return { amount: volumeDiscount, source: 'volume' };
  }
  return { amount: 0, source: 'none' };
}



// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function roundCurrencyLocal(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
