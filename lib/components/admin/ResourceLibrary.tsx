'use client';

import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Sparkles, Target, BarChart3, Library, X, Check, PenLine } from 'lucide-react';
import { Heading, Text, Button } from 'frosted-ui';
import UnifiedNavigation from '../common/UnifiedNavigation';
import { ThemeToggle } from '../common/ThemeToggle';

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

// Extended interface for the form (can include optional id for editing)
interface ResourceFormData {
  id?: string;
  name: string;
  link: string;
  type: 'AFFILIATE' | 'MY_PRODUCTS' | 'CONTENT' | 'TOOL';
  category?: string;
  description?: string;
  promoCode?: string;
}

interface NewResource extends Omit<Resource, 'id'> {
  id?: string; // Optional for new resources
}

interface Funnel {
  id: string;
  name: string;
  isDeployed?: boolean;
  delay?: number;
  resources?: Resource[];
  flow?: any;
}

interface ResourceLibraryProps {
  funnel?: Funnel;
  allResources: Resource[];
  allFunnels?: Funnel[]; // New: to check if resource is assigned to any funnel
  setAllResources: (resources: Resource[]) => void;
  onBack?: () => void;
  onAddToFunnel?: (resource: Resource) => void;
  onEdit?: () => void; // Optional: for navigation to edit mode
  onGoToPreview?: (funnel: Funnel) => void; // New: for preview navigation
  onGlobalGeneration: () => Promise<void>;
  isGenerating: boolean;
  onGoToFunnelProducts: () => void;
  context: 'global' | 'funnel';
}

/**
 * --- Resource Library Component ---
 * This component provides a comprehensive interface for managing the user's resource library.
 * Users can view all available resources, add new ones by pasting name, link, and promo code,
 * and add resources to their current funnel.
 *
 * @param {ResourceLibraryProps} props - The props passed to the component.
 * @returns {JSX.Element} The rendered ResourceLibrary component.
 */
const ResourceLibrary: React.FC<ResourceLibraryProps> = ({
  funnel,
  allResources,
  allFunnels = [],
  setAllResources,
  onBack,
  onAddToFunnel,
  onEdit,
  onGoToPreview,
  onGlobalGeneration,
  isGenerating,
  onGoToFunnelProducts,
  context
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [newResource, setNewResource] = useState<Partial<ResourceFormData>>({
    name: '',
    link: '',
    type: 'AFFILIATE',
    category: '',
    description: '',
    promoCode: ''
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean; resourceId: string | null; resourceName: string }>({
    show: false,
    resourceId: null,
    resourceName: ''
  });

  const categories = ['all', 'Education', 'Content', 'Marketing', 'Tools'];

  // Check if a resource is assigned to any funnel
  const isResourceAssignedToAnyFunnel = (resourceId: string): boolean => {
    return allFunnels.some(funnel => 
      funnel.resources && funnel.resources.some(resource => resource.id === resourceId)
    );
  };

  const filteredResources = selectedCategory === 'all' 
    ? allResources 
    : allResources.filter(resource => resource.category === selectedCategory);

  const handleAddResource = () => {
    if (newResource.name && newResource.link) {
      // Check if we're editing an existing resource (has an ID) or adding a new one
      if (newResource.id) {
        // Editing existing resource
        const updatedResources = allResources.map(r => 
          r.id === newResource.id ? { ...r, ...newResource } : r
        );
        setAllResources(updatedResources);
      } else {
        // Adding new resource
        const resource: Resource = {
          id: Date.now().toString(),
          name: newResource.name,
          link: newResource.link,
          type: newResource.type as 'AFFILIATE' | 'MY_PRODUCTS' | 'CONTENT' | 'TOOL',
          category: newResource.category,
          description: newResource.description,
          promoCode: newResource.promoCode
        };
        
        const updatedResources = [...allResources, resource];
        setAllResources(updatedResources);
      }
      
      // Reset form (clear id to ensure next action is "add" not "edit")
      setNewResource({ name: '', link: '', type: 'AFFILIATE', category: '', description: '', promoCode: '' });
      setIsAddingResource(false);
    }
  };

  const handleDeleteResource = (resourceId: string, resourceName: string) => {
    setDeleteConfirmation({
      show: true,
      resourceId,
      resourceName
    });
  };

  const confirmDelete = () => {
    if (deleteConfirmation.resourceId) {
      const updatedResources = allResources.filter(r => r.id !== deleteConfirmation.resourceId);
      setAllResources(updatedResources);
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

  const isResourceInFunnel = (resourceId: string) => {
    return funnel?.resources?.some(r => r.id === resourceId) || false;
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
              {context === 'funnel' && onBack && (
                <Button
                  size="2"
                  variant="ghost"
                  color="gray"
                  onClick={onBack}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-colors duration-200 dark:hover:bg-surface/60"
                  aria-label="Back to assigned products"
                >
                  <ArrowLeft size={20} strokeWidth={2.5} />
                </Button>
              )}
              
              <div>
                <Heading size="6" weight="bold" className="text-black dark:text-white">
                  Library
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
              

              
              {/* Right Side: Add Product Button */}
              <div className="flex-shrink-0">
                {(context === 'funnel' || context === 'global') && (
                  <Button
                    size="3"
                    color="violet"
                    onClick={() => {
                      // Clear form to ensure we're adding, not editing
                      setNewResource({ name: '', link: '', type: 'AFFILIATE', category: '', description: '', promoCode: '' });
                      setIsAddingResource(true);
                    }}
                    className={`px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 ${
                      filteredResources.length === 0 ? 'animate-pulse animate-bounce' : ''
                    }`}
                  >
                    <Plus size={20} strokeWidth={2.5} className={`transition-transform duration-300 ${
                      filteredResources.length === 0 ? 'animate-spin' : 'group-hover:rotate-12'
                    }`} />
                    Add Product
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Resources Counter Section */}
          <div className="mt-8">
            {/* Content goes here - heading removed as requested */}
          </div>

          {/* Add Product Modal - Enhanced with Frosted UI best practices */}
          {isAddingResource && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 dark:from-gray-800 dark:to-gray-900 dark:border-gray-600 rounded-2xl shadow-2xl backdrop-blur-sm dark:shadow-black/60 max-w-lg w-full p-6 sm:p-8 animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <Heading size="4" weight="bold" className="text-foreground">
                    {context === 'global' && newResource.name ? 'Edit Product' : 'Add New Product'}
                  </Heading>
                  <Button
                    size="1"
                    variant="ghost"
                    color="gray"
                    onClick={() => setIsAddingResource(false)}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-all duration-200 hover:scale-105"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </Button>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <Text as="label" size="2" weight="medium" className="block mb-3 text-foreground">
                      Product Name
                    </Text>
                    <input
                      type="text"
                      value={newResource.name}
                      onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                      placeholder="Enter product name..."
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
                    />
                  </div>
                  
                  <div>
                    <Text as="label" size="2" weight="medium" className="block mb-3 text-foreground">
                      Link/URL
                    </Text>
                    <input
                      type="url"
                      value={newResource.link}
                      onChange={(e) => setNewResource({ ...newResource, link: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
                    />
                  </div>
                  
                  <div>
                    <Text as="label" size="2" weight="medium" className="block mb-3 text-foreground">
                      Promo Code (Optional)
                    </Text>
                    <input
                      type="text"
                      value={newResource.promoCode}
                      onChange={(e) => setNewResource({ ...newResource, promoCode: e.target.value })}
                      placeholder="Enter promo code..."
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
                    />
                  </div>
                  
                  <div>
                    <Text as="label" size="2" weight="medium" className="block mb-3 text-foreground">
                      Type
                    </Text>
                    <select
                      value={newResource.type}
                      onChange={(e) => setNewResource({ ...newResource, type: e.target.value as any })}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
                    >
                      <option value="AFFILIATE">Affiliate Product</option>
                      <option value="MY_PRODUCTS">My Product</option>
                      <option value="CONTENT">Content</option>
                      <option value="TOOL">Tool</option>
                    </select>
                  </div>
                  
                  <div>
                    <Text as="label" size="2" weight="medium" className="block mb-3 text-foreground">
                      Category
                    </Text>
                    <select
                      value={newResource.category}
                      onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
                    >
                      <option value="">Select category...</option>
                      <option value="Education">Education</option>
                      <option value="Content">Content</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Tools">Tools</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-3 pt-6">
                    <Button 
                      color="violet" 
                      onClick={handleAddResource}
                      disabled={!newResource.name || !newResource.link}
                      className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-xl shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all duration-300 dark:bg-violet-500 dark:hover:bg-violet-600 dark:shadow-violet-500/40 dark:hover:shadow-violet-500/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <Plus size={18} strokeWidth={2.5} className="mr-2" />
                      {context === 'global' && newResource.name ? 'Update Product' : 'Add Product'}
                    </Button>
                    <Button 
                      variant="soft" 
                      color="gray"
                      onClick={() => setIsAddingResource(false)}
                      className="px-6 py-3 hover:scale-105 transition-all duration-300"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmation.show && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={cancelDelete}>
              <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 dark:from-gray-800 dark:to-gray-900 dark:border-gray-600 rounded-2xl shadow-2xl backdrop-blur-sm dark:shadow-black/60 max-w-md w-full p-6 sm:p-8 animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <Heading size="4" weight="bold" className="text-red-600 dark:text-red-400">
                    Confirm Deletion
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
                    Are you sure you want to delete this product?
                  </Text>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 rounded-lg p-3">
                    <Text size="2" weight="semi-bold" className="text-red-700 dark:text-red-300">
                      "{deleteConfirmation.resourceName}"
                    </Text>
                  </div>
                  <Text size="2" color="gray" className="text-muted-foreground mt-2">
                    This action cannot be undone. The product will be permanently removed from your library.
                  </Text>
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    color="red" 
                    onClick={confirmDelete}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl shadow-xl shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 transition-all duration-300 dark:bg-red-500 dark:hover:bg-red-600 dark:shadow-red-500/40 dark:hover:shadow-red-500/60"
                  >
                    <Trash2 size={18} strokeWidth={2.5} className="mr-2" />
                    Delete Product
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

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map(resource => (
              <div key={resource.id} className="group bg-gradient-to-br from-gray-50/80 via-gray-100/60 to-violet-50/40 dark:from-gray-800/80 dark:via-gray-700/60 dark:to-indigo-900/30 p-4 rounded-xl border border-border/50 dark:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(resource.type)}
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
                      {getTypeLabel(resource.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {context === 'funnel' && (
                      isResourceInFunnel(resource.id) ? (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                          <Check size={12} strokeWidth={2.5} />
                          Assigned
                        </div>
                      ) : (
                        <Button
                          size="1"
                          color="violet"
                          onClick={() => onAddToFunnel?.(resource)}
                          className="px-2 py-1 text-xs"
                        >
                          <Plus size={12} strokeWidth={2.5} className="mr-1" />
                          Assign
                        </Button>
                      )
                    )}
                                          {context === 'global' && !isResourceAssignedToAnyFunnel(resource.id) && (
                        <Button
                          size="1"
                          color="violet"
                          onClick={() => {
                            // In global context, we can edit existing resources
                            setNewResource({
                              id: resource.id, // Include the ID for editing
                              name: resource.name,
                              link: resource.link,
                              type: resource.type,
                              category: resource.category,
                              description: resource.description,
                              promoCode: resource.promoCode
                            });
                            setIsAddingResource(true);
                          }}
                          className="px-2 py-1 text-xs"
                        >
                          <PenLine size={12} strokeWidth={2.5} className="mr-1" />
                          Edit
                        </Button>
                      )}
                    {/* Delete Button - Only show when resource is not assigned to any funnel */}
                    {!isResourceAssignedToAnyFunnel(resource.id) && (
                      <Button
                        size="1"
                        variant="ghost"
                        color="red"
                        onClick={() => handleDeleteResource(resource.id, resource.name)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors"
                        aria-label="Delete product"
                      >
                        <Trash2 size={14} strokeWidth={2.5} />
                      </Button>
                    )}
                  </div>
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
                      <span className="px-2 py-1 rounded text-xs font-mono bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                        {resource.promoCode}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State - Enhanced spacing and styling */}
          {filteredResources.length === 0 && (
            <div className="text-center py-16 px-8 bg-gradient-to-br from-gray-50/50 via-gray-100/30 to-violet-50/20 dark:from-gray-800/50 dark:via-gray-700/30 dark:to-indigo-900/20 rounded-2xl border border-border/30 dark:border-border/20 shadow-lg backdrop-blur-sm">
              <div className="mb-8">
                <div className="w-20 h-20 mx-auto mb-6 p-4 rounded-full bg-gradient-to-br from-violet-100/80 to-purple-100/60 dark:from-violet-900/40 dark:to-purple-900/30 border border-violet-200/50 dark:border-violet-700/30 flex items-center justify-center">
                  <Library className="w-10 h-10 text-violet-500 dark:text-violet-400" strokeWidth={2.5} />
                </div>
              </div>
              
              <div className="mb-8">
                <Heading size="5" weight="bold" className="mb-3 text-foreground">
                  {selectedCategory === 'all' ? 'No Products Yet' : `No ${selectedCategory} Products`}
                </Heading>
                <Text size="3" color="gray" className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {selectedCategory === 'all' 
                    ? 'Add your first product to start building your collection.'
                    : `No resources found in the ${selectedCategory.toLowerCase()} category.`
                  }
                </Text>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unified Navigation - Only show in funnel context, with preview functionality */}
      {context === 'funnel' && (
        <UnifiedNavigation
          onPreview={() => {
            // Handle preview navigation exactly like Assigned Products
            if (funnel && onGoToPreview) {
              onGoToPreview(funnel);
            }
          }}
          onFunnelProducts={onGoToFunnelProducts} // Go to specific funnel's Assigned Products page
          onEdit={() => {
            // Navigate to FunnelBuilder if funnel has valid flow
            if (funnel && onEdit) {
              onEdit();
            }
          }}
          onGeneration={onGlobalGeneration}
          isGenerated={!!funnel?.flow}
          isGenerating={isGenerating}
          showOnPage="resources"
        />
      )}

    </div>
  );
};

export default ResourceLibrary;

