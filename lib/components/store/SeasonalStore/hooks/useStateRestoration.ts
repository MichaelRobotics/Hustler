import { useEffect } from 'react';

interface UseStateRestorationProps {
  isStoreContentReady: boolean;
  isActive: boolean;
  liveTemplate: any;
  lastActiveTemplate: any;
  currentSeason: string;
  restoreLastActiveState: () => void;
  saveLastActiveTheme: (theme: string) => void;
  saveLastActiveTemplate: (template: any) => void;
}

export function useStateRestoration({
  isStoreContentReady,
  isActive,
  liveTemplate,
  lastActiveTemplate,
  currentSeason,
  restoreLastActiveState,
  saveLastActiveTheme,
  saveLastActiveTemplate,
}: UseStateRestorationProps) {
  // Save current state when theme or template changes
  useEffect(() => {
    if (currentSeason) {
      saveLastActiveTheme(currentSeason);
    }
  }, [currentSeason, saveLastActiveTheme]);

  useEffect(() => {
    if (liveTemplate) {
      saveLastActiveTemplate(liveTemplate);
    }
  }, [liveTemplate, saveLastActiveTemplate]);

  // Restore last active state when store loads
  useEffect(() => {
    if (isStoreContentReady && !liveTemplate && lastActiveTemplate) {
      restoreLastActiveState();
    }
  }, [isStoreContentReady, liveTemplate, lastActiveTemplate, restoreLastActiveState]);

  // Restore last active state when store becomes active
  useEffect(() => {
    if (isActive && isStoreContentReady && !liveTemplate && lastActiveTemplate) {
      restoreLastActiveState();
    }
  }, [isActive, isStoreContentReady, liveTemplate, lastActiveTemplate, restoreLastActiveState]);
}


