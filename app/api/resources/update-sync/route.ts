import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth, type AuthContext } from '@/lib/middleware/whop-auth';
import { updateProductSync } from '@/lib/sync/update-product-sync';
import { getUserContext } from '@/lib/context/user-context';

export const POST = withWhopAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { user } = context;
    console.log('[API] Update sync request received for user:', user.userId);
    
    // Validate experience ID is provided
    if (!user.experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 },
      );
    }
    
    // Get the full user context from the simplified auth
    const userContext = await getUserContext(
      user.userId,
      "", // whopCompanyId is optional for experience-based isolation
      user.experienceId,
      false, // forceRefresh
      // Don't pass access level - let it be determined from Whop API
    );

    if (!userContext) {
      return NextResponse.json(
        { error: "User context not found" },
        { status: 401 },
      );
    }
    
    const result = await updateProductSync.checkForUpdates(userContext.user);
    
    console.log('[API] Update sync completed:', {
      hasChanges: result.hasChanges,
      totalChanges: result.summary.total,
      created: result.summary.created,
      updated: result.summary.updated,
      deleted: result.summary.deleted,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Update sync error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check for updates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});
