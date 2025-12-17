---
name: Fix ProductCard Promo Data Loading Based on Discount Status
overview: "Fix three issues with ProductCard promo data loading: 1) Products with promo data are loaded before discount validation, showing expired/non-existent promos, 2) When discount ID differs, products aren't cleaned from already-loaded state, 3) No logic to hide (not remove) promo data when discount is approaching (not yet active)."
todos:
  - id: move-discount-validation-before-products
    content: Move discount validation logic before setProducts call to clean templateProducts before they are loaded into state
    status: completed
  - id: clean-all-templates
    content: Update logic to clean ALL templates (not just current) when discount is expired/non-existent or different
    status: completed
    dependencies:
      - move-discount-validation-before-products
  - id: add-hide-logic-productcard
    content: Add discountStatus prop to ProductCard and logic to hide (not remove) promo data when discount is approaching
    status: completed
  - id: pass-discount-status
    content: Pass discount status from SeasonalStore to ProductCard components
    status: completed
    dependencies:
      - add-hide-logic-productcard
---

# Fix ProductCard Promo Data Loading Based on Discount Status

## Problem Analysis

### Issue 1: Products Loaded with Promo Data Before Discount Validation

- Products are set to state at line 1164 in `useSeasonalStoreDatabase.ts` BEFORE discount validation (starts at line 1205)
- When discount is non-existent/expired, template is cleaned in database (lines 1232-1267), but products already in state still have promo data
- **Result**: ProductCards show promo data even when discount is expired/non-existent

### Issue 2: Different Discount ID - Products Not Cleaned from State

- When discount ID differs (lines 1270-1305), template products are cleaned and template is updated in database
- But `setProducts` is called at line 1300 to clean state, which happens AFTER products were already loaded at line 1164
- **Result**: Products with old promo data may still be visible

### Issue 3: No Hide Logic for Approaching Discounts

- When discount is "approaching" (not yet active) but matches the product's discount ID, promo data is kept in template
- ProductCard always displays promo data if it exists in the product object
- **Result**: Promo data is shown even when discount hasn't started yet (should be hidden until active)

## Solution

### Strategy

1. **Move discount validation BEFORE setting products to state**

   - Validate discount status and clean template products BEFORE calling `setProducts`
   - Ensure products are cleaned before being loaded into state

2. **Add logic to hide (not remove) promo data when discount is approaching**

   - Pass discount status to ProductCard
   - ProductCard should hide promo UI when discount status is "approaching" (not yet active)
   - Keep promo data in product object, just don't display it

3. **Ensure all templates are cleaned, not just currently loaded one**

   - When cleaning ProductCard promo data in ANY case (expired, non-existent, or different discount ID), clean ALL templates
   - Update all templates in state, cache, and database
   - This ensures consistency across all templates, not just the one being loaded

## Implementation Details

### File 1: `lib/components/store/SeasonalStore/hooks/useSeasonalStoreDatabase.ts`

**Change 1: Move discount validation before setting products (around line 1120-1205)**

Current flow:

1. Load template products (line 1120-1170)
2. Set products to state (line 1164)
3. Validate discount and clean template (line 1205-1386)
4. Clean products from state (line 1266, 1300)

New flow:

1. Load template products (line 1120-1170)
2. **Validate discount and clean template products BEFORE setting to state** (move lines 1205-1386 before line 1164)
3. Set cleaned products to state (line 1164)
4. Update templates in database if needed

**Change 2: Clean products from template before setting to state**

In the discount validation logic, clean `templateProducts` array before it's used in `setProducts`:

```typescript
// After fetching database discount (around line 1220)
const discountStatus = checkDiscountStatus(databaseDiscountData);
const isActiveOrApproaching = discountStatus === 'active' || discountStatus === 'approaching';

// Clean templateProducts based on discount status BEFORE setting to state
if (template.templateData.discountSettings) {
  const templateDiscountSettings = template.templateData.discountSettings;
  const templateSeasonalDiscountId = templateDiscountSettings.seasonalDiscountId;
  const databaseSeasonalDiscountId = databaseDiscountData?.seasonalDiscountId;

  // If promo is NON-EXISTENT or EXPIRED - clean products BEFORE setting to state
  if (discountStatus === 'non-existent' || discountStatus === 'expired') {
    templateProducts = templateProducts.map(product => removeProductPromoData(product));
    // Also update template in database (existing logic)
  }
  // If promo is ACTIVE/APPROACHING but different seasonal_discount_id - clean products
  else if (isActiveOrApproaching && databaseSeasonalDiscountId && templateSeasonalDiscountId !== databaseSeasonalDiscountId) {
    templateProducts = templateProducts.map(product => removeProductPromoData(product));
    // Also update template in database (existing logic)
  }
  // If promo is ACTIVE/APPROACHING and matches - keep products as-is
  // If promo is APPROACHING - products keep promo data but will be hidden in ProductCard
}

// Then set cleaned products to state (line 1164)
setProducts(finalProducts);
```

**Change 3: Clean ALL templates when ProductCard promo data needs to be cleaned**

When cleaning ProductCard promo data in ANY scenario (expired, non-existent, or different discount ID), iterate through ALL templates (not just currently loaded one) and update them in state, cache, and database.

This should happen in:

- Case 1: Discount is non-existent or expired (lines 1232-1267)
- Case 2: Discount ID is different (lines 1270-1305)

Similar pattern to `TemplateManagerModal.tsx` lines 469-529, but for ProductCard promo data cleanup.

### File 2: `lib/components/store/SeasonalStore/components/ProductCard.tsx`

**Add discount status prop and hide logic:**

1. Add `discountStatus` prop to `ProductCardProps`:
```typescript
interface ProductCardProps {
  // ... existing props
  discountStatus?: 'active' | 'approaching' | 'expired' | 'non-existent';
  seasonalDiscountId?: string; // To match against product's discount
}
```

2. Add logic to determine if promo should be hidden:
```typescript
// Check if promo should be hidden (approaching but not yet active)
const shouldHidePromo = React.useMemo(() => {
  if (!discountStatus || !seasonalDiscountId) return false;
  
  // Hide if discount is approaching (not yet active) and matches product's discount
  if (discountStatus === 'approaching') {
    // Check if product has promo data that matches the approaching discount
    // This would require checking if product.promoCode matches discountSettings.promoCode
    // For now, hide if discount is approaching
    return true;
  }
  
  return false;
}, [discountStatus, seasonalDiscountId]);
```

3. Update promo display logic to respect `shouldHidePromo`:
```typescript
// In discountedPrice calculation
const discountedPrice = React.useMemo(() => {
  if (shouldHidePromo) return null; // Hide discount when approaching
  
  const discountAmount = Number(product.promoDiscountAmount ?? 0);
  // ... rest of logic
}, [product.promoDiscountType, product.promoDiscountAmount, product.price, shouldHidePromo]);

// In discountDisplay calculation
const discountDisplay = React.useMemo(() => {
  if (shouldHidePromo) return null; // Hide discount badge when approaching
  
  const discountAmount = Number(product.promoDiscountAmount ?? 0);
  // ... rest of logic
}, [product.promoDiscountType, product.promoDiscountAmount, shouldHidePromo]);

// In button text (hide promo code when approaching)
const getButtonText = () => {
  if (shouldHidePromo) {
    return product.buttonText || 'VIEW DETAILS'; // Don't show promo code
  }
  if (productPromoCode) {
    // ... existing promo code display
  }
  return product.buttonText || 'VIEW DETAILS';
};
```


### File 3: `lib/components/store/SeasonalStore/SeasonalStore.tsx`

**Pass discount status to ProductCard:**

1. Get discount status from `useSeasonalStoreDatabase` hook
2. Pass `discountStatus` and `seasonalDiscountId` to each `ProductCard` component

## Files to Modify

1. `lib/components/store/SeasonalStore/hooks/useSeasonalStoreDatabase.ts`

   - Move discount validation before setting products to state
   - Clean `templateProducts` array before `setProducts` call
   - Clean ALL templates (not just current) when discount is expired/non-existent or different

2. `lib/components/store/SeasonalStore/components/ProductCard.tsx`

   - Add `discountStatus` and `seasonalDiscountId` props
   - Add logic to hide (not remove) promo data when discount is "approaching"
   - Update all promo display logic to respect hide state

3. `lib/components/store/SeasonalStore/SeasonalStore.tsx`

   - Pass discount status to ProductCard components

## Testing Checklist

- [ ] When discount is non-existent/expired, ProductCards don't show promo data
- [ ] When discount is non-existent/expired, templates are cleaned in database
- [ ] When discount ID is different, ProductCards don't show old promo data
- [ ] When discount ID is different, templates are cleaned in database
- [ ] When discount is approaching (not yet active), ProductCards hide promo data (but keep it in product object)
- [ ] When discount becomes active, ProductCards show promo data
- [ ] All templates are cleaned when discount is expired/non-existent or different
- [ ] Products are cleaned before being set to state (no flash of promo data)