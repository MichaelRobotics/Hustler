---
name: Preview Upsell timer and runtime delays
overview: "Two parts: (1) In preview, after the user clicks the offer CTA, show two one-click controls: icon + 'Downsell' and icon + 'Upsell' (icon indicates simulating speed up). No countdown or separate step – each click applies the outcome (Downsell = remove old offer then show downsell; Upsell = show next offer). (2) How runtime delays would be implemented: timer starts on CTA click, cron after timeoutMinutes checks purchase and advances to upsell or downsell block."
todos: []
---

# Preview Upsell "Speed up timer" and runtime delay implementation

## Clarifications (from your message)

- **Timer start:** The upsell/downsell delay starts when the user clicks the **button that redirects to the product** (e.g. "Get Started!" in the offer message), **not** when clicking any "Upsell/Downsell" button.
- **Preview:** There should be **no** user-facing "Upsell/Downsell" buttons in preview. Instead: after the user clicks the offer CTA (product link), show **two one-click controls**: **[icon] Downsell** and **[icon] Upsell**. The icon indicates "simulating speed up" (e.g. fast-forward or timer icon). No countdown or separate "speed up then choose outcome" step – each control in one click both simulates the timer having elapsed and applies the outcome (Downsell = remove old offer then show downsell message; Upsell = show next offer).

---

## Part 1: How runtime delays would be implemented (production)

This is the behavior we are simulating in preview.

### 1.1 When the timer starts

- User is on an **OFFER** block in an Upsell funnel. The block has a CTA in the message (e.g. "Get Started!" with `animated-gold-button` linking to the product).
- When the user **clicks that CTA** (product link), we **start the timer** for that block. The block's `timeoutMinutes` (and `upsellBlockId` / `downsellBlockId`) define what happens after the delay.

### 1.2 Storing "CTA clicked" and deadline – Option A (conversation table)

- **Choice: Option A.** Add columns to the `conversations` table: `offerCtaClickedAt` (timestamp, nullable), `offerCtaBlockId` (string, nullable). When the client sends "offer CTA clicked," the backend sets these. The deadline is computed at cron time as `offerCtaClickedAt + timeoutMinutes` (read from the block in the funnel flow; no need to store `timeoutMinutes` on the conversation).
- **Client:** When the customer clicks the product link in chat (UserChat/CustomerView), in addition to opening the link we call `POST /api/userchat/offer-cta-clicked` with `{ conversationId, blockId }`. The backend loads the funnel flow, validates the block is an OFFER block with `timeoutMinutes` and upsell/downsell targets, then sets `conversations.offerCtaClickedAt = now`, `conversations.offerCtaBlockId = blockId`.

### 1.3 Resolving after the delay: bought vs didn't buy

- **Cron (recommended):** Reuse or extend the existing [app/api/cron/send-funnel-notifications/route.ts](app/api/cron/send-funnel-notifications/route.ts) (or a dedicated cron) to run every few minutes. For each active conversation that has `offerCtaClickedAt` and `offerCtaBlockId` set:
- Load funnel flow and the block; get `timeoutMinutes`, `upsellBlockId`, `downsellBlockId`.
- `deadline = offerCtaClickedAt + timeoutMinutes`. If `now < deadline`, skip.
- If `now >= deadline`:
- **Check purchase:** Use a purchase window `[offerCtaClickedAt, deadline]` for that user/experience (and, if needed, the product tied to the block's `resourceId`). This could query Whop webhooks you stored, or a `purchases` / `membership_events` table populated by `membership.went_valid` or checkout webhooks.
- **If purchased:** Update conversation to `currentBlockId = upsellBlockId`, set `currentBlockEnteredAt = now`, clear `offerCtaClickedAt` / `offerCtaBlockId`, append bot message with the upsell block's message (same as navigate-funnel).
- **If not purchased:** (Optional) "Delete old offer" in DB/UX: e.g. mark last bot message as replaced or remove it from the messages returned for that conversation; then set `currentBlockId = downsellBlockId`, append downsell block's message, clear timer state.
- **Alternative – Queue:** When recording the CTA click, enqueue a job with `runAt = clickedAt + timeoutMinutes`. A worker runs at that time, loads the conversation, checks purchase in that window, then applies the same upsell/downsell update and clears the timer.

### 1.4 "Delete old offer" when user didn't buy

- **Meaning:** Before showing the downsell message, hide or remove the previous offer message (the one with the CTA) so the chat doesn't show "old offer + downsell" as two separate bot messages.
- **Implementation:** Either: (1) when advancing to downsell, delete or soft-delete the last bot message in `messages` for that conversation before appending the downsell message; or (2) add a `replacedByMessageId` (or similar) on messages and have the load-conversation API return only the latest replacement chain so the old offer is not displayed; or (3) append a system message like "offer_expired" and have the client hide the previous bot bubble when that follows. Option (1) is simplest and matches "delete old offer."

---

## How the timer works: Preview vs customer-facing

### Preview (merchant testing)

- **No real timer.** When the merchant clicks the offer CTA in preview, we do not wait real minutes. We only set local state: "offer timer active" for this block.
- **Immediate choice.** We show two controls: [icon] Downsell and [icon] Upsell. Clicking one **immediately** applies the outcome (remove old offer + downsell message, or append upsell message). There is no passage of time; the merchant is simulating "what would happen after the delay" in one click.
- **Purpose:** Let the merchant see both branches (upsell and downsell) without waiting. The icon + label indicate "simulating speed up."

### Customer-facing (production)

- **Real timer.** When the customer clicks the offer CTA (e.g. "Get Started!"), the client calls `POST /api/userchat/offer-cta-clicked` and the backend sets `conversations.offerCtaClickedAt = now`, `conversations.offerCtaBlockId = blockId`. The customer is sent to the product/checkout (link opens). **No** "Upsell" / "Downsell" or speed-up controls are shown to the customer.
- **Cron runs later.** A cron job (e.g. every 5–10 minutes) runs. For each conversation with `offerCtaClickedAt` and `offerCtaBlockId` set, it computes `deadline = offerCtaClickedAt + timeoutMinutes` (from the block in the funnel flow). If `now >= deadline`, it checks whether the customer purchased in the window `[offerCtaClickedAt, deadline]`. If yes → append upsell block message and set `currentBlockId = upsellBlockId`. If no → remove last bot message (old offer), append downsell block message, set `currentBlockId = downsellBlockId`. Then clear `offerCtaClickedAt` and `offerCtaBlockId`.
- So the **timer** in production is "real time": the cron only acts after `timeoutMinutes` have actually passed since the CTA click.

### What the customer sees (production only)

- **Only the offer message.** On an OFFER block with upsell/downsell, the customer sees only:
- The bot message (offer text).
- The single CTA button (e.g. "Get Started!") that links to the product.
- **No** "Upsell" or "Downsell" buttons. No countdown. No speed-up controls. Those exist only in the **builder** (for wiring) and in **preview** (for simulating outcomes).
- **After the delay:** When the cron runs past the deadline, the customer (when they next load the chat) sees **one new bot message**: either the upsell (next offer) or the downsell message. If downsell, the previous offer message is removed so they do not see "old offer + downsell" as two separate bubbles.

So yes: **the customer-facing implementation only shows the offer message (and CTA)** until the delay has passed; then they see a single follow-up message (upsell or downsell).

---

## Part 2: Preview implementation (Speed up timer, no Upsell/Downsell buttons)

Preview must mirror the above flow without real time or real purchases: timer starts on **CTA click**; user can "speed up" time and then choose "bought" or "didn't buy" to see upsell or downsell.

### 2.1 Where to implement

- **Preview chat components:** [lib/components/preview/PreviewChat.tsx](lib/components/preview/PreviewChat.tsx), and store preview chat [lib/components/store/StorePreviewChat.tsx](lib/components/store/StorePreviewChat.tsx) and [lib/components/store/SeasonalStore/components/SeasonalStoreChat.tsx](lib/components/store/SeasonalStore/components/SeasonalStoreChat.tsx) if they show the same funnel preview. Prefer a shared hook so logic lives in one place.
- **Hook:** Extend [lib/hooks/useFunnelPreviewChat.ts](lib/hooks/useFunnelPreviewChat.ts) (or a wrapper) so preview chat has:
- Timer state that starts when the **offer CTA** is clicked (not Upsell/Downsell).
- A way to "speed up" virtual time and then resolve to upsell or downsell.

### 2.2 When to show timer vs normal CTA

- Use **funnel type + block shape:** If `merchantType === 'upsell'` (or the funnel has OFFER blocks with `timeoutMinutes` and `upsellBlockId`/`downsellBlockId`), and the current block is such an OFFER block, then in preview:
- **Do not** show builder-style "Upsell" / "Downsell" buttons to the user.
- **Do** show the normal offer message and **one** CTA button (e.g. "Get Started!") that in production would open the product link.
- **On CTA click in preview:** Do not only open the link. Instead (or in addition, e.g. open in new tab):
- **Start the virtual timer:** Store `offerTimerStartedAt = Date.now()`, `offerTimerBlockId = currentBlockId`, and read the block's `timeoutMinutes` (default e.g. 5 if missing).
- Show the **Speed up timer** UI (see below) and optionally still open the product link in a new tab so the preview feels realistic.

### 2.3 Speed up timer UI (preview only) – icon + Downsell / Upsell

- **Goal:** Indicate that the user is **simulating** speeding up the timer; one click per outcome, no extra steps.
- **Placement:** Below the last message (offer with CTA) when the offer timer is "active" (user has clicked the CTA and we're waiting for the simulated outcome). Shown only for OFFER blocks that have `timeoutMinutes` and `upsellBlockId` / `downsellBlockId`.
- **Content – two controls only:**
- **Control 1:** **[icon] Downsell** – Same icon for both (see below). Text: "Downsell." One click: simulate "timer elapsed, user did not buy" → remove the last bot message (old offer), append downsell block message, set `currentBlockId = downsellBlockId`, clear timer state.
- **Control 2:** **[icon] Upsell** – Text: "Upsell." One click: simulate "timer elapsed, user bought" → append upsell block message, set `currentBlockId = upsellBlockId`, clear timer state. Do not remove the previous offer.
- **Icon:** Use a single icon (e.g. fast-forward, timer, or clock/skip) next to both labels to indicate "I am simulating speeding up (time has passed)." Same icon for both controls so the meaning is "simulate outcome after delay" not "choose Upsell/Downsell in the builder sense."
- **No countdown, no multi-step:** Do not show "X min left" or "Speed up 1 min / 5 min / Skip to end." Do not show a separate "then choose Bought / Didn't buy" step. The two controls are the only UI: icon + "Downsell" and icon + "Upsell."

### 2.4 Hook / state shape (preview)

- Add to the preview hook (or a small wrapper used only in preview):
- `offerTimerActive: boolean` (or `offerTimerBlockId: string | null`) – true when the user has clicked the offer CTA and we're showing the two outcome controls. No need for virtual time or countdown.
- `startOfferTimer(blockId: string)` – called when the user clicks the offer CTA in preview; sets timer active and stores `offerTimerBlockId = blockId`. Only call when the block has `timeoutMinutes` and at least one of `upsellBlockId` / `downsellBlockId`.
- `resolveOfferTimer(outcome: 'bought' | 'didnt_buy')` – if `outcome === 'didnt_buy'`, remove last bot message from history, then append downsell block message and set `currentBlockId = downsellBlockId`; if `outcome === 'bought'`, append upsell block message and set `currentBlockId = upsellBlockId`; clear timer state. No virtual time or "speed up" step – this is called directly when the user clicks [icon] Downsell or [icon] Upsell.
- The hook needs access to `funnelFlow` and the current block to read `upsellBlockId`, `downsellBlockId` and to build the next block's message via `constructCompleteMessage`.

### 2.5 Hiding Upsell/Downsell in preview

- In preview, when rendering the OFFER block's options, if the block has `upsellBlockId` or `downsellBlockId` and we're in "preview mode" (and optionally `merchantType === 'upsell'`), **do not** render the option buttons that would say "Upsell" / "Downsell." The builder shows those for wiring; the end-user and preview should only see the offer text and the single CTA button. So in [lib/hooks/useFunnelPreviewChat.ts](lib/hooks/useFunnelPreviewChat.ts) (or wherever options are derived for the current block), when the block is OFFER and has upsell/downsell targets, return `options = []` for preview so only the message (and the CTA rendered from the message) is shown. The CTA click then starts the timer.

### 2.6 Summary of preview flow

1. User reaches an OFFER block that has `timeoutMinutes`, `upsellBlockId`, `downsellBlockId`. Preview shows only the message and the "Get Started!" (or similar) CTA – no Upsell/Downsell buttons.
2. User clicks the CTA → `startOfferTimer(blockId)` runs; UI shows **two controls only**: **[icon] Downsell** and **[icon] Upsell** (icon indicates "simulating speed up"). Optionally open the product link in a new tab.
3. User clicks **[icon] Downsell** → `resolveOfferTimer('didnt_buy')`: remove last bot message (old offer), append downsell block message, go to `downsellBlockId`.
4. User clicks **[icon] Upsell** → `resolveOfferTimer('bought')`: append upsell block message, go to `upsellBlockId`.

No countdown, no separate "speed up then choose" step. The icon + label on each control makes it clear the user is simulating the timer outcome (speed up + Downsell or speed up + Upsell).