# Merchant Conversation Editor - Technical Analysis

## Overview

The "Merchant Conversation Editor" is the main interface for creating and editing marketing conversation funnels. It's implemented as the `AIFunnelBuilderPage` component and provides a visual, drag-and-pan canvas for building conversational flows.

## Architecture

### Main Component: `AIFunnelBuilderPage`

**Location**: `lib/components/funnelBuilder/AIFunnelBuilderPage.tsx`

This is the orchestrator component that manages:
- Funnel state and updates
- Two distinct views (default and configure)
- Notification management
- Trigger configuration
- Deployment logic

### Key Components

#### 1. **FunnelBuilderHeader**
- **Location**: `lib/components/funnelBuilder/FunnelBuilderHeader.tsx`
- **Purpose**: Fixed header with title "Merchant Conversation Editor"
- **Features**:
  - Back button navigation
  - "Notifications" / "Merchant" button (toggles configure view)
  - Theme toggle
  - "Go Live" / "Live" button (deployment control)
  - Adapts width when side panels are open

#### 2. **FunnelVisualizer** (Default View)
- **Location**: `lib/components/funnelBuilder/FunnelVisualizer.tsx`
- **Purpose**: Visual representation of the conversation flow
- **Features**:
  - Renders stages and blocks in a graph layout
  - Shows trigger block at the top
  - Connects blocks with curved lines
  - Supports block editing
  - Handles panning and zooming
  - Mobile-responsive with `MobileFunnelView`

#### 3. **NotificationCanvasView** (Configure View)
- **Location**: `lib/components/funnelBuilder/NotificationCanvasView.tsx`
- **Purpose**: Configure reminder notifications per stage
- **Features**:
  - Shows stages on left (like main view)
  - Notification cards on right (up to 3 per stage)
  - Reset cards (delete/complete actions)
  - Timer configuration for notifications
  - Visual flow of notification sequence

#### 4. **FunnelCanvas**
- **Location**: `lib/components/funnelBuilder/FunnelCanvas.tsx`
- **Purpose**: Wrapper providing pan/drag functionality
- **Features**:
  - 2D panning with mouse/touch
  - Centered content with padding
  - Trigger block positioning
  - Connection lines from trigger to first block

#### 5. **BlockEditor**
- **Location**: `lib/components/funnelBuilder/BlockEditor.tsx`
- **Purpose**: Inline editor for conversation blocks
- **Features**:
  - Edit block message (auto-resizing textarea)
  - Edit option texts
  - Auto-inserts placeholders:
    - `[LINK]` for VALUE_DELIVERY, TRANSITION, OFFER stages
    - `[USER]` and `[WHOP]` for WELCOME blocks
  - Save/Cancel buttons

#### 6. **FunnelBlock**
- **Location**: `lib/components/funnelBuilder/FunnelBlock.tsx`
- **Purpose**: Individual block display component
- **Features**:
  - Shows block message and options
  - Edit button (disabled when deployed)
  - Visual styling with gradients
  - Collapsible block names

## Data Flow

### Funnel Structure

```typescript
interface Funnel {
  id: string;
  name: string;
  flow?: FunnelFlow;
  triggerType?: TriggerType;
  triggerConfig?: TriggerConfig;
  delayMinutes?: number;
  isDeployed?: boolean;
  resources?: Resource[];
}

interface FunnelFlow {
  startBlockId: string;
  stages: FunnelStage[];
  blocks: Record<string, FunnelBlock>;
}

interface FunnelBlock {
  id: string;
  message: string;
  options: FunnelBlockOption[];
}

interface FunnelStage {
  id: string;
  name: string;
  explanation: string;
  blockIds: string[];
}
```

### State Management

1. **Local State** (AIFunnelBuilderPage):
   - `currentFunnel`: Current funnel data
   - `showConfigureView`: Toggle between default/configure views
   - `notifications`: Array of notification configurations
   - `selectedNotificationId`: Currently editing notification
   - `selectedResetId`: Currently editing reset

2. **Optimistic Updates**:
   - Notification changes update UI immediately
   - Backend save happens asynchronously
   - Temp IDs used for new items until saved

3. **Persistence**:
   - Block updates saved via `onUpdate` callback
   - Notifications saved to `/api/funnels/{funnelId}/notifications`
   - Visualization layout persisted separately

## User Workflows

### 1. Editing Conversation Flow (Default View)

1. **View Flow**: User sees visual representation of stages and blocks
2. **Edit Block**: Click edit button on a block
3. **Modify Content**: 
   - Edit message text
   - Edit option texts
   - Placeholders auto-inserted based on stage type
4. **Save**: Changes saved to funnel flow
5. **Visual Update**: Canvas updates to show changes

**Restrictions**:
- Cannot edit blocks when funnel is deployed (`isDeployed === true`)
- Shows notification if user tries to edit while live

### 2. Configuring Notifications (Configure View)

1. **Enter Configure Mode**: Click "Notifications" button in header
2. **View Canvas**: See stages with notification cards
3. **Click Notification**: Opens config panel on right
4. **Configure**:
   - Select notification type (Standard, Reminder, etc.)
   - Set inactivity timer (minutes)
   - Edit message
   - Set sequence (1-3 per stage)
5. **Add More**: Click "+" to add additional notifications
6. **Configure Reset**: Click reset card to set delete/complete action

**Default Behavior**:
- Each stage gets default notification (sequence 1) if missing
- Each stage gets default reset (delete, 60min delay) if missing
- Optimistic defaults shown immediately, then created via API

### 3. Configuring Triggers

1. **Click Trigger Block**: Opens trigger panel from right
2. **Select Trigger Type**:
   - `on_app_entry`: When user enters app
   - `membership_buy`: When user buys specific membership
   - `qualification`: After another funnel completes
   - `upsell`: After another funnel completes
3. **Configure**:
   - For `membership_buy`: Select resource
   - For `qualification`/`upsell`: Select funnel
   - Set delay (minutes before conversation starts)
4. **Save**: Trigger configuration saved to funnel

### 4. Deploying Funnel

1. **Click "Go Live"**: Button in header (green when not deployed)
2. **Validation**: System checks:
   - Funnel has valid flow
   - No API errors
   - Resources are valid
3. **Deployment Modal**: Shows progress
4. **Status Update**: Button changes to "Live" (red) when deployed
5. **Take Offline**: Click "Live" button to undeploy

**Deployment Effects**:
- `isDeployed` set to `true`
- Blocks become read-only
- Funnel becomes active for users
- Validation calculations enabled

## API Integration

### Endpoints Used

1. **Notifications**:
   - `GET /api/funnels/{funnelId}/notifications` - Fetch notifications
   - `POST /api/funnels/{funnelId}/notifications` - Create/update notification
   - `DELETE /api/funnels/{funnelId}/notifications?notificationId={id}` - Delete notification

2. **Resources**:
   - `GET /api/resources?experienceId={id}&limit=100` - Fetch resources for trigger selection

3. **Funnels**:
   - `GET /api/funnels?limit=100` - Fetch funnels for trigger selection

4. **Deployment**:
   - Handled via `useFunnelDeployment` hook
   - Updates funnel `isDeployed` status

## Key Hooks

### `useFunnelDeployment`
- Manages deployment/undeployment logic
- Handles validation
- Shows deployment modals
- Updates funnel status

### `useFunnelValidation`
- Manages editing state
- Tracks API errors
- Controls block editing

### `useFunnelLayout`
- Calculates block positions
- Generates connection lines
- Handles stage layouts
- Performance optimizations (lazy calculations)

### `useFunnelInteraction`
- Handles block clicks
- Manages offer selection
- Path highlighting
- Block selection state

### `useModalManagement`
- Controls modal visibility
- Manages selected offers
- Handles offline confirmation

## Visual Design

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│  FunnelBuilderHeader (Fixed)                    │
│  [Back] Merchant Conversation Editor [Theme] [Go Live] │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐  ┌──────────────────────────┐    │
│  │ Stages  │  │  Canvas Area              │    │
│  │ Labels  │  │  - Trigger Block         │    │
│  │ (Left)  │  │  - Stages & Blocks       │    │
│  │         │  │  - Connection Lines       │    │
│  │         │  │  - Pan/Drag Support      │    │
│  └──────────┘  └──────────────────────────┘    │
│                                                 │
│  [Optional Side Panel]                          │
│  - Trigger Panel                                │
│  - Config Panel (Notifications)                 │
└─────────────────────────────────────────────────┘
```

### Color Scheme
- **Violet/Purple**: Primary accent color for blocks and UI elements
- **Green**: "Go Live" button
- **Red**: "Live" status button
- **Gradients**: Used for stage labels and block headers

### Responsive Design
- Desktop: Full canvas with pan/drag
- Mobile: `MobileFunnelView` with linear scroll
- Header adapts when side panels open

## Special Features

### 1. Placeholder Auto-Insertion
- `[LINK]`: Automatically added to VALUE_DELIVERY, TRANSITION, OFFER stages
- `[USER]` and `[WHOP]`: Automatically added to WELCOME blocks
- Prevents missing required placeholders

### 2. Optimistic Updates
- UI updates immediately when editing notifications
- Backend save happens asynchronously
- Temp IDs used until real IDs assigned

### 3. Performance Optimizations
- Layout calculations deferred until needed
- ResizeObserver for dynamic sizing
- Memoization of expensive calculations
- Lazy rendering of connection lines

### 4. Deployment Protection
- Blocks cannot be edited when deployed
- Clear visual feedback (notification + button highlight)
- Must take offline before editing

## Integration Points

### Entry Points
1. **Admin Panel**: `AdminPanel.tsx` → `AIFunnelBuilderPage`
2. **Seasonal Store**: `SeasonalStore.tsx` → `AIFunnelBuilderPage` (via "Edit Merchant")
3. **Store Preview**: `StorePreviewChat.tsx` → "Edit Merchant" button

### Navigation
- **UnifiedNavigation**: Provides preview and product links
- **Back Button**: Returns to previous view (Admin Panel, Store, etc.)

## File Structure

```
lib/components/funnelBuilder/
├── AIFunnelBuilderPage.tsx      # Main orchestrator
├── FunnelBuilderHeader.tsx       # Header component
├── FunnelVisualizer.tsx          # Default view (flow visualization)
├── NotificationCanvasView.tsx    # Configure view (notifications)
├── FunnelCanvas.tsx               # Pan/drag wrapper
├── FunnelBlock.tsx                # Individual block display
├── BlockEditor.tsx                # Block editing interface
├── TriggerBlock.tsx               # Trigger configuration block
├── TriggerPanel.tsx               # Trigger selection panel
├── ConfigPanel.tsx                # Notification config panel
└── modals/
    ├── DeploymentModal.tsx
    ├── OfflineConfirmationModal.tsx
    └── ValidationModal.tsx
```

## Summary

The Merchant Conversation Editor is a sophisticated visual editor for building conversational marketing funnels. It provides:

1. **Visual Flow Editor**: Drag-and-pan canvas for building conversation flows
2. **Block Editing**: Inline editing of messages and options
3. **Notification Configuration**: Per-stage reminder notifications
4. **Trigger Management**: Configurable conversation triggers
5. **Deployment Control**: Go live/offline functionality
6. **Responsive Design**: Works on desktop and mobile
7. **Performance Optimized**: Lazy calculations and efficient rendering

The system uses optimistic updates for responsiveness, comprehensive validation for data integrity, and clear visual feedback for user actions.
