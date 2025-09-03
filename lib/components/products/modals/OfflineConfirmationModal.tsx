import React from 'react';
import { X } from 'lucide-react';
import { Heading, Text, Button } from 'frosted-ui';

interface OfflineConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const OfflineConfirmationModal: React.FC<OfflineConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 z-[9999]">
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-lg bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-2xl backdrop-blur-sm p-6 sm:p-8 animate-in zoom-in-95 duration-300 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 dark:border-gray-600 dark:shadow-2xl dark:shadow-black/60">
        <div className="flex justify-between items-center mb-6">
          <Heading size="4" weight="bold" className="text-foreground">
            Take Funnel Offline?
          </Heading>
          <Button
            size="1"
            variant="ghost"
            color="gray"
            onClick={onCancel}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-all duration-200 hover:scale-105"
          >
            <X size={16} strokeWidth={2.5} />
          </Button>
        </div>
        
        <div className="space-y-5">
          <div>
            <Text size="3" className="text-muted-foreground text-center">
              This will make your funnel unavailable to customers.
            </Text>
          </div>
          
          <div className="flex gap-3 pt-6">
            <Button
              color="red"
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold !py-3 !px-6 rounded-xl shadow-xl shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 transition-all duration-300 dark:bg-red-500 dark:hover:bg-red-600 dark:shadow-red-500/40 dark:hover:shadow-red-500/60"
            >
              Take Offline
            </Button>
            <Button
              variant="soft"
              color="gray"
              onClick={onCancel}
              className="!px-6 !py-3 hover:scale-105 transition-all duration-300"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
