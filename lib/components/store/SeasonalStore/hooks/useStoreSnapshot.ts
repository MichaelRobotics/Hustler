import { useState, useEffect, useRef, useCallback } from 'react';
import { normalizeHtmlContent } from '../utils/html';

interface StoreSnapshotData {
  products: any[];
  floatingAssets: any[];
  currentSeason: string;
  fixedTextStyles: any;
  logoAsset: any;
  generatedBackground: string | null;
  uploadedBackground: string | null;
  backgroundAttachmentId: string | null;
  backgroundAttachmentUrl: string | null;
  logoAttachmentId: string | null;
  logoAttachmentUrl: string | null;
  promoButton: any;
}

interface UseStoreSnapshotProps {
  snapshotData: StoreSnapshotData;
  isInitialLoadComplete: boolean;
  isStoreContentReady: boolean;
  isTemplateLoaded: boolean;
  isInPreviewMode: boolean;
  currentlyLoadedTemplateId?: string | null; // Track which template is currently loaded
}

export function useStoreSnapshot({
  snapshotData,
  isInitialLoadComplete,
  isStoreContentReady,
  isTemplateLoaded,
  isInPreviewMode,
  currentlyLoadedTemplateId,
}: UseStoreSnapshotProps) {
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isResettingRef = useRef(false);
  const lastTemplateIdRef = useRef<string | null>(null);
  const hasTakenSnapshotForTemplateRef = useRef<string | null>(null);

  // Normalize snapshot data to ensure consistent comparison
  const normalizeSnapshotData = useCallback((data: StoreSnapshotData): StoreSnapshotData => {
    // Deep clone to avoid mutating original
    const normalized = JSON.parse(JSON.stringify(data));
    
    // Sort products by ID for consistent ordering
    if (normalized.products && Array.isArray(normalized.products)) {
      normalized.products = [...normalized.products].sort((a, b) => {
        const idA = String(a?.id || '');
        const idB = String(b?.id || '');
        return idA.localeCompare(idB);
      });
    }
    
    // Sort floating assets by ID for consistent ordering
    if (normalized.floatingAssets && Array.isArray(normalized.floatingAssets)) {
      normalized.floatingAssets = [...normalized.floatingAssets].sort((a, b) => {
        const idA = String(a?.id || '');
        const idB = String(b?.id || '');
        return idA.localeCompare(idB);
      });
    }
    
    // Normalize fixedTextStyles - ensure consistent structure and HTML content
    if (normalized.fixedTextStyles) {
      // Normalize HTML content in text styles to ensure consistent comparison
      const normalizeTextStyle = (style: any) => {
        if (!style) return style;
        // Normalize HTML content to prevent mismatches from encoding differences
        const normalizedContent = style.content 
          ? normalizeHtmlContent(String(style.content))
          : '';
        return {
          content: normalizedContent,
          color: style.color || '',
          styleClass: style.styleClass || '',
        };
      };
      
      normalized.fixedTextStyles = {
        mainHeader: normalizeTextStyle(normalized.fixedTextStyles.mainHeader),
        headerMessage: normalizeTextStyle(normalized.fixedTextStyles.headerMessage),
        subHeader: normalizeTextStyle(normalized.fixedTextStyles.subHeader),
        promoMessage: normalizeTextStyle(normalized.fixedTextStyles.promoMessage),
      };
    }
    
    // Normalize logoAsset - ensure consistent structure
    if (normalized.logoAsset) {
      normalized.logoAsset = {
        src: normalized.logoAsset.src || '',
        alt: normalized.logoAsset.alt || '',
        shape: normalized.logoAsset.shape || 'square',
      };
    }
    
    // Normalize promoButton - ensure consistent structure
    if (normalized.promoButton) {
      normalized.promoButton = {
        text: normalized.promoButton.text || '',
        buttonClass: normalized.promoButton.buttonClass || '',
        ringClass: normalized.promoButton.ringClass || '',
        ringHoverClass: normalized.promoButton.ringHoverClass || '',
        icon: normalized.promoButton.icon || '',
      };
    }
    
    // Normalize null/undefined to consistent values
    normalized.generatedBackground = normalized.generatedBackground || null;
    normalized.uploadedBackground = normalized.uploadedBackground || null;
    normalized.backgroundAttachmentId = normalized.backgroundAttachmentId || null;
    normalized.backgroundAttachmentUrl = normalized.backgroundAttachmentUrl || null;
    normalized.logoAttachmentId = normalized.logoAttachmentId || null;
    normalized.logoAttachmentUrl = normalized.logoAttachmentUrl || null;
    
    return normalized;
  }, []);

  const computeStoreSnapshot = useCallback(() => {
    const normalized = normalizeSnapshotData(snapshotData);
    return JSON.stringify(normalized);
  }, [snapshotData, normalizeSnapshotData]);

  // Take snapshot when template is fully loaded (using same stable metric as loading screen)
  // Conditions: isStoreContentReady && isTemplateLoaded && !isInPreviewMode
  // This ensures snapshot is taken only after all loading processes complete
  useEffect(() => {
    // Skip if in preview mode or template not loaded
    if (isInPreviewMode || !isTemplateLoaded || !isStoreContentReady) {
      return;
    }

    // Skip if we've already taken a snapshot for this template
    if (currentlyLoadedTemplateId && hasTakenSnapshotForTemplateRef.current === currentlyLoadedTemplateId) {
      return;
    }

    // Take snapshot after template is fully loaded
    const snapshotTimeout = setTimeout(() => {
      const snapshot = computeStoreSnapshot();
      setLastSavedSnapshot(snapshot);
      setHasUnsavedChanges(false);
      lastTemplateIdRef.current = currentlyLoadedTemplateId || null;
      hasTakenSnapshotForTemplateRef.current = currentlyLoadedTemplateId || null;
      console.log(`📸 Snapshot taken for template ${currentlyLoadedTemplateId || 'initial load'}`);
    }, 200);

    return () => clearTimeout(snapshotTimeout);
  }, [isStoreContentReady, isTemplateLoaded, isInPreviewMode, currentlyLoadedTemplateId, computeStoreSnapshot]);

  // Detect unsaved changes once a snapshot exists
  useEffect(() => {
    if (!lastSavedSnapshot) {
      return;
    }

    // Skip diff detection if we're in the middle of a reset
    if (isResettingRef.current) {
      return;
    }

    const currentSnapshot = computeStoreSnapshot();
    setHasUnsavedChanges(currentSnapshot !== lastSavedSnapshot);
  }, [computeStoreSnapshot, lastSavedSnapshot]);

  // Update snapshot manually (e.g., after save)
  // This resets the template tracking so automatic snapshots can work again
  const updateSnapshot = useCallback(() => {
    const snapshot = computeStoreSnapshot();
    setLastSavedSnapshot(snapshot);
    setHasUnsavedChanges(false);
    if (currentlyLoadedTemplateId) {
      hasTakenSnapshotForTemplateRef.current = currentlyLoadedTemplateId;
    } else {
      // If no template ID, reset tracking to allow automatic snapshot on next template load
      hasTakenSnapshotForTemplateRef.current = null;
    }
  }, [computeStoreSnapshot, currentlyLoadedTemplateId]);

  const restoreFromSnapshot = useCallback((): StoreSnapshotData | null => {
    if (!lastSavedSnapshot) {
      return null;
    }
    try {
      return JSON.parse(lastSavedSnapshot) as StoreSnapshotData;
    } catch (error) {
      console.error('Failed to parse snapshot:', error);
      return null;
    }
  }, [lastSavedSnapshot]);

  const resetSnapshot = useCallback(() => {
    // Mark that we're resetting to prevent diff detection during state restoration
    isResettingRef.current = true;
    // Immediately set hasUnsavedChanges to false
    setHasUnsavedChanges(false);
    
    // Reset template tracking so a new snapshot can be taken after state stabilizes
    hasTakenSnapshotForTemplateRef.current = null;
    
    // After a short delay, re-enable diff detection
    // Snapshot will be taken automatically when template is fully loaded
    setTimeout(() => {
      isResettingRef.current = false;
    }, 200);
  }, []);

  return {
    lastSavedSnapshot,
    hasUnsavedChanges,
    updateSnapshot,
    computeStoreSnapshot,
    restoreFromSnapshot,
    resetSnapshot,
  };
}

