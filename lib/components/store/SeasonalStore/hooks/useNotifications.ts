import { useState } from 'react';

export function useNotifications() {
  const [templateSaveNotification, setTemplateSaveNotification] = useState<{
    isOpen: boolean;
    isSaving: boolean;
    templateName: string;
  }>({ isOpen: false, isSaving: false, templateName: '' });

  const [themeGenerationNotification, setThemeGenerationNotification] = useState<{
    isOpen: boolean;
    isGenerating: boolean;
    themeName: string;
  }>({ isOpen: false, isGenerating: false, themeName: '' });

  const [makePublicNotification, setMakePublicNotification] = useState<{
    isOpen: boolean;
    templateName: string;
  }>({ isOpen: false, templateName: '' });

  const [templateLimitNotification, setTemplateLimitNotification] = useState(false);

  return {
    templateSaveNotification,
    setTemplateSaveNotification,
    themeGenerationNotification,
    setThemeGenerationNotification,
    makePublicNotification,
    setMakePublicNotification,
    templateLimitNotification,
    setTemplateLimitNotification,
  };
}


