/**
 * UserChat Backend Service
 * Handles all backend communication for the UserChat components
 */

export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
  conversationId: string;
}

export interface ChatOption {
  id: string;
  text: string;
  nextBlockId: string | null;
  isSelected?: boolean;
}

export interface ChatResponse {
  message: ChatMessage;
  options: ChatOption[];
  currentBlockId: string | null;
  conversationId: string;
  isComplete: boolean;
}

export interface ConversationState {
  id: string;
  funnelId: string;
  currentBlockId: string | null;
  messages: ChatMessage[];
  options: ChatOption[];
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FunnelData {
  id: string;
  name: string;
  description: string;
  startBlockId: string;
  blocks: Record<string, {
    id: string;
    message: string;
    options: ChatOption[];
    resourceName?: string;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserChatService {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = '/api', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Initialize a new conversation
   */
  async startConversation(funnelId: string, userId?: string): Promise<ConversationState> {
    const response = await this.makeRequest('/conversations', {
      method: 'POST',
      body: JSON.stringify({
        funnelId,
        userId,
        timestamp: new Date().toISOString()
      })
    });

    return this.parseConversationState(response);
  }

  /**
   * Get conversation state by ID
   */
  async getConversation(conversationId: string): Promise<ConversationState> {
    const response = await this.makeRequest(`/conversations/${conversationId}`);
    return this.parseConversationState(response);
  }

  /**
   * Send a message and get bot response
   */
  async sendMessage(
    conversationId: string, 
    message: string, 
    optionId?: string
  ): Promise<ChatResponse> {
    const response = await this.makeRequest(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        optionId,
        timestamp: new Date().toISOString()
      })
    });

    return this.parseChatResponse(response);
  }

  /**
   * Get funnel data by ID
   */
  async getFunnel(funnelId: string): Promise<FunnelData> {
    const response = await this.makeRequest(`/funnels/${funnelId}`);
    return this.parseFunnelData(response);
  }

  /**
   * Get user's conversation history
   */
  async getUserConversations(userId: string): Promise<ConversationState[]> {
    const response = await this.makeRequest(`/users/${userId}/conversations`);
    return response.map((conv: any) => this.parseConversationState(conv));
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await this.makeRequest(`/conversations/${conversationId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Make HTTP request with error handling
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      defaultHeaders['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('UserChat API Error:', error);
      throw new Error(`Failed to communicate with backend: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse conversation state from API response
   */
  private parseConversationState(data: any): ConversationState {
    return {
      id: data.id,
      funnelId: data.funnelId,
      currentBlockId: data.currentBlockId,
      messages: data.messages?.map((msg: any) => ({
        id: msg.id,
        type: msg.type,
        text: msg.text,
        timestamp: new Date(msg.timestamp),
        conversationId: data.id
      })) || [],
      options: data.options || [],
      isComplete: data.isComplete || false,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }

  /**
   * Parse chat response from API
   */
  private parseChatResponse(data: any): ChatResponse {
    return {
      message: {
        id: data.message.id,
        type: data.message.type,
        text: data.message.text,
        timestamp: new Date(data.message.timestamp),
        conversationId: data.conversationId
      },
      options: data.options || [],
      currentBlockId: data.currentBlockId,
      conversationId: data.conversationId,
      isComplete: data.isComplete || false
    };
  }

  /**
   * Parse funnel data from API response
   */
  private parseFunnelData(data: any): FunnelData {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      startBlockId: data.startBlockId,
      blocks: data.blocks || {},
      isActive: data.isActive || false,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }
}

// Default service instance
export const userChatService = new UserChatService();

// Export types for use in components
export type {
  ChatMessage as UserChatMessage,
  ChatOption as UserChatOption,
  ChatResponse as UserChatResponse,
  ConversationState as UserChatConversationState,
  FunnelData as UserChatFunnelData
};
