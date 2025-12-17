import { useState, useCallback, useEffect } from 'react';

interface UsePreviewModeProps {
  templates: any[];
  editorState: { isEditorView: boolean };
  toggleEditorView: () => void;
  currentlyLoadedTemplateId?: string | null; // Track currently loaded template to avoid unnecessary snapshots
}

export function usePreviewMode({
  templates,
  editorState,
  toggleEditorView,
  currentlyLoadedTemplateId,
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

      // Preview mode should NEVER take snapshots - it's read-only
      // The edit mode's snapshot must be preserved when entering/exiting preview
    },
    [
      templates,
      editorState.isEditorView,
      toggleEditorView,
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

