---
name: Fix Background Image Resizing
overview: Separate the background image into a fixed-position layer that's sized to the viewport, preventing it from resizing when ProductCard dimensions change or when the viewport resizes.
todos:
  - id: "1"
    content: Separate background into fixed-position layer in SeasonalStore.tsx
    status: completed
  - id: "2"
    content: Update getBackgroundStyle to remove minHeight and ensure fixed positioning compatibility
    status: completed
  - id: "3"
    content: Test that background does not resize when ProductCard dimensions change
    status: completed
---

# Fix Background Image Resizing

## Problem

The background image currently resizes when ProductCard dimensions change or when the viewport resizes (e.g., keyboard appears/disappears). The background should remain fixed at viewport size and not respond to content changes.

## Solution

### Create Fixed-Position Background Layer (`lib/components/store/SeasonalStore/SeasonalStore.tsx`)

- **Location**: Main store container (around line 1515-1540)
- **Current**: Background is applied directly to the scrollable content container
- **Fix**: 
  - Create a separate fixed-position background div that's always sized to the viewport
  - Use `position: fixed` with `top: 0, left: 0, width: 100vw, height: 100vh`
  - Apply background styles to this fixed layer
  - Keep the content container separate so it can scroll independently
  - The background won't resize when ProductCard dimensions change because it's fixed to viewport size

### Update Background Style Function (`lib/components/store/SeasonalStore/utils/getThemePlaceholder.ts`)

- **Location**: `getBackgroundStyle` function (lines 30-66)
- **Current**: Returns styles with `minHeight: '100vh'` or `minHeight: '100dvh'`
- **Fix**:
  - Remove `minHeight` from background styles (not needed for fixed positioning)
  - Ensure `width: '100vw'` and `height: '100vh'` are set for fixed positioning
  - Keep `backgroundAttachment: 'scroll'` or change to `'fixed'` (since we're using fixed positioning, `'fixed'` makes more sense)

## Implementation Details

1. **Background Layer Structure**:
   ```tsx
   {/* Fixed background layer */}
   <div 
     className="fixed inset-0 -z-10"
     style={getBackgroundStyle}
   />
   
   {/* Scrollable content container */}
   <div 
     ref={appRef}
     className="relative z-0"
     // ... other props
   >
     {/* Content */}
   </div>
   ```

2. **Background Style Updates**:

   - Remove `minHeight` from `getBackgroundStyle`
   - Add `position: 'fixed'` (or handle via className)
   - Ensure `width: '100vw'` and `height: '100vh'`
   - Use `backgroundAttachment: 'fixed'` for better performance

3. **Z-Index Management**:

   - Background layer: `z-index: -10` (behind everything)
   - Content container: `z-index: 0` (default, above background)

## Files to Modify

1. **[lib/components/store/SeasonalStore/SeasonalStore.tsx](lib/components/store/SeasonalStore/SeasonalStore.tsx)**

   - Separate background into fixed-position layer
   - Update content container to not have background styles

2. **[lib/components/store/SeasonalStore/utils/getThemePlaceholder.ts](lib/components/store/SeasonalStore/utils/getThemePlaceholder.ts)**

   - Remove `minHeight` from background styles
   - Ensure proper sizing for fixed positioning
   - Update `backgroundAttachment` to `'fixed'` if appropriate