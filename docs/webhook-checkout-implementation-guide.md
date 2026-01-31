# Webhook & Checkout Implementation Guide

This guide covers how to implement webhook handling, create checkout configurations using existing plan IDs, and open the inAppPurchase modal.

## Quick Configuration Summary

- **Webhook URL**: `https://poppy-board-app.vercel.app/api/webhooks/whop`
- **Webhook Secret**: `WHOP_WEBHOOK_SECRET` (from environment variables)
- **Plans**: Hardcoded in checkout function (no database lookup needed)
  - `plan_qcE7vsVzSsj0C` → 250 credits (Pro)
  - `plan_rUXdUumCuANuP` → 100 credits (Popular)
  - `plan_paQewmRq1rOm3` → 50 credits (Starter)
- **Metadata**: Only contains `credits` field
- **User Identification**: Only uses `user_id` from webhook (no experience filtering)
- **No Experience Lookup**: Checkout creation and webhook don't query experience table
- **Credits Implementation**: To be implemented later (currently logged only)

## Table of Contents
1. [Webhook Setup](#webhook-setup)
2. [Creating Checkout Configuration](#creating-checkout-configuration)
3. [Opening In-App Purchase Modal](#opening-in-app-purchase-modal)
4. [Webhook Handling with Metadata](#webhook-handling-with-metadata)
5. [Complete Flow Example](#complete-flow-example)

---

## 1. Webhook Setup

### 1.1 Environment Variables

Add to your `.env` file:

```env
WHOP_WEBHOOK_SECRET=your_webhook_secret_from_whop
WHOP_API_KEY=your_api_key
```

**Note**: `NEXT_PUBLIC_WHOP_APP_ID` is not required for checkout configuration creation - only `WHOP_API_KEY` is needed.

### 1.2 Webhook Route Structure

Create or update `/app/api/webhooks/whop/route.ts`:

```typescript
import { makeWebhookValidator, type PaymentWebhookData } from "@whop/api";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";

// Validate webhook secret exists
if (!process.env.WHOP_WEBHOOK_SECRET) {
  throw new Error("WHOP_WEBHOOK_SECRET environment variable is required");
}

const validateWebhook = makeWebhookValidator({
  webhookSecret: process.env.WHOP_WEBHOOK_SECRET,
});

export async function POST(request: Request) {
  try {
    // Validate the webhook to ensure it's from Whop
    const webhook = await validateWebhook(request);

    // Handle payment.succeeded event
    if (webhook.action === "payment.succeeded") {
      // Use after() to process webhook asynchronously
      // This ensures we return 200 quickly to prevent retries
      after(handlePaymentSucceededWebhook(webhook.data));
    }

    // Always return 200 quickly to acknowledge receipt
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook validation error:", error);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }
}

async function handlePaymentSucceededWebhook(data: PaymentWebhookData) {
  const { id, user_id, metadata, plan_id } = data;

  if (!user_id) {
    console.error("Missing user_id in webhook");
    return;
  }

  // Verify user exists and process payment
  // Implementation details in section 4
}
```

### 1.3 Configure Webhook URL in Whop Dashboard

1. Go to your Whop App Dashboard
2. Navigate to Webhooks section
3. Add webhook URL: `https://poppy-board-app.vercel.app/api/webhooks/whop`
4. Select events: `payment.succeeded`
5. Copy the webhook secret and add to `.env` as `WHOP_WEBHOOK_SECRET`

---

## 2. Creating Checkout Configuration

### 2.1 Hardcoded Plans Configuration

Plans are hardcoded in the function with their credit metadata:

```typescript
// Plan configurations
const PLANS = {
  "plan_qcE7vsVzSsj0C": {
    credits: 250,
    name: "Pro Plan",
  },
  "plan_rUXdUumCuANuP": {
    credits: 100,
    name: "Popular Plan",
  },
  "plan_paQewmRq1rOm3": {
    credits: 50,
    name: "Starter Plan",
  },
} as const;

type PlanId = keyof typeof PLANS;
```

### 2.2 API Route for Checkout Creation

Create `/app/api/checkout/create/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { experiences } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";

// Hardcoded plan configurations
const PLANS = {
  "plan_qcE7vsVzSsj0C": {
    credits: 250,
    name: "Pro Plan",
  },
  "plan_rUXdUumCuANuP": {
    credits: 100,
    name: "Popular Plan",
  },
  "plan_paQewmRq1rOm3": {
    credits: 50,
    name: "Starter Plan",
  },
} as const;

type PlanId = keyof typeof PLANS;

/**
 * POST /api/checkout/create - Create checkout with credits metadata
 * 
 * Body:
 * - planId: string (Whop plan ID - must be one of the hardcoded plans)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { error: "planId is required" },
        { status: 400 }
      );
    }

    // 1. Validate planId exists in hardcoded plans
    if (!(planId in PLANS)) {
      return NextResponse.json(
        { error: `Invalid planId. Must be one of: ${Object.keys(PLANS).join(", ")}` },
        { status: 400 }
      );
    }

    const planConfig = PLANS[planId as PlanId];

    // 2. Build metadata with only credits
    const planMetadata = {
      credits: planConfig.credits,  // Only credits in metadata
    };

    // 3. Create checkout configuration using Whop Client SDK
    const Whop = (await import('@whop/sdk')).default;
    const client = new Whop({
      apiKey: process.env.WHOP_API_KEY!,
    });
    
    // Create checkout configuration with plan reference
    // Note: When referencing an existing plan by plan_id, company_id is NOT required
    // (company_id is only needed when creating a NEW plan)
    const checkout = await client.checkoutConfigurations.create({
      plan_id: planId, // Reference existing plan by ID
      metadata: planMetadata,
    } as any);

    console.log(`✅ Created checkout for plan ${planId} (${planConfig.credits} credits): ${checkout.id}`);

    return NextResponse.json({
      checkoutId: checkout.id,
      planId: checkout.plan?.id || planId,
      credits: planConfig.credits,
    });
  } catch (error: any) {
    console.error("Error creating checkout:", error);
    const errorMessage = error?.message || error?.response?.data?.message || "Failed to create checkout";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
```

### 2.3 Key Points

- **Plans are hardcoded**: No database lookup needed - plans are defined in the function
- **Metadata contains only credits**: Only the credits value is included in metadata
- **No experience lookup**: No database queries for experience - simplified implementation
- **No appID required**: Only `apiKey` is needed for Whop SDK initialization
- **No company_id required**: When referencing existing plans by `plan_id`, company_id is NOT needed (only required when creating new plans)
- **Plan validation**: Only accepts the two hardcoded plan IDs

---

## 3. Opening In-App Purchase Modal

### 3.1 Frontend Implementation

In your React component (e.g., purchase button):

```typescript
import { useWhop } from "@whop-apps/sdk/react";

export function PurchaseButton({ planId }: { planId: string }) {
  const { iframeSdk, isInIframe } = useWhop();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Verify we're in Whop iframe
      if (!isInIframe || !iframeSdk) {
        setError("Please access this app through Whop to make purchases.");
        return;
      }

      // 2. Create checkout configuration
      const response = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout");
      }

      const { checkoutId, planId: checkoutPlanId } = await response.json();

      // 3. Open in-app purchase modal
      const result = await iframeSdk.inAppPurchase({
        planId: checkoutPlanId,  // The plan ID from checkout
        id: checkoutId,           // The checkout configuration ID
      });

      // 4. Handle result
      if (result.status === "ok") {
        console.log("✅ Purchase successful!");
        // The webhook will handle the actual subscription/credits update
        // You can show a success message or refresh user data
      } else {
        console.error("Purchase failed:", result);
        setError("Purchase was cancelled or failed.");
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      setError(error.message || "Failed to process purchase");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handlePurchase} 
      disabled={isLoading}
    >
      {isLoading ? "Processing..." : "Purchase"}
    </button>
  );
}
```

### 3.2 Complete Example with Error Handling

```typescript
import { useState } from "react";
import { useWhop } from "@whop-apps/sdk/react";

interface PurchaseConfig {
  planId: string;
  onSuccess?: () => void;
}

export function usePurchase() {
  const { iframeSdk, isInIframe } = useWhop();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchase = async (config: PurchaseConfig) => {
    const { planId, onSuccess } = config;

    try {
      setIsLoading(true);
      setError(null);

      // Validation
      if (!isInIframe || !iframeSdk) {
        throw new Error("Please access this app through Whop to make purchases.");
      }

      if (!planId) {
        throw new Error("Plan ID is required");
      }

      // Step 1: Create checkout
      console.log(`Creating checkout for plan ${planId}...`);
      const checkoutResponse = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json();
        throw new Error(errorData.error || "Failed to create checkout");
      }

      const { checkoutId, planId: checkoutPlanId } = await checkoutResponse.json();
      console.log(`✅ Checkout created: ${checkoutId}`);

      // Step 2: Open purchase modal
      console.log(`Opening purchase modal...`);
      const purchaseResult = await iframeSdk.inAppPurchase({
        planId: checkoutPlanId,
        id: checkoutId,
      });

      // Step 3: Handle result
      if (purchaseResult.status === "ok") {
        console.log("✅ Purchase completed successfully");
        onSuccess?.();
        return { success: true, checkoutId, planId: checkoutPlanId };
      } else {
        throw new Error("Purchase was cancelled or failed");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to process purchase";
      console.error("Purchase error:", errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return { purchase, isLoading, error };
}
```

---

## 4. Webhook Handling with Metadata

### 4.1 Complete Webhook Handler

Update your webhook handler to process payments using only `user_id`:

```typescript
// app/api/webhooks/whop/route.ts

import { makeWebhookValidator, type PaymentWebhookData } from "@whop/api";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { users } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";

// Validate webhook secret exists
if (!process.env.WHOP_WEBHOOK_SECRET) {
  throw new Error("WHOP_WEBHOOK_SECRET environment variable is required");
}

const validateWebhook = makeWebhookValidator({
  webhookSecret: process.env.WHOP_WEBHOOK_SECRET,
});

export async function POST(request: Request) {
  try {
    // Validate the webhook to ensure it's from Whop
    const webhook = await validateWebhook(request);

    // Handle payment.succeeded event
    if (webhook.action === "payment.succeeded") {
      // Use after() to process webhook asynchronously
      // This ensures we return 200 quickly to prevent retries
      after(handlePaymentSucceededWebhook(webhook.data));
    }

    // Always return 200 quickly to acknowledge receipt
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook validation error:", error);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }
}

async function handlePaymentSucceededWebhook(data: PaymentWebhookData) {
  const { id, user_id, metadata, plan_id } = data;

  console.log(`[WEBHOOK] Processing payment ${id} for user ${user_id}`);

  if (!user_id) {
    console.error("[WEBHOOK] Missing user_id");
    return;
  }

  try {
    // 1. Extract credits from metadata (only field in metadata)
    const credits = metadata?.credits ? Math.floor(Number(metadata.credits)) : undefined;
    const planIdValue = plan_id;

    if (!credits) {
      console.error("[WEBHOOK] Missing credits in metadata");
      return;
    }

    // 2. Find user by user_id only (Whop user ID)
    const user = await db.query.users.findFirst({
      where: eq(users.whopUserId, user_id),
    });

    if (!user) {
      console.error(`[WEBHOOK] User not found: ${user_id}`);
      return;
    }

    console.log(`[WEBHOOK] Found user ${user.id} for Whop user ${user_id}`);

    // 3. Handle credits purchase (to be implemented later)
    console.log(`[WEBHOOK] Credits purchase detected: ${credits} credits for user ${user_id} (implementation pending)`);
    // await addCredits(user_id, credits);

    console.log(`[WEBHOOK] ✅ Successfully processed payment ${id}`);

  } catch (error) {
    console.error(`[WEBHOOK] Error processing payment:`, error);
  }
}

```

### 4.2 Key Points for Webhook Handling

1. **User Identification**: Only uses `user_id` from webhook (Whop user ID)
2. **User Lookup**: Finds user by `whopUserId` only (no experience filtering)
3. **Metadata Extraction**: Only extracts `credits` from metadata (only field present)
4. **Error Handling**: Logs errors but doesn't throw (to prevent webhook retries)
5. **Simplified Flow**: No experience lookup, order tracking, or membership handling

---

## 5. Complete Flow Example

### 5.1 End-to-End Flow

```
1. User clicks "Purchase Subscription" button
   ↓
2. Frontend calls /api/checkout/create with planId
   ↓
3. Backend:
   - Validates planId against hardcoded plans
   - Gets plan credits from hardcoded config
   - Creates checkout configuration with metadata (only credits)
   - Returns checkoutId and planId
   ↓
4. Frontend calls iframeSdk.inAppPurchase({ planId, id: checkoutId })
   ↓
5. Whop shows purchase modal to user
   ↓
6. User completes payment
   ↓
7. Whop sends webhook to https://poppy-board-app.vercel.app/api/webhooks/whop
   ↓
8. Webhook handler:
   - Validates webhook signature
   - Extracts user_id and credits from metadata
   - Finds user by user_id only
   - Processes credits (to be implemented)
   ↓
9. User's subscription is now active
```

### 5.2 Testing the Flow

1. **Test Checkout Creation**:
```bash
curl -X POST http://localhost:3000/api/checkout/create \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "plan_qcE7vsVzSsj0C"
  }'
```

Response:
```json
{
  "checkoutId": "checkout_xxx",
  "planId": "plan_qcE7vsVzSsj0C",
  "credits": 250
}
```

2. **Test Webhook** (use Whop's webhook testing tool or simulate):
```bash
curl -X POST http://localhost:3000/api/webhooks/whop \
  -H "Content-Type: application/json" \
  -H "X-Whop-Signature: ..." \
  -d '{
    "action": "payment.succeeded",
    "data": {
      "id": "pay_xxx",
      "user_id": "user_xxx",
      "plan_id": "plan_qcE7vsVzSsj0C",
      "metadata": {
        "credits": 250
      }
    }
  }'
```

---

## 6. Important Notes

### 6.1 Credits Implementation (Future)

Currently, the webhook logs credits but doesn't add them. To implement:

1. Create `addCredits()` function that updates user's credit balance
2. Uncomment the call in `handlePaymentSucceededWebhook()`:
   ```typescript
   if (paymentType === "Credits" && credits) {
     await addCredits(user_id, experienceId, credits);
   }
   ```
3. Ensure proper error handling and user lookup

### 6.2 Available Plans

The system currently supports three hardcoded plans:

- **plan_qcE7vsVzSsj0C**: 250 credits (Pro)
- **plan_rUXdUumCuANuP**: 100 credits (Popular)
- **plan_paQewmRq1rOm3**: 50 credits (Starter)

To add more plans, update the `PLANS` constant in `/app/api/checkout/create/route.ts`.

### 6.2 Security Considerations

- ✅ Webhook signature validation (prevents unauthorized requests)
- ✅ User lookup by user_id + experienceId (prevents cross-experience access)
- ✅ Metadata validation (ensures required fields exist)
- ✅ Error logging (helps debug issues without breaking webhook)

### 6.3 Database Requirements

Ensure these tables exist:
- `users` (with `whopUserId` column - used for user lookup)

**Note**: 
- Plans are hardcoded in the checkout creation function, so no `subscriptions` or `plans` tables are needed
- No experience lookup is performed in checkout creation or webhook handling
- No order tracking is performed

---

## 7. Troubleshooting

### Common Issues

1. **"Invalid planId"**: Plan ID must be one of: `plan_qcE7vsVzSsj0C` (250 credits - Pro), `plan_rUXdUumCuANuP` (100 credits - Popular), or `plan_paQewmRq1rOm3` (50 credits - Starter)
2. **"User not found"**: User must exist in `users` table with matching `whopUserId`
3. **"Missing credits in metadata"**: Ensure checkout was created with credits in metadata
4. **Webhook validation fails**: Check `WHOP_WEBHOOK_SECRET` matches Whop dashboard
5. **Purchase modal doesn't open**: Ensure app is accessed through Whop iframe
6. **Webhook URL mismatch**: Ensure webhook URL in Whop dashboard is `https://poppy-board-app.vercel.app/api/webhooks/whop`

---

## 8. Next Steps

1. ✅ Implement webhook route with validation
2. ✅ Create checkout configuration API
3. ✅ Implement frontend purchase flow
4. ⏳ Implement credits addition (future)
5. ⏳ Implement messages addition (future)
6. ⏳ Add analytics tracking
7. ⏳ Add email notifications
