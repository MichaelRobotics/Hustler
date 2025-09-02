'use client';

import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Sparkles, Target, BarChart3, Library, Zap, X } from 'lucide-react';
import { Heading, Text, Button } from 'frosted-ui';
import UnifiedNavigation from '../common/UnifiedNavigation';
import { ThemeToggle } from '../common/ThemeToggle';
import { hasValidFlow } from '@/lib/helpers/funnel-validation';

// Type definitions
interface Resource {
  id: string;
  name: string;
  link: string;
  type: 'AFFILIATE' | 'MY_PRODUCTS' | 'CONTENT' | 'TOOL';
  category?: string;
  description?: string;
  promoCode?: string;
}

interface Funnel {
  id: string;
  name: string;
  isDeployed?: boolean;
  wasEverDeployed?: boolean; // Track if funnel was ever live
  delay?: number;
  resources?: Resource[];
  flow?: any; // Added for generated funnel flow
  // New: Per-funnel generation state
  generationStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  generationError?: string;
  lastGeneratedAt?: number;
}

interface ResourcePageProps {
  funnel: Funnel;
  onBack: () => void;
  onUpdateFunnel: (updatedFunnel: Funnel) => void;
  onEdit: () => void;
  allResources: Resource[];
  setAllResources: (resources: Resource[]) => void;
  onGoToBuilder: (updatedFunnel?: Funnel) => void;
  onGoToPreview: (funnel: Funnel) => void;
  onOpenResourceLibrary: () => void;
  onGlobalGeneration: (funnelId: string) => Promise<void>; // Updated to accept funnelId
  isGenerating: (funnelId: string) => boolean; // Function to check if specific funnel is generating
  onGoToFunnelProducts: () => void;
}

/**
 * --- Resource Management Page Component ---
 * This component provides a streamlined interface for managing current funnel resources.
 * It shows only the resources currently assigned to the funnel and provides access
 * to the resource library for adding new resources.
 *
 * @param {ResourcePageProps} props - The props passed to the component.
 * @returns {JSX.Element} The rendered ResourcePage component.
 */
const ResourcePage: React.FC<ResourcePageProps> = ({
  funnel,
  onBack,
  onGoToBuilder,
  onGoToPreview,
  onUpdateFunnel,
  allResources,
  setAllResources,
  onOpenResourceLibrary,
  onGlobalGeneration,
  isGenerating,
  onGoToFunnelProducts
}) => {
  // Get current funnel resources (in production, this would be scraped from user's Whop)
  const currentResources = funnel.resources || [];

  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean; resourceId: string | null; resourceName: string }>({
    show: false,
    resourceId: null,
    resourceName: ''
  });

  // Offline confirmation state
  const [offlineConfirmation, setOfflineConfirmation] = useState(false);

  const handleDeleteResource = (resourceId: string, resourceName: string) => {
    setDeleteConfirmation({
      show: true,
      resourceId,
      resourceName
    });
  };

  const confirmDelete = () => {
    if (deleteConfirmation.resourceId) {
      const updatedResources = currentResources.filter(r => r.id !== deleteConfirmation.resourceId);
      const updatedFunnel = { ...funnel, resources: updatedResources };
      onUpdateFunnel(updatedFunnel);
      setDeleteConfirmation({ show: false, resourceId: null, resourceName: '' });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ show: false, resourceId: null, resourceName: '' });
  };

  // Handle Escape key to close delete confirmation
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && deleteConfirmation.show) {
        cancelDelete();
      }
    };

    if (deleteConfirmation.show) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [deleteConfirmation.show]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'AFFILIATE': return <Sparkles className="w-5 h-5 text-violet-400" strokeWidth={2.5} />;
      case 'MY_PRODUCTS': return <Target className="w-5 h-5 text-green-400" strokeWidth={2.5} />;
      case 'CONTENT': return <Save className="w-5 h-5 text-blue-400" strokeWidth={2.5} />;
      case 'TOOL': return <BarChart3 className="w-5 h-5 text-orange-400" strokeWidth={2.5} />;
      default: return <Sparkles className="w-5 h-5" strokeWidth={2.5} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'AFFILIATE': return 'Affiliate';
      case 'MY_PRODUCTS': return 'My Product';
      case 'CONTENT': return 'Content';
      case 'TOOL': return 'Tool';
      default: return 'Resource';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />
      
      <div className="relative p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Header with Whop Design Patterns - Always Visible */}
          <div className="sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-border/30 dark:border-border/20 shadow-lg">
            {/* Top Section: Back Button + Title */}
            <div className="flex items-center gap-4 mb-6">
              <Button
                size="2"
                variant="ghost"
                color="gray"
                onClick={onBack}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-colors duration-200 dark:hover:bg-surface/60"
                aria-label="Back to analytics"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </Button>
              
              <div>
                <Heading size="6" weight="bold" className="text-black dark:text-white">
                  Assigned Products
                </Heading>
              </div>
            </div>
            
            {/* Subtle Separator Line */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mb-4" />
            
            {/* Bottom Section: Action Buttons - Always Horizontal Layout */}
            <div className="flex justify-between items-center gap-2 sm:gap-3">
              {/* Left Side: Theme Toggle */}
              <div className="flex-shrink-0">
                <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
                  <ThemeToggle />
                </div>
              </div>
              
              {/* Right Side: Library Button or Live Status */}
              <div className="flex-shrink-0">
                {funnel.isDeployed ? (
                  /* Live Status Button - When funnel is deployed */
                  <button
                    data-accent-color="red"
                    onClick={() => setOfflineConfirmation(true)}
                    className="fui-reset fui-BaseButton fui-Button px-4 sm:px-6 py-3 shadow-lg shadow-red-500/25 group bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 transition-all duration-200 fui-r-size-3 fui-variant-surface cursor-pointer"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="red" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="red"></circle>
                      <circle cx="12" cy="12" r="3" fill="white"></circle>
                    </svg>
                    <span className="font-semibold text-sm sm:text-base text-red-600 dark:text-red-400">Live</span>
                  </button>
                ) : (
                  /* Library Button - When funnel is not deployed */
                  <Button
                    size="3"
                    color="violet"
                    onClick={onOpenResourceLibrary}
                    className={`px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group ${
                      currentResources.length === 0 ? 'animate-pulse animate-bounce' : ''
                    }`}
                  >
                    <Library size={20} strokeWidth={2.5} className={`transition-transform duration-300 ${
                      currentResources.length === 0 ? 'animate-spin' : 'group-hover:rotate-12'
                    }`} />
                    <span className="ml-2">Library</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Generate Section - Only visible when products exist but no funnel is generated */}
          {!funnel.flow && currentResources.length > 0 && (
            <div className="mt-8 mb-8">
              <div className="text-center py-12 px-8 bg-gradient-to-br from-violet-50/30 via-purple-50/20 to-indigo-50/15 dark:from-gray-800/40 dark:via-gray-700/30 dark:to-gray-600/20 rounded-2xl border border-violet-200/30 dark:border-gray-600/30 shadow-xl backdrop-blur-sm relative overflow-hidden">
                {/* Subtle animated background elements */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(139,92,246,0.08)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_20%_80%,rgba(139,92,246,0.12)_0%,transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.08)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.12)_0%,transparent_50%)]" />
                
                <div className="relative z-10">
                  <div className="mb-6">
                    {isGenerating(funnel.id) ? (
                      <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 border-4 border-green-500 rounded-full animate-spin shadow-lg flex items-center justify-center">
                          <Zap className="w-8 h-8 text-green-500" strokeWidth={2.5} />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => onGlobalGeneration(funnel.id)}
                        disabled={funnel.generationStatus === 'generating'}
                        className={`group w-24 h-24 mx-auto mb-4 p-5 rounded-full bg-gradient-to-br from-violet-300/20 to-purple-400/25 dark:from-gray-700/30 dark:to-gray-600/25 border border-violet-200/30 dark:border-gray-500/30 flex items-center justify-center shadow-lg shadow-violet-500/15 animate-pulse hover:scale-110 hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-500 ease-out cursor-pointer ${
                          funnel.generationStatus === 'generating' ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 via-green-500 to-emerald-500 dark:from-green-300 dark:via-green-400 dark:to-emerald-400 animate-ping group-hover:animate-none group-hover:scale-125 group-hover:shadow-lg group-hover:shadow-green-400/50 transition-all duration-300 relative">
                          <Zap className="w-6 h-6 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" strokeWidth={2.5} />
                        </div>
                      </button>
                    )}
                  </div>
                  
                  <div className="mb-8">
                    <div className="text-center space-y-4">
                      <Text size="2" color="gray" className="text-muted-foreground">
                        {currentResources.length} product{currentResources.length !== 1 ? 's' : ''} selected
                      </Text>
                      <Heading size="5" weight="bold" className="text-violet-600 dark:text-violet-400">
                        {funnel.generationStatus === 'generating' ? 'Generating...' : 
                         funnel.generationStatus === 'completed' ? 'Generated' :
                         funnel.generationStatus === 'failed' ? 'Generation Failed' : 'Generate'}
                      </Heading>
                      {funnel.generationStatus === 'failed' && funnel.generationError && (
                        <Text size="2" color="red" className="text-red-600 dark:text-red-400">
                          Error: {funnel.generationError}
                        </Text>
                      )}
                      {funnel.generationStatus === 'completed' && funnel.lastGeneratedAt && (
                        <Text size="2" color="gray" className="text-muted-foreground">
                          Last generated: {new Date(funnel.lastGeneratedAt).toLocaleString()}
                        </Text>
                      )}
                    </div>
                  </div>
                  

                </div>
              </div>
            </div>
          )}

          {/* Current Resources Section */}
          <div className="mt-8">
            


            {/* Products Grid */}
            {currentResources.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentResources.map(resource => (
                  <div key={resource.id} className="group bg-gradient-to-br from-gray-50/80 via-gray-100/60 to-violet-50/40 dark:from-gray-800/80 dark:via-gray-700/60 dark:to-indigo-900/30 p-4 rounded-xl border border-border/50 dark:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(resource.type)}
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
                          {getTypeLabel(resource.type)}
                        </span>
                      </div>
                      {/* Delete Button - Only show when funnel is not live */}
                      {!funnel.isDeployed && (
                        <Button
                          size="1"
                          variant="ghost"
                          color="red"
                          onClick={() => handleDeleteResource(resource.id, resource.name)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors"
                          aria-label="Remove product"
                        >
                          <Trash2 size={14} strokeWidth={2.5} />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Text size="3" weight="semi-bold" className="text-foreground line-clamp-2">
                        {resource.name}
                      </Text>
                      <Text size="2" color="gray" className="text-muted-foreground line-clamp-1">
                        {resource.link}
                      </Text>
                      {resource.promoCode && (
                        <div className="flex items-center gap-2">
                          <Text size="1" color="gray" className="text-muted-foreground">
                            Promo:
                          </Text>
                          <span className="px-2 py-1 rounded text-xs font-mono bg-green-100 dark:bg-violet-300">
                            {resource.promoCode}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Empty State - Enhanced spacing and styling with original colors */}
          {currentResources.length === 0 && (
            <div className="text-center py-16 px-8 bg-gradient-to-br from-gray-50/50 via-gray-100/30 to-violet-50/20 dark:from-gray-800/50 dark:via-gray-700/30 dark:to-indigo-900/20 rounded-2xl border border-border/30 dark:border-border/20 shadow-lg backdrop-blur-sm">
              <div className="mb-8">
                <div className="w-20 h-20 mx-auto mb-6 p-4 rounded-full bg-gradient-to-br from-violet-100/80 to-purple-100/60 dark:from-violet-900/40 dark:to-purple-900/30 border border-violet-200/50 dark:border-violet-700/30 flex items-center justify-center">
                  <Library className="w-10 h-10 text-violet-500 dark:text-violet-400" strokeWidth={2.5} />
                </div>
              </div>
              
              <div className="mb-8">
                <Heading size="5" weight="bold" className="mb-3 text-foreground">
                  No Products Assigned
                </Heading>
                <Text size="3" color="gray" className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Add products from your library to start building your funnel.
                </Text>
              </div>
            </div>
          )}


        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={cancelDelete}>
          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 dark:from-gray-800 dark:to-gray-900 dark:border-gray-600 rounded-2xl shadow-2xl backdrop-blur-sm dark:shadow-black/60 max-w-md w-full p-6 sm:p-8 animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <Heading size="4" weight="bold" className="text-red-600 dark:text-red-400">
                Confirm Removal
              </Heading>
              <Button
                size="1"
                variant="ghost"
                color="gray"
                onClick={cancelDelete}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-all duration-200 hover:scale-105"
              >
                <X size={16} strokeWidth={2.5} />
              </Button>
            </div>
            
            <div className="mb-6">
              <Text size="3" className="text-foreground mb-3">
                Are you sure you want to remove this product from the funnel?
              </Text>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 rounded-lg p-3">
                <Text size="2" weight="semi-bold" className="text-red-700 dark:text-red-300">
                  "{deleteConfirmation.resourceName}"
                </Text>
              </div>
              <Text size="2" color="gray" className="text-muted-foreground mt-2">
                The product will be removed from this funnel but remain in your library.
              </Text>
            </div>
            
            <div className="flex gap-3">
              <Button 
                color="red" 
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl shadow-xl shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 transition-all duration-300 dark:bg-red-500 dark:hover:bg-red-600 dark:shadow-red-500/40 dark:hover:shadow-red-500/60"
              >
                <Trash2 size={18} strokeWidth={2.5} className="mr-2" />
                Remove Product
              </Button>
              <Button 
                variant="soft" 
                color="gray"
                onClick={cancelDelete}
                className="px-6 py-3 hover:scale-105 transition-all duration-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Confirmation Modal - Styled like Create New Funnel Modal */}
      {offlineConfirmation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 z-[9999]">
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-lg bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-2xl backdrop-blur-sm p-6 sm:p-8 animate-in zoom-in-95 duration-300 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 dark:border-gray-600 dark:shadow-2xl dark:shadow-black/60">
            <div className="flex justify-between items-center mb-6">
              <Heading size="4" weight="bold" className="text-foreground">
                Take Funnel Offline?
              </Heading>
              <Button
                size="1"
                variant="ghost"
                color="gray"
                onClick={() => setOfflineConfirmation(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-all duration-200 hover:scale-105"
              >
                <X size={16} strokeWidth={2.5} />
              </Button>
            </div>
            
            <div className="space-y-5">
              <div>
                <Text size="3" className="text-muted-foreground text-center">
                  This will make your funnel unavailable to customers.
                </Text>
              </div>
              
              <div className="flex gap-3 pt-6">
                <Button
                  color="red"
                  onClick={() => {
                    // Update funnel state to offline
                    const updatedFunnel = { ...funnel, isDeployed: false };
                    onUpdateFunnel(updatedFunnel);
                    setOfflineConfirmation(false);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold !py-3 !px-6 rounded-xl shadow-xl shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 transition-all duration-300 dark:bg-red-500 dark:hover:bg-red-600 dark:shadow-red-500/40 dark:hover:shadow-red-500/60"
                >
                  Take Offline
                </Button>
                <Button
                  variant="soft"
                  color="gray"
                  onClick={() => setOfflineConfirmation(false)}
                  className="!px-6 !py-3 hover:scale-105 transition-all duration-300"
                >
                  Cancel
                  </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Navigation */}
      <UnifiedNavigation
        onPreview={() => onGoToPreview(funnel)} // Go to preview
        onFunnelProducts={onGoToFunnelProducts} // Already on Assigned Products page
        onEdit={() => onGoToBuilder(funnel)} // Go to FunnelBuilder
        onGeneration={() => onGlobalGeneration(funnel.id)}
        isGenerated={hasValidFlow(funnel)}
        isGenerating={isGenerating(funnel.id)}
        isDeployed={funnel.isDeployed}
        showOnPage="resources"
      />

    </div>
  );
};

export default ResourcePage;
