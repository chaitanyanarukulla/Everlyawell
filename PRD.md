# Product Requirements Document (PRD)

# Feature: Volume-Based Checkout Discount

**Author:** Chai Narukulla  
**Date:** May 2026  
**Status:** Draft  
**Product Area:** Checkout / Promotions / Pricing Engine

---

# 1. Overview

## Objective

Introduce a configurable volume-based discount system that automatically applies discounts during checkout when customers purchase qualifying quantities of the same product.

The feature is intended to:
- increase average order value (AOV)
- incentivize bulk purchases
- improve customer retention
- support configurable promotional campaigns without Engineering involvement

The checkout system must automatically determine and apply the best available discount for the customer while maintaining pricing accuracy, payment integrity, and operational stability.

---

# 2. Business Problem

Currently, checkout pricing does not support configurable quantity-based incentives.

As a result:
- customers lack incentives to purchase larger quantities
- marketing and operations teams depend on Engineering to modify discount rules
- promotional campaigns require longer delivery cycles
- pricing experimentation is limited

This feature enables configurable volume-based discounts managed through admin-controlled configurations while preserving a stable and deterministic checkout experience.

---

# 3. Goals

## Business Goals
- Increase average order value (AOV)
- Encourage multi-kit purchases
- Reduce engineering dependency for pricing campaigns
- Improve promotional flexibility
- Support future discount extensibility

## User Goals
- Automatically receive savings for qualifying purchases
- Clearly understand why discounts are applied
- Receive the best available discount without manual comparison
- Maintain trust in checkout pricing accuracy

## Engineering / QA Goals
- Ensure deterministic pricing behavior
- Prevent double-discounting
- Maintain checkout performance
- Reduce regression risk
- Support feature flag rollout and rollback

---

# 4. Non-Goals

The following are explicitly out of scope for this release:
- Loyalty/rewards programs
- Multi-currency support
- Subscription pricing discounts
- Dynamic AI-generated promotions
- Cross-category bundle discounts
- Personalized discount recommendations
- Real-time experimentation platform integration

---

# 5. User Story

## Primary User Story

As a buyer, I want to receive a discount when purchasing 5 or more of the same product so that I am incentivized to purchase additional items.

---

# 6. Assumptions

The following assumptions were made due to intentionally ambiguous requirements:

| Area | Assumption |
|---|---|
| Product Qualification | Discount applies only to identical SKUs |
| Threshold Logic | Buy 5 items = 1 item free |
| Scaling | Buy 10 = 2 free items |
| Discount Selection | Discounts are mutually exclusive |
| Best Discount Logic | Highest savings is automatically selected |
| Tax Behavior | Discounts apply before tax |
| Shipping | Shipping is not discounted |
| Config Management | Admin-managed via configuration service |
| Backend Pricing | Backend remains source of truth |

---

# 7. Functional Requirements

# 7.1 Volume Discount Eligibility

The system shall:
- detect qualifying quantities of identical SKUs
- automatically apply volume discounts during checkout
- dynamically recalculate totals when cart quantities change

### Qualification Rules
| Quantity | Discount |
|---|---|
| < 5 | No discount |
| 5–9 | 1 item free |
| 10–14 | 2 items free |
| 15–19 | 3 items free |

### Example
| Quantity | Unit Price | Discount | Final Total |
|---|---|---|---|
| 5 | $50 | -$50 | $200 |
| 10 | $50 | -$100 | $400 |

---

# 7.2 Promotion Conflict Resolution

If multiple discount types are available:
- the system shall compare total savings
- only the highest-value discount shall be applied
- discounts shall not stack

### Example
| Discount Type | Savings |
|---|---|
| Volume Discount | $40 |
| Promo Code | $25 |

Expected Result:
- Apply Volume Discount only

---

# 7.3 Dynamic Cart Recalculation

The checkout system shall:
- recalculate totals asynchronously after cart modifications
- update discount eligibility in real time
- remove discounts immediately when qualification thresholds are no longer met

### Cart Events
- quantity increase
- quantity decrease
- product removal
- promo code application
- promo code removal

---

# 7.4 Admin Configuration

Discount rules shall be configurable without Engineering deployment.

### Configurable Fields
| Field | Description |
|---|---|
| enabled | Feature toggle |
| skuScope | Eligible SKU list |
| thresholdQuantity | Minimum quantity |
| discountType | Free item / percentage |
| maxApplications | Max times discount applies |
| startDate | Campaign start |
| endDate | Campaign expiration |

### Example Config
```json
{
  "enabled": true,
  "thresholdQuantity": 5,
  "discountType": "FREE_ITEM",
  "maxApplications": 3
}