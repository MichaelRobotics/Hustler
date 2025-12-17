import { useCallback } from 'react';
import { apiPost } from '@/lib/utils/api-client';
import type { DiscountSettings } from '../types';
import type { AuthenticatedUser } from '@/lib/types/user';

interface UseSeasonalDiscountActionsProps {
  experienceId?: string;
  user?: AuthenticatedUser | null;
  updateTemplate: (templateId: string, updates: any) => Promise<any>;
  setDiscountSettings: (settings: DiscountSettings) => void;
  templates: any[];
}

export function useSeasonalDiscountActions({
  experienceId,
  user,
  updateTemplate,
  setDiscountSettings,
  templates,
}: UseSeasonalDiscountActionsProps) {
  const handleSaveDiscountSettings = useCallback(async (
    templateId: string,
    newDiscountSettings: DiscountSettings
  ) => {
    if (!experienceId) {
      throw new Error('Experience ID is required to save discount settings');
    }
    if (!user?.experience?.whopCompanyId) {
      throw new Error('Company ID is required to save discount settings');
    }
    
    const template = templates.find((t: any) => t.id === templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Check if discount already exists (has seasonalDiscountId)
    const isExistingDiscount = Boolean(newDiscountSettings.seasonalDiscountId);
    
    // Check if this is a delete operation (all required fields are empty/default)
    const isDeleteOperation = !isExistingDiscount && 
      !newDiscountSettings.startDate && 
      !newDiscountSettings.endDate && 
      !newDiscountSettings.discountText && 
      !newDiscountSettings.promoCode;

    if (isDeleteOperation) {
      // Delete operation: Only clear template, don't update experience (already cleared by delete API)
      await updateTemplate(templateId, {
        templateData: {
          ...template.templateData,
          discountSettings: undefined,
        }
      });
      
      // Update local state with default settings
      setDiscountSettings(newDiscountSettings);
      return;
    }

    if (isExistingDiscount) {
      // Save mode: Only update discountText
      const updateResponse = await apiPost(
        '/api/seasonal-discount/update',
        {
          experienceId,
          discountData: {
            seasonalDiscountText: newDiscountSettings.discountText,
          },
        },
        experienceId
      );

      if (!updateResponse.ok) {
        throw new Error('Failed to update seasonal discount');
      }

      // Update template with only discountText change
      await updateTemplate(templateId, {
        templateData: {
          ...template.templateData,
          discountSettings: {
            ...newDiscountSettings,
            discountText: newDiscountSettings.discountText,
          }
        }
      });
      
      // Update local state with only discountText change
      setDiscountSettings(newDiscountSettings);
    } else {
      // Create mode: Save all fields and create promo if needed
      
      // Step 1: Sync promos from Whop API (only saves if plans exist)
      // This runs for all Seasonal Discount creation, not just global discount
      try {
        const syncResponse = await apiPost(
          '/api/seasonal-discount/sync-promos',
          {
            experienceId,
            companyId: user.experience.whopCompanyId,
          },
          experienceId
        );

        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          console.log(`✅ Synced ${syncData.count || 0} promos from Whop API`);
        } else {
          console.warn('⚠️ Failed to sync promos, continuing...');
        }
      } catch (error) {
        console.warn('⚠️ Error syncing promos, continuing...', error);
      }

      // Step 2: Fix orphaned promos (update plans' promo_ids)
      try {
        const fixResponse = await apiPost(
          '/api/seasonal-discount/fix-orphaned-promos',
          {
            experienceId,
            companyId: user.experience.whopCompanyId,
          },
          experienceId
        );
        if (fixResponse.ok) {
          const data = await fixResponse.json();
          console.log(`✅ Fixed ${data.fixed || 0} orphaned promo-plan connections`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fix orphaned promos, continuing...', error);
      }

      // Step 3: Delete orphaned promos (no plans connected)
      try {
        const deleteResponse = await apiPost(
          '/api/seasonal-discount/delete-orphaned-promos',
          {
            experienceId,
            companyId: user.experience.whopCompanyId,
          },
          experienceId
        );
        if (deleteResponse.ok) {
          const data = await deleteResponse.json();
          console.log(`✅ Deleted ${data.deleted || 0} orphaned promos`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to delete orphaned promos, continuing...', error);
      }

      // Generate seasonal discount ID
      const seasonalDiscountId = crypto.randomUUID();

      // Map DiscountSettings to experience seasonal discount fields
      const discountData = {
        seasonalDiscountId,
        seasonalDiscountPromo: newDiscountSettings.promoCode || undefined,
        seasonalDiscountStart: newDiscountSettings.startDate ? new Date(newDiscountSettings.startDate) : undefined,
        seasonalDiscountEnd: newDiscountSettings.endDate ? new Date(newDiscountSettings.endDate) : undefined,
        seasonalDiscountText: newDiscountSettings.discountText || undefined,
        seasonalDiscountQuantityPerProduct: newDiscountSettings.quantityPerProduct && newDiscountSettings.quantityPerProduct !== -1 
          ? newDiscountSettings.quantityPerProduct 
          : undefined,
        seasonalDiscountDurationType: newDiscountSettings.durationType,
        seasonalDiscountDurationMonths: newDiscountSettings.durationMonths,
        globalDiscount: newDiscountSettings.globalDiscount || false,
      };

      // Update experience with all discount fields
      const updateResponse = await apiPost(
        '/api/seasonal-discount/update',
        {
          experienceId,
          discountData,
        },
        experienceId
      );

      if (!updateResponse.ok) {
        throw new Error('Failed to update seasonal discount');
      }

      // If global discount is enabled, create promo (sync already done above)
      if (newDiscountSettings.globalDiscount && newDiscountSettings.promoCode) {
        try {
          // Create promo code (sync was already done before checking for existence)
          // Note: Per-product/plan conflict checks will happen in createPromoCodeForSeasonalDiscount
          const createResponse = await apiPost(
            '/api/seasonal-discount/create-promo',
            {
              experienceId,
              companyId: user.experience.whopCompanyId,
              discountData: newDiscountSettings,
              promoCode: newDiscountSettings.promoCode,
            },
            experienceId
          );

          if (!createResponse.ok) {
            console.warn('⚠️ Failed to create promo code, continuing...');
          }
        } catch (error) {
          console.warn('⚠️ Error during promo sync/creation, continuing:', error);
          // Continue even if promo creation fails (for other errors)
        }
      }

      // Save seasonalDiscountId to template's discountSettings
      const updatedSettings = {
        ...newDiscountSettings,
        seasonalDiscountId,
      };
      await updateTemplate(templateId, {
        templateData: {
          ...template.templateData,
          discountSettings: updatedSettings,
        }
      });
      
      // Update local state with seasonalDiscountId included
      setDiscountSettings(updatedSettings);
    }
  }, [experienceId, user, updateTemplate, setDiscountSettings, templates]);

  return {
    handleSaveDiscountSettings,
  };
}





