<!-- c1b73982-eb0d-4c83-8409-ae4cf9e78e53 20878cb7-8bed-4397-8b2b-b1df87bf745f -->
# Update Global Discount Promo Creation and Product Editor Discount UI

## Overview

This plan addresses three main areas:

1. **Global Discount Promo Creation**: Modify to create separate promos per product (with product_id) and one promo for all checkout-only plans
2. **Product Editor PRODUCT DISCOUNT**: Update UI to conditionally show fields, filter promos by plan/product, and sync promo dropdown based on selected scope
3. **Plans Table Optimization**: Add `promoIds` field to `plans` table to store promo IDs for efficient queries

## Changes Required

### 1. Add PromoIds Field to Plans Table

**File:** `lib/supabase/schema.ts`

**Location:** `plans` table definition (around line 270)

**Change:** Add new field:

```typescript
promoIds: jsonb("promo_ids"), // Array of whop_promo_id values that apply to this plan
```

**File:** `drizzle/YYYYMMDDHHMMSS_add_promo_ids_to_plans.sql` (NEW MIGRATION)

**Migration SQL:**

```sql
-- Add promo_ids column to plans table
ALTER TABLE plans ADD COLUMN promo_ids JSONB;

-- Create index for efficient JSONB queries
CREATE INDEX plans_promo_ids_idx ON plans USING GIN (promo_ids);
```

### 2. Update Global Discount Promo Creation Logic

**File:** `lib/actions/seasonal-discount-actions.ts`

**Function:** `createPromoCodeForSeasonalDiscount`

**Current Behavior:** Creates one promo for all plans (no product_id)

**New Behavior:**

- Group plans by product:
  - Plans with `whopProductId` → Group by `whopProductId`, create one promo per product (with `product_id` set)
  - Plans without `whopProductId` but with `checkoutConfigurationId` → Create one promo for all checkout-only plans (no `product_id`, all `plan_ids`)
- After creating each promo:
  - Update all affected plans in `plans` table to add the `whopPromoId` to their `promoIds` JSONB array

**Implementation Steps:**

1. Query plans from `plans` table by `whopCompanyId`
2. Separate plans into two groups:

   - `plansWithProduct`: Plans with `whopProductId` (group by `whopProductId`)
   - `plansWithoutProduct`: Plans with `checkoutConfigurationId` but no `whopProductId`

3. For each unique `whopProductId`:

   - Get all `planIds` for that product
   - Create promo with `product_id` set to the product ID
   - Save to `promos` table with `productId` field
   - **Update all plans in this group**: Add `whopPromoId` to their `promoIds` JSONB array

4. For checkout-only plans:

   - Collect all `planIds` from `plansWithoutProduct`
   - Create one promo with all these `plan_ids` (no `product_id`)
   - Save to `promos` table with `productId` as `null`
   - **Update all checkout-only plans**: Add `whopPromoId` to their `promoIds` JSONB array

**Code Location:** Lines 289-427

**Helper Function to Update Plans:**

```typescript
async function addPromoIdToPlans(planIds: string[], whopPromoId: string) {
  // For each plan, update promoIds JSONB array to include whopPromoId
  // Use SQL to append to JSONB array if not already present
}
```

### 3. Update Delete Seasonal Discount Promos

**File:** `lib/actions/seasonal-discount-actions.ts`

**Function:** `deleteSeasonalDiscountPromos`

**Current Behavior:** Deletes promos from Whop API and database

**New Behavior:**

- Before deleting promos, get all `whopPromoId` values that will be deleted
- For each deleted promo:
  - Query all plans that have this `whopPromoId` in their `promoIds` array
  - Remove the `whopPromoId` from those plans' `promoIds` JSONB arrays
- Then proceed with deletion from Whop API and database

**Code Location:** Lines 432-550

**Helper Function to Remove Promo from Plans:**

```typescript
async function removePromoIdFromPlans(whopPromoId: string) {
  // Query all plans where promoIds contains whopPromoId
  // Remove whopPromoId from each plan's promoIds JSONB array
}
```

### 4. Update Product Editor PRODUCT DISCOUNT UI

**File:** `lib/components/store/SeasonalStore/components/ProductEditorModal.tsx`

#### 4.1 Conditional Field Visibility

**Location:** Lines 1598-1784 (Product Discount Section)

**Changes:**

- Add state: `const [hasDiscountSelected, setHasDiscountSelected] = useState(false)`
- Update `hasDiscountSelected` when `localPromoDiscountType` or `localPromoDiscountAmount` changes
- Conditionally render:
  - **Always visible:** "Product / Plan" selector, "Promo Code Name" dropdown, "+ New" button (if seasonal discount exists)
  - **Only when `hasDiscountSelected === true`:** "Discount Type", "Discount Amount", "Limit Quantity", "Show Fire Icon", duration fields

#### 4.2 Fetch Promos Based on Selected Scope (Using New promoIds Field)

**Location:** Add `useEffect` after line 162 (after `availablePromoCodes` state)

**Implementation:**

- Create API endpoint: `/api/promos/list-by-plan` that:
  - Accepts `planId` (required)
  - Queries `plans` table for the plan
  - Gets `promoIds` from the plan record
  - Queries `promos` table where `whopPromoId` is in the `promoIds` array
  - Returns array of `{id, code}`
- Create API endpoint: `/api/promos/list-by-product` that:
  - Accepts `productId` (required)
  - Queries `promos` table where `productId` matches
  - Returns array of `{id, code}`
- In `ProductEditorModal`, add `useEffect` that:
  - Fetch

### To-dos

- [ ] Add whopCompanyId field to plans table schema with index
- [ ] Create migration to add whop_company_id to plans table and backfill from experiences
- [ ] Update upsertPlansForProduct to include whopCompanyId when creating/updating plans
- [ ] Update createPlanFromCheckoutConfiguration to include whopCompanyId (fetch from resource experience)
- [ ] Change promos table to use whopCompanyId instead of experienceId
- [ ] Create migration to change promos table from experience_id to whop_company_id
- [ ] Update createPromoCodeForSeasonalDiscount to query plans from plans table by whopCompanyId
- [ ] Update syncPromosFromWhopAPI to save whopCompanyId instead of experienceId
- [ ] Update deleteSeasonalDiscountPromos to query by whopCompanyId instead of experienceId
- [ ] Modify createPromoCodeForSeasonalDiscount to create separate promos per product (with product_id) and one promo for checkout-only plans
- [ ] Create /api/promos/list endpoint to query promos by companyId, planId, or productId
- [ ] Create /api/resources/get-by-product endpoint to get resource data for a product
- [ ] Update ProductEditorModal to conditionally show discount fields only when discount is selected
- [ ] Add logic to fetch resource data for current product in ProductEditorModal
- [ ] Add useEffect to fetch and filter promos based on selected scope (Plan vs Product) in ProductEditorModal
- [ ] Modify createPromoCodeForSeasonalDiscount to create separate promos per product (with product_id) and one promo for checkout-only plans
- [ ] Create /api/promos/list endpoint to query promos by companyId, planId, or productId
- [ ] Create /api/resources/get-by-product endpoint to get resource data for a product
- [ ] Update ProductEditorModal to conditionally show discount fields only when discount is selected
- [ ] Add logic to fetch resource data for current product in ProductEditorModal
- [ ] Add useEffect to fetch and filter promos based on selected scope (Plan vs Product) in ProductEditorModal