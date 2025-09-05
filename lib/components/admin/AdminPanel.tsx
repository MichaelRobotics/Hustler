
'use client';

import React from 'react';
import FunnelsDashboard from './FunnelsDashboard';
import FunnelAnalyticsPage from './FunnelAnalyticsPage';
import ResourcePage from '../products/ResourcePage';
import ResourceLibrary from '../products/ResourceLibrary';
import AIFunnelBuilderPage from '../funnelBuilder/AIFunnelBuilderPage';
import { LiveChatPage } from '../liveChat';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AddFunnelModal from './modals/AddFunnelModal';
import DeleteFunnelModal from './modals/DeleteFunnelModal';
import EditFunnelModal from './modals/EditFunnelModal';
import DeploymentModal from './modals/DeploymentModal';

import { useFunnelManagement } from '@/lib/hooks/useFunnelManagement';
import { useResourceManagement } from '@/lib/hooks/useResourceManagement';
import { useViewNavigation } from '@/lib/hooks/useViewNavigation';
import { hasValidFlow } from '@/lib/helpers/funnel-validation';
import { generateMockData, generateSalesData } from '@/lib/utils/dataSimulation';
import { Resource } from '@/lib/types/resource';

interface Funnel {
  id: string;
  name: string;
  isDeployed?: boolean;
  wasEverDeployed?: boolean;
  resources?: any[];
  sends?: number;
  flow?: any;
  generationStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  generationError?: string;
  lastGeneratedAt?: number;
}


type View = 'dashboard' | 'analytics' | 'resources' | 'resourceLibrary' | 'funnelBuilder' | 'preview' | 'liveChat';

export default function AdminPanel() {
  // State for tracking typing in LiveChat
  const [isUserTyping, setIsUserTyping] = React.useState(false);


  // Use the extracted hooks
  const {
    funnels,
    selectedFunnel,
    isAddDialogOpen,
    isDeleteDialogOpen,
    newFunnelName,
    funnelToDelete,
    editingFunnelId,
    setFunnels,
    setSelectedFunnel,
    setIsAddDialogOpen,
    setIsDeleteDialogOpen,
    setNewFunnelName,
    setFunnelToDelete,
    setEditingFunnelId,
    handleAddFunnel,
    handleDeleteFunnel,
    handleConfirmDelete,
    handleEditFunnel,
    handleDeployFunnel,
    handleDuplicateFunnel,
    handleSaveFunnelName,
    onFunnelClick,
    handleManageResources,
    updateFunnelGenerationStatus,
    isFunnelGenerating,
    isAnyFunnelGenerating,
    updateFunnelForGeneration,
    handleGlobalGeneration,
    updateFunnel,
  } = useFunnelManagement();

  const {
    libraryContext,
    selectedFunnelForLibrary,
    allResources,
    setLibraryContext,
    setSelectedFunnelForLibrary,
    setAllResources,
    handleOpenResourceLibrary,
    handleAddToFunnel,
    handleBackToDashboard: resourceBackToDashboard,
  } = useResourceManagement();

  const {
    currentView,
    setCurrentView,
    handleViewChange: navigationHandleViewChange,
    onFunnelClick: navigationOnFunnelClick,
    handleManageResources: navigationHandleManageResources,
    handleBackToDashboard: navigationBackToDashboard,
  } = useViewNavigation();

  // Combined handlers that integrate the hooks
  const handleViewChange = (view: View) => {
    navigationHandleViewChange(view, selectedFunnel, currentView, setLibraryContext, setSelectedFunnelForLibrary);
  };

  const handleAddFunnelWithNavigation = () => {
    const newFunnel = handleAddFunnel();
    if (newFunnel) {
      setCurrentView('resources');
    }
  };

  const handleEditFunnelWithNavigation = (funnel: Funnel) => {
    const targetView = handleEditFunnel(funnel);
    if (targetView) {
      setCurrentView(targetView as View);
    }
  };

  const handleFunnelClickWithNavigation = (funnel: Funnel) => {
    const targetView = onFunnelClick(funnel);
    if (targetView) {
      setCurrentView(targetView as View);
    }
  };

  const handleManageResourcesWithNavigation = (funnel: Funnel) => {
    const targetView = handleManageResources(funnel);
    if (targetView) {
      setCurrentView(targetView as View);
    }
  };

  const handleOpenResourceLibraryWithNavigation = () => {
    const targetView = handleOpenResourceLibrary(selectedFunnel);
    if (targetView) {
      setCurrentView(targetView as View);
    }
  };

  const handleAddToFunnelWithState = (resource: Resource) => {
    handleAddToFunnel(resource, selectedFunnel!, funnels, setFunnels, setSelectedFunnel);
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedFunnel(null);
  };

  // Render different views based on current state
  if (currentView === 'analytics' && selectedFunnel) {
    // Debug logging
    console.log('Rendering analytics page with funnel:', {
      selectedFunnel,
      isDeployed: selectedFunnel.isDeployed,
      wasEverDeployed: selectedFunnel.wasEverDeployed,
      hasValidFlow: hasValidFlow(selectedFunnel)
    });
    
    // Validate that the funnel actually has valid flow before showing analytics
    // But allow analytics if we have mock data to show
    if (!hasValidFlow(selectedFunnel)) {
      console.log('No valid flow, but allowing analytics with mock data');
      // Don't redirect - let the analytics page handle it gracefully
    }
    
    return (
      <>
        <FunnelAnalyticsPage 
          funnel={selectedFunnel}
          allUsers={generateMockData(150).map(user => ({ ...user, funnelId: selectedFunnel.id }))}
          allSalesData={generateSalesData().map(sale => ({ ...sale, funnelId: selectedFunnel.id }))}
          onBack={handleBackToDashboard}
          onGoToBuilder={(funnel) => {
            if (funnel && hasValidFlow(funnel)) {
              setSelectedFunnel(funnel);
              setCurrentView('funnelBuilder');
            } else {
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
    const currentFunnel = funnels.find(f => f.id === selectedFunnel.id) || selectedFunnel;
    
    return (
      <ResourcePage 
        funnel={currentFunnel}
        onBack={() => {
          if (hasValidFlow(selectedFunnel)) {
            setCurrentView('analytics');
          } else {
            setCurrentView('dashboard');
          }
        }}
        onGoToBuilder={(updatedFunnel?: Funnel) => {
          const targetFunnel = updatedFunnel || selectedFunnel;
          if (targetFunnel && hasValidFlow(targetFunnel)) {
            setSelectedFunnel(targetFunnel);
            setCurrentView('funnelBuilder');
          } else {
            setCurrentView('resources');
          }
        }}
        onGoToPreview={(funnel) => {
          if (funnel && hasValidFlow(funnel)) {
            setSelectedFunnel(funnel);
            setCurrentView('preview');
          } else {
            alert('This funnel needs to be generated first. Please generate the funnel before previewing.');
          }
        }}
        onUpdateFunnel={(updatedFunnel) => {
          setFunnels(funnels.map(f => f.id === updatedFunnel.id ? updatedFunnel : f));
          if (selectedFunnel && selectedFunnel.id === updatedFunnel.id) {
            setSelectedFunnel(updatedFunnel);
          }
        }}
        onOpenResourceLibrary={handleOpenResourceLibraryWithNavigation}
        onGlobalGeneration={handleGlobalGeneration}
        isGenerating={isFunnelGenerating}
        isAnyFunnelGenerating={isAnyFunnelGenerating}
        onEdit={() => {}}
        onGoToFunnelProducts={() => {}}
      />
    );
  }

  if (currentView === 'resourceLibrary') {
    if (libraryContext === 'global') {
      return (
        <div className="flex h-screen">
          <AdminSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            className="flex-shrink-0 h-full"
            libraryContext={libraryContext}
            currentFunnelForLibrary={selectedFunnelForLibrary}
          />
          
          <div className="flex-1 overflow-auto w-full lg:w-auto">
            <ResourceLibrary
              funnel={undefined}
              allResources={allResources}
              allFunnels={funnels}
              setAllResources={setAllResources}
              onBack={undefined}
              onAddToFunnel={undefined}
              onEdit={undefined}
              onGlobalGeneration={() => handleGlobalGeneration('')}
              isGenerating={false}
              isAnyFunnelGenerating={isAnyFunnelGenerating}
              onGoToFunnelProducts={() => setCurrentView('resources')}
              context={libraryContext}
            />
          </div>
        </div>
      );
    } else {
      return (
        <ResourceLibrary
          funnel={selectedFunnel || undefined}
          allResources={allResources}
          allFunnels={funnels}
          setAllResources={setAllResources}
          onBack={() => setCurrentView('resources')}
          onAddToFunnel={handleAddToFunnelWithState}
          onEdit={() => {
            if (selectedFunnel && hasValidFlow(selectedFunnel)) {
              setCurrentView('funnelBuilder');
            } else {
              setCurrentView('resources');
            }
          }}
          onGoToPreview={(funnel) => {
            if (funnel && hasValidFlow(funnel)) {
              setSelectedFunnel(funnel);
              setCurrentView('preview');
            } else {
              alert('This funnel needs to be generated first. Please generate the funnel before previewing.');
            }
          }}
          onGlobalGeneration={() => handleGlobalGeneration(selectedFunnel?.id || '')}
          isGenerating={selectedFunnel ? isFunnelGenerating(selectedFunnel.id) : false}
          isAnyFunnelGenerating={isAnyFunnelGenerating}
          onGoToFunnelProducts={() => setCurrentView('resources')}
          context={libraryContext}
        />
      );
    }
  }

  if (currentView === 'funnelBuilder' && selectedFunnel) {
    return (
      <AIFunnelBuilderPage
        funnel={selectedFunnel}
        onBack={handleBackToDashboard}
        onUpdate={(updatedFunnel) => {
          // Debug logging
          console.log('AdminPanel onUpdate called:', {
            updatedFunnel,
            isDeployed: updatedFunnel.isDeployed,
            wasEverDeployed: updatedFunnel.wasEverDeployed,
            hasValidFlow: hasValidFlow(updatedFunnel)
          });
          
          // Update funnel state
          setSelectedFunnel(updatedFunnel);
          setFunnels(funnels.map(f => f.id === updatedFunnel.id ? updatedFunnel : f));
          
          if (updatedFunnel.isDeployed && hasValidFlow(updatedFunnel)) {
            console.log('Redirecting to analytics...');
            setTimeout(() => {
              setCurrentView('analytics');
            }, 100);
          }
        }}
        onGoToFunnelProducts={() => setCurrentView('resources')}
      />
    );
  }

  if (currentView === 'funnelBuilder' && !selectedFunnel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />
        
        <div className="flex h-screen">
          <AdminSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            className="flex-shrink-0 h-full"
            libraryContext={libraryContext}
            currentFunnelForLibrary={selectedFunnelForLibrary}
          />
          
          <div className="flex-1 overflow-auto w-full lg:w-auto">
            <div className="relative p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
              <div className="max-w-7xl mx-auto">
                <div className="text-center py-20">
                  <h1 className="text-2xl font-bold text-foreground mb-4">
                    No Funnel Selected
                  </h1>
                  <p className="text-muted-foreground mb-6">
                    Please select a funnel to edit or go back to the dashboard.
                  </p>
                  <button
                    onClick={handleBackToDashboard}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'preview' && selectedFunnel) {
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

  if (currentView === 'liveChat') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />
        
        <div className="flex h-screen">
          <AdminSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            className={`flex-shrink-0 h-full ${isUserTyping ? 'hidden' : 'block'}`}
            isUserTyping={isUserTyping}
          />
          
          <div className="flex-1 overflow-auto w-full lg:w-auto">
            <LiveChatPage
              onBack={handleBackToDashboard}
              onTypingChange={setIsUserTyping}
            />
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />
      
      <div className="flex h-screen">
        <AdminSidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          className="flex-shrink-0 h-full"
          libraryContext={libraryContext}
          currentFunnelForLibrary={selectedFunnelForLibrary}
          isUserTyping={isUserTyping}
        />
        
        <div className="flex-1 overflow-auto w-full lg:w-auto">
          <div className="relative p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
            <div className="max-w-7xl mx-auto">
              <AdminHeader onAddFunnel={() => setIsAddDialogOpen(true)} />

              <div className="mt-8">
                <FunnelsDashboard
                  funnels={funnels}
                  handleEditFunnel={handleEditFunnelWithNavigation}
                  handleDeployFunnel={handleDeployFunnel}
                  setFunnelToDelete={handleDeleteFunnel}
                  editingFunnelId={editingFunnelId}
                  setEditingFunnelId={setEditingFunnelId}
                  handleSaveFunnelName={handleSaveFunnelName}
                  onFunnelClick={handleFunnelClickWithNavigation}
                  handleDuplicateFunnel={handleDuplicateFunnel}
                  handleManageResources={handleManageResourcesWithNavigation}
                />
              </div>

              {/* Modals */}
              <AddFunnelModal
                isOpen={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                newFunnelName={newFunnelName}
                onNewFunnelNameChange={setNewFunnelName}
                onAddFunnel={handleAddFunnelWithNavigation}
              />

              <DeleteFunnelModal
                isOpen={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                funnelToDelete={funnelToDelete}
                onConfirmDelete={handleConfirmDelete}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
