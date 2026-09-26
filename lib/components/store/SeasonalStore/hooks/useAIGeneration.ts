import { useCallback, useRef } from 'react';
import { 
  generateProductText, 
  generateProductImage, 
  generateBackgroundImage, 
  generateResponsiveBackgroundImage,
  generateLogo, 
  generateEmojiMatch,
  fileToBase64 
} from '../actions/aiService';
import { uploadUrlToWhop } from '../../../../utils/whop-image-upload';

interface UseAIGenerationProps {
  theme: any;
  setTextLoading: (loading: boolean) => void;
  setGeneratingImage: (loading: boolean) => void;
  setImageLoading: (loading: boolean) => void;
  setUploadingImage: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateProduct: (id: number, updates: any) => void;
  setAvailableAssets: (fn: (prev: any[]) => any[]) => void;
  setBackground: (type: "generated" | "uploaded", url: string | null) => Promise<void>;
  setBackgroundAttachmentId: (id: string | null) => void;
  setLogoAsset: (fn: (prev: any) => any) => void;
  setProducts: (fn: (prev: any[]) => any[]) => void;
  currentSeason: string;
  backgroundAttachmentUrl?: string;
  generatedBackground?: string;
  uploadedBackground?: string;
  logoAttachmentUrl?: string;
  iframeDimensions?: { width: number; height: number };
  toggleEditorView?: () => void;
  isEditorView?: boolean; // Current editor view state
  experienceId?: string;
}

export const useAIGeneration = ({
  theme,
  setTextLoading,
  setGeneratingImage,
  setImageLoading,
  setUploadingImage,
  setError,
  updateProduct,
  setAvailableAssets,
  setBackground,
  setBackgroundAttachmentId,
  setLogoAsset,
  setProducts,
  currentSeason,
  backgroundAttachmentUrl,
  generatedBackground,
  uploadedBackground,
  logoAttachmentUrl,
  iframeDimensions,
  toggleEditorView,
  isEditorView = true, // Default to true if not provided
  experienceId,
}: UseAIGenerationProps) => {
  const isGeneratingRef = useRef(false);

  // AI Generation Handlers
  const handleRefineAll = useCallback(async (product: any) => {
    setTextLoading(true);
    setGeneratingImage(true);
    setError(null);

    try {
      console.log('🤖 Refining product:', product.name);
      console.log('🤖 Product description:', product.description);
      console.log('🤖 Product image URL:', product.image);
      console.log('🤖 Product imageAttachmentUrl:', product.imageAttachmentUrl);
      console.log('🤖 Product has existing image:', !!product.image && !product.image.includes('placehold.co'));
      console.log('🤖 Product has imageAttachmentUrl:', !!product.imageAttachmentUrl && !product.imageAttachmentUrl.includes('placehold.co'));
      console.log('🤖 Product ID:', product.id);
      console.log('🤖 Product type:', typeof product.id === 'string' && product.id.startsWith('resource-') ? 'ResourceLibrary' : 'SeasonalStore');
      
      const refinedText = await generateProductText(product.name, product.description, theme, experienceId);
      console.log('🤖 Generated text:', refinedText);
      
      console.log('🎨 Generating/refining product image for:', refinedText.newName);
      const imageUrlToUse = product.imageAttachmentUrl || product.image;
      console.log('🎨 Original image URL being sent to AI:', imageUrlToUse);
      console.log('🎨 Using uploaded image for refinement:', !!product.imageAttachmentUrl);
      const finalImage = await generateProductImage(refinedText.newName, refinedText.newDescription, theme, imageUrlToUse, experienceId);
      console.log('🎨 Generated product image URL:', finalImage);

      // Upload generated image to WHOP storage
      console.log('📤 Uploading generated product image to WHOP...');
      const uploadResult = await uploadUrlToWhop(finalImage);
      console.log('📤 Upload result:', uploadResult);

      console.log('🔄 Updating product with ID:', product.id);
      console.log('🔄 New image URL:', uploadResult.url);
      console.log('🔄 New attachment ID:', uploadResult.attachmentId);
      
      // Check if this is a ResourceLibrary product (string ID) or regular product (numeric ID)
      if (typeof product.id === 'string' && product.id.startsWith('resource-')) {
        console.log('🔄 Updating ResourceLibrary product in themeProducts');
        setProducts(prev => prev.map((p: any) => 
            p.id === product.id 
              ? {
                  ...p,
                  name: refinedText.newName,
                  description: refinedText.newDescription,
                  image: uploadResult.url,
                  imageAttachmentId: uploadResult.attachmentId,
                  imageAttachmentUrl: uploadResult.url,
                }
              : p
          ));
      } else {
        console.log('🔄 Updating SeasonalStore product in frontend and database');
        // Update frontend state
        updateProduct(product.id, {
          name: refinedText.newName,
          description: refinedText.newDescription,
          image: uploadResult.url,
          imageAttachmentId: uploadResult.attachmentId,
          imageAttachmentUrl: uploadResult.url,
        });
        
        // Also update database theme state to persist across theme switches
        setProducts(prev => prev.map((p: any) =>
            p.id === product.id ? {
              ...p,
              name: refinedText.newName,
              description: refinedText.newDescription,
              image: uploadResult.url,
              imageAttachmentId: uploadResult.attachmentId,
              imageAttachmentUrl: uploadResult.url,
            } : p
          ));
      }
      
      console.log('✅ Product refinement complete');
    } catch (error) {
      console.error('❌ Error refining product:', error);
      setError(error instanceof Error ? error.message : 'Failed to refine product');
    } finally {
      setTextLoading(false);
      setGeneratingImage(false);
    }
  }, [theme, updateProduct, setProducts, setTextLoading, setGeneratingImage, setError, experienceId]);

  const handleGenerateAssetFromText = useCallback(async (userPrompt: string) => {
    setTextLoading(true);
    setError(null);
    
    try {
      const emoji = await generateEmojiMatch(userPrompt, experienceId);
      console.log('🎨 Generated emoji:', emoji);
      
      const newAsset = {
        id: Date.now(),
        src: `https://placehold.co/200x200/000000/ffffff?text=${emoji}`,
        name: userPrompt,
        type: 'emoji',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        rotation: 0,
        zIndex: 1,
        isDragging: false,
      };
      
      setAvailableAssets((prev: any[]) => [...prev, newAsset]);
    } catch (error) {
      console.error('❌ Error generating asset:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate asset');
    } finally {
      setTextLoading(false);
    }
  }, [setTextLoading, setError, setAvailableAssets, experienceId]);

  const handleGenerateBgClick = useCallback(async () => {
    if (isGeneratingRef.current) {
      console.log('🎨 Background generation already in progress, skipping...');
      return;
    }
    
    isGeneratingRef.current = true;
    setImageLoading(true);
    setError(null);
    
    try {
      console.log('🎨 Generating background for theme:', theme.name);
      console.log('🎨 Theme prompt:', theme.themePrompt);
      console.log('🎨 Background attachment URL:', backgroundAttachmentUrl);
      console.log('🎨 Generated background:', generatedBackground);
      console.log('🎨 Uploaded background:', uploadedBackground);
      
      const imageUrlToUse = backgroundAttachmentUrl || generatedBackground || uploadedBackground;
      console.log('🎨 Using image URL for background generation:', imageUrlToUse);
      
      let finalBackground;
      if (iframeDimensions && iframeDimensions.width > 0 && iframeDimensions.height > 0) {
        console.log('🎨 Generating responsive background with dimensions:', iframeDimensions);
        finalBackground = await generateResponsiveBackgroundImage(
          theme.themePrompt, 
          imageUrlToUse,
          undefined,
          experienceId
        );
      } else {
        console.log('🎨 Generating standard background');
        finalBackground = await generateBackgroundImage(theme.themePrompt, theme.name, imageUrlToUse, undefined, experienceId);
      }
      
      console.log('🎨 Generated background URL:', finalBackground);
      
      // Upload generated background to WHOP storage
      console.log('📤 Uploading generated background to WHOP...');
      const uploadResult = await uploadUrlToWhop(finalBackground);
      console.log('📤 Background upload result:', uploadResult);
      
      // Update background with WHOP storage URL and attachment ID
      await setBackground("generated", uploadResult.url);
      setBackgroundAttachmentId(uploadResult.attachmentId);
      console.log('✅ Background generation and upload complete');
      
      // Ensure we're in editor view after successful background generation
      // Only toggle if we're NOT already in editor view
      if (toggleEditorView && !isEditorView) {
        console.log('🎨 Switching to editor view after background generation');
        toggleEditorView();
      } else if (isEditorView) {
        console.log('🎨 Already in editor view, no need to toggle');
      }
    } catch (error) {
      console.error('❌ Error generating background:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate background');
    } finally {
      setImageLoading(false);
      isGeneratingRef.current = false;
    }
  }, [theme, backgroundAttachmentUrl, generatedBackground, uploadedBackground, iframeDimensions, setImageLoading, setError, setBackground, setBackgroundAttachmentId, experienceId]);

  const handleBgImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    try {
      setUploadingImage(true);
      const base64Data = await fileToBase64(file);
      const imageUrl = `data:${file.type};base64,${base64Data}`;
      console.log('📤 Uploading background image to WHOP...');
      const uploadResult = await uploadUrlToWhop(imageUrl);
      console.log('📤 Background upload result:', uploadResult);
      setBackground("uploaded", uploadResult.url);
      console.log('✅ Background upload complete');
    } catch (error) {
      console.error('❌ Error uploading background:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload background');
    } finally {
      setUploadingImage(false);
    }
  }, [setUploadingImage, setError, setBackground]);

  const handleLogoGeneration = useCallback(async (currentLogo: any, shape: string, themeName: string) => {
    setImageLoading(true);
    setError(null);

    try {
      console.log('🎨 Generating/refining logo for theme:', themeName);
      console.log('🎨 Logo shape:', shape);
      console.log('🎨 Current logo:', currentLogo);
      console.log('🎨 Logo attachment URL:', logoAttachmentUrl);
      console.log('🎨 Generated background:', generatedBackground);
      console.log('🎨 Uploaded background:', uploadedBackground);
      
      const imageUrlToUse = logoAttachmentUrl || currentLogo.src;
      console.log('🎨 Using image URL for logo generation:', imageUrlToUse);
      
      const finalLogo = await generateLogo(theme, shape as 'round' | 'square', imageUrlToUse || '', undefined, experienceId);
      console.log('🎨 Generated logo URL:', finalLogo);
      
      setLogoAsset((prev: any) => ({
        ...prev,
        src: finalLogo,
        shape: shape === 'round' ? 'round' : 'square'
      }));
      console.log('✅ Logo generation complete');
    } catch (error) {
      console.error('❌ Error generating logo:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate logo');
    } finally {
      setImageLoading(false);
    }
  }, [theme, logoAttachmentUrl, generatedBackground, uploadedBackground, setImageLoading, setError, setLogoAsset, experienceId]);

  const handleLogoImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    try {
      setUploadingImage(true);
      const base64Data = await fileToBase64(file);
      const imageUrl = `data:${file.type};base64,${base64Data}`;
      console.log('📤 Uploading logo image to WHOP...');
      const uploadResult = await uploadUrlToWhop(imageUrl);
      console.log('📤 Logo upload result:', uploadResult);
      setLogoAsset((prev: any) => ({
        ...prev,
        src: uploadResult.url,
        shape: 'round'
      }));
      console.log('✅ Logo upload complete');
    } catch (error) {
      console.error('❌ Error uploading logo:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload logo');
    } finally {
      setUploadingImage(false);
    }
  }, [setUploadingImage, setError, setLogoAsset]);

  return {
    handleRefineAll,
    handleGenerateAssetFromText,
    handleGenerateBgClick,
    handleBgImageUpload,
    handleLogoGeneration,
    handleLogoImageUpload,
  };
};





