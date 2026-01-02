'use client';

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2 } from 'lucide-react';
import { Heading, Text } from 'frosted-ui';
import { apiGet } from '@/lib/utils/api-client';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && companySlug) {
      setIsLoading(true);
      setError(null);
      
      // Construct Whop review URL
      const whopReviewUrl = `https://whop.com/${companySlug}/reviews/`;
      
      // Construct proxy URL
      const url = `/api/proxy/reviews/${companySlug}?url=${encodeURIComponent(whopReviewUrl)}`;
      setProxyUrl(url);
      setIsLoading(false);
    }
  }, [isOpen, companySlug]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load review page');
  };

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
          <div className="flex-1 relative overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                  <Text size="2" color="gray" className="text-gray-600 dark:text-gray-400">
                    Loading reviews...
                  </Text>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
                <div className="text-center px-6">
                  <Text size="3" weight="medium" className="text-red-600 dark:text-red-400 mb-2">
                    {error}
                  </Text>
                  <Text size="2" color="gray" className="text-gray-600 dark:text-gray-400">
                    Please try again later
                  </Text>
                </div>
              </div>
            )}

            {proxyUrl && !error && (
              <iframe
                src={proxyUrl}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title="Product Reviews"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};


