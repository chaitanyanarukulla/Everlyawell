# Short-Response Answers

**Submitted by:** Chai Narukulla  
**Feature:** Volume-Based Checkout Discount

# 1. Use AI coding tools to assist in different aspects of this project. Include a brief note on which tools you
used, what you delegated vs. wrote yourself, and one example where you had to correct or override
the AI's output.

For this project, I used AI-assisted development tools primarily to accelerate implementation, improve code quality, and validate edge cases while still maintaining full ownership of the architecture and final decisions.

The main tools I used were [ChatGPT](https://chatgpt.com?utm_source=chatgpt.com) and [GitHub Copilot](https://github.com/features/copilot?utm_source=chatgpt.com). I delegated repetitive or low-level tasks to AI, such as:

* generating boilerplate functions,
* suggesting data transformation patterns,
* drafting unit test cases,
* improving code readability,
* and identifying potential edge cases.

I worked on the implementation design, data modeling decisions, validation strategy, and final refactoring myself. I also reviewed all AI-generated code before integrating it to ensure correctness, maintainability, and alignment with the project requirements.

One example where I had to correct the AI’s output was during aggregation and validation logic for semi-structured input data. The AI initially generated a solution that assumed all records contained valid numeric fields and required keys. In practice, the dataset could contain malformed or incomplete entries, which would have caused runtime exceptions and inaccurate summaries. I modified the implementation to defensively handle missing fields, validate data types, skip invalid records safely, and normalize inconsistent input values. I also simplified portions of the generated code to improve readability and reduce unnecessary complexity.

Overall, I used AI as a productivity and collaboration tool rather than as a replacement for engineering judgment. My focus was on leveraging AI to speed up iteration while ensuring the final implementation remained reliable, testable, and production-quality.

# 2. Create an automated test suite for the most critical or risk-prone functionality related to this feature.

The automated test suite is organized across three spec files, each targeting a distinct risk area:

- [`tests/checkout-volume-discount.spec.ts`](./tests/checkout-volume-discount.spec.ts) — Core volume discount calculations (TC-01 through TC-06)
- [`tests/promo-conflict.spec.ts`](./tests/promo-conflict.spec.ts) — Promo code vs. volume discount conflict resolution (TC-07 through TC-11)
- [`tests/edge-cases.spec.ts`](./tests/edge-cases.spec.ts) — Boundary values, async behavior, and unit-level pricing validation (EC-01 through EC-07)

Shared test utilities are in [`tests/test-helpers.ts`](./tests/test-helpers.ts). Business logic under test lives in [`utils/discount-helper.ts`](./utils/discount-helper.ts) and [`utils/pricing-calculator.ts`](./utils/pricing-calculator.ts).

The API contract used by all tests is documented in [`api-contract.md`](./api-contract.md).


# 3a. Testing Approach Across the Development Lifecycle

## Early Development — Shift-Left Collaboration

My involvement begins before implementation starts. For this project, I intentionally spent a significant portion of my time upfront understanding the business problem, identifying ambiguity in the requirements, and clarifying assumptions before building automation.

During the discovery phase, I identified several areas that could significantly impact pricing behavior, customer experience, and downstream implementation decisions. I reached out to the team for clarification while also documenting the assumptions I would make where ambiguity intentionally remained.

Some of the key questions included:
- What qualifies as the “same product” — identical SKU, product family, or category?
- How should ties be handled when a promo code and volume discount produce equal savings?
- How should the “free” item be calculated — qualifying SKU price, lowest-priced item, or another pricing rule?

These decisions directly influence:
- discount eligibility
- pricing calculations
- edge-case behavior
- checkout consistency
- customer expectations

In a production environment, unclear pricing behavior creates a high risk of revenue-impacting defects and inconsistent customer experiences. Rather than allowing implementation assumptions to define behavior implicitly, I prefer aligning Product, Engineering, and QA early through concrete examples and lightweight ATDD-style scenarios.

This creates a shared contract between teams before implementation begins and significantly reduces downstream rework.

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

If a test fails against the UAC during development, my first step is determining whether the issue is:
- a true implementation defect
- an undefined business rule
- or a requirement ambiguity

For pricing systems specifically, many “bugs” originate from unclear business behavior rather than incorrect engineering implementation.

In these cases, I bring Product and Engineering together with:
- a reproducible scenario
- concrete pricing examples
- expected vs actual behavior
- customer impact analysis

Once alignment is reached, I update both the automated coverage and the documented assumptions to ensure future consistency.

---

### During QA / Staging

At the staging phase, UAC failures are treated as production-risk defects.

I document:
- reproduction steps
- expected vs actual behavior
- screenshots/traces
- impacted user flows
- severity classification
- business impact

Revenue-impacting pricing issues are treated as release blockers due to their direct financial and customer trust implications.

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

## Risk 1 — Pricing Calculation Accuracy (Critical)

The highest-risk area for this feature is incorrect monetary calculation behavior.

Checkout systems are highly sensitive to:
- floating-point rounding
- calculation ordering
- discount precedence
- tax application timing
- subtotal recalculation

Even small inconsistencies between displayed totals and charged totals can create:
- customer trust issues
- accounting discrepancies
- support escalations
- financial reconciliation problems

To reduce this risk, I would recommend:
- integer-cent calculations instead of floating-point math
- deterministic rounding rules
- centralized pricing calculation logic
- independent validation utilities for expected totals

I would communicate this early as a P0 business-risk concern due to its direct impact on revenue and payment integrity.

---

## Risk 2 — Async Checkout Race Conditions (High)

Checkout recalculation is asynchronous, which creates the risk that users could submit orders while pricing is still updating.

This introduces the possibility of mismatches between:
- displayed totals
- backend-calculated totals
- charged amounts

My recommendation would be:
- disable checkout submission during recalculation
- display clear loading states
- validate recalculation completion before order placement
- ensure backend pricing remains the source of truth

The automation suite specifically validates async recalculation behavior using polling-based assertions to better simulate real-world timing conditions and reduce flaky test behavior.

---

## Risk 3 — Double Discounting / Revenue Leakage (High)

The interaction between promo codes and automatic volume discounts introduces another major risk surface.

If discount-selection logic is fragmented across multiple layers, there is potential for:
- stacked discounts
- inconsistent pricing behavior
- duplicate discount application
- direct revenue leakage

To reduce this risk, I would strongly recommend maintaining a single centralized discount-selection decision point shared across checkout flows.

I would validate this behavior through:
- integration-level testing
- edge-case pricing scenarios
- simultaneous discount application attempts
- regression coverage around discount precedence logic

From a communication standpoint, I would frame this not only as a technical concern, but as a measurable business-risk scenario with direct financial implications.

---