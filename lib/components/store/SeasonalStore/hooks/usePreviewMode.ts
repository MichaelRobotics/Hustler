import { useState, useCallback, useEffect } from 'react';

interface UsePreviewModeProps {
  templates: any[];
  editorState: { isEditorView: boolean };
  toggleEditorView: () => void;
  isTemplateLoaded: boolean;
  computeStoreSnapshot: () => string;
  setLastSavedSnapshot: (snapshot: string) => void;
  currentlyLoadedTemplateId?: string | null; // Track currently loaded template to avoid unnecessary snapshots
  snapshotData: {
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
    discountSettings: any;
  };
}

export function usePreviewMode({
  templates,
  editorState,
  toggleEditorView,
  isTemplateLoaded,
  computeStoreSnapshot,
  setLastSavedSnapshot,
  currentlyLoadedTemplateId,
  snapshotData,
}: UsePreviewModeProps) {
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [isInPreviewMode, setIsInPreviewMode] = useState(false);

  const handlePreviewTemplate = useCallback(
    async (templateId: string) => {
      const template = templates.find((t: any) => t.id === templateId);
      if (!template) {
        console.error('Template not found:', templateId);
        return;
      }

      console.log('👁️ Entering preview mode for template:', template.name);

      // Check if previewing the currently loaded template
      const isPreviewingCurrentTemplate = currentlyLoadedTemplateId === templateId;
      
      if (isPreviewingCurrentTemplate) {
        console.log('📋 Previewing currently loaded template - skipping snapshot');
        // Just enter preview mode without taking a snapshot since nothing changed
        setIsInPreviewMode(true);
        setPreviewTemplate(template);
        
        if (editorState.isEditorView) {
          toggleEditorView();
        }
        return; // Exit early - no need to wait for template load or take snapshot
      }

      setIsInPreviewMode(true);
      setPreviewTemplate(template);

      if (editorState.isEditorView) {
        toggleEditorView();
      }

      // Wait for preview template to load, then take a new snapshot
      // Only do this if we're previewing a different template
      const checkTemplateLoaded = setInterval(() => {
        if (isTemplateLoaded) {
          clearInterval(checkTemplateLoaded);
          setTimeout(() => {
            const snapshot = computeStoreSnapshot();
            setLastSavedSnapshot(snapshot);
            console.log('📸 Snapshot taken after preview template loaded');
          }, 100);
        }
      }, 50);
      
      // Cleanup interval after 5 seconds (safety timeout)
      setTimeout(() => clearInterval(checkTemplateLoaded), 5000);
    },
    [
      templates,
      editorState.isEditorView,
      toggleEditorView,
      isTemplateLoaded,
      computeStoreSnapshot,
      setLastSavedSnapshot,
      currentlyLoadedTemplateId,
    ]
  );

  const handleExitPreview = useCallback(() => {
    setIsInPreviewMode(false);
    setPreviewTemplate(null);
    if (!editorState.isEditorView) {
      toggleEditorView();
    }
  }, [editorState.isEditorView, toggleEditorView]);

  return {
    previewTemplate,
    isInPreviewMode,
    handlePreviewTemplate,
    handleExitPreview,
  };
}

