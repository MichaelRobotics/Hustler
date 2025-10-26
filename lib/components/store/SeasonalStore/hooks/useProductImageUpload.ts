import { useCallback } from 'react';
import { fileToBase64 } from '../services/aiService';

interface UseProductImageUploadProps {
  setUploadingImage: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setThemeProducts: (fn: (prev: any) => any) => void;
  updateProduct: (id: number, updates: any) => void;
  currentSeason: string;
}

export const useProductImageUpload = ({
  setUploadingImage,
  setError,
  setThemeProducts,
  updateProduct,
  currentSeason,
}: UseProductImageUploadProps) => {
  const handleProductImageUpload = useCallback(async (productId: number | string, file: File) => {
    if (!file) return;
    try {
      setUploadingImage(true);
      
      // Use the API route for file upload
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-to-whop', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const uploadedImage = await response.json();
      console.log('✅ Product image uploaded to WHOP:', uploadedImage);
      
      // Convert to base64 for local display
      const base64Data = await fileToBase64(file);
      const imageUrl = `data:${file.type};base64,${base64Data}`;
      
      console.log('🔄 Updating product with new image:', {
        productId,
        imageUrl: imageUrl.substring(0, 50) + '...',
        imageAttachmentId: uploadedImage.attachmentId,
        imageAttachmentUrl: uploadedImage.url
      });
      
      // Check if this is a ResourceLibrary product (string ID) or regular product (numeric ID)
      if (typeof productId === 'string' && productId.startsWith('resource-')) {
        // Update themeProducts for ResourceLibrary products
        setThemeProducts(prev => ({
          ...prev,
          [currentSeason]: (prev[currentSeason] || []).map((product: any) => 
            product.id === productId 
              ? {
                  ...product,
                  image: imageUrl,
                  imageAttachmentId: uploadedImage.attachmentId,
                  imageAttachmentUrl: uploadedImage.url
                }
              : product
          )
        }));
      } else {
        // Update regular SeasonalStore product
        updateProduct(productId as number, {
          image: imageUrl,
          imageAttachmentId: uploadedImage.attachmentId,
          imageAttachmentUrl: uploadedImage.url
        });
      }
      
      console.log('✅ Product updated successfully');
      setError(null);
    } catch (error) {
      console.error('❌ Product image upload failed:', error);
      setError(`File upload failed: ${(error as Error).message}`);
    } finally {
      setUploadingImage(false);
    }
  }, [setUploadingImage, setError, setThemeProducts, updateProduct, currentSeason]);

  return {
    handleProductImageUpload,
  };
};









