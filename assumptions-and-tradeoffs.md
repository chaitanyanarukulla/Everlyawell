# Assumptions & Tradeoffs

> This document captures every meaningful decision made during this take-home project: why I made it, what I considered, and what I intentionally left out. 

---

## 1. SKU-Level Discount Scope (vs. Category-Level)

**Decision:** Volume discount applies only when 5+ items share the **exact same SKU**.

**Reasoning:**  
The UAC states "5 tests/kits of the same product." "Same product" is ambiguous — it could mean same SKU, same category, or same product family. I chose SKU-level because it is the most deterministic behavior: categories can have sub-categories, naming conventions drift, and product hierarchies change. SKU is an immutable, system-assigned identifier.

**Risk if wrong:** If the business intends category-level discounts, the current implementation would undercount eligible carts (false negatives — customer doesn't get a discount they should). This would be surfaced immediately in UAT.

**Tradeoff:** Choosing the more conservative interpretation. Lower revenue leakage risk than over-applying discounts.

---

## 2. Mutually Exclusive Discount Logic

**Decision:** Discounts do not stack. Only the highest-savings discount is applied.

**Reasoning:**  
The UAC explicitly states "only the best discount should be applied (mutually exclusive discounts)." This is the highest-risk business logic surface area in the entire feature — double discounting is a direct revenue loss. I implemented this in a dedicated `selectBestDiscount()` utility to make the rule explicit, testable, and impossible to accidentally circumvent.

**Tie-breaking rule:** When promo and volume discounts are equal, promo wins. This is not in the UAC — I made a judgment call. A customer who deliberately enters a promo code should have that action honored. It's the more customer-positive UX decision and easy to reverse if needed.

---

## 3. Threshold Behavior — What Happens at 6, 7, 8, 9 Items?

**Decision:** Quantity 5–9 triggers the "Buy 5 Get 1 Free" tier. Quantity 10+ triggers "Buy 10 Get 2 Free." Quantities between thresholds don't partially scale.

**Reasoning:**  
The UAC defines two discrete tiers. The system does not interpolate between them. `calculateVolumeDiscount()` evaluates tiers in descending order of `minQuantity`, returning the first match. Quantities 6–9 match the 5-tier. This is the most intuitive customer interpretation of "buy 5 get 1 free."

**Edge case documented:** A cart with quantity 6 of the same SKU applies a $149 discount (1 free item), not $178.80 (1.2 free items). This is tested in `EC-02`.

---

## 4. Tax & Shipping Assumptions

**Decision:**
- Tax rate: 8.75% applied to post-discount, pre-shipping subtotal
- Shipping: $9.99 flat rate; free on orders ≥ $150 (post-discount subtotal)
- Shipping is NOT discounted under any discount scenario

**Reasoning:**  
Standard e-commerce pricing architecture. Tax on discounted price is the legally correct approach in most US jurisdictions. Applying discounts to shipping would be an unexpected revenue variable that product didn't ask for and that customers don't typically expect.

**What I didn't test:** Tax calculation per jurisdiction (would require a real tax service like Avalara). This is acknowledged as out of scope.

---

## 5. Admin Configuration via Mocked JSON

**Decision:** Discount tiers are read from `mocks/discount-config.json`, not hardcoded constants.

**Reasoning:**  
The user story says "Admins should be able to maintain discount configurations without Engineering involvement." If I hardcoded discount thresholds, every admin change would require a code deploy. Externalizing to JSON validates the config-driven architecture. The `EC-07` edge case test specifically validates that a config change propagates without a code change.

**Tradeoff:** In production, this config would live in a database or feature flag system (LaunchDarkly, Statsig, etc.) with access controls. The JSON mock is a stand-in that validates the architectural intent.

---

## 6. Why These Edge Cases Were Prioritized

| Edge Case | Priority Rationale |
|-----------|-------------------|
| Decimal rounding (`EC-01`) | Financial calculations with floating-point math are a classic source of silent correctness bugs |
| Rapid quantity changes (`EC-04`) | A race condition here causes the displayed total to diverge from the charged amount — a payment integrity issue |
| Async recalculation (`EC-05`) | Checkout UIs notoriously fail here: user sees $X, backend charges $Y due to timing |
| Stale cart state (`EC-06`) | Critical on web — localStorage persistence across sessions can corrupt discount state |
| Config-driven change (`EC-07`) | Validates the admin self-serve promise without a production deploy |

---

## 7. What Was Intentionally NOT Implemented

| Omitted Item | Reason |
|-------------|--------|
| Real checkout UI / HTML page | The test value is in API contract and discount logic, not rendering |
| Page Object Model | YAGNI at this scale — adds maintenance surface area without signal |
| Full tax jurisdiction testing | Requires a tax service (Avalara/TaxJar) — out of scope for this take-home |
| Backend service | Deliberately mocked — testing the contract, not the infrastructure |
| Admin UI | Mocked via JSON config — validates config-driven behavior without the UI overhead |
| Internationalization/currency | USD-only assumption; adding currencies would require significant design investment |
| Load/performance testing | Outside the scope of this feature's risk profile at launch |
| 100% branch coverage goal | Coverage as a metric incentivizes the wrong behavior. Risk-based prioritization is more valuable |

---

## 8. Flaky Test Risk Mitigation

All UI assertions use `expect.poll()` rather than `expect().toHaveText()` for values that depend on asynchronous API calls. This is a deliberate architectural decision:

- `expect.poll()` retries the assertion on a configurable interval up to a timeout
- It models the real async nature of checkout recalculation
- It eliminates the need for `page.waitForResponse()` wired to specific URL patterns (brittle)
- It eliminates artificial `page.waitForTimeout()` calls (a flakiness antipattern)

The tradeoff is slightly slower test execution on happy paths (up to the poll interval). This is acceptable given the stability gain.
