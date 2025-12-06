import React from 'react';
import { TemplateSaveNotification } from './TemplateSaveNotification';
import { ThemeGenerationNotification } from './ThemeGenerationNotification';
import { MakePublicNotification } from './MakePublicNotification';
import { TemplateLimitNotification } from './TemplateLimitNotification';
import { SyncChangesPopup } from './SyncChangesPopup';

interface NotificationState {
  templateSave: {
    isOpen: boolean;
    isSaving: boolean;
    templateName: string;
  };
  themeGeneration: {
    isOpen: boolean;
    isGenerating: boolean;
    themeName: string;
  };
  makePublic: {
    isOpen: boolean;
    templateName: string;
  };
  templateLimit: boolean;
  sync: {
    isOpen: boolean;
    syncResult: any;
    isLoading: boolean;
    isApplying: boolean;
  };
}

interface NotificationsProps {
  notifications: NotificationState;
  onCloseTemplateSave: () => void;
  onCloseThemeGeneration: () => void;
  onCloseMakePublic: () => void;
  onCloseTemplateLimit: () => void;
  onOpenShopManager: () => void;
  onCloseSync: () => void;
  onApplySyncChanges: () => void;
  onSyncSuccess: () => void;
  isActive?: boolean;
}

export const Notifications: React.FC<NotificationsProps> = ({
  notifications,
  onCloseTemplateSave,
  onCloseThemeGeneration,
  onCloseMakePublic,
  onCloseTemplateLimit,
  onOpenShopManager,
  onCloseSync,
  onApplySyncChanges,
  onSyncSuccess,
  isActive = false,
}) => {
  return (
    <>
      {/* Template Save Notification */}
      <TemplateSaveNotification
        isOpen={notifications.templateSave.isOpen}
        isSaving={notifications.templateSave.isSaving}
        templateName={notifications.templateSave.templateName}
        onClose={onCloseTemplateSave}
      />

      {/* Theme Generation Notification */}
      <ThemeGenerationNotification
        isOpen={notifications.themeGeneration.isOpen}
        isGenerating={notifications.themeGeneration.isGenerating}
        themeName={notifications.themeGeneration.themeName}
        onClose={onCloseThemeGeneration}
      />

      {/* Make Public Notification */}
      <MakePublicNotification
        isOpen={notifications.makePublic.isOpen}
        templateName={notifications.makePublic.templateName}
        onClose={onCloseMakePublic}
      />

      {/* Template Limit Notification */}
      <TemplateLimitNotification
        isOpen={notifications.templateLimit}
        onClose={onCloseTemplateLimit}
        onOpenShopManager={onOpenShopManager}
      />

      {/* Sync Changes Popup - Only show in store view */}
      {isActive && (
        <SyncChangesPopup
          isOpen={notifications.sync.isOpen}
          onClose={onCloseSync}
          onApplyChanges={onApplySyncChanges}
          syncResult={notifications.sync.syncResult}
          isLoading={notifications.sync.isLoading}
          isApplying={notifications.sync.isApplying}
          onSyncSuccess={onSyncSuccess}
        />
      )}
    </>
  );
};


