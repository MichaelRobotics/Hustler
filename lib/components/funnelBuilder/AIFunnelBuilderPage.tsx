'use client';

import React from 'react';
import FunnelBuilderHeader from './FunnelBuilderHeader';
import FunnelBuilderSidebar from './FunnelBuilderSidebar';
import FunnelVisualizer from './FunnelVisualizer';
import FunnelPreviewChat from './FunnelPreviewChat';
import ResourceManager from './ResourceManager';
import GenerationPacks from '../common/GenerationPacks';
import { createErrorFunnelFlow } from '../../utils/funnelUtils';
// AI actions are now handled via API route

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

interface NewResource {
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

    const handleGeneratedFunnelUpdate = React.useCallback((newFlow: any) => {
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
        if (!updatedBlock) return;
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
            setApiError(`Error: ${(error as Error).message}`);
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
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background-color: #4b5563; /* gray-600 */
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background-color: #6b7280; /* gray-500 */
                }
            `}</style>
            <div className="bg-gray-900 min-h-screen md:h-screen md:overflow-hidden font-sans text-gray-300 flex flex-col p-2">
                <FunnelBuilderHeader 
                    onBack={onBack}
                    funnelName={currentFunnel.name}
                    generations={generations}
                    onBuyGenerations={() => setIsBuyGenerationsModalOpen(true)}
                />
                <div className="flex-grow flex flex-col md:flex-row md:overflow-hidden gap-2 mt-2">
                    <FunnelBuilderSidebar
                        isSidebarOpen={isSidebarOpen}
                        setIsSidebarOpen={setIsSidebarOpen}
                        currentFunnel={currentFunnel}
                        onAddResource={() => setIsAddingResource(true)}
                        removeResourceFromFunnel={removeResourceFromFunnel}
                    />

                    <div className="w-full flex flex-col relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl md:flex-grow md:overflow-hidden">
                        <div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 flex-shrink-0">
                            <h2 className="text-lg font-semibold text-white text-center sm:text-left">2. Generate & Visualize Funnel</h2>
                            <div className="flex flex-col sm:flex-row items-center gap-2">
                                <div className="sm:hidden w-full text-center mb-2">
                                    <p className="text-sm font-semibold bg-gray-700/50 rounded-full px-3 py-1">Generations Remaining: <span className="text-violet-400">{generations}</span></p>
                                </div>
                                <div className="flex items-center gap-2" ref={deployControlsRef}>
                                     {isPreviewing ? (
                                         <button onClick={handleEditorClick} className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700 transition-colors">
                                             Editor
                                         </button>
                                     ) : (
                                         <button onClick={handlePreviewClick} disabled={!currentFunnel.flow} className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                             Preview
                                         </button>
                                     )}
                                    <button onClick={handleGenerateFunnel} disabled={isLoading || (currentFunnel.resources || []).length === 0} className="w-full sm:w-auto px-4 py-2 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                        {isLoading ? 'Generating...' : 'Generate'}
                                    </button>
                                    <button onClick={handleDeploy} disabled={!currentFunnel.flow || isLoading} className="w-full sm:w-auto px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                        Deploy
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="relative md:flex-grow md:overflow-auto" style={{'--dot-bg': '#1f2937', '--dot-color': '#4b5563', backgroundImage: 'radial-gradient(var(--dot-color) 1px, var(--dot-bg) 1px)', backgroundSize: '20px 20px'} as React.CSSProperties}>
                            {apiError && (
                                <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-20 p-4">
                                    <div className="bg-red-900/50 border border-red-700 p-6 rounded-lg max-w-md text-center shadow-2xl">
                                        <h3 className="text-xl font-bold text-red-300 mb-3">Generation Failed</h3>
                                        <p className="text-red-200 mb-4">{apiError}</p>
                                        <button onClick={() => setApiError(null)} className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors">
                                            Close
                                        </button>
                                    </div>
                                </div>
                            )}
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full text-gray-400"><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Building your funnel...</div>
                            ) : isPreviewing ? (
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
                {isDeploying && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-900 border border-violet-500/50 rounded-lg shadow-2xl w-full max-w-md">
                            <div className="p-4 border-b border-gray-700">
                                <h3 className="text-lg font-bold text-violet-400">Deploying Funnel...</h3>
                            </div>
                            <div className="p-4 h-64 overflow-y-auto font-mono text-sm text-gray-300">
                                {deploymentLog.map((line, index) => (
                                    <p key={index} className="whitespace-pre-wrap">{`> ${line}`}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
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
            </div>
        </React.Fragment>
    );
};

export default AIFunnelBuilderPage;

