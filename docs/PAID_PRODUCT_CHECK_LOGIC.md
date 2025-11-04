# How API Checks for PAID Products During Sync and Updates

## Overview
The API determines if a product is `PAID` or `FREE_VALUE` based on the product's price and `isFree` flag from the Whop API.

## Key Logic Locations

### 1. **Update Sync Check** (`lib/sync/update-product-sync.ts`)

When checking for updates (without applying changes):

```typescript
// Line 114: For new products
category: product.isFree ? 'FREE_VALUE' : 'PAID'

// Line 142: For updated products  
category: product.isFree ? 'FREE_VALUE' : 'PAID'

// Line 126: Apps are always FREE_VALUE
category: 'FREE_VALUE'
```

**Logic:**
- If `product.isFree === true` → `FREE_VALUE`
- If `product.isFree === false` or undefined → `PAID`
- **Apps are ALWAYS** `FREE_VALUE` (line 126)

### 2. **Apply Sync Changes** (`app/api/resources/apply-sync-changes/route.ts`)

When actually creating or updating resources:

```typescript
// Line 121: For new resources
const productCategory = product.isFree || product.price === 0 ? "FREE_VALUE" : "PAID";

// Line 287: For updated resources
const productCategory = product.isFree || product.price === 0 ? "FREE_VALUE" : "PAID";
```

**Logic:**
- If `product.isFree === true` OR `product.price === 0` → `FREE_VALUE`
- Otherwise → `PAID`
- **Apps are always FREE_VALUE** (line 96: `price: 0`, line 99: `isFree: true`)

### 3. **Main Product Sync** (`lib/sync/whop-product-sync.ts`)

```typescript
// Line 271-275
private determineCategory(product: WhopProduct): "PAID" | "FREE_VALUE" {
  if (product.price && product.price > 0) {
    return "PAID";
  }
  return "FREE_VALUE";
}
```

**Logic:**
- If `product.price` exists AND `product.price > 0` → `PAID`
- Otherwise → `FREE_VALUE`

## Differences Between Checks

### Update Sync (Check Only)
- Uses **only** `product.isFree` flag
- Does NOT check `product.price === 0`
- Logic: `product.isFree ? 'FREE_VALUE' : 'PAID'`

### Apply Sync Changes (Actual Update)
- Uses **both** `product.isFree` OR `product.price === 0`
- More defensive check: `product.isFree || product.price === 0 ? "FREE_VALUE" : "PAID"`
- Ensures products with price 0 are treated as free even if `isFree` flag is missing

### Main Sync
- Uses **only** `product.price > 0`
- Does NOT check `isFree` flag
- Logic: `product.price && product.price > 0 ? "PAID" : "FREE_VALUE"`

## Important Notes

1. **Apps are ALWAYS FREE_VALUE**
   - Apps (IDs starting with `app_`) are always categorized as `FREE_VALUE`
   - They have `price: 0` and `isFree: true` set explicitly

2. **Inconsistency Warning**
   - Update sync uses `isFree` flag only
   - Apply sync uses both `isFree` OR `price === 0`
   - Main sync uses `price > 0` only
   - This could lead to different categorization in different flows

3. **Recommendation**
   - Standardize on: `product.isFree || product.price === 0 ? "FREE_VALUE" : "PAID"`
   - This is the most defensive and handles edge cases

## Product Detection Flow

### During Update Check:
1. Fetch products from Whop API (`fetchWhopProducts`)
2. For each product, check `product.isFree`:
   - `true` → `FREE_VALUE`
   - `false/undefined` → `PAID`
3. Compare with database resources
4. Report changes with category

### During Apply Changes:
1. For each change, fetch product data
2. Check: `product.isFree || product.price === 0`
   - `true` → `FREE_VALUE`
   - `false` → `PAID`
3. Create/update resource with determined category

### During Main Sync:
1. Fetch products from Whop API
2. For each product, check `product.price > 0`:
   - `true` → `PAID`
   - `false` → `FREE_VALUE`
3. Sync to database

## Code References

- Update Sync Check: `lib/sync/update-product-sync.ts` (lines 114, 142, 126)
- Apply Changes: `app/api/resources/apply-sync-changes/route.ts` (lines 121, 287)
- Main Sync: `lib/sync/whop-product-sync.ts` (lines 271-275)
- Apps Handling: `app/api/resources/apply-sync-changes/route.ts` (lines 96, 99, 250, 253)

