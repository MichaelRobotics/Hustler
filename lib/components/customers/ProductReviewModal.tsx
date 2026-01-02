'use client';

import React, { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Heading, Text } from 'frosted-ui';

interface ProductReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  companySlug: string | null;
  experienceId?: string;
}

export const ProductReviewModal: React.FC<ProductReviewModalProps> = ({
  isOpen,
  onClose,
  companySlug,
  experienceId,
}) => {

  useEffect(() => {
    if (isOpen && companySlug) {
      // Construct Whop review URL directly with company slug
      const whopReviewUrl = `https://whop.com/${companySlug}/reviews/`;
      
      // Open in new window/tab
      window.open(whopReviewUrl, '_blank', 'noopener,noreferrer');
      
      // Close the modal after opening the link
      onClose();
    }
  }, [isOpen, companySlug, onClose]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 z-[100]" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-[90vw] max-w-4xl h-[calc(100vh-4rem)] max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden"
          onEscapeKeyDown={onClose}
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-radix-dialog-content]')) {
              onClose();
            }
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <Dialog.Title asChild>
              <Heading size="4" weight="bold" className="text-gray-900 dark:text-white">
                Reviews
              </Heading>
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center p-6">
            <div className="text-center">
              <Text size="3" color="gray" className="text-gray-600 dark:text-gray-400 mb-4">
                Opening reviews in a new window...
              </Text>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};


