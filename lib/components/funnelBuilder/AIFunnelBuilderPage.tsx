'use client';

import React from 'react';
import FunnelBuilderHeader from './FunnelBuilderHeader';
import FunnelBuilderSidebar from './FunnelBuilderSidebar';
import FunnelVisualizer from './FunnelVisualizer';
import FunnelPreviewChat from './FunnelPreviewChat';
import ResourceManager from './ResourceManager';
import GenerationPacks from '../common/GenerationPacks';
import { createErrorFunnelFlow } from '../../utils/funnelUtils';
import { FunnelFlow, Resource, NewResource, Funnel } from '../../types/funnel';
// AI actions are now handled via API route

interface AIFunnelBuilderPageProps {
  funnel: Funnel;
  onBack: () => void;
  onUpdate: (funnel: Funnel) => void;
  allResources: Resource[];
  setAllResources: React.Dispatch<React.SetStateAction<Resource[]>>;
  funnels: Funnel[];
  setFunnels: React.Dispatch<React.SetStateAction<Funnel[]>>;
  generations: number;
  setGenerations: React.Dispatch<React.SetStateAction<number>>;
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
  allResources, 
  setAllResources, 
  funnels, 
  setFunnels, 
  generations, 
  setGenerations 
}) => {
    const [currentFunnel, setCurrentFunnel] = React.useState<Funnel>(funnel);
    const [newResource, setNewResource] = React.useState<NewResource>({ 
      type: 'AFFILIATE', 
      name: '', 
      link: '', 
      code: '', 
      category: 'FREE_VALUE' 
    });
    const [isLoading, setIsLoading] = React.useState(false);
    const [apiError, setApiError] = React.useState<string | null>(null);
    const [errorDetails, setErrorDetails] = React.useState<string | null>(null);
    const [errorAction, setErrorAction] = React.useState<string | null>(null);
    const [isPreviewing, setIsPreviewing] = React.useState(false);
    const [isAddingResource, setIsAddingResource] = React.useState(false);
    const [editingResource, setEditingResource] = React.useState<Resource | null>(null);
    const [resourceToDelete, setResourceToDelete] = React.useState<string | null>(null);
    const [isBuyGenerationsModalOpen, setIsBuyGenerationsModalOpen] = React.useState(false);
    const [addResourceView, setAddResourceView] = React.useState<'library' | 'new'>('library');
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
    const [isDeploying, setIsDeploying] = React.useState(false);
    const [deploymentLog, setDeploymentLog] = React.useState<string[]>([]);
    const [editingBlockId, setEditingBlockId] = React.useState<string | null>(null);
    const deployControlsRef = React.useRef<HTMLDivElement>(null);
    const deployIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
    // FIX: State to trigger the remount logic.
    const [needsRemount, setNeedsRemount] = React.useState(false);

    // FIX: This effect handles the programmatic "Preview" -> "Edit" switch.
    React.useEffect(() => {
        if (needsRemount) {
            setNeedsRemount(false);
            // Force a re-render of the visualizer
            setCurrentFunnel(prev => ({ ...prev }));
        }
    }, [needsRemount]);

    const handleGeneratedFunnelUpdate = React.useCallback((newFlow: FunnelFlow) => {
        const updatedFunnel = { ...currentFunnel, flow: newFlow };
        setCurrentFunnel(updatedFunnel);
        onUpdate(updatedFunnel);
        setGenerations(prev => prev - 1);
        // FIX: Set the trigger to start the remount process.
        setNeedsRemount(true);
    }, [currentFunnel, onUpdate, setGenerations]);

    const handleAddNewResource = (resourceData: NewResource) => {
        if (!resourceData.name || !resourceData.link) return;

        const newResourceWithId = { ...resourceData, id: Date.now().toString() };

        const updatedAllResources = [...allResources, newResourceWithId];
        setAllResources(updatedAllResources);
        localStorage.setItem('allResources', JSON.stringify(updatedAllResources));

        const updatedFunnelResources = [...(currentFunnel.resources || []), newResourceWithId];
        const updatedFunnel = { ...currentFunnel, resources: updatedFunnelResources };
        setCurrentFunnel(updatedFunnel);
        onUpdate(updatedFunnel);

        setIsAddingResource(false);
    };

    const addResourceFromLibrary = (resource: Resource) => {
        const updatedFunnelResources = [...(currentFunnel.resources || []), resource];
        const updatedFunnel = { ...currentFunnel, resources: updatedFunnelResources };
        setCurrentFunnel(updatedFunnel);
        onUpdate(updatedFunnel);
        setIsAddingResource(false);
    };

    const removeResourceFromFunnel = (resourceId: string) => {
        const updatedFunnelResources = (currentFunnel.resources || []).filter(r => r.id !== resourceId);
        const updatedFunnel = { ...currentFunnel, resources: updatedFunnelResources };
        setCurrentFunnel(updatedFunnel);
        onUpdate(updatedFunnel);
    };

    const handleUpdateResource = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingResource) return;

        const updatedAllResources = allResources.map(r => r.id === editingResource.id ? editingResource : r);
        setAllResources(updatedAllResources);
        localStorage.setItem('allResources', JSON.stringify(updatedAllResources));

        const updatedFunnels = funnels.map(f => ({
            ...f,
            resources: (f.resources || []).map(r => r.id === editingResource.id ? editingResource : r)
        }));
        setFunnels(updatedFunnels);
        localStorage.setItem('funnels', JSON.stringify(updatedFunnels));

        setCurrentFunnel(updatedFunnels.find(f => f.id === currentFunnel.id) || currentFunnel);

        setEditingResource(null);
    };

    const handleConfirmDelete = () => {
        if (!resourceToDelete) return;
        
        const updatedAllResources = allResources.filter(r => r.id !== resourceToDelete);
        setAllResources(updatedAllResources);
        localStorage.setItem('allResources', JSON.stringify(updatedAllResources));

        const updatedFunnels = funnels.map(f => ({
            ...f,
            resources: (f.resources || []).filter(r => r.id !== resourceToDelete)
        }));
        setFunnels(updatedFunnels);
        localStorage.setItem('funnels', JSON.stringify(updatedFunnels));

        setCurrentFunnel(updatedFunnels.find(f => f.id === currentFunnel.id) || currentFunnel);

        setResourceToDelete(null);
    };

    const handleBlockUpdate = (updatedBlock: any) => {
        if (!updatedBlock || !currentFunnel.flow) return;
        const newFlow = { ...currentFunnel.flow };
        newFlow.blocks[updatedBlock.id] = updatedBlock;

        const updatedFunnel = { ...currentFunnel, flow: newFlow };
        setCurrentFunnel(updatedFunnel);
        onUpdate(updatedFunnel);
        setEditingBlockId(null);
    };

    // This is the core AI integration function.
    // The prompt enforces strict layer-to-layer transitions and divergent paths.
    const handleGenerateFunnel = async () => {
        if (generations <= 0) {
            setIsBuyGenerationsModalOpen(true);
            return;
        }

        setIsLoading(true);
        setApiError(null);
        setErrorDetails(null);
        setErrorAction(null);
        setCurrentFunnel(prev => ({...prev, flow: null}));

        try {
            const response = await fetch('/api/generate-funnel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resources: currentFunnel.resources || []
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to generate funnel');
            }
            
            if (result.success) {
                handleGeneratedFunnelUpdate(result.data);
            } else {
                throw new Error(result.message || 'Failed to generate funnel');
            }
        } catch (error) {
            console.error("Funnel generation failed:", error);
            
            // Try to extract detailed error information
            let errorMessage = 'An unexpected error occurred';
            let details = null;
            let action = null;
            
            if (error instanceof Error) {
                errorMessage = error.message;
                
                // Try to parse error response for additional details
                try {
                    const errorResponse = JSON.parse(error.message);
                    if (errorResponse.details) details = errorResponse.details;
                    if (errorResponse.action) action = errorResponse.action;
                } catch {
                    // If parsing fails, use the original message
                }
            }
            
            setApiError(errorMessage);
            setErrorDetails(details);
            setErrorAction(action);
            handleGeneratedFunnelUpdate(createErrorFunnelFlow());
        } finally {
            setIsLoading(false);
        }
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
                    setDeploymentLog([]);
                }, 2000); // Keep success message for 2s
            }
        }, 700);
    };

    const handlePreviewClick = () => {
        setIsSidebarOpen(false);
        setIsPreviewing(true);
    };

    const handleEditorClick = () => {
        setIsSidebarOpen(false);
        setIsPreviewing(false);
    };

    React.useEffect(() => {
        // Cleanup interval on component unmount
        return () => {
            if (deployIntervalRef.current) {
                clearInterval(deployIntervalRef.current);
            }
        };
    }, []);

    return (
        <React.Fragment>
            <style>{`
                /* Custom Scrollbar Styles For WebKit Browsers */
                ::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: #1f2937;
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb {
                    background: #4b5563;
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #6b7280;
                }
                /* Custom CSS Variables for Dynamic Styling */
                :root {
                    --dot-bg: #1f2937;
                    --dot-color: #4b5563;
                    --dot-size: 2px;
                    --dot-space: 20px;
                }
            `}</style>

            {/* Error Display */}
            {apiError && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-900/90 border border-red-600 rounded-lg p-4 max-w-md shadow-lg">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-red-200">Generation Failed</h3>
                            <p className="text-sm text-red-300 mt-1">{apiError}</p>
                            {errorDetails && (
                                <p className="text-xs text-red-400 mt-2">{errorDetails}</p>
                            )}
                            {errorAction && (
                                <p className="text-xs text-red-300 mt-1 font-medium">{errorAction}</p>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                setApiError(null);
                                setErrorDetails(null);
                                setErrorAction(null);
                            }}
                            className="flex-shrink-0 text-red-400 hover:text-red-300"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
                {/* Sidebar */}
                <FunnelBuilderSidebar
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    currentFunnel={currentFunnel}
                    onAddResource={() => setIsAddingResource(true)}
                    removeResourceFromFunnel={removeResourceFromFunnel}
                />
                
                {/* Generation Controls */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    <div className="bg-gray-800/90 px-3 py-1 rounded-lg text-sm">
                        <span className="text-gray-300">Generations: </span>
                        <span className="text-violet-400 font-semibold">{generations}</span>
                    </div>
                    <button
                        onClick={handleGenerateFunnel}
                        disabled={isLoading || (currentFunnel.resources || []).length === 0}
                        className="px-4 py-2 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? 'Generating...' : 'Generate'}
                    </button>
                    <button
                        onClick={() => setIsBuyGenerationsModalOpen(true)}
                        className="px-3 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
                    >
                        Buy
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <FunnelBuilderHeader
                        funnelName={currentFunnel.name}
                        onBack={onBack}
                        generations={generations}
                        onBuyGenerations={() => setIsBuyGenerationsModalOpen(true)}
                    />

                    {/* Main Canvas */}
                    <div className="flex-1 overflow-hidden">
                        {isPreviewing ? (
                            <FunnelPreviewChat funnelFlow={currentFunnel.flow} />
                        ) : (
                            <FunnelVisualizer
                                funnelFlow={currentFunnel.flow}
                                editingBlockId={editingBlockId}
                                setEditingBlockId={setEditingBlockId}
                                onBlockUpdate={handleBlockUpdate}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ResourceManager
                isAddingResource={isAddingResource}
                setIsAddingResource={setIsAddingResource}
                allResources={allResources}
                setAllResources={setAllResources}
                currentFunnel={currentFunnel}
                onUpdate={onUpdate}
                funnels={funnels}
                setFunnels={setFunnels}
                handleAddNewResource={handleAddNewResource}
                addResourceFromLibrary={addResourceFromLibrary}
                removeResourceFromFunnel={removeResourceFromFunnel}
            />

            <GenerationPacks
                isBuyGenerationsModalOpen={isBuyGenerationsModalOpen}
                setIsBuyGenerationsModalOpen={setIsBuyGenerationsModalOpen}
                setGenerations={setGenerations}
            />
        </React.Fragment>
    );
};

export default AIFunnelBuilderPage;

