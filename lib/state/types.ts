/**
 * State Management Types
 * 
 * Defines the complete state structure for frontend-backend synchronization
 * with clear separation between session-based and persistent data.
 */

// ===== FRONTEND STATE (Session-based) =====
export interface FrontendState {
  // Navigation state
  currentView: 'dashboard' | 'analytics' | 'funnelBuilder' | 'liveChat' | 'resources';
  selectedFunnelId: string | null;
  selectedConversationId: string | null;
  selectedResourceId: string | null;
  
  // UI interactions
  isTyping: boolean;
  searchQuery: string;
  appliedFilters: {
    status?: string;
    type?: string;
    category?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  scrollPosition: number;
  
  // Modal states
  isModalOpen: boolean;
  modalType: 'createFunnel' | 'editFunnel' | 'createResource' | 'editResource' | 'deleteConfirm' | null;
  selectedOffer: string | null;
  
  // Form drafts (temporary)
  draftFunnelName: string;
  draftResourceData: Partial<ResourceData>;
  draftConversationData: Partial<ConversationData>;
  
  // Real-time UI state
  hasMore: boolean;
  messageCount: number;
  lastMessageAt: Date | null;
  
  // Loading states
  isLoading: boolean;
  loadingStates: {
    funnels: boolean;
    resources: boolean;
    conversations: boolean;
    analytics: boolean;
  };
  
  // Error states
  errors: {
    [key: string]: string | null;
  };
  
  // Optimistic updates
  optimisticUpdates: {
    [key: string]: {
      type: 'create' | 'update' | 'delete';
      data: any;
      timestamp: Date;
    };
  };
}

// ===== BACKEND STATE (Persistent) =====
export interface BackendState {
  // Core business data
  funnels: FunnelData[];
  resources: ResourceData[];
  conversations: ConversationData[];
  messages: MessageData[];
  
  // User preferences
  userSettings: UserSettings;
  notificationPreferences: NotificationPreferences;
  
  // Analytics data
  funnelAnalytics: FunnelAnalyticsData[];
  userAnalytics: UserAnalyticsData[];
  
  // System state
  generationStatus: 'idle' | 'generating' | 'completed' | 'failed';
  deploymentStatus: 'deployed' | 'undeployed';
  syncStatus: 'synced' | 'syncing' | 'error';
  
  // Real-time state
  realTimeState: {
    isConnected: boolean;
    lastSync: Date | null;
    pendingUpdates: number;
    connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  };
}

// ===== DATA TYPES =====
export interface FunnelData {
  id: string;
  name: string;
  description?: string;
  flow?: any;
  isDeployed: boolean;
  wasEverDeployed: boolean;
  generationStatus: 'idle' | 'generating' | 'completed' | 'failed';
  sends: number;
  createdAt: Date;
  updatedAt: Date;
  resources: string[]; // Resource IDs
}

export interface ResourceData {
  id: string;
  name: string;
  type: 'AFFILIATE' | 'MY_PRODUCTS';
  category: 'PAID' | 'FREE_VALUE';
  link: string;
  code?: string;
  description?: string;
  whopProductId?: string;
  createdAt: Date;
  updatedAt: Date;
  funnels: string[]; // Funnel IDs
}

export interface ConversationData {
  id: string;
  funnelId: string;
  status: 'active' | 'completed' | 'abandoned';
  currentBlockId?: string;
  userPath?: any;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessageAt?: Date;
}

export interface MessageData {
  id: string;
  conversationId: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  metadata?: any;
  createdAt: Date;
  isRead: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  preferences: {
    autoSave: boolean;
    showTutorials: boolean;
    compactMode: boolean;
  };
}

export interface NotificationPreferences {
  funnelUpdates: boolean;
  resourceSync: boolean;
  newMessages: boolean;
  systemAlerts: boolean;
  marketingEmails: boolean;
}

export interface FunnelAnalyticsData {
  id: string;
  funnelId: string;
  date: Date;
  views: number;
  starts: number;
  completions: number;
  conversions: number;
  revenue: number;
}

export interface UserAnalyticsData {
  id: string;
  userId: string;
  date: Date;
  interactions: number;
  sessions: number;
  duration: number;
}

// ===== STATE ACTIONS =====
export interface StateAction {
  type: string;
  payload?: any;
  timestamp: Date;
  optimistic?: boolean;
  syncRequired?: boolean;
}

export interface StateUpdate {
  type: 'frontend' | 'backend' | 'sync';
  data: Partial<FrontendState | BackendState>;
  timestamp: Date;
  source: 'user' | 'websocket' | 'api' | 'sync';
}

// ===== SYNC TYPES =====
export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'funnel' | 'resource' | 'conversation' | 'message';
  entityId: string;
  data: any;
  timestamp: Date;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
  error?: string;
}

export interface ConflictResolution {
  entityId: string;
  entityType: string;
  localVersion: any;
  remoteVersion: any;
  resolution: 'local' | 'remote' | 'merge' | 'manual';
  resolvedData: any;
  timestamp: Date;
}

// ===== STATE CONTEXT =====
export interface StateContext {
  frontend: FrontendState;
  backend: BackendState;
  sync: {
    operations: SyncOperation[];
    conflicts: ConflictResolution[];
    isOnline: boolean;
    lastSync: Date | null;
  };
  realtime: {
    isConnected: boolean;
    connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
    pendingUpdates: number;
  };
}

// ===== STATE MANAGER INTERFACE =====
export interface StateManager {
  // State access
  getState(): StateContext;
  getFrontendState(): FrontendState;
  getBackendState(): BackendState;
  
  // State updates
  updateFrontendState(updates: Partial<FrontendState>): void;
  updateBackendState(updates: Partial<BackendState>): void;
  
  // Sync operations
  syncWithBackend(): Promise<void>;
  handleOptimisticUpdate(action: StateAction): void;
  resolveConflict(conflictId: string, resolution: ConflictResolution): void;
  
  // Real-time updates
  handleRealtimeUpdate(update: StateUpdate): void;
  subscribeToUpdates(callback: (update: StateUpdate) => void): () => void;
  
  // Offline support
  enableOfflineMode(): void;
  disableOfflineMode(): void;
  syncPendingOperations(): Promise<void>;
  
  // Validation
  validateState(state: Partial<FrontendState | BackendState>): boolean;
  getValidationErrors(): string[];
}

// ===== INITIAL STATE =====
export const initialFrontendState: FrontendState = {
  currentView: 'dashboard',
  selectedFunnelId: null,
  selectedConversationId: null,
  selectedResourceId: null,
  isTyping: false,
  searchQuery: '',
  appliedFilters: {},
  scrollPosition: 0,
  isModalOpen: false,
  modalType: null,
  selectedOffer: null,
  draftFunnelName: '',
  draftResourceData: {},
  draftConversationData: {},
  hasMore: false,
  messageCount: 0,
  lastMessageAt: null,
  isLoading: false,
  loadingStates: {
    funnels: false,
    resources: false,
    conversations: false,
    analytics: false,
  },
  errors: {},
  optimisticUpdates: {},
};

export const initialBackendState: BackendState = {
  funnels: [],
  resources: [],
  conversations: [],
  messages: [],
  userSettings: {
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    notifications: {
      email: true,
      push: true,
      inApp: true,
    },
    preferences: {
      autoSave: true,
      showTutorials: true,
      compactMode: false,
    },
  },
  notificationPreferences: {
    funnelUpdates: true,
    resourceSync: true,
    newMessages: true,
    systemAlerts: true,
    marketingEmails: false,
  },
  funnelAnalytics: [],
  userAnalytics: [],
  generationStatus: 'idle',
  deploymentStatus: 'undeployed',
  syncStatus: 'synced',
  realTimeState: {
    isConnected: false,
    lastSync: null,
    pendingUpdates: 0,
    connectionStatus: 'disconnected',
  },
};

export const initialState: StateContext = {
  frontend: initialFrontendState,
  backend: initialBackendState,
  sync: {
    operations: [],
    conflicts: [],
    isOnline: navigator.onLine,
    lastSync: null,
  },
  realtime: {
    isConnected: false,
    connectionStatus: 'disconnected',
    pendingUpdates: 0,
  },
};

