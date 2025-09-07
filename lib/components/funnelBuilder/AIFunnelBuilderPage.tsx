'use client';

import React from 'react';

// Core Components
import FunnelVisualizer from './FunnelVisualizer';
import FunnelPreviewChat from './FunnelPreviewChat';
import { FunnelBuilderHeader } from './FunnelBuilderHeader';
import UnifiedNavigation from '../common/UnifiedNavigation';

// Modal Components
import { DeploymentModal } from './modals/DeploymentModal';
import { OfferSelectionModal } from './modals/OfferSelectionModal';
import { OfflineConfirmationModal } from './modals/OfflineConfirmationModal';
import { ValidationModal } from './modals/ValidationModal';
import { ApiErrorModal } from './modals/ApiErrorModal';

// Custom Hooks
import { useFunnelDeployment } from '../../hooks/useFunnelDeployment';
import { useFunnelValidation } from '../../hooks/useFunnelValidation';
import { useModalManagement } from '../../hooks/useModalManagement';
import { useKeyboard } from '../../context/KeyboardContext';

// Type definitions
interface Funnel {
  id: string;
  name: string;
  flow?: any;
  isDeployed?: boolean;
  wasEverDeployed?: boolean; // Track if funnel was ever live
  resources?: Resource[];
}

interface Resource {
  id: string;
  type: 'AFFILIATE' | 'MY_PRODUCTS' | 'CONTENT' | 'TOOL';
  name: string;
  link: string;
  promoCode?: string; // Keep original field name for consistency with AdminPanel
  category?: string;
}

interface AIFunnelBuilderPageProps {
  funnel: Funnel;
  onBack: () => void;
  onUpdate: (funnel: Funnel) => void;
  onGoToFunnelProducts: () => void;
  autoPreview?: boolean; // New: Auto-switch to preview mode
  onGenerationComplete?: (funnelId: string) => void; // New: callback when generation is fully complete
  onGenerationError?: (funnelId: string, error: Error) => void; // New: callback when generation fails
}

/**
 * AI Funnel Builder Page Component
 * 
 * Main component for creating and editing marketing funnels. Orchestrates:
 * - Resource management sidebar
 * - Main canvas for visualization/previewing
 * - All modals for resources and generations
 * - Core AI interaction logic for funnel flow generation
 */
const AIFunnelBuilderPage: React.FC<AIFunnelBuilderPageProps> = ({ 
  funnel, 
  onBack, 
  onUpdate, 
  onGoToFunnelProducts,
  autoPreview = false,
  onGenerationComplete,
  onGenerationError
}) => {
  // State Management
  const [currentFunnel, setCurrentFunnel] = React.useState<Funnel>(funnel);
  const [isPreviewing, setIsPreviewing] = React.useState(false);

  // Refs
  const funnelVisualizerRef = React.useRef<{ handleBlockClick: (blockId: string) => void }>(null);

  // Custom Hooks
  const deployment = useFunnelDeployment(currentFunnel, onUpdate);
  const validation = useFunnelValidation();
  const modals = useModalManagement();
  const { isTyping, isKeyboardOpen } = useKeyboard();

  // Effects
  React.useEffect(() => {
    setCurrentFunnel(funnel);
  }, [funnel]);

  React.useEffect(() => {
    if (autoPreview) {
      setIsPreviewing(true);
    }
  }, [autoPreview]);

    const handleBlockUpdate = (updatedBlock: any) => {
        if (!updatedBlock) return;
        const newFlow = { ...currentFunnel.flow };
        newFlow.blocks[updatedBlock.id] = updatedBlock;

        const updatedFunnel = { ...currentFunnel, flow: newFlow };
        setCurrentFunnel(updatedFunnel);
        onUpdate(updatedFunnel);
        validation.setEditingBlockId(null);
    };

    // Deployment logic is now handled by useFunnelDeployment hook







    // Handle successful generation - don't automatically switch context
    const handleGenerationSuccess = () => {
        // Don't automatically switch context - let user stay in their current view
        // User can manually navigate to preview when ready
    };
    


    // Get offer blocks for selection - Same simple logic as Go Live validation
    const offerBlocks = validation.getOfferBlocks(currentFunnel);



    // Cleanup is now handled by useFunnelDeployment hook

    return (
      <div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
        {/* Whop Design System Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />
        
        <div className="relative p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
          {/* Enhanced Header with Whop Design Patterns - Hide when typing in preview mode */}
          <div className={`transition-all duration-300 ${(isPreviewing && (isTyping || isKeyboardOpen)) ? 'hidden' : 'block'}`}>
            <FunnelBuilderHeader
              onBack={onBack}
              isDeployed={!!currentFunnel.isDeployed}
              selectedOffer={modals.selectedOffer}
              hasFlow={!!currentFunnel.flow}
              hasApiError={!!validation.apiError}
              onOpenOfferSelection={modals.openOfferSelection}
              onOpenOfflineConfirmation={modals.openOfflineConfirmation}
              onDeploy={deployment.handleDeploy}
            />
          </div>

          {/* Main Content Area */}
          <div className="flex-grow flex flex-col md:overflow-hidden gap-6 !mt-8">
            {/* Removed Card wrapper to eliminate fui-CardInner container */}
            <div className="w-full flex flex-col relative bg-surface/80 dark:bg-surface/60 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-2xl md:flex-grow md:overflow-hidden shadow-xl dark:shadow-2xl dark:shadow-black-20 p-0">
              <div className="relative md:flex-grow md:overflow-auto p-0">
                {/* API Error Modal */}
                <ApiErrorModal
                  error={validation.apiError}
                  onClose={() => validation.setApiError(null)}
                />

                {/* Main Content Area - Direct rendering without inner container */}
                <div className="flex-1 p-0 h-full">
                  {isPreviewing ? (
                    <FunnelPreviewChat 
                      funnelFlow={currentFunnel.flow} 
                      selectedOffer={modals.selectedOffer || undefined} 
                      onOfferClick={(offerId: string) => modals.setSelectedOffer(offerId)}
                    />
                  ) : (
                    <div className="animate-in fade-in duration-0">
                      <FunnelVisualizer
                        funnelFlow={currentFunnel.flow}
                        editingBlockId={validation.editingBlockId}
                        setEditingBlockId={validation.setEditingBlockId}
                        onBlockUpdate={handleBlockUpdate}
                        selectedOffer={modals.selectedOffer}
                        onOfferSelect={(offerId) => modals.setSelectedOffer(offerId)}
                        funnelId={currentFunnel.id}
                        ref={funnelVisualizerRef}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modals */}
          <DeploymentModal 
            isDeploying={deployment.isDeploying}
            deploymentLog={deployment.deploymentLog}
          />

          {/* Bottom margin spacer */}
          <div className="h-14"></div>

          {/* Floating Offers Selection Panel */}
          <OfferSelectionModal
            isOpen={modals.showOfferSelection}
            offerBlocks={offerBlocks}
            onClose={modals.closeOfferSelection}
            onOfferSelect={(offerId: string) => modals.setSelectedOffer(offerId)}
            onBlockClick={(blockId: string) => {
              if (blockId) {
                funnelVisualizerRef.current?.handleBlockClick(blockId);
              }
            }}
          />

          {/* Offline Confirmation Modal */}
          <OfflineConfirmationModal
            isOpen={modals.offlineConfirmation}
            onClose={modals.closeOfflineConfirmation}
            onConfirm={() => {
              const updatedFunnel = { ...currentFunnel, isDeployed: false };
              setCurrentFunnel(updatedFunnel);
              onUpdate(updatedFunnel);
              modals.closeOfflineConfirmation();
            }}
          />

          {/* Deployment Validation Modal */}
          {deployment.deploymentValidation && !deployment.deploymentValidation.isValid && (
            <ValidationModal
              validation={deployment.deploymentValidation}
              resources={currentFunnel.resources || []}
              onClose={() => deployment.setDeploymentValidation(null)}
              onGoToProducts={onGoToFunnelProducts}
            />
          )}

          {/* Unified Navigation */}
          <UnifiedNavigation
            onPreview={() => setIsPreviewing(true)}
            onFunnelProducts={onGoToFunnelProducts}
            onEdit={() => setIsPreviewing(false)}
            onGeneration={handleGenerationSuccess}
            isGenerated={!!currentFunnel.flow}
            isGenerating={false}
            isDeployed={currentFunnel.isDeployed}
            showOnPage={isPreviewing ? "preview" : "aibuilder"}
            hideWhenTyping={true}
          />
        </div>
      </div>
    </div>
    );
};

export default AIFunnelBuilderPage;

