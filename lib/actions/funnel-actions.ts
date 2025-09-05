import { db } from '../supabase/db';
import { funnels, funnelResources, resources, funnelAnalytics } from '../supabase/schema';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import { AuthenticatedUser } from '../middleware/auth';
import { generateFunnelFlow } from './ai-actions';
import { updateUserCredits } from '../context/user-context';
import { realTimeUpdates } from '../websocket/updates';

export interface CreateFunnelInput {
  name: string;
  description?: string;
  resources?: string[]; // Resource IDs
}

export interface UpdateFunnelInput {
  name?: string;
  description?: string;
  flow?: any;
  resources?: string[]; // Resource IDs
}

export interface FunnelWithResources {
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
  resources: Array<{
    id: string;
    name: string;
    type: 'AFFILIATE' | 'MY_PRODUCTS';
    category: 'PAID' | 'FREE_VALUE';
    link: string;
    code?: string;
    description?: string;
  }>;
}

export interface FunnelListResponse {
  funnels: FunnelWithResources[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Create a new funnel
 */
export async function createFunnel(
  user: AuthenticatedUser,
  input: CreateFunnelInput
): Promise<FunnelWithResources> {
  try {
    // Create the funnel
    const [newFunnel] = await db.insert(funnels).values({
      companyId: user.companyId,
      userId: user.id,
      name: input.name,
      description: input.description || null,
      flow: null,
      isDeployed: false,
      wasEverDeployed: false,
      generationStatus: 'idle',
      sends: 0
    }).returning();

    // Assign resources if provided
    if (input.resources && input.resources.length > 0) {
      // Verify resources belong to user's company
      const userResources = await db.query.resources.findMany({
        where: and(
          eq(resources.companyId, user.companyId),
          sql`${resources.id} = ANY(${input.resources})`
        )
      });

      if (userResources.length !== input.resources.length) {
        throw new Error('Some resources do not exist or belong to different company');
      }

      // Create funnel-resource relationships
      const funnelResourceValues = input.resources.map(resourceId => ({
        funnelId: newFunnel.id,
        resourceId: resourceId
      }));

      await db.insert(funnelResources).values(funnelResourceValues);
    }

    // Fetch the complete funnel with resources
    return await getFunnelById(user, newFunnel.id);
  } catch (error) {
    console.error('Error creating funnel:', error);
    throw new Error('Failed to create funnel');
  }
}

/**
 * Get funnel by ID with resources
 */
export async function getFunnelById(
  user: AuthenticatedUser,
  funnelId: string
): Promise<FunnelWithResources> {
  try {
    const funnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.id, funnelId),
        eq(funnels.companyId, user.companyId)
      ),
      with: {
        funnelResources: {
          with: {
            resource: true
          }
        }
      }
    });

    if (!funnel) {
      throw new Error('Funnel not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && funnel.userId !== user.id) {
      throw new Error('Access denied: You can only access your own funnels');
    }

    return {
      id: funnel.id,
      name: funnel.name,
      description: funnel.description || undefined,
      flow: funnel.flow,
      isDeployed: funnel.isDeployed,
      wasEverDeployed: funnel.wasEverDeployed,
      generationStatus: funnel.generationStatus,
      sends: funnel.sends,
      createdAt: funnel.createdAt,
      updatedAt: funnel.updatedAt,
      resources: funnel.funnelResources.map((fr: any) => ({
        id: fr.resource.id,
        name: fr.resource.name,
        type: fr.resource.type,
        category: fr.resource.category,
        link: fr.resource.link,
        code: fr.resource.code || undefined,
        description: fr.resource.description || undefined
      }))
    };
  } catch (error) {
    console.error('Error getting funnel:', error);
    throw error;
  }
}

/**
 * Get all funnels for user/company with pagination
 */
export async function getFunnels(
  user: AuthenticatedUser,
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<FunnelListResponse> {
  try {
    const offset = (page - 1) * limit;
    
    // Build where conditions
    let whereConditions = eq(funnels.companyId, user.companyId);
    
    // Add user filter for customers
    if (user.accessLevel === 'customer') {
      whereConditions = and(whereConditions, eq(funnels.userId, user.id))!;
    }
    
    // Add search filter
    if (search) {
      whereConditions = and(
        whereConditions,
        sql`${funnels.name} ILIKE ${'%' + search + '%'}`
      )!;
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(funnels)
      .where(whereConditions);
    
    const total = totalResult.count;

    // Get funnels with resources
    const funnelsList = await db.query.funnels.findMany({
      where: whereConditions,
      with: {
        funnelResources: {
          with: {
            resource: true
          }
        }
      },
      orderBy: [desc(funnels.updatedAt)],
      limit: limit,
      offset: offset
    });

    const funnelsWithResources: FunnelWithResources[] = funnelsList.map((funnel: any) => ({
      id: funnel.id,
      name: funnel.name,
      description: funnel.description || undefined,
      flow: funnel.flow,
      isDeployed: funnel.isDeployed,
      wasEverDeployed: funnel.wasEverDeployed,
      generationStatus: funnel.generationStatus,
      sends: funnel.sends,
      createdAt: funnel.createdAt,
      updatedAt: funnel.updatedAt,
      resources: funnel.funnelResources.map((fr: any) => ({
        id: fr.resource.id,
        name: fr.resource.name,
        type: fr.resource.type,
        category: fr.resource.category,
        link: fr.resource.link,
        code: fr.resource.code || undefined,
        description: fr.resource.description || undefined
      }))
    }));

    return {
      funnels: funnelsWithResources,
      total,
      page,
      limit
    };
  } catch (error) {
    console.error('Error getting funnels:', error);
    throw new Error('Failed to get funnels');
  }
}

/**
 * Update funnel
 */
export async function updateFunnel(
  user: AuthenticatedUser,
  funnelId: string,
  input: UpdateFunnelInput
): Promise<FunnelWithResources> {
  try {
    // Check if funnel exists and user has access
    const existingFunnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.id, funnelId),
        eq(funnels.companyId, user.companyId)
      )
    });

    if (!existingFunnel) {
      throw new Error('Funnel not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && existingFunnel.userId !== user.id) {
      throw new Error('Access denied: You can only update your own funnels');
    }

    // Update funnel
    const [updatedFunnel] = await db.update(funnels)
      .set({
        name: input.name || existingFunnel.name,
        description: input.description !== undefined ? input.description : existingFunnel.description,
        flow: input.flow || existingFunnel.flow,
        updatedAt: new Date()
      })
      .where(eq(funnels.id, funnelId))
      .returning();

    // Update resources if provided
    if (input.resources !== undefined) {
      // Remove existing resource assignments
      await db.delete(funnelResources)
        .where(eq(funnelResources.funnelId, funnelId));

      // Add new resource assignments
      if (input.resources.length > 0) {
        // Verify resources belong to user's company
        const userResources = await db.query.resources.findMany({
          where: and(
            eq(resources.companyId, user.companyId),
            sql`${resources.id} = ANY(${input.resources})`
          )
        });

        if (userResources.length !== input.resources.length) {
          throw new Error('Some resources do not exist or belong to different company');
        }

        // Create new funnel-resource relationships
        const funnelResourceValues = input.resources.map(resourceId => ({
          funnelId: funnelId,
          resourceId: resourceId
        }));

        await db.insert(funnelResources).values(funnelResourceValues);
      }
    }

    // Return updated funnel with resources
    return await getFunnelById(user, funnelId);
  } catch (error) {
    console.error('Error updating funnel:', error);
    throw error;
  }
}

/**
 * Delete funnel
 */
export async function deleteFunnel(
  user: AuthenticatedUser,
  funnelId: string
): Promise<boolean> {
  try {
    // Check if funnel exists and user has access
    const existingFunnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.id, funnelId),
        eq(funnels.companyId, user.companyId)
      )
    });

    if (!existingFunnel) {
      throw new Error('Funnel not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && existingFunnel.userId !== user.id) {
      throw new Error('Access denied: You can only delete your own funnels');
    }

    // Delete funnel (cascade will handle related records)
    await db.delete(funnels)
      .where(eq(funnels.id, funnelId));

    return true;
  } catch (error) {
    console.error('Error deleting funnel:', error);
    throw error;
  }
}

/**
 * Deploy funnel
 */
export async function deployFunnel(
  user: AuthenticatedUser,
  funnelId: string
): Promise<FunnelWithResources> {
  try {
    // Check if funnel exists and user has access
    const existingFunnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.id, funnelId),
        eq(funnels.companyId, user.companyId)
      )
    });

    if (!existingFunnel) {
      throw new Error('Funnel not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && existingFunnel.userId !== user.id) {
      throw new Error('Access denied: You can only deploy your own funnels');
    }

    // Check if funnel has a flow
    if (!existingFunnel.flow) {
      throw new Error('Cannot deploy funnel without a flow');
    }

    // Update funnel deployment status
    const [updatedFunnel] = await db.update(funnels)
      .set({
        isDeployed: true,
        wasEverDeployed: true,
        updatedAt: new Date()
      })
      .where(eq(funnels.id, funnelId))
      .returning();

    // Send real-time deployment notification
    await realTimeUpdates.sendFunnelDeploymentUpdate(
      user,
      funnelId,
      existingFunnel.name,
      true
    );

    return await getFunnelById(user, funnelId);
  } catch (error) {
    console.error('Error deploying funnel:', error);
    throw error;
  }
}

/**
 * Undeploy funnel
 */
export async function undeployFunnel(
  user: AuthenticatedUser,
  funnelId: string
): Promise<FunnelWithResources> {
  try {
    // Check if funnel exists and user has access
    const existingFunnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.id, funnelId),
        eq(funnels.companyId, user.companyId)
      )
    });

    if (!existingFunnel) {
      throw new Error('Funnel not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && existingFunnel.userId !== user.id) {
      throw new Error('Access denied: You can only undeploy your own funnels');
    }

    // Update funnel deployment status
    const [updatedFunnel] = await db.update(funnels)
      .set({
        isDeployed: false,
        updatedAt: new Date()
      })
      .where(eq(funnels.id, funnelId))
      .returning();

    // Send real-time undeployment notification
    await realTimeUpdates.sendFunnelDeploymentUpdate(
      user,
      funnelId,
      existingFunnel.name,
      false
    );

    return await getFunnelById(user, funnelId);
  } catch (error) {
    console.error('Error undeploying funnel:', error);
    throw error;
  }
}

/**
 * Regenerate funnel flow using AI
 */
export async function regenerateFunnelFlow(
  user: AuthenticatedUser,
  funnelId: string
): Promise<FunnelWithResources> {
  try {
    // Check if funnel exists and user has access
    const existingFunnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.id, funnelId),
        eq(funnels.companyId, user.companyId)
      ),
      with: {
        funnelResources: {
          with: {
            resource: true
          }
        }
      }
    });

    if (!existingFunnel) {
      throw new Error('Funnel not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && existingFunnel.userId !== user.id) {
      throw new Error('Access denied: You can only regenerate your own funnels');
    }

    // Check if user has sufficient credits
    if (user.credits < 1) {
      throw new Error('Insufficient credits: Regeneration requires 1 credit');
    }

    // Update generation status to generating
    await db.update(funnels)
      .set({
        generationStatus: 'generating',
        updatedAt: new Date()
      })
      .where(eq(funnels.id, funnelId));

    // Send real-time generation started notification
    await realTimeUpdates.sendFunnelGenerationUpdate(
      user,
      funnelId,
      existingFunnel.name,
      'generation_started',
      0,
      'Starting funnel generation...'
    );

    try {
      // Prepare resources for AI generation
      const resourcesForAI = existingFunnel.funnelResources.map((fr: any) => ({
        id: fr.resource.id,
        name: fr.resource.name,
        type: fr.resource.type,
        category: fr.resource.category,
        link: fr.resource.link,
        code: fr.resource.code || ''
      }));

      // Send progress update
      await realTimeUpdates.sendFunnelGenerationUpdate(
        user,
        funnelId,
        existingFunnel.name,
        'generation_progress',
        50,
        'Generating funnel flow with AI...'
      );

      // Generate new flow using AI
      const generatedFlow = await generateFunnelFlow(resourcesForAI);

      // Send progress update
      await realTimeUpdates.sendFunnelGenerationUpdate(
        user,
        funnelId,
        existingFunnel.name,
        'generation_progress',
        90,
        'Finalizing funnel flow...'
      );

      // Update funnel with new flow
      const [updatedFunnel] = await db.update(funnels)
        .set({
          flow: generatedFlow,
          generationStatus: 'completed',
          isDeployed: false, // Reset deployment status
          updatedAt: new Date()
        })
        .where(eq(funnels.id, funnelId))
        .returning();

      // Send completion notification
      await realTimeUpdates.sendFunnelGenerationUpdate(
        user,
        funnelId,
        existingFunnel.name,
        'generation_completed',
        100,
        'Funnel generation completed successfully!'
      );

      // Deduct credit
      const creditDeducted = await updateUserCredits(user.whopUserId, 1, 'subtract');
      
      if (!creditDeducted) {
        console.warn('Failed to deduct credits for user:', user.whopUserId);
      }

      return await getFunnelById(user, funnelId);
    } catch (aiError) {
      // Update generation status to failed
      await db.update(funnels)
        .set({
          generationStatus: 'failed',
          updatedAt: new Date()
        })
        .where(eq(funnels.id, funnelId));

      // Send failure notification
      await realTimeUpdates.sendFunnelGenerationUpdate(
        user,
        funnelId,
        existingFunnel.name,
        'generation_failed',
        0,
        `Funnel generation failed: ${(aiError as Error).message}`
      );

      throw aiError;
    }
  } catch (error) {
    console.error('Error regenerating funnel flow:', error);
    throw error;
  }
}

/**
 * Get funnel analytics
 */
export async function getFunnelAnalytics(
  user: AuthenticatedUser,
  funnelId: string,
  startDate?: Date,
  endDate?: Date
): Promise<any> {
  try {
    // Check if funnel exists and user has access
    const existingFunnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.id, funnelId),
        eq(funnels.companyId, user.companyId)
      )
    });

    if (!existingFunnel) {
      throw new Error('Funnel not found');
    }

    // Check access permissions
    if (user.accessLevel === 'customer' && existingFunnel.userId !== user.id) {
      throw new Error('Access denied: You can only view analytics for your own funnels');
    }

    // Build date filter
    let dateFilter = eq(funnelAnalytics.funnelId, funnelId);
    
    if (startDate) {
      dateFilter = and(dateFilter, sql`${funnelAnalytics.date} >= ${startDate}`)!;
    }
    
    if (endDate) {
      dateFilter = and(dateFilter, sql`${funnelAnalytics.date} <= ${endDate}`)!;
    }

    // Get analytics data
    const analytics = await db.query.funnelAnalytics.findMany({
      where: dateFilter,
      orderBy: [asc(funnelAnalytics.date)]
    });

    // Calculate totals
    const totals = analytics.reduce((acc: any, record: any) => {
      acc.views += record.views;
      acc.starts += record.starts;
      acc.completions += record.completions;
      acc.conversions += record.conversions;
      acc.revenue += parseFloat(record.revenue);
      return acc;
    }, {
      views: 0,
      starts: 0,
      completions: 0,
      conversions: 0,
      revenue: 0
    });

    return {
      funnel: {
        id: existingFunnel.id,
        name: existingFunnel.name,
        isDeployed: existingFunnel.isDeployed
      },
      analytics: analytics,
      totals: totals,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    };
  } catch (error) {
    console.error('Error getting funnel analytics:', error);
    throw error;
  }
}
