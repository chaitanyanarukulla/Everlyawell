# Everlywell AI-First QA Take-Home — Volume Discount Checkout

**Submitted by:** Chai Narukulla  
**Scope:** Automated validation of volume-based discount logic at checkout  
**Stack:** Playwright · TypeScript · Node.js · Mocked API responses

---

## Project Overview

**The problem:** Everlywell needs a volume-based discount system at checkout (buy 5 identical kits, get 1 free). The highest-risk surface area is pricing calculation accuracy — an incorrect discount directly impacts revenue, customer trust, and payment integrity.

**My approach:** Rather than building a broad, shallow test suite, I identified the three highest-risk areas (calculation accuracy, discount conflict resolution, and async recalculation) and built layered coverage — unit tests for pricing math, integration tests for API contracts, and E2E tests for checkout behavior — targeting those risks specifically.

**The result:** 18 tests across 3 spec files, with full coverage of every UAC requirement, 6 documented edge cases, and zero reliance on `waitForTimeout` or other flakiness-prone patterns.

The full product requirements, including functional specifications, discount qualification rules, and admin configuration design, are documented in [`PRD.md`](./PRD.md).

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
- Git
- Node.js ≥ 18.x
- npm ≥ 9.x

### Get the Project

```bash
git clone https://github.com/chaitanyanarukulla/Everlyawell.git
cd Everlyawell
```

### Install

```bash
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
        │   UI / E2E (7)  │  ← Playwright: async checkout flow, promo UX, dynamic recalc
        ├─────────────────┤
        │ Integration (8) │  ← Playwright route mocking: API contract, conflict resolution
        ├─────────────────┤
        │   Unit (3)      │  ← Pure TS: rounding, discount selection, volume calculation
        └─────────────────┘
```

### Risk-Based Prioritization

| Priority | Risk | Tests |
|----------|------|-------|
| **P0** | Checkout calculation accuracy — incorrect totals are a revenue defect | TC-02, TC-03, EC-01 |
| **P0** | Discount conflict resolution — wrong discount applied = revenue loss or customer complaint | TC-07, TC-08, EC-03 |
| **P1** | Async recalculation stability — race conditions cause display/charge mismatch | EC-04, EC-05 |
| **P1** | Boundary and state management — stale state, config changes, duplicate submissions | TC-01, TC-04, TC-05, EC-06, EC-07, TC-11 |
| **P2** | Error handling — invalid/expired promos handled gracefully | TC-09, TC-10 |

Full test plan: [`test-plan.md`](./test-plan.md)  
Short-response answers: [`short-response-answers.md`](./short-response-answers.md)

---

## AI Usage

| Tool | Role |
|------|------|
| **TestWare** *(self-developed)* | Requirements analysis → test case derivation from PRD |
| **Antigravity (Claude Sonnet)** | Primary code generation: test specs, utilities, documentation |
| **GitHub Copilot** | Inline autocomplete during utility development |
| **ChatGPT (GPT-4.5)** | PRD generation and requirement decomposition |

**Key correction:** AI generated synchronous assertions (`expect().toHaveText()`) for checkout totals. These were replaced with `expect.poll()` to handle async recalculation — eliminating an entire class of timing-based flakiness. Full details in [`short-response-answers.md`](./short-response-answers.md).

---

## Documentation

| Document | Description |
|----------|-------------|
| [`README.md`](./README.md) | Project overview, setup, and test strategy |
| [`PRD.md`](./PRD.md) | Product requirements — functional specs, discount rules, admin config design |
| [`test-plan.md`](./test-plan.md) | Risk-based test plan, regression scope, observability recommendations |
| [`assumptions-and-tradeoffs.md`](./assumptions-and-tradeoffs.md) | Technical decisions, assumptions rationale, and intentional omissions |
| [`short-response-answers.md`](./short-response-answers.md) | Responses to interview questions (3a–3d) |
| [`api-contract.md`](./api-contract.md) | API endpoint schemas, request/response contracts, error handling |
| [`Prompt.md`](./Prompt.md) | Original project prompt / requirements reference |

---

## Tradeoffs & Prioritization

| Decision | Rationale |
|----------|-----------|
| No real checkout UI implemented | A mock HTML shell validates DOM binding — the test value is in API contract and discount logic, not visual fidelity |
| No page object model abstraction | YAGNI at 18 tests across 3 files. `data-testid` locators are readable inline. Would introduce POM at ~30+ tests |
| Serial test execution | Avoids mock route state pollution. Speed tradeoff is negligible at this test count |
| Mocked admin config | Validates config-driven behavior without building admin infrastructure |
| Unit tests co-located in `edge-cases.spec.ts` | Keeps discount logic unit tests near their integration counterparts. Would split into `utils/__tests__/` in a production repo |

---

*Full technical tradeoffs: [`assumptions-and-tradeoffs.md`](./assumptions-and-tradeoffs.md)*  
*Product requirements: [`PRD.md`](./PRD.md)*  
*API contract: [`api-contract.md`](./api-contract.md)*  
*Interview responses: [`short-response-answers.md`](./short-response-answers.md)*  
*Prompt used to generate: [`Prompt.md`](./Prompt.md)*
