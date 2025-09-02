
'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Plus, X, Settings, Trash2, Save, Sparkles, ArrowLeft } from 'lucide-react';
import { Heading, Text, Button } from 'frosted-ui';
import FunnelsDashboard from './FunnelsDashboard';
import FunnelAnalyticsPage from './FunnelAnalyticsPage';
import ResourcePage from './ResourcePage';
import ResourceLibrary from './ResourceLibrary';
import AIFunnelBuilderPage from '../funnelBuilder/AIFunnelBuilderPage';

import AdminSidebar from './AdminSidebar';
import { ThemeToggle } from '../common/ThemeToggle';
import { hasValidFlow } from '@/lib/helpers/funnel-validation';

interface Funnel {
  id: string;
  name: string;
  isDeployed?: boolean;
  wasEverDeployed?: boolean; // Track if funnel was ever live
  delay?: number;
  resources?: any[];
  sends?: number;
  flow?: any;
  generationStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  generationError?: string;
  lastGeneratedAt?: number;
}

interface User {
  id: string;
  funnelId: string;
  isQualified: boolean;
  stepCompleted: number;
}

interface SalesData {
  funnelId: string;
  name: string;
  price: number;
  type: string;
}

interface Resource {
  id: string;
  name: string;
  link: string;
  type: 'AFFILIATE' | 'MY_PRODUCTS' | 'CONTENT' | 'TOOL';
  category?: string;
  description?: string;
  promoCode?: string;
}

// Unified interface for AI/API communication - consistent across all components
interface AIResource {
  id: string;
  name: string;
  link: string;
  type: 'AFFILIATE' | 'MY_PRODUCTS' | 'CONTENT' | 'TOOL';
  category: string;
  code: string; // promoCode converted to code for consistency
}

type View = 'dashboard' | 'analytics' | 'resources' | 'resourceLibrary' | 'funnelBuilder' | 'preview';

export default function AdminPanel() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'analytics' | 'resources' | 'resourceLibrary' | 'funnelBuilder' | 'preview'>('dashboard');
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [funnels, setFunnels] = useState<Funnel[]>([
         { 
       id: '1', 
       name: 'Sales Funnel', 
       isDeployed: false, 
       wasEverDeployed: false,
       sends: 0,
       generationStatus: 'idle' as const,
       resources: [
         { id: '1', type: 'AFFILIATE', name: 'Product A', link: 'https://example.com/a', promoCode: 'SAVE20', category: 'Free Value' },
         { id: '2', type: 'MY_PRODUCTS', name: 'Product B', link: 'https://example.com/b', promoCode: 'SAVE30', category: 'Free Value' }
       ],
       flow: null
     },
     { 
       id: '2', 
       name: 'Lead Generation', 
       isDeployed: false, 
       wasEverDeployed: false,
       sends: 0,
       generationStatus: 'idle' as const,
       resources: [
         { id: '3', type: 'CONTENT', name: 'Lead Magnet', link: 'https://example.com/b', promoCode: '', category: 'Free Value' }
       ],
       flow: null
     },
  ]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [funnelToDelete, setFunnelToDelete] = useState<Funnel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingFunnelName, setEditingFunnelName] = useState<{ id: string | null; name: string }>({ id: null, name: '' });
  const [libraryContext, setLibraryContext] = useState<'global' | 'funnel'>('global');
  const [currentFunnelForLibrary, setCurrentFunnelForLibrary] = useState<Funnel | null>(null);
  const [deploymentSuccess, setDeploymentSuccess] = useState<boolean>(false);

  // Handle URL query parameters for automatic view switching
  React.useEffect(() => {
    // Only process URL parameters if funnels array is populated
    if (funnels.length === 0) {
      return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const funnelParam = urlParams.get('funnel');
    
    if (viewParam === 'analytics' && funnelParam) {
      // Find the funnel by ID
      const targetFunnel = funnels.find(f => f.id === funnelParam);
      if (targetFunnel) {
        console.log('URL parameter navigation: Found funnel, navigating to analytics');
        setSelectedFunnel(targetFunnel);
        setCurrentView('analytics');
        // Clean up URL
        window.history.replaceState({}, '', '/admin');
      } else {
        console.warn('URL parameter navigation: Funnel not found, redirecting to dashboard');
        // If funnel not found, redirect to dashboard
        setCurrentView('dashboard');
        window.history.replaceState({}, '', '/admin');
      }
    }
  }, [funnels]);

  // Debug view changes and selectedFunnel state
    React.useEffect(() => {
    console.log('View changed to:', currentView);
    console.log('Selected funnel:', selectedFunnel);
    console.log('Selected funnel flow:', selectedFunnel?.flow);
    console.log('Has valid flow:', selectedFunnel ? hasValidFlow(selectedFunnel) : 'N/A');
    
    // Additional debugging for edge cases
    if (selectedFunnel && selectedFunnel.flow) {
      console.log('Flow validation details:', {
        hasFlow: !!selectedFunnel.flow,
        flowType: typeof selectedFunnel.flow,
        hasStages: Array.isArray(selectedFunnel.flow.stages),
        stagesLength: Array.isArray(selectedFunnel.flow.stages) ? selectedFunnel.flow.stages.length : 'N/A',
        hasBlocks: !!selectedFunnel.flow.blocks,
        blocksType: typeof selectedFunnel.flow.blocks,
        blocksCount: selectedFunnel.flow.blocks ? Object.keys(selectedFunnel.flow.blocks).length : 'N/A',
        hasStartBlockId: !!selectedFunnel.flow.startBlockId,
        startBlockIdType: typeof selectedFunnel.flow.startBlockId,
        startBlockIdLength: selectedFunnel.flow.startBlockId ? selectedFunnel.flow.startBlockId.length : 'N/A'
      });
    }
  }, [currentView, selectedFunnel]);

  // Auto-hide deployment success notification
  React.useEffect(() => {
    if (deploymentSuccess) {
      const timer = setTimeout(() => {
        setDeploymentSuccess(false);
      }, 5000); // Hide after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [deploymentSuccess]);

  const handleViewChange = (view: 'dashboard' | 'analytics' | 'resources' | 'resourceLibrary' | 'funnelBuilder' | 'preview') => {
    if (view === 'resourceLibrary') {
      // Check if we have a selected funnel and are in a funnel-related context
      if (selectedFunnel && (currentView === 'resources' || currentView === 'analytics' || currentView === 'funnelBuilder')) {
        // From funnel context
        setLibraryContext('funnel');
        setCurrentFunnelForLibrary(selectedFunnel);
        } else {
        // From sidebar or other non-funnel context
        setCurrentFunnelForLibrary(null);
        setLibraryContext('global');
      }
    }
    setCurrentView(view);
  };

  // Mock data for analytics
  const [allUsers, setAllUsers] = useState<User[]>([
    { id: '1', funnelId: '1', isQualified: true, stepCompleted: 6 },
    { id: '2', funnelId: '1', isQualified: false, stepCompleted: 2 },
    { id: '3', funnelId: '2', isQualified: true, stepCompleted: 4 },
  ]);

  const [allSalesData, setAllSalesData] = useState<SalesData[]>([
    { funnelId: '1', name: 'Product A', price: 50, type: 'AFFILIATE' },
    { funnelId: '1', name: 'Product B', price: 75, type: 'MY_PRODUCTS' },
    { funnelId: '2', name: 'Product C', price: 25, type: 'AFFILIATE' },
  ]);

  const [allResources, setAllResources] = useState<Resource[]>([]);

  const handleAddFunnel = () => {
    if (newFunnelName.trim()) {
      const newFunnel: Funnel = {
        id: Date.now().toString(),
        name: newFunnelName.trim(),
        isDeployed: false,
        wasEverDeployed: false,
        sends: 0,
        generationStatus: 'idle' as const,
        resources: [],
        flow: null
      };
      setFunnels([...funnels, newFunnel]);
      setNewFunnelName('');
      setIsAddDialogOpen(false);
      
      // Automatically select the new funnel and navigate to its Assigned Products page
      setSelectedFunnel(newFunnel);
      setCurrentView('resources');
    }
  };

  const handleDeleteFunnel = (funnelId: string | null) => {
    if (funnelId) {
      const funnel = funnels.find(f => f.id === funnelId);
      if (funnel) {
        setFunnelToDelete(funnel);
        setIsDeleteDialogOpen(true);
      }
    }
  };

  const handleConfirmDelete = () => {
    if (funnelToDelete) {
      setFunnels(funnels.filter(f => f.id !== funnelToDelete.id));
      setFunnelToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleEditFunnel = (funnel: Funnel) => {
    // Validate funnel has valid flow before going to builder
    if (hasValidFlow(funnel)) {
      setSelectedFunnel(funnel);
      setCurrentView('funnelBuilder');
    } else {
      console.warn('Cannot edit funnel without valid flow - staying on dashboard');
      // Don't switch view, just show error or stay on dashboard
      setSelectedFunnel(funnel);
    }
  };

  const handleDeployFunnel = (funnelId: string) => {
    setFunnels(funnels.map(f => 
      f.id === funnelId ? { 
        ...f, 
        isDeployed: !f.isDeployed,
        wasEverDeployed: f.wasEverDeployed || !f.isDeployed // Set to true if deploying
      } : f
    ));
  };

  const setFunnelSettingsToEdit = (funnel: Funnel | null) => {
    // Handle funnel settings - stay on dashboard
    console.log('Settings for funnel:', funnel);
    setSelectedFunnel(funnel);
    // Don't switch view - stay on dashboard
  };

  const handleDuplicateFunnel = (funnel: Funnel) => {
    const duplicatedFunnel = {
      ...funnel,
      id: Date.now().toString(),
      name: `${funnel.name} (Copy)`,
      isDeployed: false,
      wasEverDeployed: false, // Reset for new copy
      sends: 0,
      generationStatus: 'idle' as const,
      generationError: undefined,
      lastGeneratedAt: undefined
    };
    setFunnels([...funnels, duplicatedFunnel]);
    console.log('Duplicate funnel created:', duplicatedFunnel);
  };

    const handleSaveFunnelName = (funnelId: string) => {
    setFunnels(funnels.map(f => 
      f.id === funnelId ? { ...f, name: editingFunnelName.name } : f
    ));
        setEditingFunnelName({ id: null, name: '' });
    };

  const onFunnelClick = (funnel: Funnel) => {
          // Check if funnel is generated - if not, go to Assigned Products page
    if (!hasValidFlow(funnel)) {
      setSelectedFunnel(funnel);
      setCurrentView('resources');
    } else {
      // Navigate to funnel analytics if funnel is generated
      setSelectedFunnel(funnel);
      setCurrentView('analytics');
    }
  };

  const handleManageResources = (funnel: Funnel) => {
    setSelectedFunnel(funnel);
    setCurrentView('resources');
  };

  const handleOpenResourceLibrary = () => {
    setLibraryContext('funnel');
    setCurrentFunnelForLibrary(selectedFunnel);
    setCurrentView('resourceLibrary');
  };

  const handleAddToFunnel = (resource: Resource) => {
    if (selectedFunnel) {
      const updatedFunnel = {
        ...selectedFunnel,
        resources: [...(selectedFunnel.resources || []), resource]
      };
      setSelectedFunnel(updatedFunnel);
      // Assuming updateFunnel is a function that updates the state or sends an API call
      // For now, we'll just update the local state
      setFunnels(funnels.map(f => f.id === updatedFunnel.id ? updatedFunnel : f));
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedFunnel(null);
  };



  // NEW: Per-funnel generation state management
  const updateFunnelGenerationStatus = (funnelId: string, status: Funnel['generationStatus'], error?: string) => {
    // Use the generation-specific update function that NEVER changes selectedFunnel
    updateFunnelForGeneration(funnelId, {
      generationStatus: status, 
      generationError: error,
      lastGeneratedAt: status === 'completed' ? Date.now() : undefined
    });
  };

  // NEW: Check if a specific funnel is generating (no global state dependency)
  const isFunnelGenerating = (funnelId: string) => {
    const funnel = funnels.find(f => f.id === funnelId);
    return funnel?.generationStatus === 'generating';
  };

  // NEW: Check if any funnel is currently generating
  const isAnyFunnelGenerating = () => {
    return funnels.some(f => f.generationStatus === 'generating');
  };



  // NEW: Utility function to safely update funnel state
  const updateFunnelSafely = (funnelId: string, updates: Partial<Funnel>) => {
    setFunnels(prevFunnels => 
      prevFunnels.map(f => 
        f.id === funnelId ? { ...f, ...updates } : f
      )
    );
    
    // Only update selectedFunnel if it's the same funnel AND we're not in generation completion
    // This prevents automatic context switching when other funnels are generated
    if (selectedFunnel && selectedFunnel.id === funnelId && !updates.generationStatus) {
      setSelectedFunnel(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // NEW: Special function for generation updates that NEVER changes selectedFunnel
  const updateFunnelForGeneration = (funnelId: string, updates: Partial<Funnel>) => {
    setFunnels(prevFunnels => 
      prevFunnels.map(f => 
        f.id === funnelId ? { ...f, ...updates } : f
      )
    );
    
    // NEVER update selectedFunnel during generation - preserve user context
    // The UI will update through the funnels array, and selectedFunnel will
    // only be updated when the user is in the same funnel context
  };

  // NEW: Utility function to get funnel by ID safely
  const getFunnelById = (funnelId: string): Funnel | undefined => {
    return funnels.find(f => f.id === funnelId);
  };

  // NEW: Utility function to validate funnel state consistency
  const validateFunnelState = (funnelId: string): boolean => {
    const funnel = getFunnelById(funnelId);
    if (!funnel) return false;
    
    // Check for state inconsistencies
    if (funnel.generationStatus === 'generating' && !funnel.flow) {
      // If generating but no flow, this might be a corrupted state
      console.warn('Funnel state inconsistency detected:', funnelId);
      return false;
    }
    
    return true;
  };

  // NEW: Improved generation function with per-funnel state
  const handleGlobalGeneration = async (funnelId: string) => {
    // Validate funnel ID
    if (!funnelId || funnelId.trim() === '') {
      console.error('Invalid funnel ID provided');
      return;
    }

    // Find the target funnel by ID (don't rely on selectedFunnel)
    const targetFunnel = getFunnelById(funnelId);
    if (!targetFunnel) {
      console.error('Funnel not found:', funnelId);
      return;
    }

    // Validate funnel state consistency
    if (!validateFunnelState(funnelId)) {
      console.error('Funnel state validation failed:', funnelId);
      return;
    }

    // Check if this specific funnel is already generating
    if (targetFunnel.generationStatus === 'generating') {
      console.warn('Funnel is already generating:', funnelId);
      return;
    }

    // Check if any other funnel is generating (optional: can be removed for parallel generation)
    if (isAnyFunnelGenerating()) {
      alert('Another funnel is currently being generated. Please wait for it to complete.');
      return;
    }

    // Update this funnel's generation status
    updateFunnelGenerationStatus(funnelId, 'generating');
    
    try {
      // Get current funnel resources
      const currentFunnelResources = targetFunnel.resources || [];
      
      if (currentFunnelResources.length === 0) {
        alert('No resources assigned to this funnel. Please add resources first.');
        updateFunnelGenerationStatus(funnelId, 'failed', 'No resources assigned');
        return;
      }
      
      // Convert resources to the format expected by the AI API
      const resourcesForAI: AIResource[] = currentFunnelResources.map(resource => ({
        id: resource.id,
        type: resource.type,
        name: resource.name,
        link: resource.link,
        code: resource.promoCode || '',
        category: resource.category || 'Free Value'
      }));

      console.log('=== RESOURCES BEING SENT TO GEMINI ===');
      console.log('Funnel ID:', funnelId);
      console.log('Funnel Name:', targetFunnel.name);
      console.log('Resources count:', resourcesForAI.length);
      console.log('Resources:', JSON.stringify(resourcesForAI, null, 2));
      console.log('=== END RESOURCES FOR GEMINI ===');

      // Call the AI generation API
      const response = await fetch('/api/generate-funnel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resources: resourcesForAI }),
      });

      let result;
      try {
        result = await response.json();
        console.log('Raw API Response:', result);
      } catch (parseError) {
        console.error('Failed to parse API response:', parseError);
        throw new Error('Invalid response format from API');
      }

      if (!response.ok) {
        throw new Error(result.message || 'Failed to generate funnel');
      }

      // Update the funnel with the generated flow
      console.log('API Response:', result);
      console.log('Generated Flow:', result);
      
      // Check if the response has the expected structure
      const flowData = result.data || result;
      console.log('Flow Data to use:', flowData);
      console.log('Flow Data type:', typeof flowData);
      console.log('Flow Data keys:', Object.keys(flowData || {}));
      
      // Validate the flow data structure
      if (!flowData || typeof flowData !== 'object') {
        throw new Error('Invalid flow data structure received from API');
      }
      
      if (!flowData.stages || !flowData.blocks || !flowData.startBlockId) {
        console.warn('Flow data missing required properties:', flowData);
        throw new Error('Flow data missing required properties (stages, blocks, or startBlockId)');
      }
      
      // Update the specific funnel with the generated flow
      const updatedFunnel = { ...targetFunnel, flow: flowData };
      console.log('Updated Funnel:', updatedFunnel);
      
      // Use the generation-specific update function that NEVER changes selectedFunnel
      updateFunnelForGeneration(funnelId, updatedFunnel);
      
      // Mark generation as completed
      updateFunnelGenerationStatus(funnelId, 'completed');
      
      console.log('Generation completed for funnel:', funnelId);
      
    } catch (error) {
      console.error('Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate funnel: ${errorMessage}`);
      updateFunnelGenerationStatus(funnelId, 'failed', errorMessage);
    }
  };

  // Wrapper function for ResourcePage that matches expected signature
  const handleGlobalGenerationForResourcePage = async (funnelId: string) => {
    // Don't change selectedFunnel - preserve current context
    // User can manually navigate to view the generated funnel when ready
    await handleGlobalGeneration(funnelId);
  };



    // Render different views based on current state
  if (currentView === 'analytics' && selectedFunnel) {
    // Validate that the funnel actually has valid flow before showing analytics
    if (!hasValidFlow(selectedFunnel)) {
      console.warn('Analytics requested for funnel without valid flow, redirecting to resources');
      setCurrentView('resources');
      return null; // Don't render anything while redirecting
    }
    
    return (
      <>
        {/* Deployment Success Notification */}
        {deploymentSuccess && (
          <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-in slide-in-from-right-2 duration-300">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Funnel deployed successfully!</span>
            </div>
            <button 
              onClick={() => setDeploymentSuccess(false)}
              className="absolute top-1 right-1 text-white/80 hover:text-white"
            >
              ×
            </button>
          </div>
        )}
        
        <FunnelAnalyticsPage 
          funnel={selectedFunnel}
            allUsers={allUsers}
            allSalesData={allSalesData}
          onBack={handleBackToDashboard}
          onGoToBuilder={(funnel) => {
            // Direct navigation to funnel builder for editing
            if (funnel && hasValidFlow(funnel)) {
              setSelectedFunnel(funnel);
              setCurrentView('funnelBuilder');
            } else {
              console.warn('Cannot edit funnel without valid flow');
              alert('This funnel needs to be generated first. Please generate the funnel before editing.');
            }
          }}
          onGlobalGeneration={() => handleGlobalGeneration(selectedFunnel?.id || '')}
          isGenerating={selectedFunnel ? isFunnelGenerating(selectedFunnel.id) : false}
        />
      </>
    );
  }

  if (currentView === 'resources' && selectedFunnel) {
    // Get the current funnel data from the funnels array to ensure we have the latest state
    const currentFunnel = funnels.find(f => f.id === selectedFunnel.id) || selectedFunnel;
    
    return (
      <ResourcePage 
        funnel={currentFunnel}
        onBack={() => {
          // Smart back navigation: go to analytics only if funnel has valid flow
          if (hasValidFlow(selectedFunnel)) {
            setCurrentView('analytics');
          } else {
            // If funnel has no valid flow, go back to dashboard
            setCurrentView('dashboard');
          }
        }}
        onGoToBuilder={(updatedFunnel?: Funnel) => {
          const targetFunnel = updatedFunnel || selectedFunnel;
          if (targetFunnel && hasValidFlow(targetFunnel)) {
            // Direct navigation to funnel builder for editing
            setSelectedFunnel(targetFunnel);
            setCurrentView('funnelBuilder');
          } else {
            console.warn('Cannot go to builder: funnel has no valid flow');
            // Redirect to resources to generate funnel first
            setCurrentView('resources');
          }
        }}
        onGoToPreview={(funnel) => {
          // Handle preview navigation exactly like FunnelBuilder
          // Ensure funnel has valid flow before allowing preview
          if (funnel && hasValidFlow(funnel)) {
            setSelectedFunnel(funnel);
            setCurrentView('preview');
          } else {
            console.warn('Cannot preview funnel without valid flow');
            // Show user-friendly message and stay on current page
            alert('This funnel needs to be generated first. Please generate the funnel before previewing.');
          }
        }}
        onUpdateFunnel={(updatedFunnel) => {
          setFunnels(funnels.map(f => f.id === updatedFunnel.id ? updatedFunnel : f));
          // Also update selectedFunnel so ResourcePage re-renders with new data
          if (selectedFunnel && selectedFunnel.id === updatedFunnel.id) {
            setSelectedFunnel(updatedFunnel);
          }
        }}
        allResources={allResources}
        setAllResources={(resources) => setAllResources(resources)}
        onOpenResourceLibrary={handleOpenResourceLibrary}
        onGlobalGeneration={handleGlobalGenerationForResourcePage}
        isGenerating={isFunnelGenerating}
        onEdit={() => {}} // Not used in ResourcePage but required by interface
        onGoToFunnelProducts={() => {}} // Already on Assigned Products page
      />
    );
  }

  if (currentView === 'resourceLibrary') {
    // If it's global context, render with sidebar. If funnel context, render without sidebar
    if (libraryContext === 'global') {
      return (
        <div className="flex h-screen">
          {/* Admin Sidebar - Desktop Only */}
          <AdminSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            className="flex-shrink-0 h-full"
            libraryContext={libraryContext}
            currentFunnelForLibrary={currentFunnelForLibrary}
          />
          
          {/* Main Content Area */}
          <div className="flex-1 overflow-auto w-full lg:w-auto">
            <ResourceLibrary
              funnel={undefined}
              allResources={allResources}
              allFunnels={funnels}
              setAllResources={(resources) => setAllResources(resources)}
              onBack={undefined}
              onAddToFunnel={undefined}
              onEdit={undefined} // No edit in global library
              onGlobalGeneration={() => handleGlobalGeneration('')} // Global library doesn't show generation state
              isGenerating={false} // Global library doesn't show generation state
              onGoToFunnelProducts={() => setCurrentView('resources')}
              context={libraryContext}
            />
          </div>
        </div>
      );
    } else {
      // Funnel context - render without sidebar (as before)
      return (
        <ResourceLibrary
          funnel={selectedFunnel || undefined}
          allResources={allResources}
          allFunnels={funnels}
          setAllResources={(resources) => setAllResources(resources)}
          onBack={() => setCurrentView('resources')}
          onAddToFunnel={handleAddToFunnel}
          onEdit={() => {
            // Validate funnel has valid flow before going to builder
            if (selectedFunnel && hasValidFlow(selectedFunnel)) {
              setCurrentView('funnelBuilder');
            } else {
              console.warn('Cannot edit funnel without valid flow, redirecting to resources');
              setCurrentView('resources');
            }
          }}
          onGoToPreview={(funnel) => {
            // Handle preview navigation exactly like Assigned Products
            // Ensure funnel has valid flow before allowing preview
            if (funnel && hasValidFlow(funnel)) {
              setSelectedFunnel(funnel);
              setCurrentView('preview');
            } else {
              console.warn('Cannot preview funnel without valid flow');
              // Show user-friendly message and stay on current page
              alert('This funnel needs to be generated first. Please generate the funnel before previewing.');
            }
          }}
                      onGlobalGeneration={() => handleGlobalGeneration(selectedFunnel?.id || '')}
            isGenerating={selectedFunnel ? isFunnelGenerating(selectedFunnel.id) : false}
          onGoToFunnelProducts={() => setCurrentView('resources')}
          context={libraryContext}
        />
      );
    }
  }

  if (currentView === 'funnelBuilder' && selectedFunnel) {
    console.log('Rendering funnelBuilder view with selectedFunnel:', selectedFunnel);
    // Convert resources to match AIFunnelBuilderPage expected format
    const convertedResources = allResources.map(resource => ({
      id: resource.id,
      type: resource.type,
      name: resource.name,
      link: resource.link,
      code: resource.promoCode || '',
      category: resource.category || ''
    }));

    return (
      <AIFunnelBuilderPage
        funnel={selectedFunnel}
        onBack={handleBackToDashboard}
        onUpdate={(updatedFunnel) => {
          console.log('Funnel updated in builder:', updatedFunnel);
          console.log('Is deployed:', updatedFunnel.isDeployed);
          console.log('Has valid flow:', hasValidFlow(updatedFunnel));
          
          // Update funnel state
          setSelectedFunnel(updatedFunnel);
          setFunnels(funnels.map(f => f.id === updatedFunnel.id ? updatedFunnel : f));
          
          // Check if funnel was just deployed and navigate to analytics
          if (updatedFunnel.isDeployed && hasValidFlow(updatedFunnel)) {
            console.log('Funnel deployed successfully, navigating to analytics');
            // Set deployment success flag for notification
            setDeploymentSuccess(true);
            // Small delay to ensure state is updated
            setTimeout(() => {
              setCurrentView('analytics');
            }, 100);
          }
        }}
        onGoToFunnelProducts={() => setCurrentView('resources')}
      />
    );
  }

  // Handle case when funnelBuilder is requested but no funnel is selected
  if (currentView === 'funnelBuilder' && !selectedFunnel) {
    console.log('funnelBuilder requested but no selectedFunnel, falling back to dashboard');
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />
        
        <div className="flex h-screen">
          <AdminSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            className="flex-shrink-0 h-full"
            libraryContext={libraryContext}
            currentFunnelForLibrary={currentFunnelForLibrary}
          />
          
          <div className="flex-1 overflow-auto w-full lg:w-auto">
            <div className="relative p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
              <div className="max-w-7xl mx-auto">
                <div className="text-center py-20">
                  <Heading size="6" weight="bold" className="text-foreground mb-4">
                    No Funnel Selected
                  </Heading>
                  <Text size="3" className="text-muted-foreground mb-6">
                    Please select a funnel to edit or go back to the dashboard.
                  </Text>
                  <Button
                    variant="ghost"
                    color="gray"
                    onClick={handleBackToDashboard}
                    className="px-6 py-3"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Preview view is now handled by FunnelBuilder component
  // When switching to preview from other views, we go to FunnelBuilder in preview mode
  if (currentView === 'preview' && selectedFunnel) {
    // Redirect to FunnelBuilder in preview mode
    // This ensures we use the same preview component and layout
    return (
      <AIFunnelBuilderPage
        funnel={selectedFunnel}
        onBack={handleBackToDashboard}
        onUpdate={(updatedFunnel) => {
          // Update funnel state
          setSelectedFunnel(updatedFunnel);
          setFunnels(funnels.map(f => f.id === updatedFunnel.id ? updatedFunnel : f));
        }}
        onGoToFunnelProducts={() => setCurrentView('resources')}
        autoPreview={true} // Auto-switch to preview mode for fast navigation
      />
    );
  }

  // Main dashboard view
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
      {/* Enhanced Background Pattern for Dark Mode */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />
      
      <div className="flex h-screen">
        {/* Admin Sidebar - Desktop Only */}
                  <AdminSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            className="flex-shrink-0 h-full"
            libraryContext={libraryContext}
            currentFunnelForLibrary={currentFunnelForLibrary}
          />
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto w-full lg:w-auto">
          <div className="relative p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
            

            <div className="max-w-7xl mx-auto">
              {/* Enhanced Header with Whop Design Patterns - Always Visible */}
              <div className="sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-border/30 dark:border-border/20 shadow-lg">
                {/* Top Section: Title */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <Heading size="6" weight="bold" className="text-black dark:text-white">
                      My Funnels
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
                  
                  {/* Right Side: Add New Funnel Button */}
                  <div className="flex-shrink-0">
                    <Button
                      size="3"
                      color="violet"
                      onClick={() => setIsAddDialogOpen(true)}
                      className="px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group"
                    >
                      <Plus size={20} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform duration-300" />
                      <span className="ml-2">Add New Funnel</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Funnels Dashboard - Direct rendering without nesting */}
              <div className="mt-8">
                <FunnelsDashboard
                    funnels={funnels}
                    handleEditFunnel={handleEditFunnel}
                    handleDeployFunnel={handleDeployFunnel}
                setFunnelToDelete={handleDeleteFunnel}
                    setFunnelSettingsToEdit={setFunnelSettingsToEdit}
                    editingFunnelName={editingFunnelName}
                    setEditingFunnelName={setEditingFunnelName}
                    handleSaveFunnelName={handleSaveFunnelName}
                onFunnelClick={onFunnelClick}
                    handleDuplicateFunnel={handleDuplicateFunnel}
                    handleManageResources={handleManageResources}
                />
              </div>

              {/* Add New Funnel Dialog */}
              <Dialog.Root open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 z-50" />
                  <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-lg bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-2xl backdrop-blur-sm p-6 sm:p-8 animate-in zoom-in-95 duration-300 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 dark:border-gray-600 dark:shadow-2xl dark:shadow-black/60 z-50">
                    <div className="flex justify-between items-center mb-6">
                      <Dialog.Title asChild>
                        <Heading size="4" weight="bold" className="text-foreground">
                          Create New Funnel
                        </Heading>
                      </Dialog.Title>
                      <Dialog.Close asChild>
                        <Button 
                          size="1" 
                          variant="ghost" 
                          color="gray"
                          className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-all duration-200 hover:scale-105"
                        >
                          <X size={16} strokeWidth={2.5} />
                        </Button>
                      </Dialog.Close>
                    </div>
                    
                    <div className="space-y-5">
                      <div>
                        <Text as="label" size="2" weight="medium" className="block mb-3 text-foreground">
                          Funnel Name
                        </Text>
                                <input
                                    type="text"
                                    value={newFunnelName}
                                    onChange={(e) => setNewFunnelName(e.target.value)}
                          placeholder="Enter funnel name..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
                        />
                      </div>
                      
                      <div className="flex gap-3 pt-6">
                        <Button 
                          color="violet" 
                          onClick={handleAddFunnel}
                                        disabled={!newFunnelName.trim()}
                          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold !py-3 !px-6 rounded-xl shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all duration-300 dark:bg-violet-500 dark:hover:bg-violet-600 dark:shadow-violet-500/40 dark:hover:shadow-violet-500/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                          <Plus size={18} strokeWidth={2.5} className="mr-2" />
                          Create
                        </Button>
                        <Dialog.Close asChild>
                          <Button 
                            variant="soft" 
                            color="gray" 
                            className="!px-6 !py-3 hover:scale-105 transition-all duration-300"
                                    >
                                        Cancel
                          </Button>
                        </Dialog.Close>
                        </div>
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>

                                     </div>
                                 </div>
                             </div>

      </div>

      {/* Delete Confirmation Dialog - Simple Whop Design */}
      <AlertDialog.Root open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" strokeWidth={2} />
              </div>
              <AlertDialog.Title asChild>
                <Heading size="4" weight="semi-bold" className="text-gray-900 dark:text-white">
                  Delete Funnel
                </Heading>
              </AlertDialog.Title>
            </div>
            
            <AlertDialog.Description asChild>
              <Text color="gray" className="mb-6 text-gray-600 dark:text-gray-300">
                Are you sure you want to delete "{funnelToDelete?.name}"? This action cannot be undone.
              </Text>
            </AlertDialog.Description>
            
            <div className="flex gap-3">
              <AlertDialog.Cancel asChild>
                <Button 
                  variant="soft" 
                  color="gray"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button 
                  color="red" 
                  onClick={handleConfirmDelete}
                  className="flex-1"
                >
                  Delete
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
        </div>
    );
}
