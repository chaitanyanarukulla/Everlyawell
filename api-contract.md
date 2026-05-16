# API Contract — Checkout Discount System

**Feature:** Volume-Based Discount at Checkout  
**Version:** 1.0  
**Last Updated:** May 2026

> This document defines the API contract between the checkout frontend and the backend pricing service. All Playwright tests in this project validate against this contract using mocked responses via `page.route()`.

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/checkout/calculate` | Calculate cart totals with applicable discounts |
| `POST` | `/api/promo/validate` | Validate a promo code before applying |
| `GET`  | `/api/discount-config` | Retrieve current admin-managed discount configuration |

---

## 1. POST `/api/checkout/calculate`

Calculates the cart total, evaluates volume discount eligibility, and resolves discount conflicts.

### Request

```json
{
  "cartId": "cart-002",
  "items": [
    {
      "sku": "EW-STI-001",
      "quantity": 5,
      "unitPrice": 149.00
    }
  ],
  "promoCode": "SAVE200"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cartId` | `string` | Yes | Unique cart identifier |
| `items` | `CartItem[]` | Yes | Array of line items in the cart |
| `items[].sku` | `string` | Yes | Product SKU — volume discount is evaluated per unique SKU |
| `items[].quantity` | `integer` | Yes | Quantity of this SKU in the cart |
| `items[].unitPrice` | `number` | Yes | Unit price in USD (2 decimal places) |
| `promoCode` | `string` | No | Promo code to evaluate alongside volume discount |

### Response — `200 OK`

```json
{
  "cartId": "cart-002",
  "items": [
    {
      "sku": "EW-STI-001",
      "quantity": 5,
      "unitPrice": 149.00
    }
  ],
  "subtotal": 745.00,
  "volumeDiscount": 149.00,
  "promoDiscount": 200.00,
  "promoCode": "SAVE200",
  "discountApplied": 200.00,
  "discountLabel": "",
  "discountSource": "promo",
  "promoNotBest": false,
  "total": 545.00
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cartId` | `string` | Echo of the request cart ID |
| `items` | `CartItem[]` | Echo of the cart items |
| `subtotal` | `number` | Pre-discount subtotal (`sum of quantity × unitPrice`) |
| `volumeDiscount` | `number` | Calculated volume discount amount (may not be the applied discount) |
| `promoDiscount` | `number` | Calculated promo discount amount (may not be the applied discount) |
| `promoCode` | `string` | The promo code evaluated, if any |
| `discountApplied` | `number` | **The winning discount amount** — the one actually applied to the order |
| `discountLabel` | `string` | Display label for volume discounts (e.g., `"Buy 5 Get 1 Free"`). Empty when promo wins. |
| `discountSource` | `enum` | Which discount was applied: `"volume"`, `"promo"`, or `"none"` |
| `promoNotBest` | `boolean` | `true` when a valid promo was submitted but volume discount provided higher savings |
| `total` | `number` | Final order total: `subtotal - discountApplied` |

### Discount Resolution Rules

```
IF promoDiscount >= volumeDiscount AND promoDiscount > 0:
    discountSource = "promo"
    discountApplied = promoDiscount
ELSE IF volumeDiscount > 0:
    discountSource = "volume"
    discountApplied = volumeDiscount
ELSE:
    discountSource = "none"
    discountApplied = 0
```

> **Tie-breaking:** When `promoDiscount == volumeDiscount`, promo wins. A customer who deliberately enters a promo code should have that action honored.

### Response Scenarios

| Scenario | `discountApplied` | `discountSource` | `promoNotBest` |
|----------|-------------------|-------------------|----------------|
| Below threshold, no promo | `0` | `"none"` | `false` |
| At threshold (qty 5), no promo | `149.00` | `"volume"` | `false` |
| At threshold (qty 10), no promo | `298.00` | `"volume"` | `false` |
| Promo ($200) > volume ($149) | `200.00` | `"promo"` | `false` |
| Volume ($149) > promo ($100) | `149.00` | `"volume"` | `true` |
| Mixed SKUs, no single SKU ≥ 5 | `0` | `"none"` | `false` |

---

## 2. POST `/api/promo/validate`

Validates a promo code before the checkout calculation applies it. Called by the frontend when the user clicks "Apply".

### Request

```json
{
  "code": "SAVE200"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | Yes | The promo code entered by the user |

### Response — `200 OK` (Valid Promo)

```json
{
  "valid": true
}
```

### Response — `422 Unprocessable Entity` (Invalid Promo)

```json
{
  "error": "INVALID_PROMO",
  "message": "Promo code not found or expired."
}
```

### Response — `410 Gone` (Expired Promo)

```json
{
  "error": "PROMO_EXPIRED",
  "message": "This promo code has expired."
}
```

| Status | Meaning | Frontend Behavior |
|--------|---------|-------------------|
| `200` | Promo is valid | Proceed to recalculate cart via `/api/checkout/calculate` |
| `422` | Promo code not recognized | Show error message; preserve existing discount |
| `410` | Promo code expired | Show expiration message; preserve existing discount |

> **Important:** A `200` from `/api/promo/validate` does not mean the promo will be applied. The promo is only applied if it produces higher savings than the volume discount. The `/api/checkout/calculate` endpoint makes that determination.

---

## 3. GET `/api/discount-config`

Returns the current admin-managed discount configuration. Used by the frontend to display tier information and by the backend to evaluate volume discounts.

### Response — `200 OK`

```json
{
  "volumeDiscounts": [
    {
      "id": "volume-5",
      "label": "Buy 5 Get 1 Free",
      "minQuantity": 5,
      "freeItemCount": 1,
      "scope": "per-sku",
      "active": true,
      "description": "When a customer adds 5 or more of the same SKU, 1 item is discounted at 100%"
    },
    {
      "id": "volume-10",
      "label": "Buy 10 Get 2 Free",
      "minQuantity": 10,
      "freeItemCount": 2,
      "scope": "per-sku",
      "active": true,
      "description": "When a customer adds 10 or more of the same SKU, 2 items are discounted at 100%"
    }
  ],
  "rules": {
    "discountMutualExclusivity": true,
    "applyHighestDiscount": true,
    "discountAppliedBeforeTax": true,
    "shippingExcluded": true,
    "stackingAllowed": false
  },
  "taxRate": 0.0875,
  "shipping": {
    "flatRate": 9.99,
    "freeShippingThreshold": 150.00,
    "discountable": false
  }
}
```

### Volume Discount Tier Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique tier identifier |
| `label` | `string` | Customer-facing label |
| `minQuantity` | `integer` | Minimum qualifying quantity of a single SKU |
| `freeItemCount` | `integer` | Number of free items awarded at this tier |
| `scope` | `enum` | Discount scope: `"per-sku"` (only option currently) |
| `active` | `boolean` | Whether this tier is currently enabled |
| `description` | `string` | Admin-facing description |

### Rules Schema

| Field | Type | Description |
|-------|------|-------------|
| `discountMutualExclusivity` | `boolean` | Only one discount type can be applied per order |
| `applyHighestDiscount` | `boolean` | System selects the discount with highest savings |
| `discountAppliedBeforeTax` | `boolean` | Discount is subtracted before tax calculation |
| `shippingExcluded` | `boolean` | Shipping cost is not affected by discounts |
| `stackingAllowed` | `boolean` | Whether multiple discounts can stack (must be `false`) |

---

## Test Coverage by Endpoint

| Endpoint | Test IDs | What's Validated |
|----------|----------|------------------|
| `POST /api/checkout/calculate` | TC-01–TC-06, EC-04–EC-07 | All cart calculation scenarios, async behavior, config changes |
| `POST /api/promo/validate` | TC-07–TC-11 | Valid, invalid, expired promos; idempotent duplicate submission |
| `GET /api/discount-config` | EC-07 | Config-driven tier changes without code deploy |

---

## Error Handling Contract

| Scenario | HTTP Status | Error Code | Frontend Behavior |
|----------|-------------|------------|-------------------|
| Valid promo code | `200` | — | Recalculate cart |
| Unknown promo code | `422` | `INVALID_PROMO` | Show error, preserve existing discount |
| Expired promo code | `410` | `PROMO_EXPIRED` | Show expiration message, preserve existing discount |
| Network failure | `5xx` / timeout | — | Show generic error, preserve existing discount |
| Empty promo input | — | — | No API call (client-side guard) |
| Duplicate promo submit | — | — | No API call (idempotent guard via `appliedPromo` variable) |
