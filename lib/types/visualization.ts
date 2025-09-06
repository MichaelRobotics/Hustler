/**
 * Visualization State Types
 * 
 * Defines the structure for persisting funnel visualization state
 * Only save when layoutPhase === 'final' and all calculations are complete
 */

export interface Position {
  x: number;
  y: number;
  opacity: number;
}

export interface Line {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface StageLayout {
  id: string;
  name: string;
  explanation: string;
  blockIds: string[];
  y: number;
  height: number;
}

export interface CanvasDimensions {
  itemCanvasWidth: number;
  totalCanvasHeight: number;
}

export interface LayoutState {
  phase: 'final'; // Only save when phase is 'final'
  positions: Record<string, Position>;
  lines: Line[];
  stageLayouts: StageLayout[];
  canvasDimensions: CanvasDimensions;
}

export interface InteractionState {
  selectedOfferBlockId: string | null;
  selectedBlockForHighlight: string | null;
  highlightedPath: {
    blocks: string[];
    options: string[];
  };
}

export interface ViewportState {
  scrollLeft: number;
  scrollTop: number;
  zoom: number;
}

export interface UserPreferences {
  showStageLabels: boolean;
  compactMode: boolean;
  connectionStyle: 'curved' | 'straight';
  autoLayout: boolean;
}

export interface VisualizationState {
  // Layout state - only save when stable
  layout?: LayoutState;
  
  // User interaction state
  interactions?: InteractionState;
  
  // Canvas viewport state
  viewport?: ViewportState;
  
  // User preferences
  preferences?: UserPreferences;
  
  // Metadata
  lastSaved?: number; // timestamp
  version?: string; // for future compatibility
}

/**
 * Default empty visualization state
 */
export const DEFAULT_VISUALIZATION_STATE: VisualizationState = {
  layout: undefined,
  interactions: {
    selectedOfferBlockId: null,
    selectedBlockForHighlight: null,
    highlightedPath: {
      blocks: [],
      options: []
    }
  },
  viewport: {
    scrollLeft: 0,
    scrollTop: 0,
    zoom: 1
  },
  preferences: {
    showStageLabels: true,
    compactMode: false,
    connectionStyle: 'curved',
    autoLayout: true
  },
  lastSaved: Date.now(),
  version: '1.0'
};

/**
 * Check if visualization state is ready to be saved
 * Only save when layout is in final phase and stable
 */
export function isVisualizationStateReadyToSave(
  layoutPhase: 'measure' | 'final',
  positions: Record<string, Position>,
  lines: Line[],
  editingBlockId: string | null
): boolean {
  return (
    layoutPhase === 'final' &&
    Object.keys(positions).length > 0 &&
    lines.length > 0 &&
    editingBlockId === null // Not currently editing
  );
}

/**
 * Create a safe visualization state object for saving
 */
export function createVisualizationState(
  layoutPhase: 'measure' | 'final',
  positions: Record<string, Position>,
  lines: Line[],
  stageLayouts: StageLayout[],
  canvasDimensions: CanvasDimensions,
  interactions: InteractionState,
  viewport: ViewportState,
  preferences: UserPreferences
): VisualizationState | null {
  // Only create state if ready to save
  if (!isVisualizationStateReadyToSave(layoutPhase, positions, lines, null)) {
    return null;
  }

  return {
    layout: {
      phase: 'final',
      positions,
      lines,
      stageLayouts,
      canvasDimensions
    },
    interactions,
    viewport,
    preferences,
    lastSaved: Date.now(),
    version: '1.0'
  };
}
