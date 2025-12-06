'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button, Heading, Text } from 'frosted-ui';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkUrl: string;
  onLinkUrlChange: (url: string) => void;
  onInsert: () => void;
}

export const LinkModal: React.FC<LinkModalProps> = ({
  isOpen,
  onClose,
  linkUrl,
  onLinkUrlChange,
  onInsert,
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[80]" />
        <Dialog.Content 
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-900 text-foreground shadow-2xl z-[80] rounded-lg"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="px-8 py-6 space-y-4">
            <Dialog.Title asChild>
              <Heading size="5" weight="bold" className="text-gray-900 dark:text-white">
                Add Link
              </Heading>
            </Dialog.Title>
            <div>
              <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-2">
                URL
              </Text>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => onLinkUrlChange(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button
                size="3"
                color="gray"
                variant="soft"
                onClick={() => {
                  onClose();
                  onLinkUrlChange('');
                }}
                className="!px-6 !py-3"
              >
                Cancel
              </Button>
              <Button
                size="3"
                color="violet"
                variant="solid"
                onClick={() => {
                  onInsert();
                  onClose();
                  onLinkUrlChange('');
                }}
                className="!px-6 !py-3"
              >
                Add Link
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};




