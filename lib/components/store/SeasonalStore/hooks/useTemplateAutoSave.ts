import { useEffect } from 'react';
import { StoreTemplate } from '../types';
import { getThemePlaceholderUrl } from '../utils/getThemePlaceholder';

interface UseTemplateAutoSaveProps {
  products: any[];
  floatingAssets: any[];
  currentSeason: string;
  theme: any;
  fixedTextStyles: any;
  logoAsset: any;
  generatedBackground: string | null;
  uploadedBackground: string | null;
  backgroundAttachmentId: string | null;
  backgroundAttachmentUrl: string | null;
  logoAttachmentId: string | null;
  logoAttachmentUrl: string | null;
  saveTemplate: (templateData: Omit<StoreTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<StoreTemplate>;
  experienceId: string;
  promoButton: any;
}

export const useTemplateAutoSave = ({
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
  saveTemplate,
  experienceId,
  promoButton,
}: UseTemplateAutoSaveProps) => {
  // Automatic template saving when leaving the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Auto-save template when leaving the page
      if (products.length > 0 || floatingAssets.length > 0) {
        console.log('🔄 ===== AUTO-SAVE TEMPLATE STRUCTURE =====');
        console.log('🔄 Auto-saving template on page unload');
        console.log('🔄 Products count:', products.length);
        console.log('🔄 Floating assets count:', floatingAssets.length);
        console.log('🔄 Current season:', currentSeason);
        console.log('🔄 Theme name:', theme.name);
        saveTemplate({
          name: `Auto-saved ${new Date().toLocaleString()}`,
          experienceId: '', // Will be set by the API
          userId: '', // Will be set by the API
          themeId: '', // Will be set by the API
          themeSnapshot: {
            id: `theme_${Date.now()}`, // Create new theme ID for template snapshot
            experienceId: 'default-experience',
            name: theme.name,
            season: currentSeason,
            themePrompt: theme.themePrompt,
            accentColor: theme.accent,
            ringColor: theme.accent,
            placeholderImage: (theme as any).placeholderImage || null, // Preserve custom theme placeholder
            mainHeader: (theme as any).mainHeader || null, // Preserve custom theme mainHeader
            subHeader: theme.aiMessage || null, // Preserve custom theme subHeader
            createdAt: new Date(),
            updatedAt: new Date()
          }, // Snapshot of current theme
          currentSeason,
          templateData: {
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
              [currentSeason]: backgroundAttachmentUrl || getThemePlaceholderUrl(currentSeason)
            },
            themeUploadedBackgrounds: {
              [currentSeason]: backgroundAttachmentUrl || getThemePlaceholderUrl(currentSeason)
            },
            themeProducts: {
              [currentSeason]: products.map(product => ({
                id: product.id,
                name: product.name,
                price: product.price,
                description: product.description,
                image: product.image || `https://placehold.co/200x200/c2410c/ffffff?text=${encodeURIComponent(product.name.toUpperCase())}`, // Keep original image or use placeholder
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
              }))
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
            products: products.map(product => ({
              id: product.id,
              name: product.name,
              price: product.price,
              description: product.description,
              image: product.imageAttachmentUrl || `https://placehold.co/200x200/c2410c/ffffff?text=${encodeURIComponent(product.name.toUpperCase())}`, // Use placeholder if no WHOP storage URL
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
            })),
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
            // Use WHOP storage URLs or theme placeholder
            generatedBackground: backgroundAttachmentUrl || getThemePlaceholderUrl(currentSeason),
            uploadedBackground: backgroundAttachmentUrl || getThemePlaceholderUrl(currentSeason),
            backgroundAttachmentId,
            backgroundAttachmentUrl,
            logoAttachmentId,
            logoAttachmentUrl,
            
            // Current theme and promo button
            currentTheme: {
              name: theme.name,
              themePrompt: theme.themePrompt,
              accent: theme.accent,
              card: theme.card,
              text: theme.text,
              welcomeColor: theme.welcomeColor,
              background: theme.background,
              backgroundImage: theme.backgroundImage,
              placeholderImage: (theme as any).placeholderImage || null, // Preserve custom theme placeholder
              aiMessage: theme.aiMessage,
              mainHeader: (theme as any).mainHeader || null, // Preserve custom theme mainHeader
              emojiTip: theme.emojiTip
            },
            promoButton: {
              text: 'CLAIM YOUR GIFT!',
              buttonClass: theme.accent,
              ringClass: 'ring-indigo-500',
              ringHoverClass: 'ring-indigo-500',
              icon: '🎁'
            }
          },
          isLive: false,
          isLastEdited: false,
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [
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
    saveTemplate
  ]);
};
