# Whop Integration Implementation

## Overview

This document describes the complete implementation of the Whop app integration system that automatically syncs installed apps and memberships to create products in the ResourceLibrary.

## Features Implemented

### 1. **App Discovery System**
- Automatically fetches installed Whop apps via `/v5/app/app_connections` API
- Creates FREE products from installed apps
- **One-time sync only** when apps are installed (not on updates)
- Direct app-to-resource transformation (no separate mapping table)
- **Prevents duplicate syncing** - checks if experience already has app resources

### 2. **Membership Sync System**
- Fetches company memberships via `/v5/company/memberships` API
- Creates PAID products from memberships
- **One-time sync only** when memberships are created (not on updates)
- **Prevents duplicate syncing** - checks if experience already has membership resources
- Automatic categorization based on membership type

### 3. **Enhanced Analytics System**
- Split revenue tracking: `affiliate_revenue` and `product_revenue`
- Resource-specific analytics: clicks, conversions, revenue per resource
- Free clicks tracking for FREE_VALUE products
- Comprehensive funnel analytics with resource breakdown

### 4. **Click Tracking System**
- User-specific tracking links with parameters
- Automatic click counting and analytics
- Revenue tracking for conversions
- Redirect to actual Whop resources

## Database Schema Changes

### Updated `funnel_analytics` Table
```sql
-- Removed
- views (column removed)

-- Added
+ affiliate_revenue DECIMAL(10,2) DEFAULT '0' NOT NULL
+ product_revenue DECIMAL(10,2) DEFAULT '0' NOT NULL
+ free_clicks INTEGER DEFAULT 0 NOT NULL
+ resource_id UUID REFERENCES resources(id) ON DELETE CASCADE
+ resource_clicks INTEGER DEFAULT 0 NOT NULL
+ resource_conversions INTEGER DEFAULT 0 NOT NULL
+ resource_revenue DECIMAL(10,2) DEFAULT '0' NOT NULL
```

### Updated `resources` Table
```sql
-- Added
+ whop_app_id TEXT
+ whop_membership_id TEXT

-- Indexes
+ resources_whop_app_id_idx
+ resources_whop_membership_id_idx
+ resources_experience_whop_app_unique (unique constraint)
+ resources_experience_whop_membership_unique (unique constraint)
```

## API Endpoints

### 1. **App Sync Endpoint**
```
POST /api/sync/whop-apps
```
**Body:**
```json
{
  "experienceId": "uuid",
  "companyId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "synced": 5,
  "created": 3,
  "updated": 2,
  "errors": []
}
```

### 2. **Membership Sync Endpoint**
```
POST /api/sync/whop-memberships
```
**Body:**
```json
{
  "experienceId": "uuid",
  "companyId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "synced": 3,
  "created": 2,
  "updated": 1,
  "errors": []
}
```

### 3. **Click Tracking Endpoint**
```
POST /api/track/click
GET /api/track/click?resourceId=...&userId=...&experienceId=...&funnelId=...
```
**Body (POST):**
```json
{
  "resourceId": "uuid",
  "userId": "uuid",
  "experienceId": "uuid",
  "funnelId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "redirectUrl": "https://whop.com/hub/...",
  "resource": {
    "id": "uuid",
    "name": "string",
    "type": "MY_PRODUCTS",
    "category": "FREE_VALUE"
  }
}
```

### 4. **Webhook Endpoint**
```
POST /api/webhooks/whop
```
**Body:**
```json
{
  "event": "app.installed|membership.created|product.updated",
  "data": {
    "companyId": "string",
    "experienceId": "uuid",
    "appId": "string",
    "membershipId": "string",
    "productId": "string"
  }
}
```

## Core Classes

### 1. **WhopApiClient**
```typescript
// lib/whop-api-client.ts
export class WhopApiClient {
  async getInstalledApps(companyId: string): Promise<WhopApp[]>
  async getCompanyProducts(companyId: string): Promise<WhopProduct[]>
  async getCompanyMemberships(companyId: string): Promise<WhopMembership[]>
  async getAppById(appId: string): Promise<WhopApp | null>
  async getProductById(productId: string): Promise<WhopProduct | null>
  async getMembershipById(membershipId: string): Promise<WhopMembership | null>
}
```

### 2. **Resource Analytics**
```typescript
// lib/analytics/resource-analytics.ts
export async function trackResourceClick(...)
export async function trackResourceConversion(...)
export async function getFunnelAnalyticsSummary(...)
export function generateTrackingUrl(...)
```

## Data Flow

### 1. **App Discovery Flow (One-Time Only)**
```
App Installation Webhook → /api/webhooks/whop → syncApps() → 
Check if already synced → If not: WhopApiClient.getInstalledApps() → 
Transform to Resources → Store in Database (no updates)
```

### 2. **Membership Sync Flow (One-Time Only)**
```
Membership Creation Webhook → /api/webhooks/whop → syncMemberships() → 
Check if already synced → If not: WhopApiClient.getCompanyMemberships() → 
Transform to Resources → Store in Database (no updates)
```

### 3. **Click Tracking Flow**
```
User Clicks Link → /api/track/click → trackResourceClick() → 
Update Analytics → Redirect to Whop Resource
```

## Resource Transformation

### Apps → Resources
```typescript
{
  name: app.name || app.description || `App ${app.id}`,
  type: "MY_PRODUCTS",
  category: "FREE_VALUE",
  link: `https://whop.com/hub/${companyId}/${app.id}?ref=${experienceId}`,
  whopAppId: app.id
}
```

### Memberships → Resources
```typescript
{
  name: membership.name || membership.description || `Membership ${membership.id}`,
  type: "MY_PRODUCTS",
  category: "PAID",
  link: `https://whop.com/hub/${companyId}/memberships/${membership.id}?ref=${experienceId}`,
  whopMembershipId: membership.id
}
```

## Analytics Tracking

### Click Tracking
- Increments `resource_clicks` in `funnel_analytics`
- Increments `free_clicks` for FREE_VALUE products
- Tracks per resource, per funnel, per day

### Conversion Tracking
- Increments `resource_conversions` and `conversions`
- Adds revenue to `resource_revenue`
- Splits revenue into `affiliate_revenue` or `product_revenue` based on resource type

### Analytics Summary
```typescript
interface FunnelAnalyticsSummary {
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  affiliateRevenue: number;
  productRevenue: number;
  freeClicks: number;
  conversionRate: number;
  resourceBreakdown: ResourceAnalytics[];
}
```

## Environment Variables Required

```env
WHOP_API_KEY=your_whop_api_key
NEXT_PUBLIC_WHOP_APP_ID=your_whop_app_id
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Migration Files

1. **20250116000001_update_funnel_analytics.sql**
   - Removes `views` column
   - Adds revenue split and resource analytics fields
   - Migrates existing revenue data

2. **20250116000002_add_resource_tracking.sql**
   - Adds `whop_app_id` and `whop_membership_id` to resources
   - Creates indexes and unique constraints

## Testing

### Manual Testing
1. **App Sync**: Call `/api/sync/whop-apps` with valid experienceId and companyId
2. **Membership Sync**: Call `/api/sync/whop-memberships` with valid parameters
3. **Click Tracking**: Use generated tracking URLs and verify analytics updates
4. **Webhook Integration**: Send webhook events to `/api/webhooks/whop`

### Database Verification
```sql
-- Check synced resources
SELECT * FROM resources WHERE whop_app_id IS NOT NULL OR whop_membership_id IS NOT NULL;

-- Check analytics data
SELECT * FROM funnel_analytics WHERE resource_id IS NOT NULL;

-- Check revenue split
SELECT 
  SUM(affiliate_revenue) as total_affiliate_revenue,
  SUM(product_revenue) as total_product_revenue,
  SUM(free_clicks) as total_free_clicks
FROM funnel_analytics;
```

## Error Handling

- All API calls include comprehensive error handling
- Failed syncs are logged with detailed error messages
- Partial syncs continue processing remaining items
- Database constraints prevent duplicate resources

## Performance Considerations

- Database indexes on frequently queried fields
- Batch processing for large datasets
- Efficient upsert operations to prevent duplicates
- Cached WhopApiClient instance

## Security

- Webhook signature validation (recommended)
- User permission checks before sync operations
- Input validation and sanitization
- Secure environment variable handling

## One-Time Sync Behavior

The system is designed to sync apps and memberships **only once** when they are first installed/created:

### **App Sync Logic:**
1. **Check if already synced**: Query database for existing app resources for this experience
2. **If already synced**: Return early with "already synced" message
3. **If not synced**: Fetch all apps and create resources (one-time only)
4. **No updates**: Once created, resources are never updated

### **Membership Sync Logic:**
1. **Check if already synced**: Query database for existing membership resources for this experience
2. **If already synced**: Return early with "already synced" message
3. **If not synced**: Fetch all memberships and create resources (one-time only)
4. **No updates**: Once created, resources are never updated

### **Webhook Events:**
- **`app.installed`**: Triggers app sync (one-time only)
- **`membership.created`**: Triggers membership sync (one-time only)
- **`product.created`**: Triggers product sync (one-time only)
- **No update events**: `app.updated`, `membership.updated`, `product.updated` are ignored

### **Database Checks:**
```sql
-- Check if apps already synced
SELECT * FROM resources 
WHERE experience_id = ? 
AND type = 'MY_PRODUCTS' 
AND category = 'FREE_VALUE' 
AND whop_app_id IS NOT NULL;

-- Check if memberships already synced
SELECT * FROM resources 
WHERE experience_id = ? 
AND type = 'MY_PRODUCTS' 
AND category = 'PAID' 
AND whop_membership_id IS NOT NULL;
```

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live analytics
2. **Advanced Filtering**: Filter resources by type, category, date range
3. **Bulk Operations**: Batch sync multiple companies
4. **Analytics Dashboard**: Visual analytics interface
5. **A/B Testing**: Track different resource variations
