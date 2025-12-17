import { useCallback } from 'react';
import { apiPost } from '@/lib/utils/api-client';
import type { DiscountSettings, Product, StoreTemplate } from '../types';
import type { AuthenticatedUser } from '@/lib/types/user';
import { removeProductPromoData, checkDiscountStatus } from '../utils/discountHelpers';

interface UseSeasonalDiscountActionsProps {
  experienceId?: string;
  user?: AuthenticatedUser | null;
  updateTemplate: (templateId: string, updates: any) => Promise<any>;
  setDiscountSettings: (settings: DiscountSettings) => void;
  templates: any[];
  currentlyLoadedTemplateId?: string | null;
  setProducts?: (products: Product[] | ((prev: Product[]) => Product[])) => void;
  setTemplates?: (templates: any[] | ((prev: any[]) => any[])) => void;
  updateCachedTemplates?: (updater: (prev: Map<string, StoreTemplate>) => Map<string, StoreTemplate>) => void;
  updateSnapshot?: () => void; // Function to update snapshot after discount changes
}

export function useSeasonalDiscountActions({
  experienceId,
  user,
  updateTemplate,
  setDiscountSettings,
  templates,
  currentlyLoadedTemplateId,
  setProducts,
  setTemplates,
  updateCachedTemplates,
  updateSnapshot,
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
      const updatedTemplate = await updateTemplate(templateId, {
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
      
      // If this is the currently loaded template, ensure products state is synced
      if (templateId === currentlyLoadedTemplateId && setProducts) {
        // Products don't need to change when updating discount text
        // This is mainly for consistency
      }

      // Update snapshot after successfully saving discount text
      // Use nested setTimeout to ensure React state updates complete
      if (updateSnapshot) {
        setTimeout(() => {
          setTimeout(() => {
            updateSnapshot();
            console.log('📸 Snapshot updated after discount text save');
          }, 0);
        }, 300);
      }
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
      const updatedTemplate = await updateTemplate(templateId, {
        templateData: {
          ...template.templateData,
          discountSettings: updatedSettings,
        }
      });
      
      // Update local state with seasonalDiscountId included
      setDiscountSettings(updatedSettings);
      
      // If this is the currently loaded template, ensure products state is synced
      if (templateId === currentlyLoadedTemplateId && setProducts) {
        // Products don't need to change when creating discount, but ensure they're in sync
        // The updateTemplateWrapper already handles template updates, so products should be fine
        // This is mainly for consistency - no actual product changes needed
      }

      // Update ALL templates: clean old/expired discountSettings and apply new one if active
      if (setTemplates && updateCachedTemplates) {
        try {
          // Check if new discount is active or approaching
          const newDiscountData = {
            seasonalDiscountId,
            seasonalDiscountStart: newDiscountSettings.startDate ? new Date(newDiscountSettings.startDate) : undefined,
            seasonalDiscountEnd: newDiscountSettings.endDate ? new Date(newDiscountSettings.endDate) : undefined,
          };
          const newDiscountStatus = checkDiscountStatus(newDiscountData);
          const isNewDiscountActiveOrApproaching = newDiscountStatus === 'active' || newDiscountStatus === 'approaching';

          // Process all templates
          const updatedTemplates = templates.map(t => {
            // Skip the template we just updated (it's already correct)
            if (t.id === templateId) {
              return updatedTemplate;
            }

            const templateDiscountSettings = t.templateData?.discountSettings;
            
            // Case 1: Template has discountSettings
            if (templateDiscountSettings) {
              const templateDiscountId = templateDiscountSettings.seasonalDiscountId;
              
              // If different seasonalDiscountId or expired → Remove discountSettings and product promo data
              if (templateDiscountId && templateDiscountId !== seasonalDiscountId) {
                const cleanedProducts = (t.templateData.products || []).map((product: Product) => 
                  removeProductPromoData(product)
                );
                return {
                  ...t,
                  templateData: {
                    ...t.templateData,
                    discountSettings: undefined,
                    products: cleanedProducts,
                  },
                };
              }
              
              // If same seasonalDiscountId → Keep as is (already correct)
              if (templateDiscountId === seasonalDiscountId) {
                return t;
              }
              
              // If no seasonalDiscountId but has discountSettings → Remove (old format)
              const cleanedProducts = (t.templateData.products || []).map((product: Product) => 
                removeProductPromoData(product)
              );
              return {
                ...t,
                templateData: {
                  ...t.templateData,
                  discountSettings: undefined,
                  products: cleanedProducts,
                },
              };
            }
            
            // Case 2: Template doesn't have discountSettings
            // If new discount is active/approaching → Apply new discountSettings
            if (isNewDiscountActiveOrApproaching) {
              return {
                ...t,
                templateData: {
                  ...t.templateData,
                  discountSettings: updatedSettings,
                },
              };
            }
            
            // If new discount is not active/approaching → Keep template as is
            return t;
          });

          // Update all templates in local state
          setTemplates(updatedTemplates);

          // Update all templates in cache
          updateCachedTemplates(prev => {
            const newCache = new Map(prev);
            updatedTemplates.forEach(template => {
              newCache.set(template.id, template);
            });
            return newCache;
          });

          // Save all updated templates to database
          console.log(`💾 Saving ${updatedTemplates.length} updated templates to database after discount create`);
          const savePromises = updatedTemplates.map(t => 
            updateTemplate(t.id, {
              templateData: t.templateData,
            }).catch(error => {
              console.warn(`⚠️ Failed to save template ${t.id} to database:`, error);
              // Continue with other templates even if one fails
              return null;
            })
          );

          await Promise.all(savePromises);
          console.log('✅ All templates saved to database after discount create');
        } catch (error) {
          console.error('⚠️ Error updating all templates after discount create:', error);
          // Continue even if updating all templates fails - the main template is already saved
        }
      }

      // Update snapshot after successfully creating discount
      // Use nested setTimeout to ensure React state updates and template updates complete
      if (updateSnapshot) {
        setTimeout(() => {
          setTimeout(() => {
            updateSnapshot();
            console.log('📸 Snapshot updated after discount create');
          }, 0);
        }, 500); // Longer delay to ensure all template updates and state updates complete
      }
    }
  }, [experienceId, user, updateTemplate, setDiscountSettings, templates, currentlyLoadedTemplateId, setProducts, setTemplates, updateCachedTemplates, updateSnapshot]);

  return {
    handleSaveDiscountSettings,
  };
}





