import React from 'react';
import AIFunnelBuilderPage from '../../../funnelBuilder/AIFunnelBuilderPage';
import { StoreResourceLibrary } from '../../../products/StoreResourceLibrary';
import type { AuthenticatedUser } from '../../../../types/user';

interface ConditionalReturnsProps {
  // FunnelBuilder props
  showFunnelBuilder: boolean;
  liveFunnel: any;
  setShowFunnelBuilder: (show: boolean) => void;
  setLiveFunnel: (funnel: any) => void;
  isFunnelActive: boolean;
  experienceId?: string;
  user?: AuthenticatedUser | null; // Add user prop

  // StoreResourceLibrary props
  showStoreResourceLibrary: boolean;
  setShowStoreResourceLibrary: (show: boolean) => void;
  currentSeason: string;
  theme: any;
  resourceLibraryProducts: any[];
  themeProducts: Record<string, any[]>;
  allResources: any[];
  setAllResources: (resources: any[]) => void;
  handleAddToTheme: (resource: any) => void;
  handleRemoveFromTheme: (resource: any) => void;
  isResourceInTheme: (resourceId: string) => boolean;
  getFilteredPaidResources: () => any[];

  // Loading overlay props
  previewLiveTemplate?: any;
  isTemplateLoaded: boolean;
}

export const ConditionalReturns: React.FC<ConditionalReturnsProps> = ({
  // FunnelBuilder props
  showFunnelBuilder,
  liveFunnel,
  setShowFunnelBuilder,
  setLiveFunnel,
  isFunnelActive,
  experienceId,
  user,

  // StoreResourceLibrary props
  showStoreResourceLibrary,
  setShowStoreResourceLibrary,
  currentSeason,
  theme,
  resourceLibraryProducts,
  themeProducts,
  allResources,
  setAllResources,
  handleAddToTheme,
  handleRemoveFromTheme,
  isResourceInTheme,
  getFilteredPaidResources,

  // Loading overlay props
  previewLiveTemplate,
  isTemplateLoaded,
}) => {
  // Show FunnelBuilder if Edit Merchant was clicked
  if (showFunnelBuilder && liveFunnel) {
    return (
      <AIFunnelBuilderPage
        funnel={liveFunnel}
        onBack={() => setShowFunnelBuilder(false)}
        onUpdate={(updatedFunnel) => {
          setLiveFunnel(updatedFunnel);
          console.log('Funnel updated:', updatedFunnel);
        }}
        onGoToFunnelProducts={() => {
          console.log('Navigate to funnel products');
        }}
        user={null}
        hasAnyLiveFunnel={isFunnelActive}
        isSingleMerchant={true}
      />
    );
  }

  // Show StoreResourceLibrary if Add Product was clicked
  if (showStoreResourceLibrary) {
    return (
      <StoreResourceLibrary
        themeContext={{
          themeId: `theme-${currentSeason}-${Date.now()}`,
          season: currentSeason,
          themeName: theme?.name || 'Current Theme'
        }}
        frontendState={{
          products: resourceLibraryProducts,
          themeProducts: themeProducts,
          currentSeason: currentSeason
        }}
        allResources={allResources}
        setAllResources={setAllResources}
        onBack={() => setShowStoreResourceLibrary(false)}
        user={user || null}
        onAddToTheme={handleAddToTheme}
        onRemoveFromTheme={handleRemoveFromTheme}
        isResourceInTheme={isResourceInTheme}
        autoOpenCreateModal={true}
      />
    );
  }

  // Show loading overlay if template is not loaded yet
  if (previewLiveTemplate && !isTemplateLoaded) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
        {/* Main content */}
        <div className="text-center relative z-10">
          {/* Whop-style loading spinner */}
          <div className="relative mb-6">
            <div className="w-8 h-8 mx-auto relative">
              <div className="absolute inset-0 border-2 border-gray-200 dark:border-gray-700 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          </div>
          
          {/* Loading text */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Calling for Merchant
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Preparing showcase items...
          </p>
          
          {/* Bouncing dots animation */}
          <div className="flex justify-center mt-4 space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Return null if no conditional return should happen
  return null;
};
