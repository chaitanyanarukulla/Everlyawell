```text
You are acting as a Senior AI-First QA Engineer building a realistic take-home project for Everlywell.

Your goal is NOT to over-engineer the solution.
Your goal IS to demonstrate:
- risk-based QA thinking
- layered testing strategy
- business-critical validation
- maintainable automation
- AI-assisted engineering workflow
- clear assumptions/tradeoff documentation
- senior-level communication

==================================================
PROJECT CONTEXT
==================================================

Business Scenario:
Update the current checkout process to automatically apply volume-based discounts. Admins should be able to maintain discount configurations without Engineering involvement.

User Story:
As a buyer, I want to get a discount when I purchase 5 items of the same product so that I'm incentivized to buy more.

UAC:
- Given my cart contains at least 5 tests/kits
- When I go to checkout
- Then I should see an automatic discount applied equal to the total of 1 test
- If I manually apply a promotion code, the higher savings should be applied
- Only the best discount should be applied (assume mutually exclusive discounts)

==================================================
IMPORTANT INSTRUCTIONS
==================================================

DO NOT:
- overbuild architecture
- create unnecessary frameworks
- create excessive abstractions
- create dozens of tests
- spend time on styling
- implement real backend services
- implement real admin UI

DO:
- focus on highest-risk business logic
- prioritize checkout calculation accuracy
- include edge-case coverage
- demonstrate layered testing
- document assumptions clearly
- show stable Playwright testing practices
- include AI usage documentation
- optimize for clarity and maintainability

==================================================
TECH STACK
==================================================

Use:
- Playwright
- TypeScript
- Node.js
- Mocked/stubbed API responses
- Simple helper utilities

==================================================
EXPECTED PROJECT STRUCTURE
==================================================

Create this structure:

everlywell-ai-first-qa-project/
│
├── README.md
├── assumptions-and-tradeoffs.md
├── test-plan.md
├── short-response-answers.md
│
├── mocks/
│   ├── cart-data.json
│   ├── discount-config.json
│
├── tests/
│   ├── checkout-volume-discount.spec.ts
│   ├── promo-conflict.spec.ts
│   ├── edge-cases.spec.ts
│
├── utils/
│   ├── pricing-calculator.ts
│   ├── discount-helper.ts
│
├── playwright.config.ts
├── package.json
└── tsconfig.json

==================================================
ASSUMPTIONS TO IMPLEMENT
==================================================

Implement these assumptions consistently:

1. Volume discount applies ONLY to identical SKUs
2. Buy 5 items = get 1 item free
3. Buy 10 items = get 2 items free
4. Discounts are mutually exclusive
5. System applies whichever discount gives higher savings
6. Discounts apply before tax
7. Shipping is not discounted
8. Admin configuration is mocked via JSON config
9. Checkout recalculation is asynchronous
10. UI should update dynamically when quantities change

==================================================
REQUIRED DOCUMENTATION
==================================================

Generate strong markdown documentation.

==================================================
README.md
==================================================

Include:
- project overview
- assumptions summary
- setup instructions
- test strategy overview
- AI usage section
- tradeoffs/prioritization section

==================================================
assumptions-and-tradeoffs.md
==================================================

Document:
- SKU vs category assumption
- mutually exclusive discount logic
- repeated threshold behavior
- tax/shipping assumptions
- mocked admin configuration
- why certain edge cases were prioritized
- what was intentionally NOT implemented due to time constraints

Use strong reasoning language:
- “highest-risk surface area”
- “business-critical pricing logic”
- “tradeoff”
- “deterministic behavior”
- “maintainability”

==================================================
test-plan.md
==================================================

Include:
- testing pyramid/layered approach
- unit vs integration vs UI validation
- risk-based prioritization
- regression scope
- observability recommendations
- monitoring suggestions post-release
- flaky test mitigation strategy

==================================================
short-response-answers.md
==================================================

Answer all required project questions in detail.

Topics to emphasize:
- shift-left testing
- ATDD
- cross-functional collaboration
- risk communication
- feature flags
- rollback strategy
- payment integrity
- checkout regression coverage
- impact analysis
- prioritization under time constraints
- data-driven launch decisions

==================================================
PLAYWRIGHT IMPLEMENTATION REQUIREMENTS
==================================================

Build stable and realistic Playwright tests.

Use:
- page.locator()
- expect.poll() where appropriate
- async-safe assertions
- mocked API responses
- reusable helper functions

Avoid flaky patterns.

==================================================
REQUIRED TEST CASES
==================================================

1. Volume discount applies at 5 items
2. No discount below threshold
3. Buy 10 items applies 2 free items
4. Promo code vs volume discount comparison
5. Higher discount always wins
6. Cart quantity updates recalculate totals
7. Removing items removes discount
8. Mixed SKU carts do not qualify
9. Invalid promo code handling
10. Async recalculation stability

==================================================
EDGE CASES
==================================================

Add at least some validation/documentation for:
- decimal rounding
- rapid quantity changes
- stale cart state
- duplicate promo submissions
- asynchronous checkout recalculation
- configuration-driven discount changes

==================================================
MOCK DATA REQUIREMENTS
==================================================

Create realistic mock data:
- products
- cart totals
- discount config
- promo codes

Keep mocks simple and readable.

==================================================
AI USAGE SECTION
==================================================

This section is VERY IMPORTANT.

Include:
- tools used (ChatGPT, Copilot, Cursor/Antigravity)
- what was delegated to AI
- what required human judgment
- one example where AI-generated output was corrected/refactored

Use this example:
AI initially generated synchronous assertions for checkout total updates. These were replaced with polling/wait-based assertions to better reflect asynchronous recalculation behavior and reduce flaky test risk.

==================================================
QUALITY EXPECTATIONS
==================================================

The code should feel:
- realistic
- readable
- maintainable
- senior-level
- pragmatic

Do NOT optimize for quantity.
Optimize for:
- thoughtful risk coverage
- business logic validation
- communication quality
- maintainability
- prioritization

==================================================
FINAL GOAL
==================================================

Produce a polished take-home assignment that demonstrates:
- AI-first QA engineering maturity
- strong testing strategy
- business-risk awareness
- stable automation practices
- leadership-level communication
- thoughtful engineering judgment
```
