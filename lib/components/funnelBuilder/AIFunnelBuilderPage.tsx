'use client';

import React from 'react';
import { Heading, Text, Button, Card } from 'frosted-ui';

// Draggable Debug Panel Component
interface DraggableDebugPanelProps {
  children: React.ReactNode;
  initialPosition: { x: number; y: number };
  className?: string;
}

const DraggableDebugPanel: React.FC<DraggableDebugPanelProps> = ({ 
  children, 
  initialPosition, 
  className = '' 
}) => {
  const [position, setPosition] = React.useState(initialPosition);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button only
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      e.preventDefault();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  const handleTouchMove = React.useCallback((e: TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragOffset.x,
        y: touch.clientY - dragOffset.y
      });
      e.preventDefault();
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchEnd = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div
      className={`fixed z-50 select-none ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'move'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {children}
    </div>
  );
};
import { 
  ArrowLeft, 
  Eye, 
  Edit3, 
  Plus, 
  X, 
  Zap, 
  Loader2, 
  Play,
  Save,
  Target,
  BarChart3
} from 'lucide-react';

import FunnelVisualizer from './FunnelVisualizer';
import FunnelPreviewChat from './FunnelPreviewChat';
import { ThemeToggle } from '../common/ThemeToggle';
import { createErrorFunnelFlow } from '../../utils/funnelUtils';
import UnifiedNavigation from '../common/UnifiedNavigation';

// Type definitions
interface Funnel {
  id: string;
  name: string;
  flow?: any;
  isDeployed?: boolean;
  delay?: number;
  resources?: Resource[];
}

interface Resource {
  id: string;
  type: string;
  name: string;
  link: string;
  code: string;
  category: string;
}

interface AIFunnelBuilderPageProps {
  funnel: Funnel;
  onBack: () => void;
  onUpdate: (funnel: Funnel) => void;
  onEdit?: () => void; // Optional: for navigation to edit mode
  allResources: Resource[];
  setAllResources: React.Dispatch<React.SetStateAction<Resource[]>>;
  funnels: Funnel[];
  setFunnels: React.Dispatch<React.SetStateAction<Funnel[]>>;
  onGlobalGeneration: () => Promise<void>;
  isGenerating: boolean;
  onGoToFunnelProducts: () => void;
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
  onEdit,
  allResources, 
  setAllResources, 
  funnels, 
  setFunnels,
  onGlobalGeneration,
  isGenerating,
  onGoToFunnelProducts
}) => {
    const [currentFunnel, setCurrentFunnel] = React.useState<Funnel>(funnel);
  
  // Update currentFunnel when funnel prop changes
  React.useEffect(() => {
    setCurrentFunnel(funnel);
  }, [funnel]);
  
  // Debug: Log the current funnel flow
  React.useEffect(() => {
    console.log('=== AIFUNNEL BUILDER DEBUG ===');
    console.log('funnel prop:', funnel);
    console.log('currentFunnel:', currentFunnel);
    console.log('currentFunnel.flow:', currentFunnel.flow);
    console.log('funnel.flow:', funnel.flow);
    console.log('=== END AIFUNNEL BUILDER DEBUG ===');
  }, [currentFunnel, funnel]);

    const [isLoading, setIsLoading] = React.useState(false);
    const [apiError, setApiError] = React.useState<string | null>(null);
    const [isPreviewing, setIsPreviewing] = React.useState(false);
    const [showFloatingMenu, setShowFloatingMenu] = React.useState(false);
    const [selectedOffer, setSelectedOffer] = React.useState<string | null>(null);
    const [isDeploying, setIsDeploying] = React.useState(false);
    const [deploymentLog, setDeploymentLog] = React.useState<string[]>([]);
    const [editingBlockId, setEditingBlockId] = React.useState<string | null>(null);
    const deployControlsRef = React.useRef<HTMLDivElement>(null);
    const deployIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
    const [needsRemount, setNeedsRemount] = React.useState(false);
  const [showOfferSelection, setShowOfferSelection] = React.useState(false);

    // FIX: This effect handles the programmatic "Preview" -> "Edit" switch.
    React.useEffect(() => {
        if (needsRemount) {
            // 1. Switch to Preview mode (unmounts the visualizer)
            setIsPreviewing(true);

            // 2. In the next render cycle, switch back to Editor mode (remounts a fresh visualizer)
            const timer = setTimeout(() => {
                setIsPreviewing(false);
                setNeedsRemount(false); // Reset the trigger
            }, 50); // A small delay ensures React processes the state changes sequentially.

            return () => clearTimeout(timer);
        }
    }, [needsRemount]);

    const handleBlockUpdate = (updatedBlock: any) => {
        if (!updatedBlock) return;
        const newFlow = { ...currentFunnel.flow };
        newFlow.blocks[updatedBlock.id] = updatedBlock;

        const updatedFunnel = { ...currentFunnel, flow: newFlow };
        setCurrentFunnel(updatedFunnel);
        onUpdate(updatedFunnel);
        setEditingBlockId(null);
    };

    const handleDeploy = () => {
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
                        console.log('Deployment successful, funnel ready for analytics view');
                    }, 500);
                }, 2000); // Keep deployment message for 2s
            }
        }, 700);
    };



    const handleFloatingMenuClick = () => {
        setShowFloatingMenu(!showFloatingMenu);
    };

    const handlePreviewClick = () => {
        setShowFloatingMenu(false);
        setIsPreviewing(true);
    };

    const handleOfferSelect = () => {
        setShowFloatingMenu(false);
        setShowOfferSelection(true);
    };

    // Handle successful generation - automatically switch to preview mode
    const handleGenerationSuccess = () => {
        // Switch to preview mode to show the generated funnel
        setIsPreviewing(true);
        // Trigger remount to ensure proper rendering
        setNeedsRemount(true);
    };

    // Get offer blocks for selection - Load from funnel resources (same as Assigned Products view)
    const offerBlocks = React.useMemo(() => {
        if (!currentFunnel.resources) return [];
        return currentFunnel.resources.map(resource => ({
            id: resource.id,
            name: resource.name,
            type: resource.type,
            category: resource.category,
            link: resource.link,
            code: resource.code
        }));
    }, [currentFunnel.resources]);

    // Extract offer name from selected offer
    const selectedOfferName = React.useMemo(() => {
        if (!selectedOffer || !currentFunnel.resources) return null;
        const resource = currentFunnel.resources.find(r => r.id === selectedOffer);
        return resource ? resource.name : null;
    }, [selectedOffer, currentFunnel.resources]);

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
              <div className="flex-shrink-0">
                <Button
                  size="3"
                  variant="ghost"
                  color="violet"
                  onClick={handleOfferSelect}
                  className="px-4 sm:px-6 py-3 border border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-200 group"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                        </svg>
                  <span className="font-semibold text-sm sm:text-base">Offers</span>
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
                    className="px-4 sm:px-6 py-3 shadow-lg shadow-red-500/25 group bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 transition-all duration-200"
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
                    disabled={!currentFunnel.flow || isLoading || !!apiError} 
                    className="px-4 sm:px-6 py-3 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 dark:shadow-green-500/30 dark:hover:shadow-green-500/50 group bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                    title={apiError ? "Cannot go live due to generation error" : !currentFunnel.flow ? "Generate funnel first" : isLoading ? "Generation in progress" : ""}
                  >
                    <Play size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-300 sm:w-5 sm:h-5" />
                    <span className="ml-2 font-semibold text-sm sm:text-base">Go Live</span>
                  </Button>
                )}
                                        </div>
                                    </div>
                                </div>

          {/* Main Content Area with Whop Design System */}
          <div className="flex-grow flex flex-col md:overflow-hidden gap-6 mt-8">
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
                            {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-violet-200 dark:border-violet-700 rounded-full animate-pulse"></div>
                        <Loader2 className="absolute inset-0 w-16 h-16 text-violet-500 dark:text-violet-400 animate-spin" strokeWidth={2} />
                      </div>
                      <div className="space-y-2">
                        <Text size="4" weight="semi-bold" className="text-foreground">
                          Building your funnel...
                        </Text>
                        <Text size="2" color="gray" className="text-muted-foreground max-w-sm">
                          Our AI is analyzing your resources and creating an optimized conversion flow
                        </Text>
                      </div>
                    </div>
                            ) : isPreviewing ? (
                    <div className="h-full">
                                <FunnelPreviewChat funnelFlow={currentFunnel.flow} selectedOffer={selectedOfferName} />
                    </div>
                            ) : (
                    <>
                                <FunnelVisualizer
                                    funnelFlow={currentFunnel.flow}
                                    editingBlockId={editingBlockId}
                                    setEditingBlockId={setEditingBlockId}
                                    onBlockUpdate={handleBlockUpdate}
                                    selectedOffer={selectedOffer}
                                />
                      
                      {/* Debug Panel - Hidden for production */}
                      {/* {process.env.NODE_ENV === 'development' && (
                        <DraggableDebugPanel
                          initialPosition={{ x: 16, y: 16 }}
                          className="bg-surface/95 dark:bg-surface/90 text-foreground p-0 rounded-2xl text-sm max-w-md border border-border/50 dark:border-border/30 shadow-2xl backdrop-blur-sm cursor-move"
                        >
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                            <Text size="2" weight="semi-bold" color="violet">
                              Debug Panel
                            </Text>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Flow exists:</span>
                              <span className={currentFunnel.flow ? 'text-green-500' : 'text-red-500'}>
                                {currentFunnel.flow ? 'Yes' : 'No'}
                              </span>
                            </div>
                            {currentFunnel.flow && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Stages:</span>
                                  <span className="text-foreground">{currentFunnel.flow.stages?.length || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Blocks:</span>
                                  <span className="text-foreground">{Object.keys(currentFunnel.flow.blocks || {}).length}</span>
                                        </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Start:</span>
                                  <span className="text-foreground font-mono">{currentFunnel.flow.startBlockId}</span>
                                </div>
                              </>
                            )}
                            <details className="mt-4">
                              <summary className="cursor-pointer text-violet-500 hover:text-violet-600 transition-colors">
                                Raw Flow Data
                              </summary>
                              <pre className="mt-2 text-xs overflow-auto max-h-32 bg-surface/50 dark:bg-surface/30 p-2 rounded-lg border border-border/30">
                                {JSON.stringify(currentFunnel.flow, null, 2)}
                              </pre>
                            </details>
                          </div>
                        </DraggableDebugPanel>
                      )} */}
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
              onClick={() => setShowOfferSelection(false)}
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
                      setSelectedOffer(resource.id);
                      setShowOfferSelection(false);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                      selectedOffer === resource.id 
                        ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-600 shadow-sm' 
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 hover:border-violet-200 dark:hover:border-violet-500/50'
                    }`}
                  >
                    <Text size="2" weight="semi-bold" className="text-gray-900 dark:text-white">
                      {resource.name}
                    </Text>
                            </div>
                );
              })}
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
        isGenerating={isGenerating}
        showOnPage={isPreviewing ? "preview" : "aibuilder"}
      />

            </div>
    );
};

export default AIFunnelBuilderPage;

