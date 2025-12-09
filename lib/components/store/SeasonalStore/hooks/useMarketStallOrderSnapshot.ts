import { useEffect, useRef, useState, useCallback } from 'react';
import { Resource } from '@/lib/types/resource';

interface UseMarketStallOrderSnapshotProps {
  allResources: Resource[];
  isTemplateLoaded: boolean;
}

interface OrderSnapshotResult {
  hasOrderChanged: boolean;
  currentOrder: string[];
  snapshotOrder: string[];
  updateSnapshot: () => void;
}

/**
 * Hook to track Market Stall order and detect when it changes after template load
 * 
 * Creates a snapshot of Market Stall resource IDs in order when template loads,
 * and compares current order with snapshot to detect conflicts.
 */
export const useMarketStallOrderSnapshot = ({
  allResources,
  isTemplateLoaded,
}: UseMarketStallOrderSnapshotProps): OrderSnapshotResult => {
  const [snapshotOrder, setSnapshotOrder] = useState<string[]>([]);
  const snapshotTakenRef = useRef(false);

  // Get current Market Stall order (PAID resources sorted by displayOrder)
  const getCurrentOrder = useCallback((): string[] => {
    return allResources
      .filter((r) => r.category === 'PAID')
      .sort((a, b) => {
        if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
          return a.displayOrder - b.displayOrder;
        }
        if (a.displayOrder !== undefined) return -1;
        if (b.displayOrder !== undefined) return 1;
        return 0;
      })
      .map((r) => r.id);
  }, [allResources]);

  // Take snapshot when template loads
  useEffect(() => {
    if (isTemplateLoaded && !snapshotTakenRef.current && allResources.length > 0) {
      const currentOrder = getCurrentOrder();
      if (currentOrder.length > 0) {
        setSnapshotOrder(currentOrder);
        snapshotTakenRef.current = true;
        console.log('📸 [useMarketStallOrderSnapshot] Snapshot taken:', currentOrder);
      }
    }
  }, [isTemplateLoaded, allResources, getCurrentOrder]);

  // Reset snapshot when template unloads
  useEffect(() => {
    if (!isTemplateLoaded) {
      setSnapshotOrder([]);
      snapshotTakenRef.current = false;
    }
  }, [isTemplateLoaded]);

  // Get current order
  const currentOrder = getCurrentOrder();

  // Compare current order with snapshot
  const hasOrderChanged = snapshotOrder.length > 0 && 
    JSON.stringify(snapshotOrder) !== JSON.stringify(currentOrder);

  // Function to update snapshot (used when user dismisses conflict)
  const updateSnapshot = useCallback(() => {
    const newSnapshot = getCurrentOrder();
    setSnapshotOrder(newSnapshot);
    console.log('📸 [useMarketStallOrderSnapshot] Snapshot updated:', newSnapshot);
  }, [getCurrentOrder]);

  return {
    hasOrderChanged,
    currentOrder,
    snapshotOrder,
    updateSnapshot,
  };
};


