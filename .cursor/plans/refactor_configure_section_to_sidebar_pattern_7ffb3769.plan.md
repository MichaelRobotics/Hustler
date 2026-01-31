---
name: Refactor Configure Section to Sidebar Pattern
overview: Refactor the Configuration section to move notification and reset configuration from the canvas view into the ConfigPanel sidebar, using the same pattern as TriggerPanel. Replace "Handout" and "AI Chat" tabs with "Notification" and "Reset" sections, where stages appear as selectable list items that expand to show configuration options.
todos:
  - id: create-notifications-api
    content: Create API endpoint at app/api/funnels/[funnelId]/notifications/route.ts with GET, POST, DELETE handlers
    status: completed
  - id: refactor-config-panel-structure
    content: "Refactor ConfigPanel: Remove Handout/AI Chat tabs, add Notification/Reset sections with stages list"
    status: completed
  - id: implement-stage-item-component
    content: Create StageItem component in ConfigPanel (similar to TriggerItem pattern)
    status: completed
  - id: implement-notification-editor
    content: Create inline NotificationEditor component (replace modal approach)
    status: completed
  - id: implement-reset-editor
    content: Create inline ResetEditor component with two reset options (delete/complete)
    status: completed
  - id: update-aifunnel-builder
    content: "Update AIFunnelBuilderPage: Remove NotificationCanvasView, add notification fetching, add handlers"
    status: in_progress
  - id: update-config-panel-props
    content: Update ConfigPanel props interface to match new structure (remove handout/product FAQ props)
    status: completed
  - id: create-chat-config-panel
    content: Create ChatConfigPanel component with Handout and AI Chat tabs (extracted from ConfigPanel)
    status: pending
  - id: update-preview-chat
    content: "Update PreviewChat: Replace theme toggle with Configure button, integrate ChatConfigPanel"
    status: pending
  - id: update-funnel-builder-header
    content: "Update FunnelBuilderHeader: Change Configure button text to Notifications"
    status: pending
  - id: update-preview-page-props
    content: Update PreviewPage to pass funnel data (handout config, product FAQs, resources) to PreviewChat
    status: pending
  - id: test-notification-persistence
    content: Test notification and reset configuration persistence through API
    status: pending
---

# Refactor Configure Section to Sidebar Pattern

## Overview

1. Move notification and reset configuration from `NotificationCanvasView` into `ConfigPanel` sidebar, following the `TriggerPanel` pattern
2. Move "Handout" and "AI Chat" functionality from `ConfigPanel` to `PreviewChat` component
3. In `PreviewChat`, replace theme toggle button with "Configure" button that reveals Handout/AI Chat panel
4. In `FunnelBuilderHeader`, rename "Configure" button to "Notifications"
5. `ConfigPanel` will only have "Notification" and "Reset" sections (no Handout/AI Chat)

## Current Architecture

### Current Flow

- Configure mode shows `NotificationCanvasView` (canvas) + `ConfigPanel` (sidebar)
- `NotificationCanvasView`: Visual canvas with stage labels and notification cards
- `ConfigPanel`: Has "Handout" and "AI Chat" tabs
- `PreviewChat`: Has theme toggle button in header
- Notifications are not persisted (TODO comment in code)

### Target Architecture

- Configure mode shows main canvas (simplified) + `ConfigPanel` (sidebar)
- `ConfigPanel`: Has "Notification" and "Reset" sections only
- Each section shows stages as list items (like triggers in `TriggerPanel`)
- Selecting a stage expands inline configuration editor
- `PreviewChat`: Theme toggle replaced with "Configure" button
- "Configure" button in `PreviewChat` opens a panel with "Handout" and "AI Chat" tabs
- `FunnelBuilderHeader`: "Configure" button renamed to "Notifications"
- Remove `NotificationCanvasView` dependency

## Implementation Plan

### 1. Create Notifications API Endpoint

**File**: `app/api/funnels/[funnelId]/notifications/route.ts` (new file)

- Create GET endpoint: Fetch all notifications for a funnel
- Create POST endpoint: Upsert notification (create or update)
- Create DELETE endpoint: Delete notification
- Use existing `getFunnelNotifications`, `upsertFunnelNotification` from `funnel-actions.ts`
- Follow same pattern as `product-faqs` route

### 2. Refactor ConfigPanel Component

**File**: `lib/components/funnelBuilder/ConfigPanel.tsx`

**Changes**:

- Remove "Handout" and "AI Chat" tabs (moved to PreviewChat)
- Add "Notification" and "Reset" sections (as category tabs)
- Add stages list in each section (similar to triggers in `TriggerPanel`)
- When stage selected, show inline configuration editor
- Remove handout and product FAQ functionality (moved to PreviewChat)

**New Structure**:

```typescript
type CategoryFilter = "Notification" | "Reset";

// Notification Section:
// - List of stages (from funnel.flow.stages)
// - Click stage → expand inline editor
// - Editor: inactivityMinutes, message fields
// - Support multiple notifications per stage (sequence 1, 2, 3)

// Reset Section:
// - List of stages
// - Click stage → expand inline editor  
// - Editor: delayMinutes, resetAction (delete/complete)
// - Two reset options: "Delete" and "Complete" (as separate configurable items)
```

**Stage Item Component**:

- Similar to `TriggerItem` in `TriggerPanel`
- Shows stage name and explanation
- Click to expand/collapse configuration
- Visual indicator when configured

**Notification Editor (inline)**:

- Replace `NotificationEditModal` with inline form
- Fields: inactivityMinutes (with time unit selector), message
- Support adding multiple notifications per stage (up to 3)
- Show existing notifications as list with edit/delete

**Reset Editor (inline)**:

- Two reset options: "Delete" and "Complete"
- Each has: delayMinutes input, enabled/disabled toggle
- Save button when changes detected

### 3. Update AIFunnelBuilderPage

**File**: `lib/components/funnelBuilder/AIFunnelBuilderPage.tsx`

**Changes**:

- Remove `NotificationCanvasView` from Configure mode
- Update Configure mode layout: show simplified canvas or empty state + `ConfigPanel`
- Fetch notifications when entering Configure mode (similar to product FAQs)
- Add `handleNotificationChange` function to persist notifications
- Update `handleNotificationsChange` to call API endpoint

**State Management**:

```typescript
// Fetch notifications on Configure mode entry
React.useEffect(() => {
  if (showConfigureView && currentFunnel.id && user?.experienceId) {
    fetch(`/api/funnels/${currentFunnel.id}/notifications`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setNotifications(data.data);
        }
      });
  }
}, [showConfigureView, currentFunnel.id, user?.experienceId]);
```

### 4. Update Types (if needed)

**File**: `lib/types/funnel.ts`

- Verify `FunnelNotification` and `FunnelNotificationInput` types are complete
- Ensure reset action types are correct: `"delete" | "complete"`

### 5. Update PreviewChat Component

**File**: `lib/components/preview/PreviewChat.tsx`

**Changes**:

- Replace theme toggle button (lines 501-525) with "Configure" button
- Add state for showing/hiding configuration panel
- Add `ChatConfigPanel` component (new file) or reuse existing ConfigPanel logic
- "Configure" button should open a right-side panel with "Handout" and "AI Chat" tabs
- Panel should match the design pattern of `ConfigPanel` (400px width, fixed right side)
- Move handout and product FAQ configuration logic here

**New Structure**:

```typescript
// In PreviewChat header (replace theme toggle):
<button onClick={() => setShowConfigPanel(!showConfigPanel)}>
  <Settings icon />
  Configure
</button>

// Panel component (new or extracted):
<ChatConfigPanel
  isOpen={showConfigPanel}
  funnelId={funnelId}
  handoutKeyword={handoutKeyword}
  handoutAdminNotification={handoutAdminNotification}
  handoutUserMessage={handoutUserMessage}
  productFaqs={productFaqs}
  resources={resources}
  experienceId={experienceId}
  onHandoutChange={handleHandoutChange}
  onProductFaqChange={handleProductFaqChange}
  onClose={() => setShowConfigPanel(false)}
/>
```

**PreviewChat Props Update**:

- Add `funnelId?: string` prop
- Add `handoutKeyword?: string`, `handoutAdminNotification?: string`, `handoutUserMessage?: string` props
- Add `productFaqs?: FunnelProductFaq[]` prop
- Fetch product FAQs when component mounts (if funnelId and experienceId available)
- Add handlers for handout and product FAQ changes

### 6. Create ChatConfigPanel Component

**File**: `lib/components/preview/ChatConfigPanel.tsx` (new file)

**Purpose**: Extract Handout and AI Chat configuration from `ConfigPanel` into a separate component for use in `PreviewChat`

**Structure**:

- Same design as `ConfigPanel` (400px width, fixed right side)
- Two tabs: "Handout" and "AI Chat"
- Handout tab: keyword, admin notification, user message fields
- AI Chat tab: product list with FAQ editors (same as current ConfigPanel AI Chat tab)
- Reuse existing `ProductFaqEditor` component

### 7. Update FunnelBuilderHeader

**File**: `lib/components/funnelBuilder/FunnelBuilderHeader.tsx`

**Changes**:

- Change button text from "Configure" to "Notifications" (line 80)
- Update button label when `showMerchantButton` is false
- Keep "Merchant" text when `showMerchantButton` is true

### 8. Update PreviewPage Component

**File**: `lib/components/preview/PreviewPage.tsx`

**Changes**:

- Pass funnel data to PreviewChat component
- Fetch product FAQs when funnel is available
- Pass handout configuration from funnel to PreviewChat
- Add handlers for handout and product FAQ updates

**Updated Props**:

```typescript
<PreviewChat
  funnelFlow={funnelFlow}
  resources={funnel.resources || []}
  experienceId={experienceId}
  funnelId={funnel.id}
  handoutKeyword={funnel.handoutKeyword}
  handoutAdminNotification={funnel.handoutAdminNotification}
  handoutUserMessage={funnel.handoutUserMessage}
  productFaqs={productFaqs}
  onHandoutChange={handleHandoutChange}
  onProductFaqChange={handleProductFaqChange}
  onMessageSent={handleMessageSent}
  onBack={onBack}
  hideAvatar={false}
/>
```

### 9. Remove/Deprecate NotificationCanvasView

**File**: `lib/components/funnelBuilder/NotificationCanvasView.tsx`

- Keep file for now (may be used elsewhere)
- Remove from Configure mode rendering
- Can be deleted later if not used

### 10. Update ConfigPanel Props Interface

**File**: `lib/components/funnelBuilder/ConfigPanel.tsx`

**New Props**:

```typescript
interface ConfigPanelProps {
  isOpen: boolean;
  funnelId: string;
  stages: Stage[]; // From funnel.flow.stages
  notifications: FunnelNotification[];
  onNotificationChange: (notification: FunnelNotificationInput) => void;
  onNotificationDelete: (notificationId: string) => void;
  onResetChange: (stageId: string, resetAction: "delete" | "complete", delayMinutes: number) => void;
  onClose: () => void;
}
```

**Remove**:

- `handoutKeyword`, `handoutAdminNotification`, `handoutUserMessage`
- `productFaqs`, `resources`, `experienceId`
- `onHandoutChange`, `onProductFaqChange`

## Data Flow

### Notification Flow

```
User selects stage in Notification section
  → Stage expands showing notification editor
  → User configures notification (inactivityMinutes, message)
  → User clicks Save
  → ConfigPanel calls onNotificationChange
  → AIFunnelBuilderPage.handleNotificationChange
  → POST /api/funnels/[funnelId]/notifications
  → Backend upserts notification
  → Local state updates
```

### Reset Flow

```
User selects stage in Reset section
  → Stage expands showing reset editor
  → User configures Delete reset (delayMinutes)
  → User configures Complete reset (delayMinutes)
  → User clicks Save
  → ConfigPanel calls onResetChange (for each reset action)
  → AIFunnelBuilderPage.handleResetChange
  → POST /api/funnels/[funnelId]/notifications (with isReset: true)
  → Backend upserts reset notification
  → Local state updates
```

### Handout/AI Chat Flow (in PreviewChat)

```
User clicks Configure button in PreviewChat
  → ChatConfigPanel opens (right-side panel)
  → User selects Handout or AI Chat tab
  → User configures handout (keyword, admin notification, user message)
  → User configures product FAQ (FAQ content, objection handling)
  → User clicks Save
  → ChatConfigPanel calls onHandoutChange / onProductFaqChange
  → PreviewChat updates local state
  → POST /api/funnels/[funnelId] (for handout) or /api/funnels/[funnelId]/product-faqs (for FAQ)
  → Backend updates funnel/product FAQ
  → Local state updates
```

## UI/UX Details

### Notification Section

- Header: "Notification" tab
- List of stages (from `funnel.flow.stages`)
- Each stage item:
  - Stage name (formatted)
  - Stage explanation (truncated)
  - Badge showing number of configured notifications (0-3)
  - Click to expand
- When expanded:
  - List existing notifications (sequence 1, 2, 3)
  - Each notification: shows time and message preview, edit/delete buttons
  - "Add Notification" button (if < 3)
  - Inline editor for new/edit notification
  - Save button when changes detected

### Reset Section

- Header: "Reset" tab
- List of stages
- Each stage item:
  - Stage name
  - Badge showing reset status (both, delete only, complete only, none)
  - Click to expand
- When expanded:
  - Two reset options:

    1. "Delete Conversations" - delayMinutes input, enabled toggle
    2. "Mark as Completed" - delayMinutes input, enabled toggle

  - Save button when changes detected

## Migration Notes

- Existing notifications in database will be preserved
- UI change only - no data migration needed
- Handout and AI Chat configuration moved from ConfigPanel to PreviewChat
- Handout and product FAQ data structures remain the same
- PreviewChat now needs access to funnel data (handout config, product FAQs, resources)

## Testing Considerations

- Test notification creation/update/deletion
- Test reset configuration for both actions
- Test multiple notifications per stage (sequence 1, 2, 3)
- Test stage selection and expansion
- Test unsaved changes tracking
- Test API error handling