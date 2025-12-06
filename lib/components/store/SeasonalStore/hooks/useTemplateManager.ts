import { useState, useCallback } from 'react';
import { useModalAnimation } from './useModalAnimation';

export function useTemplateManager(editorState: { isAdminSheetOpen: boolean }) {
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const templateManagerAnimOpen = useModalAnimation(templateManagerOpen);
  const adminSheetAnimOpen = useModalAnimation(editorState.isAdminSheetOpen);

  const openTemplateManager = useCallback(() => {
    setTemplateManagerOpen(true);
  }, []);

  const closeTemplateManager = useCallback(() => {
    setTemplateManagerOpen(false);
  }, []);

  const closeTemplateManagerAnimated = useCallback(() => {
    setTimeout(() => setTemplateManagerOpen(false), 300);
  }, []);

  const closeAdminSheetAnimated = useCallback((toggleAdminSheet: () => void) => {
    setTimeout(() => toggleAdminSheet(), 500);
  }, []);

  return {
    templateManagerOpen,
    setTemplateManagerOpen,
    templateManagerAnimOpen,
    adminSheetAnimOpen,
    openTemplateManager,
    closeTemplateManager,
    closeTemplateManagerAnimated,
    closeAdminSheetAnimated,
  };
}


