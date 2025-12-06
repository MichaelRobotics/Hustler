import { db } from "@/lib/supabase/db-server";
import { originTemplates, experiences, resources, themes } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";
import { generateThemePromptFromImage, getDefaultThemePrompt } from "./theme-prompt-generator";
import { getThemePlaceholderUrl } from "@/lib/components/store/SeasonalStore/utils/getThemePlaceholder";
import { getThemeDefaultText, initialThemes } from "@/lib/components/store/SeasonalStore/actions/constants";
import { GoogleGenAI } from '@google/genai';
import { nanoBananaService } from '@/lib/components/store/SeasonalStore/actions/nanobananaService';

export interface OriginTemplateData {
  experienceId: string;
  companyLogoUrl: string | null;
  companyBannerImageUrl: string | null;
  themePrompt: string | null;
  defaultThemeData: {
    background: string | null;
    logo: any;
    themePrompt: string;
    products: any[];
    fixedTextStyles: any;
    floatingAssets?: any[];
    promoButton?: any;
  };
}

/**
 * Check if origin template should be created
 */
export async function shouldCreateOriginTemplate(experienceId: string): Promise<boolean> {
  try {
    // Get experience record
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      return false;
    }

    // Check if origin template already exists
    const existing = await db.query.originTemplates.findFirst({
      where: eq(originTemplates.experienceId, experience.id),
    });

    if (existing) {
      return false; // Already exists
    }

    // Check if products exist
    const productCount = await db.query.resources.findMany({
      where: and(
        eq(resources.experienceId, experience.id),
        eq(resources.type, "MY_PRODUCTS")
      ),
      limit: 1,
    });

    return productCount.length > 0; // Should create if products exist
  } catch (error) {
    console.error("Error checking if should create origin template:", error);
    return false;
  }
}

/**
 * Check if origin template needs update by comparing company logo/banner URLs
 */
export async function shouldUpdateOriginTemplate(
  experienceId: string,
  productResult: any
): Promise<boolean> {
  try {
    // Get experience record first (experienceId might be whopExperienceId)
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      return false;
    }

    // Get origin template directly from database
    const originTemplate = await db.query.originTemplates.findFirst({
      where: eq(originTemplates.experienceId, experience.id),
    });

    if (!originTemplate) {
      return false; // No origin template to update
    }

    const currentBannerUrl = productResult?.company?.bannerImage?.sourceUrl || null;
    const currentLogoUrl = productResult?.company?.logo?.sourceUrl || null;

    // Check if URLs changed
    const bannerChanged = originTemplate.companyBannerImageUrl !== currentBannerUrl;
    const logoChanged = originTemplate.companyLogoUrl !== currentLogoUrl;

    return bannerChanged || logoChanged;
  } catch (error) {
    console.error("Error checking if should update origin template:", error);
    return false;
  }
}

/**
 * Generate theme styles directly from banner image using Gemini Flash
 */
async function generateThemeStylesFromBannerImage(bannerImageUrl: string): Promise<{
  accent: string;
  card: string;
  text: string;
  welcomeColor: string;
  mainHeader: string;
  aiMessage: string;
  emojiTip: string;
  colorPalette?: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
} | null> {
  try {
    console.log('🎨 [Origin Template Service] Analyzing banner image directly with Gemini Flash...');
    
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️ [Origin Template Service] GEMINI_API_KEY not set');
      return null;
    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Fetch the banner image
    const imageResponse = await fetch(bannerImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch banner image: ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    const themeGenerationPrompt = `Analyze this company banner image and generate a complete e-commerce theme design.

    Create a JSON response with the following structure:
    {
      "accent": "Tailwind CSS classes for buttons and interactive elements. Examples: 'bg-blue-600 hover:bg-blue-700 text-white ring-blue-500', 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white ring-purple-400', 'bg-emerald-500 hover:bg-emerald-600 text-white ring-emerald-400', 'bg-orange-500 hover:bg-orange-600 text-white ring-orange-400'",
      "card": "Tailwind CSS classes for product cards. Examples: 'bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-blue-500/30', 'bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-md shadow-2xl hover:shadow-3xl shadow-purple-500/25', 'bg-amber-50/95 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-amber-500/30', 'bg-slate-50/90 backdrop-blur-md shadow-xl hover:shadow-2xl shadow-slate-500/25'",
      "text": "Tailwind CSS classes for body text. Examples: 'text-gray-800', 'text-slate-700', 'text-gray-900', 'text-zinc-800', 'text-neutral-800'",
      "welcomeColor": "Tailwind CSS classes for welcome/accent text. Examples: 'text-blue-200', 'text-purple-200', 'text-emerald-200', 'text-orange-200', 'text-cyan-200', 'text-pink-200', 'text-yellow-200', 'text-indigo-200'",
      "mainHeader": "A bold, eye-catching main header text for this theme in ALL CAPS (e.g., 'NEON SUMMER', 'OCEAN BREEZE', 'GALAXY DREAMS'). Should be 2-4 words maximum, impactful and theme-appropriate.",
      "aiMessage": "A welcoming subheader message for this theme (e.g., 'Welcome to our Neon Summer collection!', 'Discover our curated ocean-inspired products'). Should be a complete sentence that describes the theme collection.",
      "emojiTip": "Relevant emojis for this theme (e.g., '🌊🏄‍♀️☀️')",
      "colorPalette": {
        "primary": "hex color code",
        "secondary": "hex color code", 
        "accent": "hex color code",
        "text": "hex color code",
        "background": "hex color code"
      }
    }

    Requirements:
    - Analyze the colors, style, and mood of the banner image
    - Use colors that match the banner image
    - Ensure good contrast and readability
    - Make it visually appealing and professional
    - Use appropriate Tailwind CSS classes
    - The accent color should be vibrant and eye-catching
    - The card design should be modern with backdrop blur effects
    - Text colors should be readable and theme-appropriate
    - Welcome color should complement the accent color
    - AI message should be engaging and theme-specific
    - Emojis should be relevant to the theme

    Return ONLY the JSON object, no additional text.`;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: contentType,
                data: imageBase64,
              },
            },
            { text: themeGenerationPrompt },
          ],
        },
      ] as any,
    });
    
    let responseText = response.text || "";
    if (responseText.startsWith("```json")) {
      responseText = responseText
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (responseText.startsWith("```")) {
      responseText = responseText
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
    }
    
    const themeData = JSON.parse(responseText);
    
    // Validate all required fields are present
    if (!themeData.accent || !themeData.card || !themeData.text || !themeData.welcomeColor) {
      throw new Error('Missing required theme fields from banner analysis');
    }

    console.log('✅ [Origin Template Service] Generated theme styles from banner image');
    return themeData;
  } catch (error) {
    console.error('❌ [Origin Template Service] Error generating theme styles from banner:', error);
    return null;
  }
}

/**
 * Create company theme from banner image or fallback to Black Friday theme
 */
async function createCompanyTheme(
  experienceId: string,
  bannerImageUrl: string | null,
  companyTitle: string
): Promise<string | null> {
  try {
    console.log('🎨 [Origin Template Service] Creating company theme...');
    
    // Get experience record first (experienceId might be whopExperienceId)
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      console.error('❌ [Origin Template Service] Experience not found:', experienceId);
      return null;
    }

    let themeData: {
      accent: string;
      card: string;
      text: string;
      welcomeColor: string;
      mainHeader: string;
      aiMessage: string;
      emojiTip: string;
      themePrompt?: string;
    };
    let refinedPlaceholderUrl = '';

    // Try to generate theme styles from banner image
    if (bannerImageUrl) {
      const bannerThemeData = await generateThemeStylesFromBannerImage(bannerImageUrl);
      if (bannerThemeData) {
        themeData = bannerThemeData;
        console.log('✅ [Origin Template Service] Generated theme styles from banner image');
        
        // Refine product placeholder to match theme
        const defaultProductPlaceholderUrl = 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
        try {
          const themeObject = {
            name: companyTitle,
            themePrompt: themeData.themePrompt || `Theme based on ${companyTitle} banner image`
          };
          refinedPlaceholderUrl = await nanoBananaService.generateProductImage(
            'Product',
            themeData.themePrompt || `Theme based on ${companyTitle} banner image`,
            themeObject,
            defaultProductPlaceholderUrl
          );
        } catch (error) {
          console.warn('⚠️ [Origin Template Service] Failed to refine placeholder, using default:', error);
          refinedPlaceholderUrl = defaultProductPlaceholderUrl;
        }
      } else {
        // Fallback to Black Friday theme
        console.log('⚠️ [Origin Template Service] Banner analysis failed, using Black Friday theme as fallback');
        const blackFridayTheme = initialThemes['Black Friday'];
        themeData = {
          accent: blackFridayTheme.accent,
          card: blackFridayTheme.card,
          text: blackFridayTheme.text,
          welcomeColor: blackFridayTheme.welcomeColor,
          mainHeader: blackFridayTheme.name.toUpperCase(),
          aiMessage: blackFridayTheme.aiMessage,
          emojiTip: blackFridayTheme.emojiTip,
          themePrompt: blackFridayTheme.themePrompt,
        };
        refinedPlaceholderUrl = getThemePlaceholderUrl('Black Friday');
      }
    } else {
      // No banner image - use Black Friday theme as fallback
      console.log('📦 [Origin Template Service] No banner image, using Black Friday theme as fallback');
      const blackFridayTheme = initialThemes['Black Friday'];
      themeData = {
        accent: blackFridayTheme.accent,
        card: blackFridayTheme.card,
        text: blackFridayTheme.text,
        welcomeColor: blackFridayTheme.welcomeColor,
        mainHeader: blackFridayTheme.name.toUpperCase(),
        aiMessage: blackFridayTheme.aiMessage,
        emojiTip: blackFridayTheme.emojiTip,
        themePrompt: blackFridayTheme.themePrompt,
      };
      refinedPlaceholderUrl = getThemePlaceholderUrl('Black Friday');
    }

    // Create theme directly in database
    // Note: card, text, welcomeColor will be stored in a JSONB field or we need to add them to schema
    // For now, storing in themeSnapshot or we can extend the schema
    const [theme] = await db.insert(themes).values({
      experienceId: experience.id,
      name: companyTitle,
      season: 'Company',
      themePrompt: themeData.themePrompt || `Theme for ${companyTitle}`,
      accentColor: themeData.accent,
      ringColor: themeData.accent,
      placeholderImage: refinedPlaceholderUrl,
      mainHeader: themeData.mainHeader,
      subHeader: themeData.aiMessage,
    }).returning();

    console.log('✅ [Origin Template Service] Company theme created:', theme.id, 'with name:', companyTitle);
    return theme.id;
  } catch (error) {
    console.error('❌ [Origin Template Service] Error creating company theme:', error);
    return null;
  }
}

/**
 * Create origin template from product data
 */
export async function createOriginTemplateFromProduct(
  experienceId: string,
  productId: string
): Promise<OriginTemplateData | null> {
  try {
    console.log('📦 [Origin Template Service] Creating origin template for experience:', experienceId);
    
    // Get experience record first (experienceId might be whopExperienceId)
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      console.error('❌ [Origin Template Service] Experience not found:', experienceId);
      return null;
    }

    // Check if origin template already exists
    const existing = await db.query.originTemplates.findFirst({
      where: eq(originTemplates.experienceId, experience.id),
    });

    if (existing) {
      console.log('⚠️ [Origin Template Service] Origin template already exists');
      return null;
    }

    // Fetch product data from Whop SDK
    let productResult;
    try {
      productResult = await whopSdk.accessPasses.getAccessPass({
        accessPassId: productId,
      });
    } catch (error) {
      console.error('❌ [Origin Template Service] Failed to fetch product data:', error);
      return null;
    }
    
    if (!productResult) {
      console.error('❌ [Origin Template Service] Failed to fetch product data');
      return null;
    }

    // Extract company data
    const companyBannerUrl = productResult.company?.bannerImage?.sourceUrl || null;
    const companyLogoUrl = productResult.company?.logo?.sourceUrl || null;
    const companyTitle = productResult.company?.title || 'Company Theme';

    console.log('📦 [Origin Template Service] Company banner:', companyBannerUrl ? 'Found' : 'Not found');
    console.log('📦 [Origin Template Service] Company logo:', companyLogoUrl ? 'Found' : 'Not found');
    console.log('📦 [Origin Template Service] Company title:', companyTitle);

    // Create company theme directly from banner image (or fallback to Black Friday)
    let companyThemeId: string | null = null;
    let themePrompt: string | null = null;

    // Create company theme - this will analyze banner image directly or use Black Friday fallback
    companyThemeId = await createCompanyTheme(experienceId, companyBannerUrl, companyTitle);
    
    if (companyThemeId) {
      // Get theme prompt from created theme or use default
      const createdTheme = await db.query.themes.findFirst({
        where: eq(themes.id, companyThemeId),
      });
      themePrompt = createdTheme?.themePrompt || getDefaultThemePrompt();
    } else {
      // Fallback if theme creation failed
      themePrompt = getDefaultThemePrompt();
      console.log('📦 [Origin Template Service] Theme creation failed, using default theme prompt');
    }

    // Get default background (banner or placeholder)
    const defaultBackground = companyBannerUrl || getThemePlaceholderUrl('Black Friday');

    // Get default logo (company logo or placeholder)
    const defaultLogo = companyLogoUrl ? {
      src: companyLogoUrl,
      alt: 'Company Logo',
      shape: 'round' as const,
    } : {
      src: '',
      alt: '',
      shape: 'round' as const,
    };

    // Get default text styles
    const themeDefaults = getThemeDefaultText('Company Theme', '');
    const defaultTextStyles = {
      mainHeader: {
        content: themeDefaults.mainHeader,
        color: '',
        styleClass: 'text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg',
      },
      headerMessage: {
        content: themeDefaults.headerMessage,
        color: '',
        styleClass: 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg',
      },
      subHeader: {
        content: themeDefaults.subHeader,
        color: '',
        styleClass: 'text-lg sm:text-xl font-normal',
      },
      promoMessage: {
        content: themeDefaults.promoMessage,
        color: '',
        styleClass: 'text-2xl sm:text-3xl font-semibold drop-shadow-md',
      },
    };

    // Build default theme data
    const defaultThemeData = {
      background: defaultBackground,
      logo: defaultLogo,
      themePrompt: themePrompt,
      products: [], // Empty products array - will be populated from template
      fixedTextStyles: defaultTextStyles,
      floatingAssets: [],
      promoButton: {
        text: 'SHOP NOW',
        buttonClass: 'bg-indigo-500',
        ringClass: '',
        ringHoverClass: '',
        icon: '🛒',
      },
    };

    // Create origin template directly in database
    const [created] = await db.insert(originTemplates).values({
      experienceId: experience.id,
      companyLogoUrl,
      companyBannerImageUrl: companyBannerUrl,
      themePrompt,
      defaultThemeData,
    }).returning();

    console.log('✅ [Origin Template Service] Origin template created:', created.id);

    return {
      experienceId: experience.whopExperienceId,
      companyLogoUrl: created.companyLogoUrl,
      companyBannerImageUrl: created.companyBannerImageUrl,
      themePrompt: created.themePrompt,
      defaultThemeData: created.defaultThemeData as any,
    };
  } catch (error) {
    console.error('❌ [Origin Template Service] Error creating origin template:', error);
    return null;
  }
}

/**
 * Update origin template with new product data
 */
export async function updateOriginTemplateFromProduct(
  experienceId: string,
  productId: string
): Promise<OriginTemplateData | null> {
  try {
    console.log('🔄 [Origin Template Service] Updating origin template for experience:', experienceId);
    
    // Get experience record first (experienceId might be whopExperienceId)
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      console.error('❌ [Origin Template Service] Experience not found:', experienceId);
      return null;
    }

    // Get existing origin template directly from database
    const existing = await db.query.originTemplates.findFirst({
      where: eq(originTemplates.experienceId, experience.id),
    });

    if (!existing) {
      console.log('⚠️ [Origin Template Service] Origin template does not exist, creating new one');
      return await createOriginTemplateFromProduct(experienceId, productId);
    }

    // Fetch product data from Whop SDK
    let productResult;
    try {
      productResult = await whopSdk.accessPasses.getAccessPass({
        accessPassId: productId,
      });
    } catch (error) {
      console.error('❌ [Origin Template Service] Failed to fetch product data:', error);
      return null;
    }
    
    if (!productResult) {
      console.error('❌ [Origin Template Service] Failed to fetch product data');
      return null;
    }

    // Extract company data
    const companyBannerUrl = productResult.company?.bannerImage?.sourceUrl || null;
    const companyLogoUrl = productResult.company?.logo?.sourceUrl || null;

    // Check if URLs changed
    const bannerChanged = existing.companyBannerImageUrl !== companyBannerUrl;
    const logoChanged = existing.companyLogoUrl !== companyLogoUrl;

    if (!bannerChanged && !logoChanged) {
      console.log('✅ [Origin Template Service] No changes detected, skipping update');
      return existing;
    }

    console.log('🔄 [Origin Template Service] Company data changed, updating origin template');

    // Update theme prompt if banner changed
    let themePrompt = existing.themePrompt;
    if (bannerChanged && companyBannerUrl) {
      const newPrompt = await generateThemePromptFromImage(companyBannerUrl);
      if (newPrompt) {
        themePrompt = newPrompt;
        // Create new company theme if prompt changed (banner was added/changed)
        // Get company title from existing origin template or use default
        const existingOriginTemplate = await db.query.originTemplates.findFirst({
          where: eq(originTemplates.experienceId, experience.id),
        });
        const companyTitle = existingOriginTemplate?.defaultThemeData 
          ? (existingOriginTemplate.defaultThemeData as any).companyTitle || 'Company Theme'
          : 'Company Theme';
        await createCompanyTheme(experienceId, companyBannerUrl, companyTitle);
      }
    } else if (bannerChanged && !companyBannerUrl) {
      // Banner removed, use default prompt
      themePrompt = getDefaultThemePrompt();
    }

    // Update default theme data
    const defaultBackground = companyBannerUrl || existing.defaultThemeData.background || getThemePlaceholderUrl('Black Friday');
    const defaultLogo = companyLogoUrl ? {
      src: companyLogoUrl,
      alt: 'Company Logo',
      shape: 'round' as const,
    } : existing.defaultThemeData.logo;

    const updatedDefaultThemeData = {
      ...existing.defaultThemeData,
      background: defaultBackground,
      logo: defaultLogo,
      themePrompt: themePrompt || existing.defaultThemeData.themePrompt,
    };

    // Update origin template directly in database
    const [updated] = await db.update(originTemplates)
      .set({
        companyLogoUrl,
        companyBannerImageUrl: companyBannerUrl,
        themePrompt,
        defaultThemeData: updatedDefaultThemeData,
        updatedAt: new Date(),
      })
      .where(eq(originTemplates.id, existing.id))
      .returning();

    console.log('✅ [Origin Template Service] Origin template updated:', updated.id);
    return {
      experienceId: experience.whopExperienceId,
      companyLogoUrl: updated.companyLogoUrl,
      companyBannerImageUrl: updated.companyBannerImageUrl,
      themePrompt: updated.themePrompt,
      defaultThemeData: updated.defaultThemeData as any,
    };
  } catch (error) {
    console.error('❌ [Origin Template Service] Error updating origin template:', error);
    return null;
  }
}

/**
 * Get origin template for experience
 */
export async function getOriginTemplateForExperience(experienceId: string): Promise<OriginTemplateData | null> {
  try {
    // Get experience record first (experienceId might be whopExperienceId)
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      return null;
    }

    // Get origin template directly from database
    const originTemplate = await db.query.originTemplates.findFirst({
      where: eq(originTemplates.experienceId, experience.id),
    });

    if (!originTemplate) {
      return null;
    }

    return {
      experienceId: experience.whopExperienceId,
      companyLogoUrl: originTemplate.companyLogoUrl,
      companyBannerImageUrl: originTemplate.companyBannerImageUrl,
      themePrompt: originTemplate.themePrompt,
      defaultThemeData: originTemplate.defaultThemeData as any,
    };
  } catch (error) {
    console.error('❌ [Origin Template Service] Error getting origin template:', error);
    return null;
  }
}


