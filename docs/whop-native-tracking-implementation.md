# Whop Native Tracking Implementation

## Overview

This document explains how the Whop native tracking system is implemented and how to access tracking data for paid products.

## Current Implementation

### ✅ What's Working

1. **Free Products**: Direct app links (`https://whop.com/joined/{companyId}/{experienceId}/app/`)
2. **Paid Products**: Whop native tracking links created via API
3. **Funnel Analytics**: Custom tracking for interest, starts, intent, conversions
4. **Webhook Integration**: Purchase tracking via Whop webhooks

### 📊 Tracking Capabilities

#### For Paid Products (Whop Native Tracking):
- ✅ **Clicks**: Total number of people who clicked each product's tracking link
- ✅ **Revenue**: Total revenue generated from each specific product
- ✅ **Conversion Rate**: Percentage of clicks that resulted in purchases
- ✅ **Converted Users**: Number of unique users who purchased after clicking

#### For Free Products (Custom Tracking):
- ✅ **Interest**: Tracked when user enters `EXPERIENCE_QUALIFICATION` stage
- ✅ **Starts**: Tracked when welcome message is sent

## How to Access Tracking Data

### 1. Whop Dashboard (Recommended)
- Go to: `https://whop.com/dashboard/{companyId}/marketing/tracking-links`
- View detailed metrics for each tracking link
- See clicks, revenue, conversion rates per product

### 2. API Endpoint
- **GET** `/api/analytics/tracking-links?companyId={companyId}&experienceId={experienceId}`
- Returns comprehensive analytics data including:
  - Funnel analytics (starts, intent, conversions, interest)
  - Resource analytics (per-product metrics)
  - Growth percentages (daily comparisons)

### 3. Database Queries
- **Funnel Analytics**: `funnel_analytics` table
- **Resource Analytics**: `funnel_resource_analytics` table
- **Resources**: `resources` table

## API Usage Examples

### Get Analytics for a Company
```bash
curl "https://your-domain.com/api/analytics/tracking-links?companyId=biz_123&experienceId=exp_456"
```

### Create a New Tracking Link
```bash
curl -X POST "https://your-domain.com/api/analytics/tracking-links" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "biz_123",
    "planId": "plan_456",
    "linkName": "Product Launch Campaign",
    "destination": "checkout"
  }'
```

## Tracking Link Creation Process

### For Paid Products:
1. **API Call**: `whopSdk.plans.createQuickLink()`
2. **Parameters**: Plan ID, company ID, link name, destination
3. **Result**: Whop native tracking URL with built-in analytics
4. **Analytics**: Automatically tracked by Whop's system

### For Free Products:
1. **Direct Link**: `https://whop.com/joined/{companyId}/{experienceId}/app/`
2. **Analytics**: Custom tracking via UserChat entry
3. **Interest Tracking**: When user enters `EXPERIENCE_QUALIFICATION` stage

## Metrics Available

### Per-Product Metrics (Paid Products):
- **Clicks**: Number of people who clicked the tracking link
- **Revenue**: Total revenue generated from that product
- **Conversion Rate**: Percentage of clicks that resulted in purchases
- **Converted Users**: Number of unique users who purchased

### Funnel-Level Metrics (All Products):
- **Starts**: When welcome message is sent
- **Interest**: When user enters UserChat
- **Intent**: When user clicks paid product links
- **Conversions**: When purchase is completed

### Growth Metrics:
- **Daily Growth**: Percentage change from yesterday
- **Yesterday's Metrics**: Stored for comparison
- **Growth Percentages**: Calculated automatically

## Limitations

### Current Limitations:
1. **API Access**: Whop's tracking link metrics API isn't fully documented
2. **Real-time Data**: Some metrics may have delays
3. **Historical Data**: Limited historical data access via API

### Workarounds:
1. **Dashboard Access**: Use Whop dashboard for detailed metrics
2. **Webhook Integration**: Real-time conversion tracking via webhooks
3. **Custom Analytics**: Funnel-level metrics stored in database

## Future Improvements

### Planned Enhancements:
1. **API Integration**: When Whop releases tracking metrics API
2. **Real-time Sync**: Automatic sync of Whop metrics to database
3. **Advanced Analytics**: More detailed reporting and insights
4. **Export Features**: CSV/JSON export of analytics data

## Troubleshooting

### Common Issues:

1. **No Tracking Data**: Check if tracking links are created correctly
2. **Missing Metrics**: Verify Whop dashboard access
3. **Webhook Failures**: Check webhook configuration and logs
4. **Database Errors**: Verify database connection and schema

### Debug Steps:

1. Check API logs for errors
2. Verify Whop API credentials
3. Test webhook endpoints
4. Check database connectivity
5. Review Whop dashboard for native metrics

## Support

For issues with:
- **Whop Native Tracking**: Check Whop documentation and support
- **Custom Analytics**: Review this implementation and logs
- **API Endpoints**: Check server logs and error messages
- **Database Issues**: Verify schema and connection settings
