# Affiliate/Owned Resource Type Analysis

## Overview

Resources in the system have a `type` field that can be either:
- **`AFFILIATE`**: External affiliate products (links to other products/services)
- **`MY_PRODUCTS`**: Owned products (your own products, can be Whop-synced or digital assets)

## Resource Type Behavior

### 1. **AFFILIATE Type**

**Characteristics:**
- Always requires a `link` field (affiliate URL)
- No `storageUrl` (no digital asset upload)
- No `whopProductId` (not synced from Whop)
- Used for promoting external products/services

**Form Fields Shown:**
- Name (required)
- Affiliate URL (required) - shown as "Affiliate URL" placeholder
- Description (optional)
- Price (if category is PAID)
- Promo Code (if category is PAID)

**Validation:**
- Link is required: `if (resource.type === 'AFFILIATE' && !resource.link?.trim())`
- No storage URL validation

**Usage in navigate-funnel:**
- In OFFER blocks, affiliate links get affiliate parameters added automatically:
  ```typescript
  // Check if link already has affiliate parameters
  const hasAffiliate = resource.link.includes('app=') || resource.link.includes('ref=');
  
  if (!hasAffiliate) {
    // Add affiliate parameter to the link
    const url = new URL(resource.link);
    url.searchParams.set('app', affiliateAppId);
    const affiliateLink = url.toString();
  }
  ```

### 2. **MY_PRODUCTS Type**

**Characteristics:**
- Can have `whopProductId` (synced from Whop) OR `storageUrl` (uploaded digital asset)
- If it has `whopProductId`, it shows a link field (product link)
- If it doesn't have `whopProductId`, it requires `storageUrl` (digital asset upload)
- Used for your own products/services

**Form Fields Shown:**

**Case 1: MY_PRODUCTS with whopProductId (Whop-synced product):**
- Name (required)
- Product link (required) - shown as "Product link" placeholder
- Description (optional)
- Price (if category is PAID)
- Promo Code (if category is PAID)
- **NO** digital asset upload field

**Case 2: MY_PRODUCTS without whopProductId (Digital asset):**
- Name (required)
- Description (optional)
- Digital Asset Upload (required) - file upload field
- Price (if category is PAID)
- Promo Code (if category is PAID)
- **NO** link field

**Validation:**
- If `MY_PRODUCTS` without `whopProductId`: `storageUrl` is required
  ```typescript
  if (resource.type === 'MY_PRODUCTS' && !resource.whopProductId && !resource.storageUrl?.trim()) {
    errors.push('Digital asset is required for owned products');
  }
  ```

**Usage in navigate-funnel:**
- Links are used as-is (no affiliate parameters added)
- For VALUE_DELIVERY blocks, the link is used directly:
  ```typescript
  const buttonHtml = `<div class="animated-gold-button" data-href="${resource.link}">Claim!</div>`;
  ```

## Code Locations

### Form Fields Logic
**File:** `lib/components/products/forms/FormFields.tsx`

```typescript
// URL Field - For Affiliate products and actual Whop products
{(resource.type === "AFFILIATE" || (resource.type === "MY_PRODUCTS" && resource.whopProductId)) && (
  <input
    type="url"
    value={resource.link || ""}
    placeholder={resource.type === "AFFILIATE" ? "Affiliate URL" : "Product link"}
  />
)}

// Digital Asset Upload - Only for Owned products that are NOT actual Whop products
{resource.type === "MY_PRODUCTS" && !resource.whopProductId && (
  <div className="space-y-2">
    {/* File upload UI */}
  </div>
)}
```

### Validation Logic
**File:** `lib/hooks/useResourceValidation.ts`

```typescript
// Link validation for affiliate products
if (resource.type === 'AFFILIATE' && !resource.link?.trim()) {
  errors.push('Affiliate URL is required');
}

// Storage URL validation for owned products that are NOT Whop products
if (resource.type === 'MY_PRODUCTS' && !resource.whopProductId && !resource.storageUrl?.trim()) {
  errors.push('Digital asset is required for owned products');
}
```

### Navigate Funnel API
**File:** `app/api/userchat/navigate-funnel/route.ts`

**OFFER Blocks (lines 434-497):**
- Looks up resource by name
- For AFFILIATE or MY_PRODUCTS: Checks if link has affiliate parameters
- If no affiliate params: Adds `app` parameter with affiliate app ID
- Replaces `[LINK]` placeholder with animated button HTML

**VALUE_DELIVERY Blocks (lines 498-529):**
- Looks up resource by name
- Uses resource link directly (no affiliate parameters added)
- Replaces `[LINK]` placeholder with animated button HTML

## Key Differences Summary

| Feature | AFFILIATE | MY_PRODUCTS (with whopProductId) | MY_PRODUCTS (no whopProductId) |
|---------|-----------|----------------------------------|--------------------------------|
| **Link Field** | ✅ Required | ✅ Required | ❌ Not shown |
| **Storage URL** | ❌ Not shown | ❌ Not shown | ✅ Required |
| **Affiliate Params** | ✅ Added in OFFER blocks | ✅ Added in OFFER blocks | N/A (no link) |
| **Whop Sync** | ❌ No | ✅ Yes | ❌ No |
| **Use Case** | External products | Your Whop products | Your digital assets |

## Important Notes

1. **Type cannot be changed after creation** (based on form removal, but validation still exists)
2. **AFFILIATE always needs a link** - used for external product promotion
3. **MY_PRODUCTS has two modes:**
   - Whop-synced: Has `whopProductId` and `link`
   - Digital asset: Has `storageUrl` but no `link`
4. **Affiliate parameters are only added in OFFER blocks**, not VALUE_DELIVERY blocks
5. **VALUE_DELIVERY blocks use links as-is** regardless of type



