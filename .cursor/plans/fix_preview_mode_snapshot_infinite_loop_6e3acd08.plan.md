---
name: Fix Preview Mode Snapshot Infinite Loop
overview: Fix the infinite loop and state mismatch when exiting preview mode and resetting changes. The issue is that preview mode overwrites edit snapshots, and resetting triggers infinite recalculation loops.
todos:
  - id: remove-preview-snapshot
    content: Remove ALL snapshot-taking logic from preview mode entry - preview should never take or modify snapshots
    status: pending
  - id: ensure-exit-snapshot
    content: Ensure snapshots are correctly taken after exiting preview when templates load (both Live preview and regular preview cases)
    status: pending
  - id: fix-change-detection-loop
    content: Fix infinite loop in useStoreSnapshot change detection by adding proper guards and debouncing
    status: pending
  - id: fix-content-ready-logging
    content: Fix infinite logging in isStoreContentReady by tracking last logged state
    status: pending
  - id: improve-reset-handler
    content: Improve reset handler to batch updates and prevent cascading recalculations
    status: pending
---

# Fix Preview Mode Snapshot Infinite Loop

## Problem Analysis

### Root Causes

1. **Preview Mode Incorrectly Takes Snapshots**: When entering preview mode with a different template, `usePreviewMode` incorrectly takes a snapshot and overwrites `lastSavedSnapshot` (line 79-80 in `usePreviewMode.ts`). **Preview mode should NEVER take snapshots** - it's read-only and should preserve the edit mode's snapshot. This destroys the edit mode's snapshot, causing state mismatch.

2. **Infinite Loop on Reset**: When resetting after exiting preview:

- `handleResetChanges` updates all state (products, fixedTextStyles, etc.)
- State updates trigger `isStoreContentReady` recalculation (depends on `fixedTextStyles`)
- `isStoreContentReady` logs on every recalculation (line 256)
- State updates trigger `computeStoreSnapshot` recalculation (depends on `snapshotData`)
- `computeStoreSnapshot` triggers change detection useEffect (line 149-161)
- Change detection might cause more state updates, creating a loop

3. **Missing Reset Guards**: The change detection useEffect (line 149-161) depends on `computeStoreSnapshot`, which recalculates on every state change, even during reset.

## Solution Strategy

### 1. Remove All Snapshot Logic from Preview Mode

**File**: `lib/components/store/SeasonalStore/hooks/usePreviewMode.ts`

- **Requirement**: NO snapshots should be taken in preview mode. Preview mode should only display the template without modifying any snapshot state.
- **Implementation**: Remove all snapshot-taking logic from preview mode (lines 73-87). Preview should not call `setLastSavedSnapshot` or `computeStoreSnapshot`.
- **Rationale**: Preview mode is read-only and should not interfere with edit mode's snapshot tracking. The edit mode snapshot must be preserved when entering/exiting preview.

### 1b. Ensure Snapshots Are Taken After Exiting Preview

**File**: `lib/components/store/SeasonalStore/SeasonalStore.tsx` and `lib/components/store/SeasonalStore/hooks/useStoreSnapshot.ts`

- **Requirement**: When exiting preview mode and loading a template, snapshots must be taken AFTER the template fully loads to prevent state mismatches.
- **Case 1 - Exiting Live Preview**: When exiting Live preview, a different template (latest non-live) is loaded. The automatic snapshot mechanism should take a snapshot after this template fully loads.
- **Case 2 - Exiting Regular Preview**: When exiting regular preview, the previewed template is loaded. The automatic snapshot mechanism should take a snapshot after this template fully loads and preview state is cleared.
- **Implementation**: Ensure the automatic snapshot in `useStoreSnapshot` (line 124-146) correctly triggers after template load completes when exiting preview. The condition `isStoreContentReady && isTemplateLoaded && !isInPreviewMode` should work correctly.
- **Key**: The snapshot must be taken AFTER all components are loaded to prevent mismatch between snapshot state and actual rendered state.

### 2. Fix Infinite Loop in Change Detection

**File**: `lib/components/store/SeasonalStore/hooks/useStoreSnapshot.ts`

- Add dependency array optimization to prevent unnecessary `computeStoreSnapshot` recalculations
- Ensure `isResettingRef.current` check properly prevents change detection during reset
- Add debouncing/throttling to change detection

### 3. Fix Infinite Logging in isStoreContentReady

**File**: `lib/components/store/SeasonalStore/hooks/useSeasonalStoreDatabase.ts`

- Remove or throttle the console.log in `isStoreContentReady` (line 256)
- Use a ref to track last logged state to prevent duplicate logs

### 4. Improve Reset Handler

**File**: `lib/components/store/SeasonalStore/SeasonalStore.tsx`

- Ensure `resetSnapshot()` is called before state updates
- Batch state updates to prevent multiple recalculations
- Add a flag to prevent snapshot recalculation during reset

## Implementation Details

### Change 1: Remove Snapshot Logic from Preview Mode Entry

In `usePreviewMode.ts`:

- Remove the snapshot-taking logic from `handlePreviewTemplate` (lines 73-87)
- Remove the `setInterval` that waits for template load and takes snapshot
- Preview mode should only set `isInPreviewMode` and `previewTemplate` state
- Preview mode must not call `setLastSavedSnapshot` or `computeStoreSnapshot` when entering preview

### Change 1b: Ensure Snapshots Are Taken After Exiting Preview

In `useStoreSnapshot.ts`:

- Verify the automatic snapshot mechanism (lines 124-146) correctly triggers after exiting preview
- The snapshot should be taken when: `isStoreContentReady && isTemplateLoaded && !isInPreviewMode`
- Ensure `hasTakenSnapshotForTemplateRef` is properly reset when exiting preview so a new snapshot can be taken
- The snapshot must be taken AFTER the template fully loads to prevent state mismatches

In `SeasonalStore.tsx`:

- When exiting preview via `handleExitPreview`, ensure the template load completes before snapshot is taken
- The automatic snapshot mechanism should handle this, but verify the timing is correct

### Change 2: Optimize Change Detection

In `useStoreSnapshot.ts`:

- Add a ref to track if we're computing snapshot during reset
- Debounce the change detection to prevent rapid-fire comparisons
- Make `computeStoreSnapshot` more stable by memoizing intermediate results

### Change 3: Fix isStoreContentReady Logging

In `useSeasonalStoreDatabase.ts`:

- Use a ref to track last logged templateId to prevent duplicate logs
- Only log when templateId actually changes

### Change 4: Improve Reset Flow

In `SeasonalStore.tsx`:

- Ensure `resetSnapshot()` sets the flag before any state updates
- Use React's `startTransition` or batch updates to prevent cascading recalculations

## Files to Modify

1. `lib/components/store/SeasonalStore/hooks/usePreviewMode.ts` - Remove preview snapshot update
2. `lib/components/store/SeasonalStore/hooks/useStoreSnapshot.ts` - Fix infinite loop in change detection
3. `lib/components/store/SeasonalStore/hooks/useSeasonalStoreDatabase.ts` - Fix infinite logging
4. `lib/components/store/SeasonalStore/SeasonalStore.tsx` - Improve reset handler

## Testing Checklist

- [ ] Enter preview mode, exit, reset changes - no infinite loop
- [ ] Enter preview mode with different template, exit, reset - state restores correctly
- [ ] Edit mode snapshot is preserved when entering/exiting preview
- [ ] Exiting Live preview loads different template and snapshot is taken after template fully loads
- [ ] Exiting regular preview loads previewed template and snapshot is taken after template fully loads
- [ ] No console spam from "Store content ready" logs
- [ ] Reset button works correctly without browser lag
- [ ] Preview mode and edit mode have correct state tracking