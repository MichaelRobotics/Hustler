# Product Sync Visibility Filtering Analysis

## Current Implementation

### Main Product Fetch (`lib/whop-api-client.ts`)

**Location:** Line 277 in `getCompanyProducts()`

```typescript
// Filter out archived products
const visibleProducts = validProducts.filter(product => product.visibility !== 'archived');
```

**Current Behavior:**
- ✅ **INCLUDES:** `visibility === 'visible'`
- ✅ **INCLUDES:** `visibility === 'hidden'`
- ✅ **INCLUDES:** `visibility === 'quick_link'`
- ❌ **EXCLUDES:** `visibility === 'archived'`

### Product Sync (`lib/sync/whop-product-sync.ts`)

**Location:** Lines 226-259 in `fetchWhopProducts()`

```typescript
const apiProducts = await whopClient.getCompanyProducts();
// ... maps products ...
// Filter by status if needed
if (!options.includeInactive) {
  return whopProducts.filter((p) => p.status === "active");
}
```

**Filtering:**
- Uses products from `getCompanyProducts()` (which already excludes archived)
- **Additional filter:** Only includes products with `status === "active"` (unless `includeInactive` is true)
- **No additional visibility filtering** - relies on `getCompanyProducts()` filtering

### Update Sync Check (`lib/sync/update-product-sync.ts`)

**Location:** Lines 204-233 in `fetchWhopProducts()`

```typescript
const apiProducts = await whopClient.getCompanyProducts();
// ... maps products ...
// No additional visibility filtering
```

**Filtering:**
- Uses products from `getCompanyProducts()` (which already excludes archived)
- **No additional visibility or status filtering**

## Summary

### What Gets Synced:

1. **Product Sync (`whop-product-sync.ts`):**
   - ✅ `visible` + `active`
   - ✅ `hidden` + `active`
   - ✅ `quick_link` + `active`
   - ❌ `archived` (excluded by `getCompanyProducts()`)
   - ❌ `inactive` or `draft` status (unless `includeInactive` is true)

2. **Update Sync Check (`update-product-sync.ts`):**
   - ✅ `visible` (any status)
   - ✅ `hidden` (any status)
   - ✅ `quick_link` (any status)
   - ❌ `archived` (excluded by `getCompanyProducts()`)
   - **Note:** No status filtering, so includes inactive/draft products

### What Gets Excluded:

- ❌ Products with `visibility === 'archived'` (filtered in `getCompanyProducts()`)
- ❌ Products without associated plans (filtered in `getCompanyProducts()`)
- ❌ Products with `status !== 'active'` (only in main product sync, not in update sync)

## Answer to Your Question

**Q: Does product sync and product update check only for "visible" and "hidden"?**

**A: NO** - Currently it processes:
- ✅ `visible`
- ✅ `hidden`
- ✅ `quick_link`
- ❌ `archived` (excluded)

So it processes **3 visibility types** (`visible`, `hidden`, `quick_link`), not just 2.

## Recommendation

If you want to **ONLY** process `visible` and `hidden` products, you need to add filtering:

```typescript
// In lib/whop-api-client.ts, line 277, change from:
const visibleProducts = validProducts.filter(product => product.visibility !== 'archived');

// To:
const visibleProducts = validProducts.filter(product => 
  product.visibility === 'visible' || product.visibility === 'hidden'
);
```

This would exclude:
- ❌ `archived`
- ❌ `quick_link`

## Code References

- Main filtering: `lib/whop-api-client.ts:277`
- Product sync: `lib/sync/whop-product-sync.ts:226-259`
- Update sync: `lib/sync/update-product-sync.ts:204-233`

