---
name: Fix First Template Load Market Stall Order
overview: ""
todos:
  - id: 938d9a94-dccc-4b15-98a5-8533cfdf4349
    content: Remove order conflict notification UI and related handlers from SeasonalStore.tsx
    status: pending
  - id: cb46286f-9146-4065-804a-da5c8770a358
    content: Modify filterProductsAgainstMarketStall to preserve template product order instead of Market Stall order
    status: pending
  - id: 69cff6b0-e6f8-44e8-a7cb-26324b436ed3
    content: Add effect in SeasonalStore.tsx to automatically sync product order when Market Stall order changes
    status: pending
  - id: dea9bb40-f275-48f5-bc70-0ad2d55276f9
    content: Ensure template products maintain their saved order when loaded in useSeasonalStoreDatabase and usePreviewLiveTemplate
    status: pending
  - id: 038b1032-5c8e-43ba-ae3f-3063f2c7c289
    content: Add useEffect in SeasonalStore.tsx to reorder products to Market Stall order when template is first loaded
    status: pending
  - id: cd08173c-e6d3-4b9e-b65a-362efb3eaa23
    content: Use ref to track if initial reorder has been done to avoid multiple reorders
    status: pending
  - id: 5651a035-ec31-454a-870d-401ca2d9a490
    content: Ensure initial reorder updates the snapshot to prevent false change detection
    status: pending
---

# Fix First Template Load Market Stall Order

## Problem

The first template loaded via `restoreLastActiveState` doesn't get reordered to Market Stall order because:

1. `restoreLastActiveState` in `useSeasonalStoreDatabase.ts` calls `setProducts` directly (line 2348), bypassing the `setProductsAndReorder` wrapper
2. `isTemplateLoaded` is false for database hook template loads (only true for `usePreviewLiveTemplate`)
3. The effect condition requires `isTemplateLoaded` OR resources just became available, but timing issues prevent it from triggering

## Solution

### Option 1: Modify restoreLastActiveState to reorder (Recommended)

**File**: `lib/components/store/SeasonalStore/hooks/useSeasonalStoreDatabase.ts`

- Modify `restoreLastActiveState` to accept `allResources` as a parameter or access them from context
- After setting products, immediately reorder them to Market Stall order if resources are available
- If resources aren't available yet, the effect in SeasonalStore will catch it later

### Option 2: Enhance the effect to handle database hook loads

**File**: `lib/components/store/SeasonalStore/SeasonalStore.tsx`

- Remove the `isTemplateLoaded` requirement from the reorder condition
- Add detection for when products are set from database hook (products exist but `isTemplateLoaded` is false)
- Ensure the effect triggers when products exist and resources become available, regardless of `isTemplateLoaded`

### Option 3: Pass reordering function to database hook

**File**: `lib/components/store/SeasonalStore/SeasonalStore.tsx` and `useSeasonalStoreDatabase.ts`

- Pass `reorderProductsArray` function to the database hook
- Modify `restoreLastActiveState` to use the reordering function after setting products

## Recommended Implementation (Option 2 - Simplest)

Modify the effect in SeasonalStore.tsx to:

1. Remove dependency on `isTemplateLoaded` for initial reorder
2. Trigger reorder whenever products exist and resources are available, and reorder hasn't been done
3. Add better logging to debug when reorder should happen vs when it actually happens

The effect should trigger when:

- Products exist AND
- Resources are available AND  
- Reorder hasn't been done yet

This will catch the first template load case regardless of `isTemplateLoaded` status.