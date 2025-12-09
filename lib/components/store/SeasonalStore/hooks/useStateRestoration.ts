import { useEffect } from 'react';

interface UseStateRestorationProps {
  isStoreContentReady: boolean;
  isActive: boolean;
  liveTemplate: any;
  lastEditedTemplate: any;
  currentSeason: string;
  loadTemplate: (templateId: string) => Promise<any>;
  saveLastActiveTheme: (theme: string) => void;
}

export function useStateRestoration({
  isStoreContentReady,
  isActive,
  liveTemplate,
  lastEditedTemplate,
  currentSeason,
  loadTemplate,
  saveLastActiveTheme,
}: UseStateRestorationProps) {
  // Save current theme when it changes
  useEffect(() => {
    if (currentSeason) {
      saveLastActiveTheme(currentSeason);
    }
  }, [currentSeason, saveLastActiveTheme]);

  // Load latest edited template when store loads (if no live template)
  useEffect(() => {
    if (isStoreContentReady && !liveTemplate && lastEditedTemplate?.id) {
      console.log(`🔄 Loading latest edited template: ${lastEditedTemplate.name}`);
      loadTemplate(lastEditedTemplate.id).catch((error) => {
        console.error('Error loading latest template:', error);
      });
    }
  }, [isStoreContentReady, liveTemplate, lastEditedTemplate, loadTemplate]);

  // Load latest edited template when store becomes active (if no live template)
  useEffect(() => {
    if (isActive && isStoreContentReady && !liveTemplate && lastEditedTemplate?.id) {
      console.log(`🔄 Loading latest edited template on activation: ${lastEditedTemplate.name}`);
      loadTemplate(lastEditedTemplate.id).catch((error) => {
        console.error('Error loading latest template:', error);
      });
    }
  }, [isActive, isStoreContentReady, liveTemplate, lastEditedTemplate, loadTemplate]);
}


