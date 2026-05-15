import { test, expect } from '@playwright/test';
import cartData from '../mocks/cart-data.json';
import { calculateVolumeDiscount, selectBestDiscount } from '../utils/discount-helper';
import { roundCurrency } from '../utils/pricing-calculator';
import { goToCheckout, mockCheckoutAPI } from './test-helpers';

// ---------------------------------------------------------------------------
// Suite: Edge Cases — Boundary and Async Behavior
// ---------------------------------------------------------------------------
test.describe('Edge Cases — Boundary and Async Behavior', () => {

  // ---- Unit-level utility tests (no browser needed) ----------------------

  test('EC-01 [unit]: Currency rounding to 2 decimal places is correct', () => {
    expect(roundCurrency(149.005)).toBe(149.01);
    expect(roundCurrency(149.004)).toBe(149.00);
    expect(roundCurrency(0.1 + 0.2)).toBe(0.30);
    expect(roundCurrency(1492.505 / 10)).toBe(149.25);
  });

  test('EC-02 [unit]: Volume discount calculation returns correct free-item count', () => {
    expect(calculateVolumeDiscount({ sku: 'EW-STI-001', quantity: 5,  unitPrice: 149.00 })).toBe(149.00);
    expect(calculateVolumeDiscount({ sku: 'EW-STI-001', quantity: 10, unitPrice: 149.00 })).toBe(298.00);
    expect(calculateVolumeDiscount({ sku: 'EW-STI-001', quantity: 4,  unitPrice: 149.00 })).toBe(0);
    // Qty 6 hits only the 5-tier (1 free item), not a second threshold
    expect(calculateVolumeDiscount({ sku: 'EW-STI-001', quantity: 6,  unitPrice: 149.00 })).toBe(149.00);
  });

  test('EC-03 [unit]: selectBestDiscount returns the higher of volume vs promo', () => {
    expect(selectBestDiscount({ volumeDiscount: 149.00, promoDiscount: 200.00 })).toEqual({ amount: 200.00, source: 'promo' });
    expect(selectBestDiscount({ volumeDiscount: 149.00, promoDiscount: 100.00 })).toEqual({ amount: 149.00, source: 'volume' });
    // Tie: promo wins (deliberate customer action should be honored)
    expect(selectBestDiscount({ volumeDiscount: 149.00, promoDiscount: 149.00 })).toEqual({ amount: 149.00, source: 'promo' });
    // No promo: volume wins by default
    expect(selectBestDiscount({ volumeDiscount: 149.00, promoDiscount: 0 })).toEqual({ amount: 149.00, source: 'volume' });
  });

  // ---- UI / Integration edge case tests ----------------------------------

  test('EC-04: Rapid quantity changes resolve to the final cart state', async ({ page }) => {
    await mockCheckoutAPI(page, cartData.carts.atThreshold);
    await goToCheckout(page);

    // Fire multiple cart:update events rapidly — all hit same mock, final state wins
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() =>
        window.dispatchEvent(new CustomEvent('cart:update'))
      );
    }

    await expect.poll(() => page.locator('[data-testid="discount-amount"]').textContent(), {
      timeout: 8000,
      intervals: [500, 1000, 2000],
      message: 'Discount should settle after rapid quantity changes',
    }).toBe('-$149.00');
  });

  test('EC-05: Async recalculation completes before order total is asserted', async ({ page }) => {
    // Simulate 1.5s API latency — expect.poll() tolerates this without a fixed sleep
    await page.route('**/api/checkout/calculate', async (route) => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1500);
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(cartData.carts.atThreshold),
      });
    });

    await goToCheckout(page);

    await expect.poll(() => page.locator('[data-testid="order-total"]').textContent(), {
      timeout: 10000,
      message: 'Order total did not update after async recalculation',
    }).toBe('$596.00');
  });

  test('EC-06: Stale cart state is cleared when a new session begins', async ({ page }) => {
    // Poison localStorage before page load — simulates a returning user with stale session
    await page.addInitScript(() => {
      localStorage.setItem('ew_cart_state', JSON.stringify({
        discountApplied: 999.00,
        total: 0.01,
        stale: true,
      }));
    });

    await mockCheckoutAPI(page, cartData.carts.belowThreshold);
    await goToCheckout(page);

    // Checkout must reflect fresh API data, not poisoned localStorage
    await expect.poll(() => page.locator('[data-testid="order-total"]').textContent(), { timeout: 5000 }).toBe('$596.00');
    await expect(page.locator('[data-testid="discount-amount"]')).toHaveText('$0.00');
  });

  test('EC-07: Configuration-driven discount change is reflected without code deploy', async ({ page }) => {
    // Admin changes freeItemCount from 1→2 for the 5-item tier in config.
    // The checkout API returns the updated amounts — the HTML renders without code change.
    await page.route('**/api/discount-config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          volumeDiscounts: [{ id: 'volume-5', minQuantity: 5, freeItemCount: 2, active: true }],
        }),
      });
    });

    // Modified cart: 5 items but now 2 free (admin changed config)
    const modifiedCart = {
      ...cartData.carts.atThreshold,
      discountApplied: 298.00,
      discountLabel: 'Buy 5 Get 2 Free',
      total: 447.00,
    };

    await mockCheckoutAPI(page, modifiedCart);
    await goToCheckout(page);

    await expect.poll(() => page.locator('[data-testid="discount-amount"]').textContent(), { timeout: 5000 }).toBe('-$298.00');
    await expect(page.locator('[data-testid="order-total"]')).toHaveText('$447.00');
  });
});
