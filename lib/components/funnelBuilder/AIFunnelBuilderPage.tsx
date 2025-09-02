'use client';

import React from 'react';
import { Heading, Text, Button, Card } from 'frosted-ui';


import { 
  ArrowLeft, 
  X, 
  Play
} from 'lucide-react';

import FunnelVisualizer from './FunnelVisualizer';
import FunnelPreviewChat from './FunnelPreviewChat';
import { ThemeToggle } from '../common/ThemeToggle';

import UnifiedNavigation from '../common/UnifiedNavigation';

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
}

/**
 * --- AI Funnel Builder Page Component ---
 * This is the main component for creating and editing a marketing funnel. It orchestrates
 * the sidebar for resource management, the main canvas for visualization or previewing,
 * and all the modals for adding resources and buying generations. It also contains the
 * core logic for interacting with the AI to generate the funnel flow.
 *
 * @param {AIFunnelBuilderPageProps} props - The props passed to the component.
 * @returns {JSX.Element} The rendered AIFunnelBuilderPage component.
 */
const AIFunnelBuilderPage: React.FC<AIFunnelBuilderPageProps> = ({ 
  funnel, 
  onBack, 
  onUpdate, 
  onGoToFunnelProducts,
  autoPreview = false
}) => {
    const [currentFunnel, setCurrentFunnel] = React.useState<Funnel>(funnel);
  

    const [apiError, setApiError] = React.useState<string | null>(null);
    const [isPreviewing, setIsPreviewing] = React.useState(false);

    
  // Update currentFunnel when funnel prop changes
  React.useEffect(() => {
    setCurrentFunnel(funnel);
  }, [funnel]);

  // Auto-switch to preview mode if requested
  React.useEffect(() => {
    if (autoPreview) {
      // Immediate switch to preview mode for instant transition
      setIsPreviewing(true);
    }
  }, [autoPreview]);
  

    const [selectedOffer, setSelectedOffer] = React.useState<string | null>(null);
      const [isDeploying, setIsDeploying] = React.useState(false);
  const [deploymentLog, setDeploymentLog] = React.useState<string[]>([]);
  const [deploymentValidation, setDeploymentValidation] = React.useState<{
    isValid: boolean;
    message: string;
    missingProducts: string[];
    extraProducts: string[];
  } | null>(null);
  const [offlineConfirmation, setOfflineConfirmation] = React.useState(false);
    const [editingBlockId, setEditingBlockId] = React.useState<string | null>(null);
    const deployIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
    const [showOfferSelection, setShowOfferSelection] = React.useState(false);
    const funnelVisualizerRef = React.useRef<{ handleBlockClick: (blockId: string) => void }>(null);

    const handleBlockUpdate = (updatedBlock: any) => {
        if (!updatedBlock) return;
        const newFlow = { ...currentFunnel.flow };
        newFlow.blocks[updatedBlock.id] = updatedBlock;

        const updatedFunnel = { ...currentFunnel, flow: newFlow };
        setCurrentFunnel(updatedFunnel);
        onUpdate(updatedFunnel);
        setEditingBlockId(null);
    };

    // Validate that assigned products match generated funnel products
    const validateDeployment = (): { isValid: boolean; message: string; missingProducts: string[]; extraProducts: string[] } => {
        if (!currentFunnel.flow || !currentFunnel.resources) {
            return { 
                isValid: false, 
                message: "Funnel must be generated and have assigned products to deploy.", 
                missingProducts: [], 
                extraProducts: [] 
            };
        }

        // Extract product names from the generated funnel flow (what the AI actually offers)
        const generatedProductNames = new Set<string>();
        
        // Look for offer blocks in the flow using resourceName field
        Object.values(currentFunnel.flow.blocks).forEach((block: any) => {
            // Check if this block has a resourceName field (offer block)
            if (block.resourceName && typeof block.resourceName === 'string') {
                generatedProductNames.add(block.resourceName);
            }
        });
        

        
        // Check which generated products are missing from "Assigned Products"
        const missingProducts: string[] = [];
        const extraProducts: string[] = [];
        
        // Find missing products (generated but not assigned)
        generatedProductNames.forEach(productName => {
            const isAssigned = currentFunnel.resources?.some(resource => 
                resource.name.toLowerCase() === productName.toLowerCase()
            );
            if (!isAssigned) {
                missingProducts.push(productName);
            }
        });
        
        // Find extra products (assigned but not generated)
        currentFunnel.resources?.forEach(resource => {
            const isGenerated = Array.from(generatedProductNames).some(generatedName => 
                generatedName.toLowerCase() === resource.name.toLowerCase()
            );
            if (!isGenerated) {
                extraProducts.push(resource.id);
            }
        });


        
        // Simple validation - just check if there's a mismatch
        if (missingProducts.length > 0 || extraProducts.length > 0) {
            return { 
                isValid: false, 
                message: "Product mismatch detected", 
                missingProducts, 
                extraProducts 
            };
        }

        return { isValid: true, message: "", missingProducts: [], extraProducts: [] };
    };

    const handleDeploy = () => {
        // Validate deployment before proceeding
        const validation = validateDeployment();
        if (!validation.isValid) {
            setDeploymentValidation(validation);
            return;
        }

        setIsDeploying(true);
        setDeploymentLog(['Deployment initiated...']);

        const steps = [
            'Connecting to server...',
            'Authenticating...',
            'Uploading funnel data...',
            'Validating funnel structure...',
            'Provisioning resources...',
            'Finalizing deployment...',
            '✅ Deployment successful!'
        ];

        let stepIndex = 0;
        deployIntervalRef.current = setInterval(() => {
            if (stepIndex < steps.length) {
                setDeploymentLog(prev => [...prev, steps[stepIndex]]);
                stepIndex++;
            } else {
                if (deployIntervalRef.current) {
                    clearInterval(deployIntervalRef.current);
                }
                setTimeout(() => {
                    setIsDeploying(false);
                    // Mark funnel as deployed
                    const updatedFunnel = { ...currentFunnel, isDeployed: true };
                    setCurrentFunnel(updatedFunnel);
                    
                    // Update parent component with deployed funnel
                    onUpdate(updatedFunnel);
                    
                    // Add deployment success to log
                    setDeploymentLog(prev => [...prev, '🎉 Deployment completed! Navigating to analytics...']);
                    
                    // Small delay to ensure state is updated before navigation
                    setTimeout(() => {
                        // The parent component will handle navigation to analytics
                
                    }, 500);
                }, 2000); // Keep deployment message for 2s
            }
        }, 700);
    };







    // Handle successful generation - don't automatically switch context
    const handleGenerationSuccess = () => {
        // Don't automatically switch context - let user stay in their current view
        // User can manually navigate to preview when ready
    };
    


    // Get offer blocks for selection - Same simple logic as Go Live validation
    const offerBlocks = React.useMemo(() => {
        if (!currentFunnel.flow) return [];
        
        // Simple: Just get all blocks with resourceName (same as validation modal)
        return Object.values(currentFunnel.flow.blocks)
            .filter((block: any) => block.resourceName && typeof block.resourceName === 'string')
            .map((block: any) => ({
                id: block.id,
                name: block.resourceName
            }));
    }, [currentFunnel.flow]);



    React.useEffect(() => {
        // Cleanup interval on component unmount
        return () => {
            if (deployIntervalRef.current) {
                clearInterval(deployIntervalRef.current);
            }
        };
    }, []);

    return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
      {/* Whop Design System Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />
      
      <div className="relative p-4 sm:p-6 lg:p-8">
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
                aria-label="Back to dashboard"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </Button>
              
              <div>
                <Heading size="6" weight="bold" className="text-black dark:text-white">
                  Funnel Builder
                </Heading>
                            </div>
                        </div>
            
            {/* Subtle Separator Line */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mb-4" />
            
            {/* Bottom Section: Action Buttons - Always Horizontal Layout */}
            <div className="flex justify-between items-center gap-2 sm:gap-3">
              {/* Left Side: Offers Button */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <Button
                  size="3"
                  variant="ghost"
                  color="violet"
                  onClick={() => {
                    setOfflineConfirmation(false);
                    setShowOfferSelection(true);
                  }}
                  className={`px-4 sm:px-6 py-3 border transition-all duration-200 group ${
                    selectedOffer 
                      ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-400 dark:border-violet-500 text-violet-700 dark:text-violet-300' 
                      : 'border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                        </svg>
                  <span className="font-semibold text-sm sm:text-base">
                    Offers
                  </span>
                </Button>
                

              </div>
              
              {/* Center: Theme Toggle */}
              <div className="flex-shrink-0">
                <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
                  <ThemeToggle />
                                    </div>
                                </div>
              
              {/* Right Side: Go Live Button */}
              <div className="flex-shrink-0">
                {currentFunnel.isDeployed ? (
                  <Button
                    size="3"
                    color="red"
                    onClick={() => {
                      setOfflineConfirmation(true);
                      setShowOfferSelection(false); // Hide offer selection when opening offline modal
                      setSelectedOffer(null); // Clear offer selection when opening offline modal
                    }}
                    className="px-4 sm:px-6 py-3 shadow-lg shadow-red-500/25 group bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 transition-all duration-200 cursor-pointer"
                  >
                    {/* Live Status Icon */}
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="red" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="red" />
                      <circle cx="12" cy="12" r="3" fill="white" />
                                            </svg>
                    {/* Live Text */}
                    <span className="font-semibold text-sm sm:text-base text-red-600 dark:text-red-400">Live</span>
                  </Button>
                ) : (
                  <Button
                    size="3"
                    color="green"
                    onClick={handleDeploy} 
                    disabled={!currentFunnel.flow || !!apiError} 
                    className="px-4 sm:px-6 py-3 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 dark:shadow-green-500/30 dark:hover:shadow-green-500/50 group bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                    title={apiError ? "Cannot go live due to generation error" : !currentFunnel.flow ? "Generate funnel first" : ""}
                  >
                    <Play size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-300 sm:w-5 sm:h-5" />
                    <span className="ml-2 font-semibold text-sm sm:text-base">Go Live</span>
                  </Button>
                )}
                                        </div>
                                    </div>
                                </div>

          {/* Main Content Area with Whop Design System */}
          <div className="flex-grow flex flex-col md:overflow-hidden gap-6 !mt-8">
            <Card className="w-full flex flex-col relative bg-surface/80 dark:bg-surface/60 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-2xl md:flex-grow md:overflow-hidden shadow-xl dark:shadow-2xl dark:shadow-black-20 p-0">
              <div className="relative md:flex-grow md:overflow-auto p-0">




                {/* API Error Modal */}
                            {apiError && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 p-4">
                    <Card className="bg-red-900/50 border border-red-700 p-0 rounded-lg max-w-md text-center shadow-2xl">
                      <Heading size="4" weight="bold" color="red" className="dark:text-red-300 mb-3">
                        Generation Failed
                      </Heading>
                      <Text color="red" className="mb-4 text-red-200">
                        {apiError}
                      </Text>
                      <Button
                        size="3"
                        color="red"
                        onClick={() => setApiError(null)}
                        className="px-4 py-2"
                      >
                                            Close
                      </Button>
                    </Card>
                                </div>
                            )}

                

                {/* Enhanced Content Area with Whop Design */}
                <div className="flex-1 p-0">
                            {isPreviewing ? (
                    <div className="h-full animate-in fade-in duration-0">
                                <FunnelPreviewChat 
                                  funnelFlow={currentFunnel.flow} 
                                  selectedOffer={selectedOffer} 
                                  onOfferClick={(offerId: string) => setSelectedOffer(offerId)}
                                />
                    </div>
                            ) : (
                    <>
                                <div className="animate-in fade-in duration-0">
                                <FunnelVisualizer
                                    funnelFlow={currentFunnel.flow}
                                    editingBlockId={editingBlockId}
                                    setEditingBlockId={setEditingBlockId}
                                    onBlockUpdate={handleBlockUpdate}
                                    selectedOffer={selectedOffer}
                                    onOfferSelect={(offerId) => setSelectedOffer(offerId)}
                                    ref={funnelVisualizerRef}
                                />
                                </div>
                      

                    </>
                  )}
                </div>




                        </div>
            </Card>
                </div>

                    {/* Deployment Modal - Layered like UnifiedNavigation */}
          {isDeploying && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-2xl backdrop-blur-sm">
              <div className="p-6">
                <div className="text-center space-y-4">
                  {/* Animated Loading Icon with Play Symbol */}
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 w-16 h-16 border-4 border-green-200 dark:border-green-800 rounded-full animate-pulse"></div>
                    <div className="absolute inset-2 w-12 h-12 border-4 border-transparent border-t-green-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-4 w-8 h-8 bg-green-500 rounded-full animate-ping"></div>
                    {/* Play Icon in Center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                                    </svg>
                    </div>
                  </div>
                  
                  <Heading size="4" weight="bold" className="text-gray-900 dark:text-white">
                    Going Live! 🚀
                  </Heading>
                  
                  <Text size="2" className="text-gray-600 dark:text-gray-300">
                    Setting up your funnel for customers...
                  </Text>
                </div>
              </div>
            </div>
          )}

                    {/* Success Modal - Removed for automatic redirect flow */}
                        </div>
                    </div>
                    
                    {/* Bottom margin spacer for consistent spacing */}
                    <div className="h-14"></div>

      {/* Floating Offers Selection Panel - Native Whop Style */}
      {showOfferSelection && offerBlocks.length > 0 && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-2xl backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
              <Text size="2" weight="semi-bold" className="text-gray-900 dark:text-white">
                Select Offer
              </Text>
            </div>
            <Button
              size="1"
              variant="ghost"
              color="gray"
              onClick={() => {
                setShowOfferSelection(false);
                setOfflineConfirmation(false); // Hide offline modal when closing offer selection
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
            >
              <X size={14} strokeWidth={2.5} />
            </Button>
          </div>
          


          {/* Offers List */}
          <div className="p-4 max-h-80 overflow-y-auto">
            <div className="space-y-2">
              {offerBlocks.map((resource: any) => {
                return (
                  <div
                    key={resource.id}
                                          onClick={() => {
                       // Since resource.id is now the block ID, we can use it directly
                       const blockId = resource.id;
                       
                       if (blockId) {
                         // Directly call handleBlockClick to set selectedBlockForHighlight state
                         funnelVisualizerRef.current?.handleBlockClick(blockId);
                       }
                       
                       setShowOfferSelection(false);
                       setOfflineConfirmation(false); // Hide offline modal when selecting offer
                     }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                      'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 hover:border-violet-200 dark:hover:border-violet-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Text size="2" weight="semi-bold" className="text-gray-900 dark:text-white">
                        {resource.name}
                      </Text>
                    </div>
                  </div>
                );
              })}
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
                onClick={() => {
                  setOfflineConfirmation(false);
                  setShowOfferSelection(false); // Hide offer selection when closing offline modal
                }}
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
                    const updatedFunnel = { ...currentFunnel, isDeployed: false };
                    setCurrentFunnel(updatedFunnel);
                    onUpdate(updatedFunnel);
                    setOfflineConfirmation(false);
                    setShowOfferSelection(false); // Hide offer selection when going offline
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold !py-3 !px-6 rounded-xl shadow-xl shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 transition-all duration-300 dark:bg-red-500 dark:hover:bg-red-600 dark:shadow-red-500/40 dark:hover:shadow-red-500/60"
                >
                  Take Offline
                </Button>
                <Button
                  variant="soft"
                  color="gray"
                  onClick={() => {
                    setOfflineConfirmation(false);
                    setShowOfferSelection(false); // Hide offer selection when closing offline modal
                  }}
                  className="!px-6 !py-3 hover:scale-105 transition-all duration-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Validation Modal - Enhanced with Product Details */}
      {deploymentValidation && !deploymentValidation.isValid && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 z-[9999]">
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-2xl backdrop-blur-sm p-6 sm:p-8 animate-in zoom-in-95 duration-300 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 dark:border-gray-600 dark:shadow-2xl dark:shadow-black/60">
            <div className="flex justify-between items-center mb-6">
              <Heading size="4" weight="bold" className="text-foreground">
                Cannot Go Live
              </Heading>
              <Button
                size="1"
                variant="ghost"
                color="gray"
                onClick={() => setDeploymentValidation(null)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-all duration-200 hover:scale-105"
              >
                <X size={16} strokeWidth={2.5} />
              </Button>
            </div>
            
            <div className="space-y-6">
              <div className="text-center">
                <Text size="3" className="text-muted-foreground">
                  Products don't match. Fix your products or generate a new funnel.
                </Text>
              </div>
              
              {/* Missing Products Section */}
              {deploymentValidation.missingProducts.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <Text size="3" weight="semi-bold" className="text-amber-800 dark:text-amber-200">
                      Add these products to "Assigned Products":
                    </Text>
                  </div>
                  <div className="space-y-2">
                    {deploymentValidation.missingProducts.map((productName, index) => {
                      return (
                        <div key={index} className="flex items-center gap-2 bg-white dark:bg-amber-900/30 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-600">
                          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <Text size="2" className="text-amber-800 dark:text-amber-200 font-medium">
                            {productName}
                          </Text>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Extra Products Section */}
              {deploymentValidation.extraProducts.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <Text size="3" weight="semi-bold" className="text-red-800 dark:text-red-200">
                      Remove these products from "Assigned Products":
                    </Text>
                  </div>
                  <div className="space-y-2">
                    {deploymentValidation.extraProducts.map((productId) => {
                      // Try to find the product name from funnel resources
                      const productName = currentFunnel.resources?.find(r => r.id === productId)?.name || 
                                        `Product ${productId}`;
                      return (
                        <div key={productId} className="flex items-center gap-2 bg-white dark:bg-red-900/30 rounded-lg px-3 py-2 border border-red-200 dark:border-red-600">
                          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <Text size="2" className="text-red-800 dark:text-red-200 font-medium">
                            {productName}
                          </Text>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="flex justify-center pt-4">
                <Button
                  color="violet"
                  onClick={() => onGoToFunnelProducts()}
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all duration-300 dark:bg-violet-500 dark:hover:bg-violet-600 dark:shadow-violet-500/40 dark:hover:bg-violet-500/60"
                >
                  Go to Assigned Products
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Navigation */}
      <UnifiedNavigation
        onPreview={() => setIsPreviewing(true)}
        onFunnelProducts={onGoToFunnelProducts} // Go to specific funnel's Assigned Products page
        onEdit={() => setIsPreviewing(false)} // Go back to Funnel Builder from Preview
        onGeneration={handleGenerationSuccess}
        isGenerated={!!currentFunnel.flow}
        isGenerating={false}
        isDeployed={currentFunnel.isDeployed}
        showOnPage={isPreviewing ? "preview" : "aibuilder"}
      />

            </div>
    );
};

export default AIFunnelBuilderPage;

