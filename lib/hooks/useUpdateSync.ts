import { useState, useCallback } from 'react';
import type { UpdateSyncResult } from '@/lib/sync/update-product-sync';
import { apiPost } from '@/lib/utils/api-client';
import type { AuthenticatedUser } from '@/lib/types/user';

interface UseUpdateSyncProps {
  user?: AuthenticatedUser | null;
  onSyncComplete?: () => void; // Callback to refresh data after sync
}

export const useUpdateSync = ({ user, onSyncComplete }: UseUpdateSyncProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [syncResult, setSyncResult] = useState<UpdateSyncResult | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false); // Track if we've checked once

  // Extract experience ID from user context (standard pattern)
  const experienceId = user?.experienceId;

  const checkForUpdates = useCallback(async () => {
    if (isChecking) return;
    
    // Check if we've already checked once - if so, don't run again
    if (hasCheckedOnce) {
      console.log('[useUpdateSync] Already checked for updates once, skipping...');
      return null;
    }
    
    // Validate experience ID before making API call
    if (!experienceId || experienceId === 'default-experience') {
      console.log('[useUpdateSync] Skipping update check - invalid experience ID:', experienceId);
      return null;
    }
    
    setIsChecking(true);
    setError(null);
    
    try {
      console.log('[useUpdateSync] Checking for updates...');
      
      const response = await apiPost('/api/resources/update-sync', {}, experienceId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check for updates');
      }

      const result = await response.json() as UpdateSyncResult;
      
      console.log('[useUpdateSync] Update check completed:', {
        hasChanges: result.hasChanges,
        totalChanges: result.summary.total,
      });
      
      setSyncResult(result);
      setHasCheckedOnce(true); // Mark as checked
      
      // Only show popup if there are actual changes
      if (result.hasChanges) {
        setShowPopup(true);
        console.log('[useUpdateSync] Changes detected - showing popup');
      } else {
        console.log('[useUpdateSync] No changes detected - popup not shown');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('[useUpdateSync] Error checking for updates:', errorMessage);
      setError(errorMessage);
      setHasCheckedOnce(true); // Mark as checked even on error to prevent retries
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [user, isChecking, hasCheckedOnce]);

  const applyChanges = useCallback(async () => {
    if (!syncResult?.hasChanges) return;
    
    // Validate experience ID before making API call
    if (!experienceId || experienceId === 'default-experience') {
      console.log('[useUpdateSync] Cannot apply changes - invalid experience ID:', experienceId);
      return null;
    }
    
    try {
      console.log('[useUpdateSync] Applying changes...');
      
      // Call the apply sync changes API with the sync result
      const response = await apiPost('/api/resources/apply-sync-changes', { syncResult }, experienceId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to apply changes');
      }

      const data = await response.json();
      console.log('[useUpdateSync] Changes applied successfully:', data);
      
      // Close popup and reset state
      setShowPopup(false);
      setSyncResult(null);
      
      // Trigger data refresh instead of page reload
      if (onSyncComplete) {
        onSyncComplete();
      }
      
      console.log('[useUpdateSync] Sync completed successfully - data refreshed');
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('[useUpdateSync] Error applying changes:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  }, [user, syncResult]);

  const closePopup = useCallback(() => {
    setShowPopup(false);
    setSyncResult(null);
    setError(null);
  }, []);

  // Reset state when user changes (for new user sessions)
  const resetState = useCallback(() => {
    setHasCheckedOnce(false);
    setSyncResult(null);
    setShowPopup(false);
    setError(null);
  }, []);

  return {
    isChecking,
    syncResult,
    showPopup,
    error,
    hasCheckedOnce,
    checkForUpdates,
    applyChanges,
    closePopup,
    resetState,
  };
};


