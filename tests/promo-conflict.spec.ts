import { test, expect } from '@playwright/test';
import cartData from '../mocks/cart-data.json';
import { goToCheckout, mockCheckoutAPI, mockPromoValid } from './test-helpers';

// ---------------------------------------------------------------------------
// Suite: Promo Code vs Volume Discount — Conflict Resolution
// ---------------------------------------------------------------------------
test.describe('Promo Code vs. Volume Discount — Conflict Resolution', () => {

  test('TC-07: Promo code with higher savings overrides volume discount', async ({ page }) => {
    // SAVE200 ($200) > volume ($149) → promo wins
    await mockCheckoutAPI(page, cartData.carts.withPromoCode);
    await mockPromoValid(page);
    await goToCheckout(page);

    await page.locator('[data-testid="promo-input"]').fill('SAVE200');
    await page.locator('[data-testid="promo-apply-btn"]').click();

    await expect.poll(() => page.locator('[data-testid="discount-amount"]').textContent(), { timeout: 5000 }).toBe('-$200.00');
    await expect(page.locator('[data-testid="order-total"]')).toHaveText('$545.00');
    await expect(page.locator('[data-testid="discount-source"]')).toHaveText('Promo Code: SAVE200');
    await expect(page.locator('[data-testid="volume-discount-line"]')).not.toBeVisible();
  });

  test('TC-08: Volume discount wins when promo code savings are lower', async ({ page }) => {
    // SAVE100 ($100) < volume ($149) → volume wins; promoNotBest=true returned by API
    await mockCheckoutAPI(page, cartData.carts.withWeakerPromo);
    await mockPromoValid(page);
    await goToCheckout(page);

    await page.locator('[data-testid="promo-input"]').fill('SAVE100');
    await page.locator('[data-testid="promo-apply-btn"]').click();

    await expect.poll(() => page.locator('[data-testid="discount-source"]').textContent(), { timeout: 5000 }).toContain('Volume Discount');
    await expect(page.locator('[data-testid="discount-amount"]')).toHaveText('-$149.00');
    await expect(page.locator('[data-testid="order-total"]')).toHaveText('$596.00');
    await expect(page.locator('[data-testid="promo-not-best-message"]')).toBeVisible();
  });

  test('TC-09: Invalid promo code shows error and does not alter totals', async ({ page }) => {
    await mockCheckoutAPI(page, cartData.carts.atThreshold);
    await goToCheckout(page);

    // Confirm initial volume discount loaded
    await expect.poll(() => page.locator('[data-testid="discount-amount"]').textContent(), { timeout: 5000 }).toBe('-$149.00');

    await page.route('**/api/promo/validate', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'INVALID_PROMO', message: 'Promo code not found or expired.' }),
      });
    });

    await page.locator('[data-testid="promo-input"]').fill('NOTACODE123');
    await page.locator('[data-testid="promo-apply-btn"]').click();

    await expect(page.locator('[data-testid="promo-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="promo-error"]')).toContainText('Promo code not found or expired.');
    // Existing volume discount must be untouched
    await expect(page.locator('[data-testid="discount-amount"]')).toHaveText('-$149.00');
    await expect(page.locator('[data-testid="order-total"]')).toHaveText('$596.00');
  });

  test('TC-10: Expired promo code is rejected and volume discount is preserved', async ({ page }) => {
    await mockCheckoutAPI(page, cartData.carts.atThreshold);
    await goToCheckout(page);

    await expect.poll(() => page.locator('[data-testid="discount-amount"]').textContent(), { timeout: 5000 }).toBe('-$149.00');

    await page.route('**/api/promo/validate', async (route) => {
      await route.fulfill({
        status: 410,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'PROMO_EXPIRED', message: 'This promo code has expired.' }),
      });
    });

    await page.locator('[data-testid="promo-input"]').fill('EXPIRED99');
    await page.locator('[data-testid="promo-apply-btn"]').click();

    await expect(page.locator('[data-testid="promo-error"]')).toContainText('expired');
    await expect(page.locator('[data-testid="discount-amount"]')).toHaveText('-$149.00');
  });

  test('TC-11: Submitting the same promo code twice does not double-apply the discount', async ({ page }) => {
    await mockCheckoutAPI(page, cartData.carts.withPromoCode);
    await mockPromoValid(page);
    await goToCheckout(page);

    const applyBtn = page.locator('[data-testid="promo-apply-btn"]');
    await page.locator('[data-testid="promo-input"]').fill('SAVE200');
    await applyBtn.click();
    await expect.poll(() => page.locator('[data-testid="discount-amount"]').textContent(), { timeout: 5000 }).toBe('-$200.00');

    // Re-click same code — idempotent guard in JS prevents second validation/recalculate
    await applyBtn.click();

    await expect(page.locator('[data-testid="discount-amount"]')).toHaveText('-$200.00');
    await expect(page.locator('[data-testid="order-total"]')).toHaveText('$545.00');
  });
});
