/**
 * test-helpers.ts
 *
 * Shared setup for all checkout test specs.
 * Using page.setContent() avoids a network server dependency —
 * all API calls are intercepted by Playwright's page.route() regardless.
 */
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const checkoutHTML = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'checkout.html'),
  'utf-8'
);

/**
 * Load the checkout page HTML by mocking the route and navigating to it.
 * This ensures the page has a real origin (http://localhost:3000) so that
 * relative fetch() calls work correctly.
 */
export async function goToCheckout(page: Page): Promise<void> {
  await page.route('http://localhost:3000/checkout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: checkoutHTML,
    });
  });
  await page.goto('http://localhost:3000/checkout');
}

/**
 * Intercept /api/checkout/calculate and return the given cart payload.
 */
export async function mockCheckoutAPI(page: Page, cartPayload: object): Promise<void> {
  await page.route('**/api/checkout/calculate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(cartPayload),
    });
  });
}

/**
 * Intercept /api/promo/validate and return HTTP 200 (valid promo).
 * Use this for TC-07, TC-08, TC-11 where the promo code is syntactically valid
 * but the backend selects the best discount.
 */
export async function mockPromoValid(page: Page): Promise<void> {
  await page.route('**/api/promo/validate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ valid: true }),
    });
  });
}
