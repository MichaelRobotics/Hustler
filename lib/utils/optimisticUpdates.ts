/**
 * Optimistic Updates Utility
 * Provides immediate UI feedback while syncing with backend
 * Improves perceived performance by updating UI before API calls complete
 */

export interface OptimisticUpdateOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error, rollback: () => void) => void;
  rollbackOnError?: boolean;
}

export class OptimisticUpdater<T> {
  private rollbackFunctions: (() => void)[] = [];

  /**
   * Execute an operation with optimistic updates
   */
  async executeOptimistic<TResult>(
    optimisticUpdate: () => void,
    apiCall: () => Promise<TResult>,
    options: OptimisticUpdateOptions<TResult> = {}
  ): Promise<TResult> {
    const { onSuccess, onError, rollbackOnError = true } = options;
    
    // Store rollback function
    const rollback = () => {
      optimisticUpdate(); // Re-apply the same update to rollback
    };
    this.rollbackFunctions.push(rollback);

    try {
      // Apply optimistic update immediately
      optimisticUpdate();
      
      // Make API call
      const result = await apiCall();
      
      // Success - call success callback
      onSuccess?.(result);
      
      return result;
    } catch (error) {
      // Error - rollback if enabled
      if (rollbackOnError) {
        rollback();
      }
      
      // Call error callback
      onError?.(error as Error, rollback);
      
      throw error;
    } finally {
      // Remove rollback function
      const index = this.rollbackFunctions.indexOf(rollback);
      if (index > -1) {
        this.rollbackFunctions.splice(index, 1);
      }
    }
  }

  /**
   * Rollback all pending optimistic updates
   */
  rollbackAll(): void {
    this.rollbackFunctions.forEach(rollback => rollback());
    this.rollbackFunctions = [];
  }

  /**
   * Get the number of pending optimistic updates
   */
  getPendingCount(): number {
    return this.rollbackFunctions.length;
  }
}

// Create a singleton instance
export const optimisticUpdater = new OptimisticUpdater();

/**
 * Hook for React components to use optimistic updates
 */
export const useOptimisticUpdates = () => {
  return {
    executeOptimistic: optimisticUpdater.executeOptimistic.bind(optimisticUpdater),
    rollbackAll: () => optimisticUpdater.rollbackAll(),
    getPendingCount: () => optimisticUpdater.getPendingCount()
  };
};

/**
 * Utility function for common optimistic update patterns
 */
export const createOptimisticUpdate = <T>(
  updateFn: (data: T) => void,
  apiCall: () => Promise<T>,
  options?: OptimisticUpdateOptions<T>
) => {
  return optimisticUpdater.executeOptimistic(
    () => updateFn({} as T), // This will be replaced with actual data
    apiCall,
    options
  );
};
