# Funnel Visualizer Data Transformation Flow

## Overview
The funnel visualizer transforms data from AI-generated prompts into interactive visual representations through a multi-stage process involving data validation, layout calculation, and visualization rendering.

## Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Resources     │───▶│   AI Generation  │───▶│  FunnelFlow     │
│   (User Input)  │    │   (Prompt + AI)  │    │  (JSON Structure)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Visualization   │◀───│  Layout Engine   │◀───│  Data Validation│
│   Rendering     │    │  (useFunnelLayout)│    │  & Processing   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  User Interface │    │  Position Calc   │    │  State Persistence│
│  (React Canvas) │    │  & Line Drawing  │    │  (Database)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Detailed Transformation Stages

### 1. Resource Input Processing
**Location**: `lib/actions/ai-actions.ts` - `generateFunnelFlow()`

**Input**: Array of Resource objects
```typescript
interface Resource {
  id: string;
  name: string;
  type: string;
  category: 'PAID_PRODUCT' | 'FREE_VALUE';
  link: string;
  code?: string;
}
```

**Process**: 
- Maps resources to formatted strings for AI prompt
- Categorizes as "Paid Product" or "Free Value"
- Includes promo codes and resource details

### 2. AI Prompt Generation & Processing
**Location**: `lib/actions/ai-actions.ts` - `generateFunnelFlow()`

**AI Prompt Structure**:
- Core concepts (stages vs blocks)
- Message construction rules
- Funnel generation rules
- Resource mapping requirements
- Validation requirements

**AI Response Processing**:
- Parses JSON response from Gemini AI
- Strips markdown code blocks if present
- Validates JSON structure
- Auto-fixes malformed JSON using `repairFunnelJson()`

### 3. FunnelFlow Data Structure
**Location**: `lib/types/funnel.ts`

**Output Structure**:
```typescript
interface FunnelFlow {
  startBlockId: string;
  stages: FunnelStage[];
  blocks: Record<string, FunnelBlock>;
}

interface FunnelStage {
  id: string;
  name: string;
  explanation: string;
  blockIds: string[];
}

interface FunnelBlock {
  id: string;
  message: string;
  options: FunnelBlockOption[];
  resourceName?: string; // Critical for offer blocks
}
```

### 4. Layout Calculation Engine
**Location**: `lib/hooks/useFunnelLayout.ts`

**Two-Phase Layout System**:

#### Phase 1: Measurement (`layoutPhase: 'measure'`)
- Sets initial positions using estimated block heights
- Renders blocks to DOM for measurement
- Calculates stage widths and canvas dimensions
- Uses `ESTIMATED_BLOCK_HEIGHT = 200px`

#### Phase 2: Final Layout (`layoutPhase: 'final'`)
- Measures actual DOM element heights
- Recalculates positions with real dimensions
- Generates connection lines between blocks
- Activates performance mode to freeze calculations

**Key Calculations**:
```typescript
// Stage positioning
const stageWidth = (itemsInStage.length - 1) * ITEM_WIDTH;
const xPos = (itemIndex * ITEM_WIDTH) - (stageWidth / 2);

// Line connections
const line = {
  x1: sourceBlock.x,
  y1: sourceBlock.y + sourceBlock.height,
  x2: targetBlock.x,
  y2: targetBlock.y
};
```

### 5. Interaction State Management
**Location**: `lib/hooks/useFunnelInteraction.ts`

**Features**:
- Block highlighting and selection
- Path tracing from offer blocks back to start
- Offer block identification and management
- Performance-optimized interaction handling

**Path Calculation**:
- Creates reverse mapping of block connections
- Traces paths from selected blocks to start
- Highlights connected blocks and options

### 6. Visualization Rendering
**Location**: `lib/components/funnelBuilder/FunnelVisualizer.tsx`

**Rendering Components**:
- **FunnelCanvas**: Main container with scrollable viewport
- **FunnelStage**: Stage labels and explanations
- **FunnelBlock**: Individual block rendering with options
- **Connection Lines**: SVG lines connecting blocks

**Visual Features**:
- Responsive layout for desktop/mobile
- Block highlighting and selection states
- Smooth animations and transitions
- Performance-optimized rendering

### 7. State Persistence
**Location**: `lib/hooks/useVisualizationPersistence.ts`

**Persistence Strategy**:
- Debounced saving (1000ms default)
- Only saves when layout is in 'final' phase
- Stores layout, interaction, and viewport state
- API endpoints: `/api/funnels/[funnelId]/visualization`

**Saved State Structure**:
```typescript
interface VisualizationState {
  layout?: LayoutState;
  interactions?: InteractionState;
  viewport?: ViewportState;
  preferences?: UserPreferences;
  lastSaved?: number;
  version?: string;
}
```

## Key Performance Optimizations

### 1. Performance Mode
- Freezes layout calculations after initial render
- Prevents unnecessary re-renders during interaction
- Temporarily enables calculations for specific actions

### 2. Memoization
- React.memo for component optimization
- useMemo for expensive calculations
- useCallback for event handlers

### 3. Layout Phases
- Two-phase rendering prevents layout thrashing
- Measurement phase for initial positioning
- Final phase for accurate dimensions

### 4. Debounced Persistence
- Prevents excessive API calls
- Only saves stable, final states
- Error handling and retry logic

## Data Validation & Error Handling

### 1. AI Response Validation
- JSON structure validation
- Required field checking
- Resource mapping verification
- Auto-repair for malformed JSON

### 2. Funnel Flow Validation
- Block connectivity verification
- Stage structure validation
- Resource name matching
- Escape hatch requirement checking

### 3. Layout Error Handling
- Fallback to estimated dimensions
- Graceful degradation for missing elements
- Performance mode activation on errors

## Integration Points

### 1. Database Integration
- Funnel flow storage in PostgreSQL
- Visualization state persistence
- Real-time updates via WebSocket

### 2. Real-time Updates
- Generation progress tracking
- Live collaboration features
- State synchronization

### 3. Analytics Integration
- Funnel performance tracking
- User interaction analytics
- Conversion path analysis

This architecture ensures robust, performant, and maintainable funnel visualization with comprehensive error handling and state management.
