import { test, expect } from '@playwright/test';
import cartData from '../mocks/cart-data.json';
import { goToCheckout, mockCheckoutAPI } from './test-helpers';

// ---------------------------------------------------------------------------
// Suite: Volume Discount — Core Checkout Calculations
// ---------------------------------------------------------------------------
test.describe('Volume Discount — Core Checkout Calculations', () => {

  test('TC-01: No discount applied when cart contains fewer than 5 identical SKUs', async ({ page }) => {
    await mockCheckoutAPI(page, cartData.carts.belowThreshold);
    await goToCheckout(page);

    // fetchCart() runs on load — wait for it to settle
    await expect.poll(() => page.locator('[data-testid="discount-amount"]').textContent(), { timeout: 5000 }).toBe('$0.00');
    await expect(page.locator('[data-testid="order-total"]')).toHaveText('$596.00');
    await expect(page.locator('[data-testid="discount-badge"]')).not.toBeVisible();
  });

  test('TC-02: Volume discount of 1 free item applies exactly at quantity threshold of 5', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err));
    await mockCheckoutAPI(page, cartData.carts.atThreshold);
    await goToCheckout(page);

    await expect.poll(() => page.locator('[data-testid="discount-amount"]').textContent(), { timeout: 5000 }).toBe('-$149.00');
    await expect(page.locator('[data-testid="order-total"]')).toHaveText('$596.00');
    await expect(page.locator('[data-testid="discount-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="discount-label"]')).toContainText('Buy 5 Get 1 Free');
  });

  test('TC-03: Buy 10 of same SKU applies 2 free items discount', async ({ page }) => {
    await mockCheckoutAPI(page, cartData.carts.doubleThreshold);
    await goToCheckout(page);

    await expect.poll(() => page.locator('[data-testid="discount-amount"]').textContent(), { timeout: 5000 }).toBe('-$298.00');
    await expect(page.locator('[data-testid="order-total"]')).toHaveText('$1,192.00');
    await expect(page.locator('[data-testid="discount-label"]')).toContainText('Buy 10 Get 2 Free');
  });

  test('TC-04: Mixed-SKU cart with no single SKU meeting threshold receives no volume discount', async ({ page }) => {
    await mockCheckoutAPI(page, cartData.carts.mixedSkus);
    await goToCheckout(page);

    await expect.poll(() => page.locator('[data-testid="discount-amount"]').textContent(), { timeout: 5000 }).toBe('$0.00');
    await expect(page.locator('[data-testid="order-total"]')).toHaveText('$645.00');
    await expect(page.locator('[data-testid="discount-badge"]')).not.toBeVisible();
  });

  test('TC-05: Removing items below threshold removes the applied discount', async ({ page }) => {
    // Start at threshold — discount applied
    await mockCheckoutAPI(page, cartData.carts.atThreshold);
    await goToCheckout(page);
    await expect.poll(() => page.locator('[data-testid="discount-amount"]').textContent(), { timeout: 5000 }).toBe('-$149.00');

    // Re-mock: drop to 4 items — discount removed
    await page.route('**/api/checkout/calculate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(cartData.carts.belowThreshold),
      });
    });

    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('cart:update'))
    );

    await expect.poll(() => page.locator('[data-testid="discount-amount"]').textContent(), { timeout: 5000 }).toBe('$0.00');
    await expect(page.locator('[data-testid="discount-badge"]')).not.toBeVisible();
  });

  test('TC-06: Cart quantity update dynamically recalculates order total', async ({ page }) => {
    // Start: no discount
    await mockCheckoutAPI(page, cartData.carts.belowThreshold);
    await goToCheckout(page);
    await expect.poll(() => page.locator('[data-testid="order-total"]').textContent(), { timeout: 5000 }).toBe('$596.00');

    // Re-mock: threshold reached
    await page.route('**/api/checkout/calculate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(cartData.carts.atThreshold),
      });
    });

    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('cart:update'))
    );

    await expect.poll(() => page.locator('[data-testid="order-total"]').textContent(), { timeout: 5000 }).toBe('$596.00');
    await expect(page.locator('[data-testid="discount-amount"]')).toHaveText('-$149.00');
  });
});
