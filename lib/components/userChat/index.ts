// User Chat Components (Mock/Development)
export { default as UserChat } from './UserChat';
export { default as UserChatPage } from './UserChatPage';
export { default as UserChatContainer } from './UserChatContainer';
export { default as UserChatExample } from './UserChatExample';
export { default as UserChatDemo } from './UserChatDemo';
export { default as CustomerView } from './CustomerView';
export { CustomerChatOptions } from './CustomerChatOptions';
export { UserChatExact } from './UserChatExact';
export { UserChatHeader } from './UserChatHeader';

// User Chat Components (Backend/Production)
export { default as UserChatBackend } from './UserChatBackend';
export { default as UserChatBackendPage } from './UserChatBackendPage';
export { default as UserChatBackendContainer } from './UserChatBackendContainer';

// Backend Services and Hooks
export { userChatService } from '../../services/userChatService';
export { useUserChat } from '../../hooks/useUserChat';
export { 
  getUserChatConfig, 
  setUserChatConfig, 
  resetUserChatConfig,
  initializeUserChatConfig 
} from '../../config/userChatConfig';

// Types
export type {
  UserChatMessage as ChatMessage,
  UserChatOption as ChatOption,
  UserChatResponse as ChatResponse,
  UserChatConversationState as ConversationState,
  UserChatFunnelData as FunnelData
} from '../../services/userChatService';

export type {
  UseUserChatOptions,
  UseUserChatReturn
} from '../../hooks/useUserChat';

export type {
  UserChatConfig
} from '../../config/userChatConfig';

// Mock Data (for development/testing)
export { mockFunnelFlow, mockFunnelFlows } from './mockData';
