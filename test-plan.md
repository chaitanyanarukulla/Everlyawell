# Test Plan — Everlywell Volume Discount Feature

**Feature:** Volume-based automatic discount at checkout  
**Version:** 1.0   
**Last Updated:** May 2024

---

## 1. Testing Pyramid & Layered Strategy

```
             ┌────────────────────────────┐
             │  E2E / UI Tests (Playwright)│  7 tests
             │  Async flow, promo UX,      │
             │  dynamic recalculation      │
             └────────────┬───────────────┘
                          │
             ┌────────────▼───────────────┐
             │  Integration Tests          │  4 tests
             │  (Playwright route mocking) │
             │  API contract, promo        │
             │  conflict resolution        │
             └────────────┬───────────────┘
                          │
             ┌────────────▼───────────────┐
             │  Unit Tests (Pure TS)       │  4+ tests
             │  Pricing math, rounding,    │
             │  discount selection logic   │
             └────────────────────────────┘
```

### Layer Responsibilities

| Layer | Tool | What it validates | When it breaks |
|-------|------|------------------|----------------|
| Unit | Playwright test runner (pure TS assertions) | Discount math, rounding, tie-breaking | Business logic bug in utilities |
| Integration | Playwright + `page.route()` mock | API response contract, end-to-end calculation pipeline | Contract change, field rename, wrong status code |
| UI/E2E | Playwright full browser | DOM updates, async behavior, user interactions | Frontend rendering bug, timing issue, locator change |

---

## 2. Risk-Based Test Prioritization

### P0 — Revenue Impact (Must Pass Before Merge)

| Test ID | Description | Risk |
|---------|-------------|------|
| TC-02 | Volume discount applies at exactly qty=5 | Overcharging customers |
| TC-03 | Buy 10 applies 2x free item discount | Under-discounting or revenue leakage |
| TC-07 | Higher promo wins over volume discount | Wrong discount applied → revenue loss or customer complaint |
| TC-08 | Volume wins over weaker promo | Customer sees promo but volume discount charges → confusion |
| EC-01 | Currency rounding is correct | Systematic rounding errors in financial calculations |

### P1 — User Experience (Must Pass Before Launch)

| Test ID | Description | Risk |
|---------|-------------|------|
| TC-01 | No discount below threshold | False discount display (trust erosion) |
| TC-04 | Mixed SKUs don't qualify | Incorrect eligibility logic |
| TC-05 | Removing items removes discount | Stale discount state after cart modification |
| TC-09 | Invalid promo shows error, preserves total | Poor error handling → UX failure |
| EC-05 | Async recalculation stability | Displayed total ≠ charged total |

### P2 — Stability & Edge Cases (Must Pass Before GA)

| Test ID | Description | Risk |
|---------|-------------|------|
| TC-06 | Dynamic total updates on qty change | Real-time UX consistency |
| TC-10 | Expired promo rejected gracefully | Edge case error handling |
| TC-11 | Duplicate promo submission no-ops | Double-discount vulnerability |
| EC-04 | Rapid qty changes settle correctly | Race condition in cart state |
| EC-06 | Stale cart state cleared on new session | Incorrect totals from previous session |

---

## 3. Scope & Exclusions

### In Scope
- Volume discount calculation accuracy
- Promo code vs. volume discount conflict resolution
- Async checkout total recalculation
- Config-driven discount tier changes
- Error handling for invalid/expired promo codes

### Explicitly Out of Scope
- Tax jurisdiction variations (multi-state compliance)
- Payment processing validation (Stripe/Braintree integration)
- Checkout accessibility (WCAG) — separate workstream
- Load and performance testing
- Mobile viewport testing
- Internationalization / multi-currency

---

## 4. Regression Scope

When this feature ships, the following existing checkout regression areas must be re-validated:

1. **Standard checkout flow** — ensure non-volume carts are unaffected
2. **Existing promo code flows** — validate all active promo codes still apply correctly
3. **Tax calculation** — confirm discount-before-tax ordering is preserved
4. **Order confirmation page** — discount line item must render correctly
5. **Order history / receipts** — discount reflected accurately in historical records
6. **Cart persistence** — discount state not corrupted across browser sessions

---

## 5. Observability Recommendations

### Monitoring (Post-Release)

| Signal | Tool | Alert Threshold |
|--------|------|----------------|
| Checkout calculation error rate | Datadog / CloudWatch | > 0.5% over 5 min |
| Discount applied percentage | Custom event metric | Drop > 20% from baseline |
| Average order value | Analytics | Sudden spike/drop > 15% |
| Promo validation failure rate | API logs | > 10% in 10 min |
| Checkout completion rate | Funnel analytics | Drop > 5% vs. 7-day avg |

### Logging Requirements

Before release, ensure the following are logged per checkout attempt:
- Cart ID, SKU list, quantities
- Volume discount evaluated (amount + tier matched)
- Promo code applied (if any) and discount amount
- Final discount source (`volume` | `promo` | `none`)
- Pre-tax subtotal, tax, shipping, total
- Timestamp of recalculation

This enables post-hoc debugging of any reported pricing discrepancies.

### Recommended Dashboard Panels

1. Discount source distribution pie chart (volume vs. promo vs. none)
2. Time-series: average discount amount per order
3. Real-time: checkout error rate
4. Alert: orders where `discountApplied > subtotal` (should be impossible)

---

## 6. Flaky Test Mitigation Strategy

| Antipattern | Mitigation Applied |
|-------------|-------------------|
| `page.waitForTimeout(2000)` | Replaced with `expect.poll()` with configurable intervals |
| Hardcoded URL matchers for API waits | Route interception via `page.route()` — exact path control |
| Race conditions in qty update tests | `expect.poll()` with increased timeout + specific failure message |
| Test interdependency | Each test is fully self-contained with its own mock setup |
| Shared browser state | `page.addInitScript()` used to reset localStorage before each test |

### CI Configuration Note

`retries: 1` is set in CI. This is intentional infrastructure tolerance, not a signal that tests are flaky. A test that passes on first retry is not inherently unstable — it may reflect network jitter or Docker startup latency. A test that *requires* a retry consistently is a test that needs to be fixed.

---

## 7. Definition of Ready (for QA Engagement)

Before I begin testing a checkout pricing change, I require:
- UAC finalized and signed off by Product
- API contract documented (request/response schema)
- Admin config schema versioned
- Feature flag or rollout strategy defined
- Rollback plan documented

---

## 8. Definition of Done (for Test Completion)

- All P0 tests passing in CI
- All P1 tests passing in CI
- No known flaky tests in the suite
- Test plan reviewed by at least one engineer
- Observability plan confirmed with backend team
- Regression checklist completed
