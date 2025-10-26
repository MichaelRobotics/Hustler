import React from 'react';
import { DollarSign, Gift } from 'lucide-react';
import { ResourceCard } from './ResourceCard';

interface ResourceGridProps {
  resources: any[];
  funnel?: any;
  context: "global" | "funnel";
  allResources: any[];
  isResourceInFunnel: (resourceId: string) => boolean;
  isResourceAssignedToAnyFunnel: (resourceId: string) => boolean;
  onAddToFunnel: (resource: any) => void;
  onRemoveFromFunnel: (resource: any) => void;
  onEdit: (resource: any) => void;
  onDelete: (resourceId: string, resourceName: string) => void;
  onUpdate: (resourceId: string, updatedResource: any) => Promise<any>;
  removingResourceId?: string;
  onEditingChange: (isEditing: boolean) => void;
  hideAssignmentOptions?: boolean;
  newlyCreatedResourceId?: string | null;
  newlyEditedResourceId?: string | null;
  highlightedCards: string[];
  editingResourceId?: string | null;
}

export const ResourceGrid: React.FC<ResourceGridProps> = ({
  resources,
  funnel,
  context,
  allResources,
  isResourceInFunnel,
  isResourceAssignedToAnyFunnel,
  onAddToFunnel,
  onRemoveFromFunnel,
  onEdit,
  onDelete,
  onUpdate,
  removingResourceId,
  onEditingChange,
  hideAssignmentOptions,
  newlyCreatedResourceId,
  newlyEditedResourceId,
  highlightedCards,
  editingResourceId,
}) => {
  const paidResources = resources.filter(resource => resource.category === "PAID");
  const giftResources = resources.filter(resource => resource.category === "FREE_VALUE");

  const renderResourceSection = (
    resources: any[],
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
              className={newlyCreatedResourceId === resource.id ? "animate-pulse" : ""}
            >
              <ResourceCard
                resource={resource}
                funnel={funnel}
                context={context}
                allResources={allResources}
                isResourceInFunnel={isResourceInFunnel}
                isResourceAssignedToAnyFunnel={isResourceAssignedToAnyFunnel}
                onAddToFunnel={onAddToFunnel}
                onRemoveFromFunnel={onRemoveFromFunnel}
                onEdit={onEdit}
                onDelete={onDelete}
                onUpdate={onUpdate}
                isRemoving={removingResourceId === resource.id}
                onEditingChange={onEditingChange}
                hideAssignmentOptions={hideAssignmentOptions}
                isJustCreated={newlyCreatedResourceId === resource.id}
                isJustEdited={newlyEditedResourceId === resource.id}
                isHighlighted={highlightedCards.includes(resource.id)}
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

      {/* Gift Resources Section */}
      {renderResourceSection(
        giftResources,
        "Gift Digital Assets",
        <Gift className="w-5 h-5" strokeWidth={2.5} />,
        "text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-700/50"
      )}
    </div>
  );
};
