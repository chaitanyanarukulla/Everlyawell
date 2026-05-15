# Everlywell AI-First QA Take-Home — Volume Discount Checkout

**Submitted by:** Chai.Narukulla 
**Scope:** Automated validation of volume-based discount logic at checkout  
**Stack:** Playwright · TypeScript · Node.js · Mocked API responses

---

## Project Overview

This project validates the business-critical checkout pricing logic introduced by the volume discount feature. 
The core risk is financial accuracy: an incorrect discount calculation directly impacts revenue and customer trust. 
This submission prioritizes that risk above all else..

---

## Assumptions Summary

| # | Assumption | Impact |
|---|-----------|--------|
| 1 | Volume discount applies per identical SKU only (not category) | Mixed carts with distributed quantities don't qualify |
| 2 | Buy 5 same SKU → 1 free item; Buy 10 same SKU → 2 free items | Threshold logic is config-driven, not hardcoded |
| 3 | Discounts are mutually exclusive — only one applies | Prevents double-discounting revenue leakage |
| 4 | System selects whichever discount produces higher savings | Implemented in `selectBestDiscount()` utility |
| 5 | Discounts apply before tax | Tax is calculated on post-discount subtotal |
| 6 | Shipping is excluded from discount calculation | Shipping remains flat/free based on post-discount subtotal |
| 7 | Admin config is mocked via `discount-config.json` | No real admin UI or backend required |
| 8 | Checkout recalculation is asynchronous | All UI assertions use `expect.poll()` |

Full rationale for each assumption is documented in [`assumptions-and-tradeoffs.md`](./assumptions-and-tradeoffs.md).

---

## Setup Instructions

### Prerequisites
- Node.js ≥ 18.x
- npm ≥ 9.x

### Install

```bash
cd everlywell-ai-first-qa-project
npm install
npx playwright install chromium
```

### Run Tests

```bash
# Run all tests
npm test

# Run individual suites
npm run test:unit     # checkout-volume-discount.spec.ts
npm run test:promo    # promo-conflict.spec.ts
npm run test:edge     # edge-cases.spec.ts

# Open HTML report after run
npm run test:report
```

> **Note:** Tests use Playwright's route interception (`page.route()`) to mock API responses — no live server is required. The `webServer` config block in `playwright.config.ts` is commented out with instructions for when a real checkout mock server is wired up.

---

## Test Strategy Overview

### Testing Pyramid

```
        ┌─────────────────┐
        │   UI / E2E (7)  │  ← Playwright: async checkout flow, promo UX
        ├─────────────────┤
        │  Integration (3)│  ← Playwright route mocking: API contract validation
        ├─────────────────┤
        │   Unit (8)      │  ← Pure TS: rounding, discount selection, SKU logic
        └─────────────────┘
```

### Risk-Based Prioritization

1. **Checkout calculation accuracy** — incorrect totals are a P0 issue. Validated first.
2. **Discount conflict resolution** — wrong discount applied = revenue impact or customer complaints.
3. **Async recalculation stability** — race conditions cause displayed total to diverge from charged total.
4. **Edge cases** — rounding errors, stale cart state, rapid input — addressed with targeted tests and unit coverage.

Full test plan: [`test-plan.md`](./test-plan.md)

---

## AI Usage

### Tools Used
- **Antigravity (Claude Sonnet)** — primary code generation and documentation drafting
- **GitHub Copilot** — inline autocomplete during utility function development
- **ChatGPt (Gpt4.5)** — for generating PRD 

---

## Tradeoffs & Prioritization

| Decision | Rationale |
|----------|-----------|
| No real checkout UI implemented | A mock HTML shell would add no signal — the test value is in API contract validation and discount logic |
| No page object model abstraction | Overkill for 14 tests across 3 files. Locators are `data-testid`-based and readable inline |
| Serial test execution | Avoids mock route state pollution. Speed tradeoff is acceptable at this test count |
| Mocked admin config | Validates config-driven behavior without building admin infrastructure |
| Unit tests co-located in `edge-cases.spec.ts` | Keeps the "discount logic unit test" concern near its integration tests. Would split into `utils/__tests__/` in a production repo |

---

*Full technical tradeoffs: [`assumptions-and-tradeoffs.md`](./assumptions-and-tradeoffs.md)*  
* Prompt used to generate: [`Prompt.md`](./Prompt.md)*
