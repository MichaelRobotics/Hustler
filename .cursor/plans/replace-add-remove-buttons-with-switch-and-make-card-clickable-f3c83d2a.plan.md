<!-- f3c83d2a-50aa-4f4f-adb5-96190add373c 19cac951-b3df-4fc4-8f2f-1bd2f7f6b548 -->
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

### To-dos

- [ ] Remove order conflict notification UI and related handlers from SeasonalStore.tsx
- [ ] Modify filterProductsAgainstMarketStall to preserve template product order instead of Market Stall order
- [ ] Add effect in SeasonalStore.tsx to automatically sync product order when Market Stall order changes
- [ ] Ensure template products maintain their saved order when loaded in useSeasonalStoreDatabase and usePreviewLiveTemplate
- [ ] Add useEffect in SeasonalStore.tsx to reorder products to Market Stall order when template is first loaded
- [ ] Use ref to track if initial reorder has been done to avoid multiple reorders
- [ ] Ensure initial reorder updates the snapshot to prevent false change detection