---
name: Fix TopNavbar Copy Notification and Mobile Layout
overview: Fix toast notification not showing on click, restore desktop timer number sizes, center discount name above timer on mobile, and center the discount modal in TopNavbar without resizing to the right. Keep desktop unchanged, only modify mobile.
todos: []
---

# Fix TopNavbar Copy Notification and Mobile Layout

## Issues to Fix

### 1. Toast Notification Not Showing on Click

- **Problem**: When clicking TopNavbar to copy promo code, the toast notification doesn't appear
- **Location**: `lib/components/store/SeasonalStore/components/TopNavbar.tsx` (lines 470-480)
- **Root Cause**: The click handler might be preventing the notification, or the click event isn't properly triggering `handlePromoCardCopy`
- **Fix**: 
- Ensure `handlePromoCardCopy` is being called correctly from the TopNavbar click handler
- Verify the notification state is being set properly
- Check if event propagation is preventing the handler from executing

### 2. Restore Desktop Timer Number Sizes (Desktop Unchanged)

- **Problem**: Timer numbers are smaller on desktop after recent changes
- **Location**: `lib/components/store/SeasonalStore/components/TopNavbar.tsx` (line 730)
- **Current**: `text-base sm:text-2xl` (base is smaller)
- **Fix**: Change to `text-lg sm:text-2xl` or `text-xl sm:text-2xl` to keep desktop at `text-2xl` (original size) while having smaller mobile size
- **Important**: Desktop must remain at `text-2xl` (original size)

### 3. Mobile Layout: Discount Name Above Timer, Centered (Mobile Only)

- **Problem**: Discount name and timer are on same line on mobile, should be stacked with name above
- **Location**: `lib/components/store/SeasonalStore/components/TopNavbar.tsx` (lines 705-738)
- **Current**: Horizontal flex layout with `flex-nowrap` for both mobile and desktop
- **Fix**:
- **Mobile only**: Change layout to vertical: use `flex-col sm:flex-row` for the container
- **Mobile only**: Center align content: add `items-center justify-center text-center` for mobile
- **Mobile only**: Discount text should be above timer on mobile
- **Mobile only**: Timer and label should be centered below discount text
- **Desktop**: Keep original horizontal layout unchanged (using `sm:flex-row` ensures desktop stays horizontal)

### 4. Center Discount Modal and Prevent Right-Side Resizing

- **Problem**: Discount modal in TopNavbar resizes to the right side instead of staying centered
- **Location**: `lib/components/store/SeasonalStore/components/TopNavbar.tsx` (lines 686-742)
- **Current**: Promo card uses `w-full sm:w-auto sm:max-w-3xl` with `justify-start` alignment
- **Fix**:
- Center the promo card container: change parent div to use `justify-center` instead of `justify-start`
- Ensure promo card itself is centered: use `mx-auto` or center alignment
- Remove any right-side alignment that causes resizing

## Files to Modify

1. **[lib/components/store/SeasonalStore/components/TopNavbar.tsx](lib/components/store/SeasonalStore/components/TopNavbar.tsx)**

- Fix click handler to properly trigger copy notification
- Restore desktop timer number sizes (keep desktop at `text-2xl`, mobile can be smaller)
- Change mobile layout to vertical (discount name above timer, centered) - desktop stays horizontal
- Center discount modal and prevent right-side resizing

## Implementation Details

- Verify `handlePromoCardCopy` function is working correctly and setting notification state
- **Mobile changes only**: Use responsive flex direction: `flex-col` on mobile, `flex-row` on desktop (via `sm:` breakpoint)
- **Mobile changes only**: Center alignment for mobile: `items-center justify-center text-center` on mobile, keep desktop alignment as before
- **Desktop unchanged**: Keep desktop timer size at `text-2xl` (original size) using `sm:text-2xl`
- **Desktop unchanged**: Keep desktop layout horizontal and left-aligned as it was originally
- Ensure promo card container is centered with proper alignment classes
- All mobile-specific changes should use `sm:` breakpoint to ensure desktop remains unchanged