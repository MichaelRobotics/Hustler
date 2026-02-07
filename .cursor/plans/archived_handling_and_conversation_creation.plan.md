# Archived handling, createConversation guard, and enum cleanup

## 1. Do not load archived conversations in chat (no 404)

**Goal:** Code should handle archived so the client never hits a generic 404. Either prevent requesting archived IDs or return a structured response the client can handle.

**1.1 API: Return structured response for archived instead of 404**

- In [app/api/userchat/load-conversation/route.ts](app/api/userchat/load-conversation/route.ts) (lines 69–74): when `conversation.status === "archived"`, return **200** with a body the client can interpret, e.g. `{ success: false, code: "ARCHIVED", error: "Conversation is archived" }`. Do **not** use 404 so the client can distinguish "archived" from "not found" and react (e.g. switch to list or active conversation).
- Keep 404 only for: conversation not found, or conversation exists but does not belong to the requesting user (wrong experience/whopUserId).

**1.2 Exclude archived from merchant conversation list**

- In [lib/actions/livechat-integration-actions.ts](lib/actions/livechat-integration-actions.ts), in `getLiveChatConversations`, ensure archived conversations are never returned. Today when `filters.status` is "open" or "closed" only active or closed are queried; when no status filter is applied, all statuses (including archived) can be returned. Add a condition so we **always** exclude `status === "archived"` (e.g. add `not(eq(conversations.status, "archived"))` or use `inArray(conversations.status, ["active", "closed"])` when no status filter). That way the merchant never sees or clicks an archived conversation.

**1.3 Client: Handle ARCHIVED from load-conversation**

- **Customer (userchat):** In [lib/components/userChat/CustomerView.tsx](lib/components/userChat/CustomerView.tsx), in `loadConversationById` (and anywhere else that calls load-conversation): when the response is success: false and code/error indicates archived, treat it like "conversation not loadable": clear the selected conversation (e.g. setConversationId(null), setConversation(null)), optionally refetch the conversation list so the archived one disappears from the list, and show the conversation list or the active conversation. That way no 404 is shown to the user and the UI recovers (e.g. after a deep link to an archived convo or stale list).
- **Merchant (livechat):** If the merchant view loads conversation details by ID (e.g. [lib/components/liveChat/LiveChatPage.tsx](lib/components/liveChat/LiveChatPage.tsx) or related), when the API returns code ARCHIVED, clear selection and show list or a message ("Conversation was archived") instead of treating it as a generic error. After 1.2, this path should be rare since archived won't appear in the list.

No 404 in the "archived" case: the API responds with 200 + `code: "ARCHIVED"`, and the UI handles it explicitly.

---

## 2. Creating conversation must not close other conversations (guard-only)

**Goal:** Do not create a new conversation if the user already has an active one; do **not** close existing active conversations inside `createConversation` (treat that as a double-check to remove).

**2.1 Remove "close active" logic from createConversation**

- In [lib/actions/simplified-conversation-actions.ts](lib/actions/simplified-conversation-actions.ts), in `createConversation` (lines 128–142), **remove** the block that updates existing conversations for the same (experienceId, whopUserId) from `status: "active"` to `status: "closed"`. So `createConversation` only inserts a new conversation and never closes others.

**2.2 Enforce "no create when active" at call sites**

- All call sites that create a conversation already use `hasActiveConversation` (or equivalent) before calling `createConversation`, except:
- **handleFunnelCompletionInUserChat:** It first closes the *current* conversation by ID, then calls `createConversation`. After that close, there is no active conversation for that user in that experience, so it's correct to create. No change needed.
- **startConversationForMerchantClosedTrigger:** Already calls `hasActiveConversation` and returns if true. No change.
- **createConversationForNewCustomer, check-conversation, handleUserJoinEvent, handleMembershipWentValidWebhook, handleMembershipDeactivatedWebhook:** All guard with `hasActiveConversation` before creating.
- **payment.succeeded webhook** ([app/api/webhook/route.ts](app/api/webhook/route.ts)): also creates for membership_activated with `hasActiveConversation` guard before each create.

So after removing the "close active" logic, the invariant "at most one active per (experienceId, whopUserId)" is preserved by callers. Optional: add a safeguard inside `createConversation` that checks `hasActiveConversation` and throws or returns without creating if true, so misuse in the future doesn't create two actives (recommended as a safety check).

**2.3 Comment and doc updates (must follow this flow)**

- In [lib/actions/user-join-actions.ts](lib/actions/user-join-actions.ts) at line 371 the comment says: "Create conversation (createConversation closes any previous active for this user, then inserts)". After removing the close logic from `createConversation`, update this to reflect that creation only runs when the guard (hasActiveConversation) has already passed, e.g. "Create conversation (only when no active conversation; guard above ensures this)."

---

## 3. Close/archive scenarios: code audit (no change, document only)

**User's model:** Closed = (1) All stages processed (funnel completion), (2) Notification system sets to closed. Archived = only notification system.

**Code that sets status today (must stay consistent):**

- **closed** is set in:
- [lib/actions/simplified-conversation-actions.ts](lib/actions/simplified-conversation-actions.ts) `handleFunnelCompletionInUserChat` (funnel completion) — matches (1).
- [app/api/cron/send-funnel-notifications/route.ts](app/api/cron/send-funnel-notifications/route.ts) (reset action "complete") — matches (2).
- [lib/actions/livechat-actions.ts](lib/actions/livechat-actions.ts) `manageConversation` when `action.status === "closed"` (merchant manually closes) — additional path; do not remove.
- [lib/actions/conversation-cleanup-actions.ts](lib/actions/conversation-cleanup-actions.ts) `closeInactiveConversations` (cron: no message in 2 days); invoked by [app/api/cron/close-inactive-conversations/route.ts](app/api/cron/close-inactive-conversations/route.ts) — additional path; do not remove.
- [lib/actions/simplified-conversation-actions.ts](lib/actions/simplified-conversation-actions.ts) `createConversation` (close existing active before insert) — **remove this** per section 2.1.

- **archived** is set only in:
- [app/api/cron/send-funnel-notifications/route.ts](app/api/cron/send-funnel-notifications/route.ts) (reset action "delete") — matches; only notification system. No other code should set archived.

Admin reset ([app/api/admin/reset-conversations/route.ts](app/api/admin/reset-conversations/route.ts)) deletes conversations via `deleteExistingConversationsByWhopUserId`; it does not set status to closed/archived. No change needed.

---

## 4. Remove unused enum values: completed, abandoned

**Goal:** Remove `completed` and `abandoned` from the conversation status enum in DB and code since they are never set.

**4.1 Database migration (PostgreSQL)**

- PostgreSQL does not support dropping an enum value directly. Use a new enum and migrate:

1. Create a new enum with only the values in use: `CREATE TYPE conversation_status_new AS ENUM ('active', 'closed', 'archived');`
2. Update any existing rows with `completed` or `abandoned` to `closed`: `UPDATE conversations SET status = 'closed' WHERE status IN ('completed', 'abandoned');` (if the column is already using the old enum).
3. Alter the column to use the new type with a USING clause that maps old values: e.g. `ALTER TABLE conversations ALTER COLUMN status TYPE conversation_status_new USING (CASE WHEN status::text IN ('completed', 'abandoned') THEN 'closed'::conversation_status_new ELSE status::text::conversation_status_new END);`
4. Drop the old type: `DROP TYPE conversation_status;`
5. Rename the new type: `ALTER TYPE conversation_status_new RENAME TO conversation_status;`

- Add a new Drizzle migration file under [drizzle/](drizzle/) that implements the above (order and exact syntax may need to be adjusted for your Drizzle/Postgres setup; e.g. some setups use a temporary column to swap).

**4.2 Schema and types in code**

- [drizzle/schema.ts](drizzle/schema.ts): Change `conversationStatus` to only `['active', 'closed', 'archived']`.
- [lib/supabase/schema.ts](lib/supabase/schema.ts): Change `conversationStatusEnum` to the same three values.
- [lib/actions/simplified-conversation-actions.ts](lib/actions/simplified-conversation-actions.ts): Conversation type `status` already uses a union; narrow to `"active" | "closed" | "archived"` (remove `"abandoned"`).
- [lib/types/user.ts](lib/types/user.ts) and [lib/cache/conversation-message-cache.ts](lib/cache/conversation-message-cache.ts): Same: use only `"active" | "closed" | "archived"` where conversation status is typed.
- [lib/actions/livechat-actions.ts](lib/actions/livechat-actions.ts): Remove `completed` and `abandoned` from the statusMap objects (lines 175–180, 373–376, 512–515); keep only active -> "open", closed -> "closed", and if needed archived -> "closed" for display.
- [lib/actions/livechat-integration-actions.ts](lib/actions/livechat-integration-actions.ts): Update the comment "active and completed = open, closed and abandoned = closed" to "active = open, closed/archived = closed" (or equivalent); logic already treats only active as open.

After this, the enum and all types only use active, closed, and archived.

---

## Summary

| Area | Change |
|------|--------|
| load-conversation | Return 200 + `code: "ARCHIVED"` for archived instead of 404; client handles by clearing selection and showing list/active. |
| getLiveChatConversations | Always exclude `status === "archived"` so merchant never sees archived in list. |
| CustomerView / LiveChat | On ARCHIVED from load-conversation, clear selected conversation and show list or message. |
| createConversation | Remove the update that sets other conversations to closed; rely on hasActiveConversation at call sites; optionally add guard inside createConversation. |
| user-join-actions comment | Update line 371 to say creation only runs when guard passed (no "closes any previous active"). |
| Close/archive audit | Section 3 documents all code paths that set closed/archived; only createConversation's close block is removed. |
| DB + schema + types | Migration to enum (active, closed, archived); remove completed/abandoned from schema and all status maps/types. |