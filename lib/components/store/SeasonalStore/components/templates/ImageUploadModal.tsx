'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Heading, Text } from 'frosted-ui';
import { Upload } from 'lucide-react';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (imageDataUrl: string) => void;
  inputId?: string;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onImageSelect,
  inputId = 'image-file-upload',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        onImageSelect(imageUrl);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[80]" />
        <Dialog.Content 
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-900 text-foreground shadow-2xl z-[80] rounded-lg"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="px-8 py-6">
            <Dialog.Title asChild>
              <Heading size="5" weight="bold" className="mb-4 text-gray-900 dark:text-white">
                Upload Image
              </Heading>
            </Dialog.Title>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
                const file = e.dataTransfer.files[0];
                handleFile(file);
              }}
              onClick={(e) => {
                e.stopPropagation();
                document.getElementById(inputId)?.click();
              }}
              className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 min-h-[200px] flex items-center justify-center cursor-pointer ${
                isDragOver
                  ? "border-violet-500 bg-violet-100 dark:bg-violet-900/30 ring-4 ring-violet-300 dark:ring-violet-700"
                  : "border-gray-300 dark:border-gray-600 hover:border-violet-500 dark:hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                id={inputId}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFile(file);
                  }
                }}
                className="hidden"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                <div>
                  <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-1">
                    Drag & drop image here
                  </Text>
                  <Text size="2" className="text-gray-500 dark:text-gray-400">
                    or click to browse
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};




