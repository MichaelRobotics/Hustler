'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Heading, Button, Separator } from 'frosted-ui';

interface ProductEditorModalHeaderProps {
  modalTitle: string;
  modalIcon: React.ReactNode;
  onClose: () => void;
}

export const ProductEditorModalHeader: React.FC<ProductEditorModalHeaderProps> = ({
  modalTitle,
  modalIcon,
  onClose,
}) => {
  return (
    <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-4">
        <Dialog.Title asChild>
          <Heading
            size="5"
            weight="bold"
            className="flex items-center gap-3 text-gray-900 dark:text-white text-2xl font-bold tracking-tight"
          >
            {modalIcon}
            {modalTitle}
          </Heading>
        </Dialog.Title>
        <div className="flex items-center gap-2">
          <Dialog.Close asChild>
            <Button
              size="2"
              variant="soft"
              color="gray"
              className="!px-4 !py-2"
              onClick={onClose}
            >
              Close
            </Button>
          </Dialog.Close>
        </div>
      </div>
      <Separator size="1" color="gray" />
    </div>
  );
};

