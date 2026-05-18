# Short-Response Answers

**Submitted by:** Chai Narukulla  
**Feature:** Volume-Based Checkout Discount

---

# 1. Use AI coding tools to assist in different aspects of this project. Include a brief note on which tools you used, what you delegated vs. wrote yourself, and one example where you had to correct or override the AI's output.

### Tools Used

| Tool | Role |
|------|------|
| **TestWare** *(self-developed)* | Requirements analysis → structured test case derivation from the PRD |
| **Antigravity (Claude Sonnet)** | Primary code generation: test specs, helper utilities, documentation drafts |
| **GitHub Copilot** | Inline autocomplete during `discount-helper.ts` and `pricing-calculator.ts` development |
| **ChatGPT (GPT-4.5)** | PRD generation and structured requirement decomposition |

### What I Delegated vs. Owned

**Delegated to AI:** boilerplate test structure, initial mock data shapes, first-pass documentation drafts, and `roundCurrency()` implementation.

**Owned entirely:** risk-based test prioritization (deciding *which* tests to write and *why*), the `selectBestDiscount()` tie-breaking rule (promo wins on tie — a UX judgment call, not a code generation task), the flaky-test mitigation strategy (`expect.poll()` over `waitForTimeout`), and the decision to keep the suite at 18 tests rather than over-engineering coverage.

### Correction Example

AI initially generated synchronous assertions for checkout total verification:

```typescript
// AI-generated — breaks on async recalculation
await expect(page.locator('[data-testid="order-total"]')).toHaveText('$596.00');
```

This fails intermittently because checkout recalculation is asynchronous — the DOM hasn't updated yet when the assertion fires. I replaced these with polling-based assertions:

```typescript
// Corrected — tolerates async recalculation latency
await expect.poll(
  () => page.locator('[data-testid="order-total"]').textContent(),
  { timeout: 5000 }
).toBe('$596.00');
```

This change was applied across every test that asserts on API-derived values. It eliminated an entire class of timing-based flakiness and better models how checkout recalculation actually behaves in production.

# 2. Create an automated test suite for the most critical or risk-prone functionality related to this feature.

The automated test suite is organized across three spec files, each targeting a distinct risk area:

- [`tests/checkout-volume-discount.spec.ts`](./tests/checkout-volume-discount.spec.ts) — Core volume discount calculations (TC-01 through TC-06)
- [`tests/promo-conflict.spec.ts`](./tests/promo-conflict.spec.ts) — Promo code vs. volume discount conflict resolution (TC-07 through TC-11)
- [`tests/edge-cases.spec.ts`](./tests/edge-cases.spec.ts) — Boundary values, async behavior, and unit-level pricing validation (EC-01 through EC-07)

Shared test utilities are in [`tests/test-helpers.ts`](./tests/test-helpers.ts). Business logic under test lives in [`utils/discount-helper.ts`](./utils/discount-helper.ts) and [`utils/pricing-calculator.ts`](./utils/pricing-calculator.ts).

The API contract used by all tests is documented in [`api-contract.md`](./api-contract.md).


# 3a. Testing Approach Across the Development Lifecycle

## Early Development — Shift-Left Collaboration

My involvement begins before implementation starts. For this feature, I spent the first phase identifying ambiguity in the UAC that would directly affect pricing behavior — not building automation.

Three questions determined the shape of the entire test strategy:

1. **What qualifies as "the same product"?** — SKU, product family, or category? This changes whether a cart with 3 Food Sensitivity kits + 2 STI kits qualifies. I chose SKU-level (most conservative, lowest revenue-leakage risk).
2. **What happens on a tie?** — When promo and volume discounts produce equal savings, who wins? The UAC is silent. I chose promo (honors deliberate customer action — better UX).
3. **How is the "free" item priced?** — Qualifying SKU price, lowest-priced item, or average? This directly changes the discount amount. I chose qualifying SKU price (most intuitive).

Each of these decisions has a direct financial impact. Rather than letting implementation assumptions define behavior implicitly, I documented each one in [`assumptions-and-tradeoffs.md`](./assumptions-and-tradeoffs.md) and wrote concrete ATDD-style scenarios that serve as a shared contract between Product, Engineering, and QA.

This approach catches requirement defects before they become code defects — which is where shift-left testing delivers the highest ROI.

---

## During Development — Layered Validation Strategy

During implementation, I approach testing in layers based on business risk, feedback speed, and long-term maintainability.

### 1. Unit-Level Validation

I started with isolated validation of the pricing and discount-selection logic, including:
- volume discount calculations
- threshold evaluation
- promo vs volume discount selection
- rounding behavior
- subtotal recalculation

These tests provide fast feedback and validate business-critical pricing logic independently from the UI layer.

Because checkout pricing is a revenue-impacting workflow, I prioritized deterministic validation of the underlying calculation logic before expanding into UI coverage.

---

### 2. Integration / Contract Validation

As the checkout flow stabilized, I validated the interaction between the frontend and mocked checkout APIs using Playwright route interception and mocked responses.

This layer helps catch issues such as:
- schema mismatches
- missing pricing fields
- contract regressions
- stale pricing data
- asynchronous recalculation issues

before full UI integration is complete.

I intentionally used mocked/config-driven responses to simulate how admin-managed discount configurations could impact checkout behavior without requiring a fully implemented backend service.

---

### 3. End-to-End Checkout Coverage

Once the pricing flows were stable, I added targeted Playwright end-to-end coverage focused on the highest-risk user journeys:
- quantity updates
- automatic discount application
- promo code conflicts
- async checkout recalculation
- cart total rendering
- discount removal after cart modification

I intentionally kept E2E coverage focused and deterministic. While broad UI coverage can provide confidence, these tests are also the most expensive to maintain and most susceptible to flaky behavior if overused.

My goal was to prioritize high-value checkout scenarios rather than maximize test count.

---

## Pre-Release — Regression & Operational Readiness

Before release, my focus shifts from feature implementation validation to regression prevention and operational readiness.

Key validation areas include:
- existing promo code behavior
- standard checkout flows without discounts
- tax calculation ordering
- cart persistence across sessions
- async recalculation stability
- stale cart handling
- rollback behavior behind feature flags

For a checkout feature, regression coverage is especially important because even small pricing inconsistencies can impact customer trust, payment integrity, and reporting accuracy.

I would also recommend validating observability and monitoring readiness prior to launch, including:
- checkout error rates
- discount application metrics
- average order value shifts
- failed recalculation events

This helps the team quickly detect unexpected production behavior after release.

---

## Handling UAC Failures at Different Stages

### During Development

If a test fails against the UAC during development, my first step is classifying the root cause:

| Classification | Action | Example from this project |
|---|---|---|
| Implementation defect | File bug, block merge | `selectBestDiscount()` applies volume when promo is higher |
| Undefined business rule | Escalate to Product with concrete scenario | "What happens at qty=6? Is it 1 free item or 1.2?" |
| Requirement ambiguity | Document assumption, write test, get sign-off | Tie-breaking rule (promo wins on equal savings) |

For checkout pricing, many apparent "bugs" are actually undefined business rules. The cost of misclassification is high — treating an ambiguity as a defect wastes engineering time; treating a real defect as an ambiguity lets it ship.

I bring Product and Engineering together with a concrete pricing scenario showing expected vs. actual behavior and customer impact — not just a failing test ID.

---

### During QA / Staging

At the staging phase, UAC failures are treated as production-risk defects. I document:

- **Reproduction steps** with exact cart configuration and quantities
- **Expected vs. actual** pricing breakdown (subtotal, discount, total)
- **Playwright trace** attached for deterministic reproduction
- **Severity classification** — pricing errors are release blockers by default
- **Business impact** — framed in revenue terms, not just technical terms

Revenue-impacting pricing issues are never deferred. A $1 overcharge at scale is a financial and trust liability.

---

### Post-Release

If an issue is discovered in production, my first priority is reproducing the failure with an automated test to establish a permanent regression safeguard.

From there, I work with Engineering to determine whether the issue is:
- a regression
- a configuration issue
- an uncovered edge case
- or an operational/environmental failure

The resulting automated test remains part of the regression suite to prevent recurrence.

---

# 3b. Significant Risks and Communication Strategy

## Risk 1 — Pricing Calculation Accuracy (P0 / Critical)

**What breaks:** Displayed checkout total ≠ charged amount. A customer sees $400, gets charged $500.

**Why it's highest priority:** This is a direct revenue and trust issue. For a health diagnostics company like Everlywell, pricing errors also risk regulatory and compliance scrutiny — customers purchasing medical test kits expect billing accuracy.

**Root causes:**
- Floating-point arithmetic (e.g., `0.1 + 0.2 ≠ 0.3` in JavaScript)
- Discount applied after tax instead of before
- Rounding applied inconsistently across calculation steps

**Mitigations implemented:**
- `roundCurrency()` utility with epsilon-corrected rounding (`EC-01`)
- Centralized discount selection in `selectBestDiscount()` — single decision point, no fragmentation
- Unit tests validate calculation correctness independent of UI rendering

**How I'd communicate this:** As a P0 business-risk item in sprint planning and release readiness. Framed in financial terms: *"A 1-cent rounding error across 10K daily orders = $100/day systematic revenue discrepancy that compounds in financial reconciliation."*

---

## Risk 2 — Async Checkout Race Conditions (P0 / High)

**What breaks:** User clicks "Place Order" while checkout is mid-recalculation. Backend charges $745, but the UI showed $596.

**Why it matters:** This is a payment integrity issue. The customer disputes the charge, support escalates, and the company absorbs the cost. At volume, this creates a measurable support cost center.

**Mitigations implemented:**
- `EC-05` validates that assertions wait for async recalculation to complete (1.5s simulated latency)
- `EC-04` validates rapid quantity changes settle to correct final state
- All UI assertions use `expect.poll()` — never `waitForTimeout()`

**Recommendations for production:**
- Disable the "Place Order" button during recalculation (loading state)
- Backend validates cart totals server-side before charging — frontend total is advisory only
- Log discrepancies between frontend-displayed and backend-calculated totals as a monitoring signal

---

## Risk 3 — Double Discounting / Revenue Leakage (P1 / High)

**What breaks:** A customer gets both the volume discount ($149 off) *and* a promo code ($200 off) applied simultaneously. Total discount: $349 instead of $200.

**Why it matters:** This is direct, measurable revenue loss. If discount selection logic is fragmented across frontend and backend, stacking becomes possible through edge cases — especially during cart modifications that trigger multiple recalculation events.

**Mitigations implemented:**
- `selectBestDiscount()` is a single, centralized decision function — mutually exclusive by design
- `TC-07` and `TC-08` validate correct winner selection in both directions
- `TC-11` validates that duplicate promo submissions don't double-apply
- Tie-breaking rule is documented and tested (`EC-03`)

**How I'd communicate this:** In a pre-launch risk review with Engineering and Finance. Framed as: *"If this logic has a gap, it's not a UX issue — it's a revenue leakage issue that compounds silently until someone notices in monthly reconciliation."*

---