"use client";

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button, Text } from 'frosted-ui';
import { X, ArrowLeft, DollarSign, Gift, Download, Upload } from 'lucide-react';
import { Product, LegacyTheme } from '../types';
import { useSafeIframeSdk } from '../../../../hooks/useSafeIframeSdk';
import { apiPost, apiPut } from '../../../../utils/api-client';
import { useFileUpload } from '../../../../hooks/useFileUpload';

interface ProductPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  theme: LegacyTheme;
  storeName?: string;
  experienceId?: string;
  isEditMode?: boolean; // If true, clicking thumbnails swaps images. If false (preview), just changes displayed image
}

export const ProductPageModal: React.FC<ProductPageModalProps> = ({
  isOpen,
  onClose,
  product,
  theme,
  storeName = "Store",
  experienceId,
  isEditMode = false, // Default to preview mode
}) => {
  const { isInIframe, safeInAppPurchase } = useSafeIframeSdk();
  const fileUpload = useFileUpload();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [productImages, setProductImages] = useState<string[]>(product.productImages || []);
  const [mainImageUrl, setMainImageUrl] = useState<string>(product.image || '');

  // Extract resource ID from product.id
  // Handle both "resource-{id}" format and numeric IDs
  const resourceId = (() => {
    if (typeof product.id === 'string') {
      if (product.id.startsWith('resource-')) {
        return product.id.replace('resource-', '');
      }
      // If it's a string that looks like a number, try using it directly
      if (/^\d+$/.test(product.id)) {
        return product.id;
      }
    } else if (typeof product.id === 'number') {
      // Convert numeric ID to string
      return String(product.id);
    }
    return null;
  })();

  // In preview mode, use selectedImageIndex to determine which image to display
  // In edit mode, mainImageUrl is always the main image
  const thumbnailImages = [
    mainImageUrl, // First thumbnail is the main image
    ...productImages.slice(0, 2) // Then up to 2 additional images
  ].filter(Boolean); // Remove any empty values

  // Determine which image to display in the main view
  const displayedMainImage = isEditMode 
    ? (mainImageUrl || 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp')
    : (thumbnailImages[selectedImageIndex] || mainImageUrl || 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp');

  // Clear error and sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsLoading(false);
      setSelectedImageIndex(0);
      setProductImages(product.productImages || []);
      setMainImageUrl(product.image || '');
    }
  }, [isOpen, product.productImages, product.image]);

  // Handle image upload to thumbnail slots
  // slotIndex: 0-1 (for productImages array, since slot 0 is main image)
  const handleThumbnailUpload = async (file: File, productImageIndex: number) => {
    if (!resourceId) {
      setError(`Cannot upload images: Resource ID missing. Product ID: ${product.id} (type: ${typeof product.id})`);
      console.error('Resource ID extraction failed:', { productId: product.id, productIdType: typeof product.id });
      return;
    }
    if (!experienceId) {
      setError("Cannot upload images: Experience ID missing");
      return;
    }

    setError(null);
    console.log('🔄 [ProductPageModal] Starting image upload for slot:', productImageIndex);
    
    // handleImageUpload uses a callback pattern, so we wrap it in a promise
    // to properly handle errors and ensure state updates
    try {
      await new Promise<void>((resolve, reject) => {
        // Set a timeout to detect if upload fails silently
        const timeoutId = setTimeout(() => {
          reject(new Error('Upload timed out. Please try again.'));
        }, 30000); // 30 second timeout

        fileUpload.handleImageUpload(file, async (url: string) => {
          clearTimeout(timeoutId);
          
          if (!url) {
            reject(new Error('Upload returned empty URL'));
            return;
          }

          console.log('✅ [ProductPageModal] Image uploaded successfully, URL:', url);
          
          // Optimistic update - show image immediately
          const newProductImages = [...productImages];
          // If slot is empty, add new image; if slot has image, replace it
          if (productImageIndex < newProductImages.length) {
            newProductImages[productImageIndex] = url;
          } else {
            newProductImages.push(url);
          }

          // Limit to 2 additional images (total 3 slots: main + 2 additional)
          const updatedImages = newProductImages.slice(0, 2);
          setProductImages(updatedImages); // Update state immediately so image appears
          console.log('✅ [ProductPageModal] State updated with new image, productImages:', updatedImages);

          // Then try to save to database
          try {
            const response = await apiPut(
              `/api/resources/${resourceId}`,
              {
                productImages: updatedImages,
              },
              experienceId
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || 'Failed to save images');
            }
            
            console.log('✅ [ProductPageModal] Images saved to database successfully');
            resolve();
          } catch (saveError: any) {
            console.error('❌ [ProductPageModal] Failed to save product images to database:', saveError);
            // Image is already shown, but indicate save error
            setError('Image uploaded but failed to save. Please try again.');
            // Don't revert - keep the image visible
            resolve(); // Resolve anyway so we don't block the UI
          }
        });
      });
    } catch (uploadError: any) {
      console.error('❌ [ProductPageModal] Failed to upload image:', uploadError);
      setError(uploadError.message || 'Failed to upload image. Please try again.');
    }
  };

  // Handle thumbnail click - behavior differs based on mode
  // slotIndex: 0 = main image, 1-2 = productImages[0-1]
  const handleThumbnailClick = async (slotIndex: number) => {
    if (isEditMode) {
      // Edit mode: Swap images (change order)
      if (slotIndex === 0) return; // First slot is main image, no swap needed
      
      const productImageIndex = slotIndex - 1; // Convert to productImages array index
      if (productImageIndex >= productImages.length) return;

      const thumbnailUrl = productImages[productImageIndex];
      if (!thumbnailUrl || !resourceId || !experienceId) return;

      // Swap: current main image goes to productImages, clicked thumbnail becomes main
      const newProductImages = [...productImages];
      const oldMainImage = mainImageUrl;
      
      // Replace the clicked thumbnail position with old main image
      newProductImages[productImageIndex] = oldMainImage;
      
      // Update main image
      setMainImageUrl(thumbnailUrl);
      setProductImages(newProductImages);

      // Save to database
      try {
        const response = await apiPut(
          `/api/resources/${resourceId}`,
          {
            image: thumbnailUrl,
            productImages: newProductImages,
          },
          experienceId
        );

        if (!response.ok) {
          throw new Error('Failed to update images');
        }
      } catch (saveError) {
        console.error('Failed to save image swap:', saveError);
        setError('Failed to save changes. Please try again.');
        // Revert state on error
        setMainImageUrl(oldMainImage);
        setProductImages(productImages);
      }
    } else {
      // Preview mode: Just change which image is displayed (no swapping)
      setSelectedImageIndex(slotIndex);
    }
  };

  // Handle remove thumbnail
  const handleRemoveThumbnail = async (thumbnailIndex: number) => {
    if (!resourceId || !experienceId) return;

    const newProductImages = productImages.filter((_, index) => index !== thumbnailIndex);
    setProductImages(newProductImages);

    // Save to database
    try {
      const response = await apiPut(
        `/api/resources/${resourceId}`,
        {
          productImages: newProductImages,
        },
        experienceId
      );

      if (!response.ok) {
        throw new Error('Failed to remove image');
      }
    } catch (saveError) {
      console.error('Failed to remove image:', saveError);
      setError('Failed to remove image. Please try again.');
      // Revert state on error
      setProductImages(productImages);
    }
  };

  // Determine product category
  const isPaid = product.price && product.price > 0;
  const category = isPaid ? "PAID" : "FREE_VALUE";

  // Get category badge (icon only, no text)
  const getCategoryBadge = () => {
    if (category === "PAID") {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700">
          <DollarSign className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
          <Gift className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>
      );
    }
  };

  // Handle purchase/download
  const handlePurchase = async () => {
    if (category === "FREE_VALUE") {
      // For free products, trigger download directly
      if (product.storageUrl) {
        window.open(product.storageUrl, '_blank');
        onClose();
      } else {
        setError("Download link not available");
      }
      return;
    }

    // For paid products, use Whop payment
    try {
      setIsLoading(true);
      setError(null);

      if (!isInIframe) {
        setError(
          "Please access this app through Whop to purchase products. The payment system is only available within the Whop platform."
        );
        return;
      }

      if (!product.price || product.price <= 0) {
        setError("Invalid product price");
        return;
      }

      // TODO: Replace with actual payment implementation
      // For now, use mock payment system
      console.log("🔄 [ProductPageModal] Using mock payment system");
      
      try {
        // Mock payment - simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock successful payment
        const mockPaymentResult = {
          status: "ok" as const,
          inAppPurchase: {
            id: `mock-purchase-${Date.now()}`,
            planId: `mock-plan-${product.id}`,
          }
        };
        
        console.log("✅ [ProductPageModal] Mock payment successful:", mockPaymentResult);
        
        // Provide download link
        if (product.storageUrl) {
          window.open(product.storageUrl, '_blank');
        }
        onClose();
      } catch (mockError: any) {
        console.error("❌ [ProductPageModal] Mock payment failed:", mockError);
        setError("Payment processing failed. Please try again later.");
      }
      
      /* 
      // Actual payment implementation (commented out for now)
      const response = await apiPost(
        "/api/resources/purchase-file",
        {
          resourceId: product.id,
          price: product.price,
          name: product.name,
        },
        experienceId
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create charge");
      }

      const inAppPurchase = await response.json();
      console.log("Charge created, opening payment modal:", inAppPurchase);

      // Open payment modal with iframe SDK
      const result = await safeInAppPurchase(inAppPurchase);

      console.log("Payment result:", result);

      if (result.status === "ok") {
        console.log("Payment successful");
        // Provide download link
        if (product.storageUrl) {
          window.open(product.storageUrl, '_blank');
        }
        onClose();
      } else {
        const errorMessage = result.error || "Payment failed";
        let userFriendlyMessage = errorMessage;

        if (errorMessage.toLowerCase().includes("cancel")) {
          userFriendlyMessage = "Payment was cancelled. No charges were made.";
        } else if (errorMessage.toLowerCase().includes("insufficient")) {
          userFriendlyMessage = "Payment failed due to insufficient funds. Please try a different payment method.";
        } else if (errorMessage.toLowerCase().includes("declined")) {
          userFriendlyMessage = "Payment was declined. Please check your payment details and try again.";
        } else if (errorMessage.toLowerCase().includes("expired")) {
          userFriendlyMessage = "Payment session expired. Please try again.";
        } else if (errorMessage.toLowerCase().includes("network") || errorMessage.toLowerCase().includes("timeout")) {
          userFriendlyMessage = "Network error occurred. Please check your connection and try again.";
        }

        setError(userFriendlyMessage);
      }
      */
    } catch (error: any) {
      console.error("Purchase failed:", error);
      setError(error.message || "Purchase failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Apply ProductCard styles - use ONLY product styles, no theme fallback
  const cardClass = product.cardClass || 'bg-amber-50/90 backdrop-blur-sm shadow-xl';
  const titleClass = product.titleClass || 'text-amber-900';
  const descClass = product.descClass || 'text-amber-900';
  const buttonClass = product.buttonClass || 'bg-emerald-600 hover:bg-emerald-700 text-white';

  // Detect if card background is light or dark for text color adaptation
  const isDarkBackground = cardClass.includes('gray-900') || cardClass.includes('gray-950') || 
                           cardClass.includes('black') || cardClass.includes('slate-900') ||
                           cardClass.includes('zinc-900') || cardClass.includes('neutral-900');
  const backButtonTextClass = isDarkBackground ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-gray-900';

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 z-[100]" />
        <Dialog.Content
          className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-5xl ${cardClass} text-foreground shadow-2xl rounded-2xl overflow-hidden z-[100]`}
          onEscapeKeyDown={onClose}
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            // Comprehensive check for interactive elements and modal content
            // Prevent closing if clicking on any element inside the dialog content
            const dialogContent = target.closest('[data-radix-dialog-content]');
            if (dialogContent) {
              e.preventDefault();
              return;
            }
            // Also check for common interactive elements (as fallback)
            if (
              target.tagName === 'INPUT' ||
              target.tagName === 'TEXTAREA' ||
              target.tagName === 'SELECT' ||
              target.tagName === 'BUTTON' ||
              target.tagName === 'LABEL' ||
              target.closest('input') ||
              target.closest('textarea') ||
              target.closest('select') ||
              target.closest('button') ||
              target.closest('label') ||
              target.closest('[role="dialog"]')
            ) {
              e.preventDefault();
              return;
            }
            onClose();
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Dialog.Title className="sr-only">{product.name} - Product Details</Dialog.Title>
          {/* Header with Back and Close */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <button
              onClick={onClose}
              className={`flex items-center gap-2 ${backButtonTextClass} transition-colors`}
            >
              <ArrowLeft className="w-4 h-4" />
              <Text size="2" className={backButtonTextClass}>
                Back to {storeName}
              </Text>
            </button>
            <button
              onClick={onClose}
              className={`p-2 ${backButtonTextClass} transition-colors rounded-lg hover:opacity-70`}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 max-h-[calc(100vh-120px)] overflow-y-auto">
            {/* Left Section: Images */}
            <div className="flex flex-col gap-4">
              {/* Main Image */}
              <div
                className={`relative w-full aspect-square rounded-xl overflow-hidden ${cardClass}`}
                style={{
                  backgroundImage: `url(${displayedMainImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                <div className="absolute inset-0 bg-black/10" />
              </div>

              {/* Thumbnail Images - 3 slots with upload capability */}
              <div className="flex gap-3">
                {[0, 1, 2].map((slotIndex) => {
                  const isFirstSlot = slotIndex === 0;
                  const thumbnailUrl = thumbnailImages[slotIndex];
                  const hasImage = !!thumbnailUrl;
                  
                  return (
                    <div key={slotIndex} className="relative group">
                      {hasImage ? (
                        <button
                          onClick={() => {
                            // In preview mode, allow clicking all slots including first
                            // In edit mode, first slot is not clickable
                            if (isEditMode && isFirstSlot) return;
                            handleThumbnailClick(slotIndex);
                          }}
                          className={`relative w-24 h-24 rounded-lg overflow-hidden border-2 ${
                            (isEditMode && isFirstSlot) || (!isEditMode && selectedImageIndex === slotIndex)
                              ? 'border-blue-500 ring-2 ring-blue-500/50 cursor-default' 
                              : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 cursor-pointer'
                          } transition-all`}
                        >
                          <div
                            className="w-full h-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${thumbnailUrl})` }}
                          />
                          {!isFirstSlot && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleRemoveThumbnail(slotIndex - 1); // Adjust index for productImages array
                              }}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                              role="button"
                              tabIndex={0}
                              aria-label="Remove image"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRemoveThumbnail(slotIndex - 1);
                                }
                              }}
                            >
                              <X className="w-3 h-3" />
                            </div>
                          )}
                        </button>
                      ) : (
                        <label
                          className={`w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors relative overflow-hidden ${
                            fileUpload.isUploadingImage || isFirstSlot ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && !isFirstSlot) {
                                handleThumbnailUpload(file, slotIndex - 1); // Adjust index for productImages array
                              }
                            }}
                            disabled={fileUpload.isUploadingImage || isFirstSlot}
                            className="hidden"
                          />
                          {fileUpload.isUploadingImage ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-gray-800/50">
                              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : (
                            <Upload className="w-5 h-5 text-gray-400" />
                          )}
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Section: Product Info */}
            <div className="flex flex-col gap-4">
              {/* Product Name */}
              <h1
                className={`text-5xl font-black tracking-tight ${titleClass}`}
                style={{ fontWeight: 900 }}
                dangerouslySetInnerHTML={{ __html: product.name || 'Product Name' }}
              />

              {/* Price */}
              <div className="text-2xl font-extrabold">
                <span className={titleClass}>
                  {isPaid ? `$${product.price.toFixed(2)}` : 'Free'}
                </span>
              </div>

              {/* Description */}
              <div
                className={`text-base leading-relaxed ${descClass}`}
                dangerouslySetInnerHTML={{
                  __html: product.description || 'No description available.'
                }}
              />

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <Text size="2" className="text-red-400">{error}</Text>
                </div>
              )}

              {/* Purchase/Download Button - Match ProductCard button style exactly */}
              <button
                onClick={handlePurchase}
                disabled={isLoading}
                className={`w-full py-1.5 px-3 rounded-full font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-[1.03] ${buttonClass} shadow-xl ring-2 ring-offset-2 ring-offset-white ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </div>
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: 'BUY NOW' }} />
                )}
              </button>

              {/* Security Text */}
              {category === "PAID" && (
                <Text size="1" className="text-center text-gray-500">
                  Secure payment powered by Whop
                </Text>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};


