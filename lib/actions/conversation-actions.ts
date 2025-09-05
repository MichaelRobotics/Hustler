import { db } from '../supabase/db';
import { conversations, messages, funnelInteractions, funnels } from '../supabase/schema';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import { AuthenticatedUser } from '../middleware/simple-auth';
import { realTimeMessaging } from '../websocket/messaging';

export interface CreateConversationInput {
  funnelId: string;
  metadata?: any;
}

export interface UpdateConversationInput {
  status?: 'active' | 'completed' | 'abandoned';
  currentBlockId?: string;
  userPath?: any;
  metadata?: any;
}

export interface CreateMessageInput {
  conversationId: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  metadata?: any;
}

export interface CreateInteractionInput {
  conversationId: string;
  blockId: string;
  optionText: string;
  nextBlockId?: string;
}

export interface ConversationWithMessages {
  id: string;
  funnelId: string;
  status: 'active' | 'completed' | 'abandoned';
  currentBlockId?: string;
  userPath?: any;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    type: 'user' | 'bot' | 'system';
    content: string;
    metadata?: any;
    createdAt: Date;
  }>;
  interactions: Array<{
    id: string;
    blockId: string;
    optionText: string;
    nextBlockId?: string;
    createdAt: Date;
  }>;
  funnel: {
    id: string;
    name: string;
    isDeployed: boolean;
  };
}

export interface ConversationListResponse {
  conversations: ConversationWithMessages[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  user: AuthenticatedUser,
  input: CreateConversationInput
): Promise<ConversationWithMessages> {
  try {
    // Verify funnel exists and belongs to user's company
    const funnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.id, input.funnelId),
        eq(funnels.experienceId, user.experienceId)
      )
    });

    if (!funnel) {
      throw new Error('Funnel not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && funnel.userId !== user.id) {
      throw new Error('Access denied: You can only create conversations for your own funnels');
    }

    // Create the conversation
    const [newConversation] = await db.insert(conversations).values({
      experienceId: user.experienceId,
      funnelId: input.funnelId,
      status: 'active',
      currentBlockId: null,
      userPath: null,
      metadata: input.metadata || null
    }).returning();

    // Return conversation with empty messages and interactions
    return {
      id: newConversation.id,
      funnelId: newConversation.funnelId,
      status: newConversation.status,
      currentBlockId: newConversation.currentBlockId || undefined,
      userPath: newConversation.userPath,
      metadata: newConversation.metadata,
      createdAt: newConversation.createdAt,
      updatedAt: newConversation.updatedAt,
      messages: [],
      interactions: [],
      funnel: {
        id: funnel.id,
        name: funnel.name,
        isDeployed: funnel.isDeployed
      }
    };
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw new Error('Failed to create conversation');
  }
}

/**
 * Get conversation by ID with messages and interactions
 */
export async function getConversationById(
  user: AuthenticatedUser,
  conversationId: string
): Promise<ConversationWithMessages> {
  try {
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, user.experienceId)
      ),
      with: {
        messages: {
          orderBy: [asc(messages.createdAt)]
        },
        funnelInteractions: {
          orderBy: [asc(funnelInteractions.createdAt)]
        },
        funnel: true
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && conversation.funnel.userId !== user.id) {
      throw new Error('Access denied: You can only access conversations for your own funnels');
    }

    return {
      id: conversation.id,
      funnelId: conversation.funnelId,
      status: conversation.status,
      currentBlockId: conversation.currentBlockId || undefined,
      userPath: conversation.userPath,
      metadata: conversation.metadata,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map((msg: any) => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        metadata: msg.metadata,
        createdAt: msg.createdAt
      })),
      interactions: conversation.funnelInteractions.map((interaction: any) => ({
        id: interaction.id,
        blockId: interaction.blockId,
        optionText: interaction.optionText,
        nextBlockId: interaction.nextBlockId || undefined,
        createdAt: interaction.createdAt
      })),
      funnel: {
        id: conversation.funnel.id,
        name: conversation.funnel.name,
        isDeployed: conversation.funnel.isDeployed
      }
    };
  } catch (error) {
    console.error('Error getting conversation:', error);
    throw error;
  }
}

/**
 * Get all conversations for user/company with pagination
 */
export async function getConversations(
  user: AuthenticatedUser,
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: 'active' | 'completed' | 'abandoned',
  funnelId?: string
): Promise<ConversationListResponse> {
  try {
    const offset = (page - 1) * limit;
    
    // Build where conditions
    let whereConditions = eq(conversations.experienceId, user.experienceId);
    
    // Add funnel filter
    if (funnelId) {
      whereConditions = and(whereConditions, eq(conversations.funnelId, funnelId))!;
    }
    
    // Add status filter
    if (status) {
      whereConditions = and(whereConditions, eq(conversations.status, status))!;
    }
    
    // Add search filter (search in funnel name)
    if (search) {
      whereConditions = and(
        whereConditions,
        sql`EXISTS (
          SELECT 1 FROM funnels 
          WHERE funnels.id = conversations.funnel_id 
          AND funnels.name ILIKE ${'%' + search + '%'}
        )`
      )!;
    }

    // For customers, filter by their funnels
    if (user.accessLevel === 'customer') {
      whereConditions = and(
        whereConditions,
        sql`EXISTS (
          SELECT 1 FROM funnels 
          WHERE funnels.id = conversations.funnel_id 
          AND funnels.user_id = ${user.id}
        )`
      )!;
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(conversations)
      .where(whereConditions);
    
    const total = totalResult.count;

    // Get conversations with messages and interactions
    const conversationsList = await db.query.conversations.findMany({
      where: whereConditions,
      with: {
        messages: {
          orderBy: [asc(messages.createdAt)],
          limit: 50 // Limit messages per conversation for performance
        },
        funnelInteractions: {
          orderBy: [asc(funnelInteractions.createdAt)]
        },
        funnel: true
      },
      orderBy: [desc(conversations.updatedAt)],
      limit: limit,
      offset: offset
    });

    const conversationsWithMessages: ConversationWithMessages[] = conversationsList.map((conversation: any) => ({
      id: conversation.id,
      funnelId: conversation.funnelId,
      status: conversation.status,
      currentBlockId: conversation.currentBlockId || undefined,
      userPath: conversation.userPath,
      metadata: conversation.metadata,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map((msg: any) => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        metadata: msg.metadata,
        createdAt: msg.createdAt
      })),
      interactions: conversation.funnelInteractions.map((interaction: any) => ({
        id: interaction.id,
        blockId: interaction.blockId,
        optionText: interaction.optionText,
        nextBlockId: interaction.nextBlockId || undefined,
        createdAt: interaction.createdAt
      })),
      funnel: {
        id: conversation.funnel.id,
        name: conversation.funnel.name,
        isDeployed: conversation.funnel.isDeployed
      }
    }));

    return {
      conversations: conversationsWithMessages,
      total,
      page,
      limit
    };
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw new Error('Failed to get conversations');
  }
}

/**
 * Update conversation
 */
export async function updateConversation(
  user: AuthenticatedUser,
  conversationId: string,
  input: UpdateConversationInput
): Promise<ConversationWithMessages> {
  try {
    // Check if conversation exists and user has access
    const existingConversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, user.experienceId)
      ),
      with: {
        funnel: true
      }
    });

    if (!existingConversation) {
      throw new Error('Conversation not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && existingConversation.funnel.userId !== user.id) {
      throw new Error('Access denied: You can only update conversations for your own funnels');
    }

    // Update conversation
    const [updatedConversation] = await db.update(conversations)
      .set({
        status: input.status || existingConversation.status,
        currentBlockId: input.currentBlockId !== undefined ? input.currentBlockId : existingConversation.currentBlockId,
        userPath: input.userPath !== undefined ? input.userPath : existingConversation.userPath,
        metadata: input.metadata !== undefined ? input.metadata : existingConversation.metadata,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    // Return updated conversation with messages and interactions
    return await getConversationById(user, conversationId);
  } catch (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
}

/**
 * Create a message in a conversation
 */
export async function createMessage(
  user: AuthenticatedUser,
  input: CreateMessageInput
): Promise<{
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  metadata?: any;
  createdAt: Date;
}> {
  try {
    // Verify conversation exists and user has access
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, input.conversationId),
        eq(conversations.experienceId, user.experienceId)
      ),
      with: {
        funnel: true
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && conversation.funnel.userId !== user.id) {
      throw new Error('Access denied: You can only add messages to conversations for your own funnels');
    }

    // Create the message
    const [newMessage] = await db.insert(messages).values({
      conversationId: input.conversationId,
      type: input.type,
      content: input.content,
      metadata: input.metadata || null
    }).returning();

    // Send real-time message notification
    try {
      await realTimeMessaging.sendMessage(
        user,
        input.conversationId,
        input.content,
        input.type,
        input.metadata
      );
    } catch (wsError) {
      console.warn('Failed to send real-time message notification:', wsError);
      // Don't fail the message creation if WebSocket fails
    }

    return {
      id: newMessage.id,
      type: newMessage.type,
      content: newMessage.content,
      metadata: newMessage.metadata,
      createdAt: newMessage.createdAt
    };
  } catch (error) {
    console.error('Error creating message:', error);
    throw new Error('Failed to create message');
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  user: AuthenticatedUser,
  conversationId: string,
  page: number = 1,
  limit: number = 50
): Promise<{
  messages: Array<{
    id: string;
    type: 'user' | 'bot' | 'system';
    content: string;
    metadata?: any;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
}> {
  try {
    const offset = (page - 1) * limit;

    // Verify conversation exists and user has access
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, user.experienceId)
      ),
      with: {
        funnel: true
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && conversation.funnel.userId !== user.id) {
      throw new Error('Access denied: You can only view messages for conversations of your own funnels');
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.conversationId, conversationId));
    
    const total = totalResult.count;

    // Get messages
    const messagesList = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: [asc(messages.createdAt)],
      limit: limit,
      offset: offset
    });

    return {
      messages: messagesList.map((msg: any) => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        metadata: msg.metadata,
        createdAt: msg.createdAt
      })),
      total,
      page,
      limit
    };
  } catch (error) {
    console.error('Error getting messages:', error);
    throw new Error('Failed to get messages');
  }
}

/**
 * Create a funnel interaction
 */
export async function createInteraction(
  user: AuthenticatedUser,
  input: CreateInteractionInput
): Promise<{
  id: string;
  blockId: string;
  optionText: string;
  nextBlockId?: string;
  createdAt: Date;
}> {
  try {
    // Verify conversation exists and user has access
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, input.conversationId),
        eq(conversations.experienceId, user.experienceId)
      ),
      with: {
        funnel: true
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && conversation.funnel.userId !== user.id) {
      throw new Error('Access denied: You can only add interactions to conversations for your own funnels');
    }

    // Create the interaction
    const [newInteraction] = await db.insert(funnelInteractions).values({
      conversationId: input.conversationId,
      blockId: input.blockId,
      optionText: input.optionText,
      nextBlockId: input.nextBlockId || null
    }).returning();

    return {
      id: newInteraction.id,
      blockId: newInteraction.blockId,
      optionText: newInteraction.optionText,
      nextBlockId: newInteraction.nextBlockId || undefined,
      createdAt: newInteraction.createdAt
    };
  } catch (error) {
    console.error('Error creating interaction:', error);
    throw new Error('Failed to create interaction');
  }
}

/**
 * Get interactions for a conversation
 */
export async function getInteractions(
  user: AuthenticatedUser,
  conversationId: string
): Promise<Array<{
  id: string;
  blockId: string;
  optionText: string;
  nextBlockId?: string;
  createdAt: Date;
}>> {
  try {
    // Verify conversation exists and user has access
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, user.experienceId)
      ),
      with: {
        funnel: true
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && conversation.funnel.userId !== user.id) {
      throw new Error('Access denied: You can only view interactions for conversations of your own funnels');
    }

    // Get interactions
    const interactions = await db.query.funnelInteractions.findMany({
      where: eq(funnelInteractions.conversationId, conversationId),
      orderBy: [asc(funnelInteractions.createdAt)]
    });

    return interactions.map((interaction: any) => ({
      id: interaction.id,
      blockId: interaction.blockId,
      optionText: interaction.optionText,
      nextBlockId: interaction.nextBlockId || undefined,
      createdAt: interaction.createdAt
    }));
  } catch (error) {
    console.error('Error getting interactions:', error);
    throw new Error('Failed to get interactions');
  }
}

/**
 * Complete a conversation
 */
export async function completeConversation(
  user: AuthenticatedUser,
  conversationId: string
): Promise<ConversationWithMessages> {
  try {
    // Check if conversation exists and user has access
    const existingConversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, user.experienceId)
      ),
      with: {
        funnel: true
      }
    });

    if (!existingConversation) {
      throw new Error('Conversation not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && existingConversation.funnel.userId !== user.id) {
      throw new Error('Access denied: You can only complete conversations for your own funnels');
    }

    // Update conversation status
    const [updatedConversation] = await db.update(conversations)
      .set({
        status: 'completed',
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    // Return updated conversation with messages and interactions
    return await getConversationById(user, conversationId);
  } catch (error) {
    console.error('Error completing conversation:', error);
    throw error;
  }
}

/**
 * Abandon a conversation
 */
export async function abandonConversation(
  user: AuthenticatedUser,
  conversationId: string
): Promise<ConversationWithMessages> {
  try {
    // Check if conversation exists and user has access
    const existingConversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, user.experienceId)
      ),
      with: {
        funnel: true
      }
    });

    if (!existingConversation) {
      throw new Error('Conversation not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && existingConversation.funnel.userId !== user.id) {
      throw new Error('Access denied: You can only abandon conversations for your own funnels');
    }

    // Update conversation status
    const [updatedConversation] = await db.update(conversations)
      .set({
        status: 'abandoned',
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    // Return updated conversation with messages and interactions
    return await getConversationById(user, conversationId);
  } catch (error) {
    console.error('Error abandoning conversation:', error);
    throw error;
  }
}
