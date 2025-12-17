---
name: Fix Snapshot Timing and Global Discount Validation
overview: "Two fixes: 1) Fix snapshot timing to ensure it captures all state changes after discount create/save by using longer delays and ensuring state updates complete, 2) Add validation to prevent creating discount with globalDiscount enabled when quantityPerProduct or durationType are not selected."
todos: []
---

# Fix Snapshot Timing and Global Discount Validation

## Problem Analysis

### Issue 1: Snapshot Taken Too Early

**Current Problem:**

- Snapshot is updated with `setTimeout` delays (100ms for save, 200ms for create)
- State updates (`setDiscountSettings`, `setTemplates`, etc.) might not be complete when snapshot is taken
- React state updates are asynchronous and may not be reflected in the snapshot immediately
- The snapshot might be capturing stale state before all updates complete

**Root Cause:**

- `setTimeout` doesn't guarantee React state updates are complete
- Multiple state updates might be batched by React
- The snapshot is computed from `snapshotData` which includes `discountSettings`, but the state might not be updated yet

### Issue 2: Global Discount Validation Missing

**Current Problem:**

- `canCreateDiscount` validation doesn't check for `quantityPerProduct` and `durationType` when `globalDiscount` is enabled
- Users can create a discount with global discount enabled without selecting these required fields

**Current Validation (line 128-136 in SeasonalDiscountPanel.tsx):**

- Only checks: `startDate`, `endDate`, `discountText`, `promoCode`
- Missing: `quantityPerProduct` and `durationType` when `globalDiscount === true`

## Solution

### Strategy 1: Fix Snapshot Timing

**Approach:**

1. Increase the delay for snapshot updates to ensure React state updates complete
2. Use `requestAnimationFrame` or multiple `setTimeout` calls to ensure state is updated
3. Consider using a callback approach where snapshot is updated after all async operations complete
4. Ensure `setDiscountSettings` state update is reflected before taking snapshot

**Implementation:**

- For save operation: Increase delay to 300ms and use double `setTimeout` to ensure React has processed state updates
- For create operation: Increase delay to 500ms (longer because it updates multiple templates) and use double `setTimeout`
- Alternatively: Use `flushSync` from React or wait for next render cycle

### Strategy 2: Add Global Discount Validation

**Approach:**

1. Update `canCreateDiscount` validation to check `quantityPerProduct` and `durationType` when `globalDiscount` is true
2. `quantityPerProduct` must be set (either a number >= 0 or -1 for unlimited)
3. `durationType` must be set (one of: 'one-time', 'forever', 'duration_months')

**Implementation:**

- Add checks in `canCreateDiscount` useMemo:
- If `globalDiscount === true`:
- `quantityPerProduct` must be defined (not undefined) - can be -1 for unlimited or >= 0
- `durationType` must be defined (not undefined) - must be one of the valid values

## Implementation Details

### File 1: `lib/components/store/SeasonalStore/hooks/useSeasonalDiscountActions.ts`

**Change 1: Fix snapshot timing for save operation**

- Update the snapshot update delay (line 111) to use a longer delay with double setTimeout
- Change from 100ms to 300ms with nested setTimeout to ensure React state updates complete

**Change 2: Fix snapshot timing for create operation**

- Update the snapshot update delay (line 365) to use a longer delay with double setTimeout
- Change from 200ms to 500ms with nested setTimeout to ensure all template updates and state updates complete

### File 2: `lib/components/store/SeasonalStore/components/templates/SeasonalDiscountPanel.tsx`

**Change 3: Add global discount validation**

- Update `canCreateDiscount` useMemo (lines 128-136) to include validation for global discount
- Add check: If `globalDiscount === true`, then:
- `quantityPerProduct` must be defined (not undefined) - can be -1 or >= 0
- `durationType` must be defined (not undefined) - must be 'one-time', 'forever', or 'duration_months'
- Update dependency array to include `discountSettings.globalDiscount`, `discountSettings.quantityPerProduct`, and `discountSettings.durationType`

## Files to Modify

1. `lib/components/store/SeasonalStore/hooks/useSeasonalDiscountActions.ts` - Fix snapshot timing
2. `lib/components/store/SeasonalStore/components/templates/SeasonalDiscountPanel.tsx` - Add global discount validation

## Implementation Notes

- For snapshot timing, using nested `setTimeout` helps ensure React has processed state updates
- The delays are longer to account for:
- React state update batching
- Multiple state updates (setDiscountSettings, setTemplates, etc.)
- Template database updates completing
- For validation, `quantityPerProduct` can be -1 (unlimited) or a number >= 0, but not undefined
- For validation, `durationType` must be explicitly set to one of the valid values

## Testing Checklist

- [ ] Snapshot is taken after all state updates complete for save operation
- [ ] Snapshot is taken after all state updates complete for create operation
- [ ] Snapshot includes updated discountSettings after save
- [ ] Snapshot includes updated discountSettings after create
- [ ] Cannot create discount with globalDiscount=true when quantityPerProduct is not selected
- [ ] Cannot create discount with globalDiscount=true when durationType is not selected
- [ ] Can create discount with globalDiscount=true when both quantityPerProduct and durationType are selected
- [ ] Can create discount with globalDiscount=false without quantityPerProduct and durationType
- [ ] Validation properly disables Create Discount button when requirements not met