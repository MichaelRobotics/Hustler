# Check (Read Receipts), Notifications, and Typing Indicator Flows

This doc explains how **checks** (read receipts), **notifications**, and **typing indicators** work in **CustomerView/UserChat** and **LiveChat**.

---

## 1. Database fields (single source of truth)

All flows rely on these columns on `conversations`:

| Column | Meaning |
|--------|--------|
| `user_last_read_at` | Timestamp when the **customer** last read the thread. Bot/admin messages with `created_at <= user_last_read_at` are "read by user". |
| `admin_last_read_at` | Timestamp when the **admin** last read the thread. User messages with `created_at <= admin_last_read_at` are "read by admin". |
| `user_typing` | Boolean: true = show "user is typing" animation. |
| `admin_typing` | Boolean: true = show "admin is typing" animation. |

---

## 2. CustomerView / UserChat

### 2.1 How the "check" is resolved

- **Who updates read state**
  - **Customer** reading: when the customer loads the conversation, `POST /api/userchat/load-conversation` is called with `userType === "customer"`. The handler sets `user_last_read_at = now()` (so all bot messages up to now count as "read by user").
  - **Admin** reading: not updated in UserChat. Admin read is updated in **LiveChat** when the admin opens the conversation (see LiveChat below). So in UserChat, "read by admin" only appears after the admin has opened that conversation in LiveChat at least once.

- **What the client gets**
  - `load-conversation` returns the conversation with `userLastReadAt` and `adminLastReadAt` (from the DB row).
  - UserChat keeps a local `readReceipts` state `{ userLastReadAt, adminLastReadAt }`, synced from:
    1. The `conversation` prop (initial load from parent),
    2. Every **poll** response (same endpoint, every ~2s),
    3. Any **refresh** (e.g. after sending).

- **How one vs two checks are shown**
  - **Customer’s own messages (type `"user"`)**  
    - One check (✓): always (message is sent).  
    - Two checks (✓✓): when `adminLastReadAt >= message.timestamp` (admin has read).
  - **Admin view of the same chat (when viewing as admin in CustomerView)**  
    - **Bot messages** (messages “we” sent to the user):  
      - One check: sent.  
      - Two checks: when `userLastReadAt >= message.timestamp` (user has read).

So: **one check = sent**, **two checks = read by the recipient** (admin for user messages, user for bot messages). All of that is derived only from `userLastReadAt` / `adminLastReadAt` and message timestamps; no per-message read flag in the API for UserChat.

### 2.2 Notifications (UserChat / CustomerView)

- **Customer sends a message**  
  - Handled by `POST /api/userchat/send-message` (or by process-message/navigate when going through the funnel).  
  - That route:
    - Saves the message,
    - Sets `controlled_by = 'admin'`, increments `unread_count_admin`,
    - Calls **Whop push notification** via `sendWhopNotification()`:
      - **Recipients**: all admin users for the experience (`users` with `accessLevel === "admin"`),
      - **Payload**: title "New message", body = customer name + message snippet, `rest_path = /chat/{conversationId}` so opening the notification can deep-link to that chat.

- **Funnel reminders (to the customer)**  
  - Handled by cron: `app/api/cron/send-funnel-notifications/route.ts`.  
  - Uses funnel notifications config (stage, block, delay, sequence). For conversations that are due (e.g. inactivity, offer timer), it sends a **Whop push** to the **customer** (experience_id + user_ids) so they get a reminder; opening it opens the app.

So in CustomerView/UserChat: **notifications = Whop push** (admin on new customer message, customer on funnel reminders).

### 2.3 Typing indicator

- **UserChat does not use typing indicators.**  
  - Comments in `UserChat.tsx` explicitly state typing state was removed ("REMOVED: isTyping", "no typing indicators needed").  
  - So in CustomerView/UserChat there is **no typing indicator flow**.

---

## 3. LiveChat

### 3.1 How the "check" is resolved

- **Who updates read state**
  - **Admin** reading: when the admin opens a conversation, `LiveChatUserInterface` calls `onMarkAsRead(conversationId)`.  
    - That triggers `handleMarkAsRead` in `LiveChatPage`, which calls `POST /api/livechat/conversations/[conversationId]/read` with body `{ side: "admin" }`.  
    - The read route calls `markConversationRead(..., conversationId, "admin")`, which sets `admin_last_read_at = now()` and `unread_count_admin = 0`.
  - **User** reading: when the **customer** loads the conversation (e.g. in UserChat), `load-conversation` sets `user_last_read_at` (see 2.1). So "read by user" is updated from the **userchat** load-conversation path, not from a separate LiveChat call.

- **What the client gets**
  - **List**: `GET /api/livechat/conversations` uses `getLiveChatConversations` (or integration equivalent). Returned conversations include `userLastReadAt` and `adminLastReadAt`, and each **message** has `isRead` computed on the server:
    - User message: `isRead = (admin_last_read_at != null && message.created_at <= admin_last_read_at)`
    - Bot/agent message: `isRead = (user_last_read_at != null && message.created_at <= user_last_read_at)`
  - **Single conversation**: `GET /api/livechat/conversations/[conversationId]` loads conversation (e.g. `getLiveChatConversationDetails`) and then replaces `messages` with **unified messages** from `getConversationMessages()` in `unified-message-actions`. Those unified messages already have `isRead` computed the same way (from `userLastReadAt` / `adminLastReadAt`).

- **How one vs two checks are shown**
  - **LiveChatUserInterface** shows a receipt under every message (user and agent):
    - **One check (✓)**: message sent (when `!message.isRead`).
    - **Two checks (✓✓)**: message read by the other side (when `message.isRead`), with tooltip "Read by admin" for user messages and "Read by user" for agent messages.

So in LiveChat the check is resolved **per message** via the precomputed `message.isRead` from the same two timestamps.

### 3.2 Notifications (LiveChat)

- **Admin** is notified of new **customer** messages by the same UserChat path: when the customer sends a message, `send-message` (or the funnel process-message path) calls `sendWhopNotification` to admin users (see 2.2). So LiveChat doesn’t have a separate notification API; it relies on that.
- **Customer** doesn’t get a push when the admin replies in LiveChat; that could be added later (e.g. in the route that saves the admin message) by calling `sendWhopNotification` for the conversation’s customer.

### 3.3 Typing indicator

- **API**
  - `POST /api/livechat/conversations/[conversationId]/typing`  
  - Body: `{ side: "user" | "admin", active: boolean }`.  
  - **Admin**: only callers with `accessLevel === "admin"` can set `side: "admin"`.  
  - **User**: only the conversation’s customer (`whopUserId`) can set `side: "user"`.  
  - Sets `user_typing` or `admin_typing` to the `active` boolean (true = show typing animation, false = don’t).

- **When it’s sent**
  - **Admin typing**: in `LiveChatUserInterface`, when the admin types in the input, a debounced effect calls `onTypingChange(conversation.id, true)` after a short delay, and `onTypingChange(..., false)` after they stop or send.  
  - `LiveChatPage`’s `handleTypingChange` calls `POST .../typing` with `{ side: "admin", active }`. So **only admin typing is sent** from the current LiveChat UI; the customer (e.g. in UserChat) does not call the typing endpoint.

- **How the UI gets typing state**
  - **List** (`GET /api/livechat/conversations`): the list endpoint (e.g. `getLiveChatConversations`) does **not** currently add a `typing` field per conversation, so list polling does not refresh typing.
  - **Single conversation** (`GET /api/livechat/conversations/[conversationId]`): uses `getLiveChatConversationDetails` (in livechat-integration-actions), which calls `getConversationTypingState(conversationId)`. That reads `user_typing` and `admin_typing` booleans and returns `{ user, admin }`. So when you **open** a conversation, the response includes `conversation.typing`. Polling the typing endpoint returns the same booleans; UI shows typing animation when true.

- **How it’s shown**
  - In `LiveChatUserInterface`, when `conversation.typing?.user` is true, a "typing..." line is shown under the messages (with the user avatar on the left). There is no separate "admin is typing" block in the current UI (admin is the one viewing, so typically only "user is typing" is relevant).

So: **typing is written** by LiveChat (admin) via the typing API; **typing is read** from the single-conversation load (`typing` from `getConversationTypingState`). Because the **list** poll doesn’t include typing, the "user is typing" state can be stale until the conversation is reloaded or the list is replaced by a response that eventually adds typing.

---

## 4. Summary table

| Feature | CustomerView/UserChat | LiveChat |
|--------|------------------------|----------|
| **One check (sent)** | Shown on our messages (user or bot by view). | Same: one check when `!message.isRead`. |
| **Two checks (read)** | When `adminLastReadAt` or `userLastReadAt` ≥ message time, from load-conversation + polling. | When `message.isRead` (from same timestamps). |
| **Who sets "read by admin"** | Not set in UserChat; set when admin opens conversation in LiveChat (read API). | `POST .../read` with `side: "admin"`. |
| **Who sets "read by user"** | Customer loading conversation: `load-conversation` sets `user_last_read_at`. | Same DB; no separate LiveChat call. |
| **Notifications** | Whop push: admin on new customer message; customer on funnel reminders (cron). | Admin notifications same as UserChat; customer on admin reply not implemented. |
| **Typing** | None. | Admin sends typing via `POST .../typing`; UI shows `conversation.typing?.user` ("user is typing"); typing only in single-conversation load, not in list. |

---

## 5. Relevant files

- **Read receipts (DB)**: `drizzle/schema.ts` (`user_last_read_at`, `admin_last_read_at`).
- **UserChat checks**: `lib/components/userChat/UserChat.tsx` (readReceipts state, Check/CheckCheck per message).
- **UserChat read update**: `app/api/userchat/load-conversation/route.ts` (sets `userLastReadAt` when customer loads).
- **LiveChat checks**: `lib/components/liveChat/LiveChatUserInterface.tsx` (Check/CheckCheck from `message.isRead`).
- **LiveChat read API**: `app/api/livechat/conversations/[conversationId]/read/route.ts` and `lib/actions/livechat-actions.ts` (`markConversationRead`).
- **LiveChat typing API**: `app/api/livechat/conversations/[conversationId]/typing/route.ts`; `lib/actions/livechat-integration-actions.ts` (`getConversationTypingState`, TYPING_TTL_MS).
- **Notifications**: `lib/helpers/whop-notifications.ts` (`sendWhopNotification`); `app/api/userchat/send-message/route.ts`; `app/api/cron/send-funnel-notifications/route.ts`.
- **Unified message isRead**: `lib/actions/unified-message-actions.ts` (`getConversationMessages`).
