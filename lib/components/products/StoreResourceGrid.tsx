import React from 'react';
import { DollarSign, Gift } from 'lucide-react';
import { StoreResourceCard } from './StoreResourceCard';
import { Resource } from '@/lib/types/resource';

interface StoreResourceGridProps {
  resources: Resource[];
  allResources: Resource[];
  onEdit: (resource: Resource) => void;
  onDelete: (resourceId: string, resourceName: string) => void;
  onUpdate: (resourceId: string, updatedResource: Partial<Resource>) => Promise<void>;
  removingResourceId?: string;
  highlightedCards: string[];
  // Store context props
  themeContext: {
    themeId: string;
    season: string;
    themeName: string;
  };
  onAddToTheme: (resource: Resource) => void;
  onRemoveFromTheme: (resource: Resource) => void;
  isResourceInTheme: (resourceId: string) => boolean;
  editingResourceId?: string | null;
}

export const StoreResourceGrid: React.FC<StoreResourceGridProps> = ({
  resources,
  allResources,
  onEdit,
  onDelete,
  onUpdate,
  removingResourceId,
  highlightedCards,
  themeContext,
  onAddToTheme,
  onRemoveFromTheme,
  isResourceInTheme,
  editingResourceId,
}) => {
  // Since StoreResourceLibrary only shows PAID products, we don't need to filter
  const paidResources = resources;

  const renderResourceSection = (
    resources: Resource[],
    title: string,
    icon: React.ReactNode,
    colorClasses: string
  ) => {
    if (resources.length === 0) return null;

    return (
      <div className="mb-8">
        {/* Section Header */}
        <div className="flex items-center gap-4 mb-6">
          <h3 className={`text-xl font-bold ${colorClasses} px-4 py-2 rounded-lg border shadow-sm flex items-center gap-2`}>
            {icon}
            {title}
          </h3>
          <div className={`flex-1 h-px bg-gradient-to-r ${colorClasses.includes('orange') ? 'from-orange-400/80 via-orange-500/60' : 'from-green-400/80 via-green-500/60'} to-transparent`}></div>
        </div>
        
        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <div 
              key={resource.id}
              data-resource-id={resource.id}
            >
              <StoreResourceCard
                resource={resource}
                onEdit={onEdit}
                onDelete={onDelete}
                onUpdate={onUpdate}
                isRemoving={removingResourceId === resource.id}
                isHighlighted={highlightedCards.includes(resource.id)}
                themeContext={themeContext}
                onAddToTheme={onAddToTheme}
                onRemoveFromTheme={onRemoveFromTheme}
                isResourceInTheme={isResourceInTheme}
                isBeingEdited={editingResourceId === resource.id}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div data-products-section>
      {/* Paid Resources Section */}
      {renderResourceSection(
        paidResources,
        "Paid Digital Assets",
        <DollarSign className="w-5 h-5" strokeWidth={2.5} />,
        "text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700/50"
      )}

      {/* Empty State */}
      {resources.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            <DollarSign size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Paid Products Available</h3>
            <p className="text-sm">Create your first paid product to get started with the store.</p>
          </div>
        </div>
      )}
    </div>
  );
};