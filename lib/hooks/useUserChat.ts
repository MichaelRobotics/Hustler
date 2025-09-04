import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  userChatService, 
  ConversationState, 
  ChatMessage, 
  ChatOption, 
  FunnelData,
  ChatResponse 
} from '../services/userChatService';

export interface UseUserChatOptions {
  funnelId: string;
  conversationId?: string;
  userId?: string;
  autoStart?: boolean;
  onMessageSent?: (message: string, conversationId: string) => void;
  onError?: (error: Error) => void;
}

export interface UseUserChatReturn {
  // State
  conversation: ConversationState | null;
  funnel: FunnelData | null;
  messages: ChatMessage[];
  options: ChatOption[];
  currentBlockId: string | null;
  isComplete: boolean;
  
  // Loading states
  isLoading: boolean;
  isSending: boolean;
  isInitializing: boolean;
  
  // Error states
  error: Error | null;
  
  // Actions
  startConversation: () => Promise<void>;
  sendMessage: (message: string, optionId?: string) => Promise<void>;
  selectOption: (option: ChatOption) => Promise<void>;
  resetConversation: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  
  // Refs for UI
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const useUserChat = (options: UseUserChatOptions): UseUserChatReturn => {
  const {
    funnelId,
    conversationId,
    userId,
    autoStart = true,
    onMessageSent,
    onError
  } = options;

  // State
  const [conversation, setConversation] = useState<ConversationState | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Derived state
  const messages = conversation?.messages || [];
  const chatOptions = conversation?.options || [];
  const currentBlockId = conversation?.currentBlockId || null;
  const isComplete = conversation?.isComplete || false;

  /**
   * Handle errors consistently
   */
  const handleError = useCallback((err: Error) => {
    console.error('UserChat Error:', err);
    setError(err);
    onError?.(err);
  }, [onError]);

  /**
   * Load funnel data
   */
  const loadFunnel = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const funnelData = await userChatService.getFunnel(funnelId);
      setFunnel(funnelData);
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to load funnel'));
    } finally {
      setIsLoading(false);
    }
  }, [funnelId, handleError]);

  /**
   * Start a new conversation
   */
  const startConversation = useCallback(async () => {
    try {
      setIsInitializing(true);
      setError(null);
      const newConversation = await userChatService.startConversation(funnelId, userId);
      setConversation(newConversation);
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to start conversation'));
    } finally {
      setIsInitializing(false);
    }
  }, [funnelId, userId, handleError]);

  /**
   * Load existing conversation
   */
  const loadConversation = useCallback(async (convId: string) => {
    try {
      setIsInitializing(true);
      setError(null);
      const existingConversation = await userChatService.getConversation(convId);
      setConversation(existingConversation);
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to load conversation'));
    } finally {
      setIsInitializing(false);
    }
  }, [handleError]);

  /**
   * Send a message to the conversation
   */
  const sendMessage = useCallback(async (message: string, optionId?: string) => {
    if (!conversation || isSending) return;

    try {
      setIsSending(true);
      setError(null);

      // Add user message to local state immediately for better UX
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        type: 'user',
        text: message,
        timestamp: new Date(),
        conversationId: conversation.id
      };

      setConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, userMessage]
      } : null);

      // Send to backend
      const response: ChatResponse = await userChatService.sendMessage(
        conversation.id, 
        message, 
        optionId
      );

      // Update conversation with bot response
      setConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, response.message],
        options: response.options,
        currentBlockId: response.currentBlockId,
        isComplete: response.isComplete,
        updatedAt: new Date()
      } : null);

      // Notify parent component
      onMessageSent?.(message, conversation.id);

    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to send message'));
      
      // Remove the temporary user message on error
      setConversation(prev => prev ? {
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== `temp-${Date.now()}`)
      } : null);
    } finally {
      setIsSending(false);
    }
  }, [conversation, isSending, onMessageSent, handleError]);

  /**
   * Select an option (shortcut for sendMessage with option)
   */
  const selectOption = useCallback(async (option: ChatOption) => {
    await sendMessage(option.text, option.id);
  }, [sendMessage]);

  /**
   * Reset the conversation
   */
  const resetConversation = useCallback(async () => {
    if (!conversation) return;
    
    try {
      setError(null);
      await userChatService.deleteConversation(conversation.id);
      await startConversation();
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to reset conversation'));
    }
  }, [conversation, startConversation, handleError]);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    const initialize = async () => {
      // Load funnel data first
      await loadFunnel();
      
      // Then handle conversation
      if (conversationId) {
        await loadConversation(conversationId);
      } else if (autoStart) {
        await startConversation();
      }
    };

    initialize();
  }, [funnelId, conversationId, autoStart, loadFunnel, loadConversation, startConversation]);

  return {
    // State
    conversation,
    funnel,
    messages,
    options: chatOptions,
    currentBlockId,
    isComplete,
    
    // Loading states
    isLoading,
    isSending,
    isInitializing,
    
    // Error states
    error,
    
    // Actions
    startConversation,
    sendMessage,
    selectOption,
    resetConversation,
    loadConversation,
    
    // Refs
    chatEndRef,
    chatContainerRef
  };
};
