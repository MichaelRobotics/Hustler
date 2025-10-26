import { useCallback } from 'react';
import { StoreTemplate } from '../types';

interface UseTemplateSaveProps {
  saveTemplate: (templateData: Omit<StoreTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<StoreTemplate>;
  createTheme: (themeData: any) => Promise<any>;
  products: any[];
  floatingAssets: any[];
  currentSeason: string;
  theme: any;
  legacyTheme: any;
  fixedTextStyles: any;
  logoAsset: any;
  generatedBackground: string | null;
  uploadedBackground: string | null;
  backgroundAttachmentId: string | null;
  backgroundAttachmentUrl: string | null;
  logoAttachmentId: string | null;
  logoAttachmentUrl: string | null;
  promoButton: any;
  setError: (error: string | null) => void;
  experienceId: string;
  allResources?: any[]; // Add allResources to check ResourceLibrary
}

export const useTemplateSave = ({
  saveTemplate,
  createTheme,
  products,
  floatingAssets,
  currentSeason,
  theme,
  legacyTheme,
  fixedTextStyles,
  logoAsset,
  generatedBackground,
  uploadedBackground,
  backgroundAttachmentId,
  backgroundAttachmentUrl,
  logoAttachmentId,
  logoAttachmentUrl,
  promoButton,
  setError,
  experienceId,
  allResources = [],
}: UseTemplateSaveProps) => {
  const handleSaveTemplate = useCallback(async () => {
    try {
      const templateName = prompt('Enter template name:');
      if (!templateName) return;
      
      // Templates should always use themeSnapshot, never create database themes
      // This keeps templates self-contained and prevents theme dropdown pollution
      const themeId = null;
      console.log('💾 Template will use themeSnapshot for rendering, no database theme needed');
      
      console.log('💾 ===== PRODUCTS BEING SAVED =====');
      console.log('💾 Products array length:', products.length);
      console.log('💾 Products array:', JSON.stringify(products, null, 2));
      console.log('💾 Current season:', currentSeason);
      
      // Save complete frontend product state (including all customizations)
      const frontendProducts = products.filter(product => typeof product.id === 'string' && product.id.startsWith('resource-'));
      
      console.log('💾 Frontend products to save (complete state):', frontendProducts.length);
      console.log('💾 ===== END PRODUCTS BEING SAVED =====');
      
      const templateData = {
        name: templateName,
        experienceId: '', // Will be set by the API
        userId: '', // Will be set by the API
        themeId: themeId, // Use the determined theme ID
        themeSnapshot: {
          id: `theme_${Date.now()}`, // Create new theme ID for template snapshot
          experienceId: 'default-experience',
          name: theme.name,
          season: currentSeason,
          themePrompt: theme.themePrompt,
          accentColor: theme.accent,
          ringColor: theme.accent,
          card: theme.card,
          text: theme.text,
          welcomeColor: theme.welcomeColor,
          background: theme.background,
          aiMessage: theme.aiMessage,
          emojiTip: theme.emojiTip,
          createdAt: new Date(),
          updatedAt: new Date()
        }, // Complete snapshot of current theme
        currentSeason,
        templateData: {
          // Theme-specific data
          themeTextStyles: {
            [currentSeason]: {
              mainHeader: {
                content: fixedTextStyles.mainHeader?.content || '',
                color: fixedTextStyles.mainHeader?.color || '',
                styleClass: fixedTextStyles.mainHeader?.styleClass || ''
              },
              headerMessage: {
                content: fixedTextStyles.headerMessage?.content || '',
                color: fixedTextStyles.headerMessage?.color || '',
                styleClass: fixedTextStyles.headerMessage?.styleClass || ''
              },
              subHeader: {
                content: fixedTextStyles.subHeader?.content || '',
                color: fixedTextStyles.subHeader?.color || '',
                styleClass: fixedTextStyles.subHeader?.styleClass || ''
              },
              promoMessage: {
                content: fixedTextStyles.promoMessage?.content || '',
                color: fixedTextStyles.promoMessage?.color || '',
                styleClass: fixedTextStyles.promoMessage?.styleClass || ''
              }
            }
          },
          themeLogos: {
            [currentSeason]: logoAttachmentUrl ? {
              src: logoAttachmentUrl,
              shape: logoAsset?.shape || 'square',
              alt: logoAsset?.alt || 'Logo'
            } : logoAsset
          },
          themeGeneratedBackgrounds: {
            [currentSeason]: backgroundAttachmentUrl
          },
          themeUploadedBackgrounds: {
            [currentSeason]: backgroundAttachmentUrl
          },
          themeProducts: {
            [currentSeason]: frontendProducts // Save complete frontend product state
          },
          themeFloatingAssets: {
            [currentSeason]: floatingAssets.map(asset => ({
              id: asset.id,
              type: asset.type,
              src: asset.src,
              alt: asset.alt,
              x: asset.x,
              y: asset.y,
              rotation: asset.rotation,
              scale: asset.scale,
              z: asset.z,
              content: asset.content,
              color: asset.color,
              styleClass: asset.styleClass,
              isPromoMessage: asset.isPromoMessage,
              isPromoCode: asset.isPromoCode,
              isLogo: asset.isLogo,
              customData: asset.customData
            }))
          },
          
          // Current store state - save complete frontend product state
          products: frontendProducts, // Save complete frontend product state
          floatingAssets: floatingAssets.map(asset => ({
            id: asset.id,
            type: asset.type,
            src: asset.src,
            alt: asset.alt,
            x: asset.x,
            y: asset.y,
            rotation: asset.rotation,
            scale: asset.scale,
            z: asset.z,
            content: asset.content,
            color: asset.color,
            styleClass: asset.styleClass,
            isPromoMessage: asset.isPromoMessage,
            isPromoCode: asset.isPromoCode,
            isLogo: asset.isLogo,
            customData: asset.customData
          })),
          fixedTextStyles: {
            mainHeader: {
              content: fixedTextStyles.mainHeader?.content || '',
              color: fixedTextStyles.mainHeader?.color || '',
              styleClass: fixedTextStyles.mainHeader?.styleClass || ''
            },
            headerMessage: {
              content: fixedTextStyles.headerMessage?.content || '',
              color: fixedTextStyles.headerMessage?.color || '',
              styleClass: fixedTextStyles.headerMessage?.styleClass || ''
            },
            subHeader: {
              content: fixedTextStyles.subHeader?.content || '',
              color: fixedTextStyles.subHeader?.color || '',
              styleClass: fixedTextStyles.subHeader?.styleClass || ''
            },
            promoMessage: {
              content: fixedTextStyles.promoMessage?.content || '',
              color: fixedTextStyles.promoMessage?.color || '',
              styleClass: fixedTextStyles.promoMessage?.styleClass || ''
            }
          },
          logoAsset: logoAttachmentUrl ? {
            src: logoAttachmentUrl,
            shape: logoAsset?.shape || 'square',
            alt: logoAsset?.alt || 'Logo'
          } : logoAsset,
          
          // Background assets (WHOP storage)
          generatedBackground: backgroundAttachmentUrl,
          uploadedBackground: backgroundAttachmentUrl,
          backgroundAttachmentId,
          backgroundAttachmentUrl,
          logoAttachmentId,
          logoAttachmentUrl,
          
          // Current theme styling
          currentTheme: {
            name: theme.name,
            themePrompt: theme.themePrompt,
            accent: theme.accent,
            card: theme.card,
            text: theme.text,
            welcomeColor: theme.welcomeColor,
            background: theme.background,
            backgroundImage: theme.backgroundImage,
            aiMessage: theme.aiMessage,
            emojiTip: theme.emojiTip
          },
          
          // Claim button styling
          promoButton: {
            text: promoButton.text,
            buttonClass: promoButton.buttonClass,
            ringClass: promoButton.ringClass,
            ringHoverClass: promoButton.ringHoverClass,
            icon: promoButton.icon
          }
        },
        isLive: false,
        isLastEdited: false,
      };
      
      console.log('💾 ===== TEMPLATE SAVE STRUCTURE =====');
      console.log('💾 Template Name:', templateData.name);
      console.log('💾 Experience ID:', templateData.experienceId);
      console.log('💾 Current Season:', templateData.currentSeason);
      console.log('💾 Theme ID:', templateData.themeId);
      console.log('💾 Is Live:', templateData.isLive);
      console.log('💾 Is Last Edited:', templateData.isLastEdited);
      
      console.log('💾 ===== THEME SNAPSHOT =====');
      console.log('💾 Theme Snapshot:', JSON.stringify(templateData.themeSnapshot, null, 2));
      
      console.log('💾 ===== TEMPLATE DATA STRUCTURE =====');
      console.log('💾 Theme Text Styles:', JSON.stringify(templateData.templateData.themeTextStyles, null, 2));
      console.log('💾 Theme Logos:', JSON.stringify(templateData.templateData.themeLogos, null, 2));
      console.log('💾 Theme Generated Backgrounds:', JSON.stringify(templateData.templateData.themeGeneratedBackgrounds, null, 2));
      console.log('💾 Theme Uploaded Backgrounds:', JSON.stringify(templateData.templateData.themeUploadedBackgrounds, null, 2));
      console.log('💾 Theme Products:', JSON.stringify(templateData.templateData.themeProducts, null, 2));
      console.log('💾 Theme Floating Assets:', JSON.stringify(templateData.templateData.themeFloatingAssets, null, 2));
      
      console.log('💾 ===== LEGACY COMPATIBILITY =====');
      console.log('💾 Products (Legacy):', JSON.stringify(templateData.templateData.products, null, 2));
      console.log('💾 Floating Assets (Legacy):', JSON.stringify(templateData.templateData.floatingAssets, null, 2));
      console.log('💾 Fixed Text Styles (Legacy):', JSON.stringify(templateData.templateData.fixedTextStyles, null, 2));
      console.log('💾 Logo Asset (Legacy):', JSON.stringify(templateData.templateData.logoAsset, null, 2));
      console.log('💾 Generated Background (Legacy):', templateData.templateData.generatedBackground);
      console.log('💾 Uploaded Background (Legacy):', templateData.templateData.uploadedBackground);
      
      console.log('💾 ===== WHOP ATTACHMENTS =====');
      console.log('💾 Background Attachment ID:', templateData.templateData.backgroundAttachmentId);
      console.log('💾 Background Attachment URL:', templateData.templateData.backgroundAttachmentUrl);
      console.log('💾 Logo Attachment ID:', templateData.templateData.logoAttachmentId);
      console.log('💾 Logo Attachment URL:', templateData.templateData.logoAttachmentUrl);
      
      console.log('💾 ===== CURRENT THEME =====');
      console.log('💾 Current Theme:', JSON.stringify(templateData.templateData.currentTheme, null, 2));
      
      console.log('💾 ===== PROMO BUTTON =====');
      console.log('💾 Promo Button:', JSON.stringify(templateData.templateData.promoButton, null, 2));
      
      console.log('💾 ===== PRODUCT DETAILS =====');
      if (templateData.templateData.products && templateData.templateData.products.length > 0) {
        templateData.templateData.products.forEach((product, index) => {
          console.log(`💾 Product ${index + 1}:`, {
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            image: product.image,
            imageAttachmentId: product.imageAttachmentId,
            imageAttachmentUrl: product.imageAttachmentUrl,
            containerAsset: product.containerAsset,
            cardClass: product.cardClass,
            buttonText: product.buttonText,
            buttonClass: product.buttonClass,
            buttonAnimColor: product.buttonAnimColor,
            titleClass: product.titleClass,
            descClass: product.descClass,
            buttonLink: product.buttonLink
          });
        });
      }
      
      console.log('💾 ===== END TEMPLATE SAVE STRUCTURE =====');
      
      await saveTemplate(templateData);
      
      alert('Template saved successfully!');
    } catch (error) {
      setError(`Failed to save template: ${(error as Error).message}`);
    }
  }, [
    saveTemplate, 
    createTheme, 
    products, 
    floatingAssets, 
    currentSeason, 
    theme, 
    fixedTextStyles, 
    logoAsset, 
    generatedBackground, 
    uploadedBackground, 
    backgroundAttachmentId, 
    backgroundAttachmentUrl, 
    logoAttachmentId, 
    logoAttachmentUrl, 
    promoButton, 
    setError,
    allResources
  ]);

  return {
    handleSaveTemplate,
    handleSaveTemplateForNavbar: handleSaveTemplate,
  };
};

