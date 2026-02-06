# Triggers Implementation Analysis

**Last updated:** Based on current codebase state (conversation-trigger, webhook route, user-context, check-conversation, user-join-actions, simplified-conversation-actions).

---

## 1. Overview

Triggers determine **when** a funnel’s conversation is started. They are stored on the funnel as:

- **App triggers:** `funnels.app_trigger_type` + `funnels.app_trigger_config`
- **Membership triggers:** `funnels.membership_trigger_type` + `funnels.membership_trigger_config`

**Event vs trigger:** Webhooks (e.g. `membership.went_valid`, `membership.deactivated`) are **events**. Funnel **triggers** (e.g. `any_membership_buy`, `membership_buy`) use those events: when a webhook fires, we find funnels whose trigger type matches and create conversations (subject to guards and filters).

---

## 2. Schema and UI

### 2.1 Enum: `funnel_trigger_type` (schema)

Defined in `lib/supabase/schema.ts`:

| Value | Category | Used in findFunnelForTrigger? |
|-------|----------|------------------------------|
| `on_app_entry` | App | Yes |
| `no_active_conversation` | App | Yes |
| `qualification_merchant_complete` | App | Yes |
| `upsell_merchant_complete` | App | Yes |
| `delete_merchant_conversation` | App | Yes |
| `any_membership_buy` | Membership | Yes |
| `membership_buy` | Membership | Yes |
| `any_cancel_membership` | Membership | Yes |
| `cancel_membership` | Membership | Yes |

### 2.2 UI: TriggerBlock TRIGGER_OPTIONS

In `lib/components/funnelBuilder/TriggerBlock.tsx`, merchants can select:

- **App:** on_app_entry, no_active_conversation, qualification_merchant_complete, upsell_merchant_complete, delete_merchant_conversation  
- **Membership:** any_membership_buy, membership_buy, any_cancel_membership, cancel_membership  

**Note:** Membership webhooks are wired to any_membership_buy / membership_buy (and cancel_*) via membership_activated / membership_deactivated contexts.

---

## 3. Trigger Contexts and Hierarchy

Defined in `lib/helpers/conversation-trigger.ts`:

| TriggerContext | Trigger types tried (order) | Event / call site |
|----------------|----------------------------|-------------------|
| `app_entry` | on_app_entry, no_active_conversation | App load / user context when no active convo |
| `membership_activated` | any_membership_buy, membership_buy | Webhook: membership.went_valid |
| `membership_deactivated` | any_cancel_membership, cancel_membership | Webhook: membership.deactivated |
| `funnel_completed` | qualification_merchant_complete, upsell_merchant_complete | After funnel completion (handleFunnelCompletionInUserChat) |
| `merchant_conversation_deleted` | delete_merchant_conversation | Merchant closes conversation (manageConversation status: closed) |

For each context, `findFunnelForTrigger(experienceId, context, options)` walks the hierarchy until a deployed funnel matches (and passes filters). Tie-break: one random funnel if multiple match.

---

## 4. Call Sites and Implementation Status

### 4.1 App entry (app_entry)

| Call site | File | Behavior |
|-----------|------|----------|
| createConversationForNewCustomer | lib/context/user-context.ts | If !hasActiveConversation, findFunnelForTrigger(experienceId, 'app_entry', { userId, whopUserId }); create conversation and update to WELCOME. |
| check-conversation (no active convo) | app/api/userchat/check-conversation/route.ts | findFunnelForTrigger(experience.id, 'app_entry', { userId, whopUserId }); if funnel, create conversation and update to WELCOME. |

**Implemented:** Yes. Both use the same guard and same finder; hierarchy on_app_entry then no_active_conversation; app trigger filters (filterResourceIdsRequired / filterResourceIdsExclude) applied.

### 4.2 Membership activated (membership_activated)

| Call site | File | Behavior |
|-----------|------|----------|
| handleMembershipWentValidWebhook | app/api/webhook/route.ts | Resolve company_id (payload or from product_id via resources). Get all experiences for company. findExperiencesWithActiveFunnelForUser(companyId, user_id, 'membership_activated', product_id). For each match: if !hasActiveConversation(experienceId, user_id), create conversation. |

**Implemented:** Yes. Uses company_id only (not page_id). Multiple experiences per company can each get a conversation; per experience, at most one active conversation per user.

**Filters:** membership_buy: funnel only matches if config.resourceId’s resource has whopProductId or planId equal to webhook product_id. any_membership_buy: no product filter. Membership filters (filterResourceIdsRequired / filterResourceIdsExclude) applied in findFunnelForTrigger.

### 4.3 Membership deactivated (membership_deactivated)

| Call site | File | Behavior |
|-----------|------|----------|
| handleMembershipDeactivatedWebhook | app/api/webhook/route.ts | Same pattern as membership_activated: resolve by company_id, findExperiencesWithActiveFunnelForUser(..., 'membership_deactivated', ...), for each match hasActiveConversation guard then create conversation. |

**Implemented:** Yes. Same company correlation and per-experience guard as membership_activated.

### 4.4 Funnel completed (funnel_completed)

| Call site | File | Behavior |
|-----------|------|----------|
| handleFunnelCompletionInUserChat | lib/actions/simplified-conversation-actions.ts | Close current conversation. findFunnelForTrigger(experienceId, 'funnel_completed', { completedFunnelId, userId, whopUserId }). If funnel, create new conversation and update to WELCOME. |

**Implemented:** Yes. Only funnels whose appTriggerConfig or membershipTriggerConfig has funnelId === completedFunnelId are considered (qualification_merchant_complete or upsell_merchant_complete).

### 4.5 User join (separate from trigger hierarchy)

| Call site | File | Behavior |
|-----------|------|----------|
| handleUserJoinEvent | lib/actions/user-join-actions.ts | Resolve experience by page_id (company). hasActiveConversation guard. **Does not use findFunnelForTrigger.** Uses first deployed funnel for that experience; applies membershipTriggerConfig filter (filterResourceIdsRequired / filterResourceIdsExclude). Creates conversation (TRANSITION → WELCOME). |

**Note:** User join is its own event path; it does **not** use app_trigger_type or membership_trigger_type to pick a funnel. It always uses the first deployed funnel and applies membership filter only.

### 4.6 Merchant conversation deleted (merchant_conversation_deleted)

| Call site | File | Behavior |
|-----------|------|----------|
| manageConversation (when status set to closed) | lib/actions/livechat-actions.ts | After updating conversation to closed, calls startConversationForMerchantClosedTrigger(experienceId, whopUserId) in simplified-conversation-actions. That helper: hasActiveConversation guard, findFunnelForTrigger(experienceId, 'merchant_conversation_deleted', { userId, whopUserId }); if funnel, create conversation and update to WELCOME. |

**Implemented:** Yes. When merchant closes a conversation, a deployed funnel with trigger delete_merchant_conversation can start a new conversation for that user (same pattern as funnel_completed).

---

## 5. Guards

- **hasActiveConversation(experienceId, whopUserId):** Used before creating any new conversation in:
  - user-context (createConversationForNewCustomer)
  - check-conversation (before auto-start)
  - user-join-actions (handleUserJoinEvent)
  - webhook (handleMembershipWentValidWebhook, handleMembershipDeactivatedWebhook) — per experience: if already active in that experience, skip creating another there
  - livechat-actions (startConversationForMerchantClosedTrigger when merchant closes conversation)
- **DB constraint:** One active conversation per (experienceId, whopUserId) (e.g. partial unique on status = 'active').

---

## 6. Config Used in findFunnelForTrigger

- **appTriggerConfig / membershipTriggerConfig:**
  - **filterResourceIdsRequired / filterResourceIdsExclude:** Applied for app_entry, membership_activated, membership_deactivated, funnel_completed, merchant_conversation_deleted (via getMemberResourceIds + memberPassesTriggerFilter).
  - **funnelId:** Used only for funnel_completed to match “run after this funnel” (app or membership config).
  - **resourceId (membershipTriggerConfig):** Used for membership_buy and cancel_membership to match webhook productId to resource (whopProductId or planId).

---

## 7. Triggers Not Wired to Conversation Creation

All trigger types in the schema and UI are now wired to an event path. (The deprecated trigger `membership_valid` was removed; membership activation uses any_membership_buy / membership_buy.)

---

## 8. Summary Table

| Trigger | Category | Event / call site | Implemented |
|---------|----------|-------------------|-------------|
| on_app_entry | App | User context, check-conversation (no active) | Yes |
| no_active_conversation | App | Same (fallback in hierarchy) | Yes |
| qualification_merchant_complete | App | handleFunnelCompletionInUserChat | Yes |
| upsell_merchant_complete | App | handleFunnelCompletionInUserChat | Yes |
| delete_merchant_conversation | App | manageConversation (status: closed) → startConversationForMerchantClosedTrigger | Yes |
| any_membership_buy | Membership | membership.went_valid webhook | Yes |
| membership_buy | Membership | membership.went_valid webhook (with productId filter) | Yes |
| any_cancel_membership | Membership | membership.deactivated webhook | Yes |
| cancel_membership | Membership | membership.deactivated webhook (with productId filter) | Yes |

---

## 9. File Reference

| File | Role |
|------|------|
| lib/helpers/conversation-trigger.ts | hasActiveConversation, findFunnelForTrigger, TriggerContext, TRIGGER_HIERARCHY |
| lib/helpers/trigger-filter.ts | getMemberResourceIds, memberPassesTriggerFilter |
| app/api/webhook/route.ts | handleMembershipWentValidWebhook, handleMembershipDeactivatedWebhook; resolveCompanyIdFromMembershipPayload; findExperiencesWithActiveFunnelForUser |
| lib/context/user-context.ts | createConversationForNewCustomer (app_entry) |
| app/api/userchat/check-conversation/route.ts | App entry when no active conversation |
| lib/actions/simplified-conversation-actions.ts | handleFunnelCompletionInUserChat (funnel_completed), startConversationForMerchantClosedTrigger (merchant_conversation_deleted) |
| lib/actions/livechat-actions.ts | manageConversation (calls startConversationForMerchantClosedTrigger when status set to closed) |
| lib/actions/user-join-actions.ts | handleUserJoinEvent (uses hasActiveConversation; does not use findFunnelForTrigger) |
| lib/components/funnelBuilder/TriggerBlock.tsx | TRIGGER_OPTIONS (UI) |
| lib/supabase/schema.ts | funnelTriggerTypeEnum, funnels.app_trigger_type, funnels.membership_trigger_type, config columns |
