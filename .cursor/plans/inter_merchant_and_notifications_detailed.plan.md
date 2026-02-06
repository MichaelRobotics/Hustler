# Inter-Merchant Trigger-Based Conversations + Notifications & UpSell (Detailed)

## Core idea

**Conversations are started by events** (e.g. user buys a product on Whop, enters the app, or completes a funnel). When the user opens chat, they see the conversation that was already created by that event. **Notifications and UpSell behavior run only inside an existing merchant conversation** — they are part of the same flow, not a separate system.

**Order of the flow:**

1. **Event happens** (app entry, membership valid, purchase, funnel completed, or “no active conversation” on app load).
2. **Guard:** If the user already has an active conversation in this experience → do nothing (no second conversation).
3. **Find funnel:** For that event type, pick the right merchant funnel (trigger hierarchy + filters).
4. **Create conversation** (and optionally send first message / set current block).
5. **User opens chat later** → they see that conversation.
6. **Inside the conversation:** stage progression, timeout-based notifications (reminders when they don’t click in the current stage), and — if the funnel is UpSell — no option buttons in OFFER, advance to next offer on purchase, hide previous offer.

So: **event → one active conversation per user per experience → user sees it in chat → notification and UpSell logic run within that conversation.**

---

# Part 1: Event-Triggered Conversations (Inter-Merchant)

## 1.1 What “event-triggered” means

Conversations are **not** created only when the user opens chat. They are created when certain **events** occur:

| Event | When it fires | Result |
|-------|----------------|--------|
| **App entry** | User enters the app / experience (e.g. `createUserContext`, check-conversation when no active convo). | If no active conversation, find funnel for `app_entry` (e.g. `on_app_entry`, then `no_active_conversation`) and create conversation. User sees it when they open chat. |
| **Membership activated** | Webhook: `membership.went_valid` (user’s membership became valid). | If no active conversation, find funnel for `membership_activated` (any_membership_buy, membership_buy) and create conversation. User sees it when they open chat. |
| **User join** | Webhook or internal: user joined a product/experience. | Guard only today: if user already has active conversation, do not create another. (Later: can also create convo if no active.) |
| **Funnel completed** | User completes a funnel (e.g. qualification or upsell). | After closing current conversation, find funnel for `funnel_completed` (e.g. `qualification_merchant_complete`, `upsell_merchant_complete`) matching the completed funnel; if found, create **new** conversation for the “next” merchant. User sees it when they open chat. |
| **No active conversation (app load)** | User opens chat / check-conversation runs and there is no active conversation. | Find funnel for `app_entry` and optionally auto-start a conversation so user sees a first message when they open chat. |

So: **e.g. “user buys product on Whop”** can be the event that triggers creating a conversation (if that event is wired to “membership valid” or a dedicated purchase trigger). When the user **enters chat**, they don’t “start” the conversation — they **see** the conversation that was already started by the event.

## 1.2 Guard: one active conversation per user per experience

Before creating any new conversation:

- Call **`hasActiveConversation(experienceId, whopUserId)`**.
- If it returns `true`, **do not** create a new conversation (trigger is ignored for that user in that experience).
- This applies to **all** event paths above (app entry, membership valid, user join, funnel completed, no active on app load).

So only one merchant conversation is active at a time per user per experience; the next one starts only after the current one is closed (e.g. funnel completed → close → then maybe start next funnel’s conversation).

## 1.3 Finding the right funnel for the event

Introduce **`findFunnelForTrigger(experienceId, triggerContext, options?)`**:

- **`triggerContext`** describes the event: `'app_entry'` | `'membership_activated'` | `'membership_deactivated'` | `'funnel_completed'` | `'merchant_conversation_deleted'`.
- For each context, define a **trigger-type hierarchy** (e.g. for `app_entry`: prefer `on_app_entry`, then `no_active_conversation`).
- Among deployed funnels that match the chosen trigger type, apply **filters** (e.g. `appTriggerConfig`, `membershipTriggerConfig`).
- If multiple funnels still match, pick one **randomly** (tie-break).
- For `funnel_completed`, pass the completed funnel id so only triggers that reference that funnel (e.g. “after this qualification funnel, go to this upsell merchant”) are considered.

**Returns:** the funnel to use for the new conversation, or `null` if none.

## 1.4 Call sites (where events create conversations)

| Call site | Event | Action |
|-----------|------|--------|
| **createConversationForNewCustomer** (user-context) | App entry | If `!hasActiveConversation`, call `findFunnelForTrigger(..., 'app_entry')`; if funnel, create conversation. |
| **check-conversation API** (when no active convo) | No active on app load | Call `findFunnelForTrigger(..., 'app_entry')`; if funnel, optionally create conversation so user sees first message. |
| **handleMembershipWentValidWebhook** (webhook) | Membership activated | If `!hasActiveConversation`, call `findFunnelForTrigger(..., 'membership_activated')`; if funnel, create conversation. |
| **handleUserJoinEvent** (user-join-actions) | User join | Add `hasActiveConversation` guard so we never create a second conversation if one is active. |
| **handleFunnelCompletionInUserChat** (simplified-conversation-actions) | Funnel completed | After closing current conversation, call `findFunnelForTrigger(..., 'funnel_completed', { completedFunnelId })`; if next funnel, create new conversation for that funnel. |

All of these use the **same** guard and the **same** finder (with different trigger contexts). The conversation is created at **event time**; when the user **enters chat**, they simply load that conversation.

## 1.5 Files and helpers

- **New shared module** (e.g. `lib/helpers/conversation-trigger.ts` or under `lib/actions`):
- `hasActiveConversation(experienceId, whopUserId): Promise<boolean>`
- `findFunnelForTrigger(experienceId, triggerContext, options?): Promise<Funnel | null>`
- **Update:** `lib/context/user-context.ts`, `app/api/userchat/check-conversation/route.ts`, `app/api/webhook/route.ts`, `lib/actions/user-join-actions.ts`, `lib/actions/simplified-conversation-actions.ts` to call these and create conversations as in the table above.

---

# Part 2: Notifications & UpSell (Inside the Merchant Flow)

**Important:** Notification flow and UpSell behavior run **only after** a conversation with a merchant has been started. They are part of the **same** conversation lifecycle: same `conversationId`, same `currentBlockId`, same funnel.

## 2.1 When notifications apply

- User already has an **active conversation** (created by one of the events in Part 1).
- Conversation has a **current block** (`currentBlockId`) and thus a **current stage** (Qualification stage or OFFER stage for UpSell).
- **Inactivity** = user has not clicked any option (Qualification) or has not clicked the offer CTA (UpSell OFFER) since entering that block.
- **Reminder** = after X minutes of inactivity, send a **push notification** to the user using the Whop API, with the notification **text** from `funnel_notifications` (existing table: `stageId`, `sequence`, `inactivityMinutes`, `message`, isReset, resetAction, delayMinutes). Notifications are sent **per user per conversation** according to each conversation’s status (current block, stage, and which sequence is due).

So: **notification flow starts after the conversation with the merchant is started** — it runs **inside** that conversation, per stage. Each user receives only the reminder that matches their conversation’s current stage and sequence.

## 2.2 Schema and state for notifications

- **Conversations table:** add `currentBlockEnteredAt` (timestamp, nullable). Meaning: “user entered this block at this time.” Inactivity is measured from this time.
- Optionally add `lastNotificationSequenceSent` (integer, nullable) to know we already sent sequence 1, 2, or 3 for this block entry; when `currentBlockId` changes, reset it.
- **Whenever `currentBlockId` is set** (create conversation, navigate-funnel, processValidOptionSelection, user-join conversation creation): set `currentBlockEnteredAt = now()` and reset “last notification sequence” for this block.

So the **merchant flow** (same conversation, same funnel) is extended with: “when did the user enter this block?” and “which reminder(s) did we already send?”.

## 2.3 Cron: send funnel notifications (Whop API, open app on click)

- **New route:** e.g. `app/api/cron/send-funnel-notifications/route.ts`.
- For each **active** conversation, determine **per user per conversation** whether a reminder is due (using conversation status: `currentBlockId`, `currentBlockEnteredAt`, funnel + stage, and which notification sequence has already been sent).
- Logic per conversation:
- Resolve **stage** from `currentBlockId` and funnel flow.
- Load `funnel_notifications` for that funnel + stage, ordered by `sequence` (1, 2, 3).
- For each notification row: if `(now - currentBlockEnteredAt) >= inactivityMinutes` and this sequence not yet sent for this conversation, then:
- **Send a push notification** via the [Whop Create Notification API](https://docs.whop.com/api-reference/notifications/create-notification) using **SendNotificationV2InputWithExperienceId**:
- **`experience_id`** — experience the conversation belongs to (required). When the user clicks the notification, Whop opens your **experience view** (your app).
- **`user_ids`** — `[conversation.whopUserId]` so only this user receives this reminder (per user per conversation).
- **`title`** — short title (e.g. “Reminder” or configurable per funnel/stage).
- **`content`** — the notification text: **`notification.message`** from `funnel_notifications` (the reminder copy for this stage/sequence).
- **`rest_path`** (optional) — path to append to the deep link so the app opens to a specific view (e.g. chat/conversation). Use `[restPath]` in your app path in the Whop dashboard to read this and open the right conversation.
- Mark this sequence as sent for this conversation (e.g. update `lastNotificationSequenceSent` or equivalent).
- Optionally also insert a **bot** message into the conversation with the same `notification.message` so when the user opens the app they see the reminder in chat.
- If a row has `isReset === true`, after all non-reset notifications and after `delayMinutes`, run reset (e.g. delete conversation or mark complete per `resetAction`).
- Applies to **Qualification** stages (remind when they don’t click any option) and **UpSell OFFER** stage (remind when they don’t click the offer).

**Summary:** Use the notification **text** from `funnel_notifications.message` as the push **content**; target **one user per conversation** via `user_ids`; use **experience_id** so the notification opens the app when the user clicks; use **rest_path** to open the app to the conversation/chat view. This keeps notifications **integrated** with the merchant flow: same conversation, same stages, same funnel config.

## 2.4 UpSell: no navigation in OFFER

- In **UpSell** funnels, in the **OFFER** stage, the user should **not** see option buttons (no “1. Option A”, “2. Option B”). They only see the offer message and the CTA link (e.g. “Get Started!”).
- **UserChat:** When funnel is UpSell and current stage is OFFER, derive `options = []` for rendering (even if the block has options in the flow for builder/canvas). So the options list is not shown; only the last bot message (with CTA) is shown.
- Pass funnel type (e.g. `merchantType === 'upsell'`) and `stageInfo.currentStage` into UserChat from the parent (CustomerView / live chat) so this logic is correct.

## 2.5 UpSell: advance to next offer on purchase

- When a **payment succeeds** (webhook), resolve the user’s **active** conversation for that experience.
- If the conversation’s funnel is **UpSell** and `currentBlockId` is an **OFFER** block for the **purchased** product/resource:
- Compute the **next OFFER** block in the flow (next in same OFFER stage or first block of next OFFER stage, per flow design).
- Update conversation: `currentBlockId = nextOfferBlockId`, `currentBlockEnteredAt = now()`, reset notification state.
- Insert a **bot** message with the next offer content (same format as navigate-funnel, including [LINK] if applicable).
- If there is no next offer, optionally complete funnel or close conversation.

So the **merchant flow** continues in the **same** conversation: purchase → advance block → show next offer. No separate “UpSell system”; it’s the same event-triggered conversation with UpSell-specific rules.

## 2.6 UpSell: hide previous offer (“deletion of previous”)

- When we advance to the next offer after purchase, we add a **new** bot message. In the UI, we do **not** show the previous OFFER-stage message(s) so the user only sees the **latest** offer (and all non-OFFER messages).
- **UserChat** (when funnel is UpSell): when building the message list, filter so that for OFFER-stage messages only the **latest** one is shown (e.g. by metadata or by knowing current block history). All other stages show full history.

So “deletion of previous” = **hide** previous offer in the list; the flow is “show next in flow” with the previous offer removed from view.

## 2.7 Files for Part 2

- **Schema:** `lib/supabase/schema.ts` — add `currentBlockEnteredAt` (and optional `lastNotificationSequenceSent`) on `conversations`; migration in `drizzle/`.
- **Set entered-at:** `app/api/userchat/navigate-funnel/route.ts`, `lib/actions/simplified-conversation-actions.ts`, `lib/actions/user-join-actions.ts` (wherever `currentBlockId` is set).
- **Cron:** `app/api/cron/send-funnel-notifications/route.ts` — for each conversation due for a reminder, call Whop API `POST /notifications` with [SendNotificationV2InputWithExperienceId](https://docs.whop.com/api-reference/notifications/create-notification#sendnotificationv2inputwithexperienceid) (`experience_id`, `user_ids`, `title`, `content` = notification message, optional `rest_path`). Requires `notification:create` permission and app API key.
- **UserChat:** `lib/components/userChat/UserChat.tsx` — accept funnel type; hide options for UpSell OFFER; filter OFFER messages to “only latest” when UpSell.
- **Webhook:** `app/api/webhook/route.ts` — on purchase, advance UpSell conversation to next OFFER block when applicable.

---

# How the two parts connect

1. **Event** (app entry, membership valid, purchase, funnel completed, no active) → **Guard** → **findFunnelForTrigger** → **Create conversation**.
2. User **opens chat** → sees that conversation (no “second plan”; it’s the same event-triggered system).
3. **Inside** that conversation: stages advance (navigate-funnel, processValidOptionSelection), **notifications** run per stage (cron: per user per conversation, call Whop Create Notification API with notification text, `experience_id` + `user_ids`, so the user gets a push and opening it opens the app), and **UpSell** rules apply (no options in OFFER, advance on purchase, hide previous offer).

So: **Inter-merchant = how conversations start (events). Notifications and UpSell = what happens inside that conversation.** Both are one integrated merchant flow.