import React, { useState } from 'react';
import { DollarSign, Gift } from 'lucide-react';
import { StoreResourceCard } from './StoreResourceCard';
import { Resource } from '@/lib/types/resource';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  onReorder?: (reorderedResources: Resource[]) => void; // Handler for reordering
}

// Sortable Resource Card Component
const SortableResourceCard: React.FC<{
  resource: Resource;
  onEdit: (resource: Resource) => void;
  onDelete: (resourceId: string, resourceName: string) => void;
  onUpdate: (resourceId: string, updatedResource: Partial<Resource>) => Promise<void>;
  isRemoving: boolean;
  isHighlighted: boolean;
  themeContext: StoreResourceGridProps['themeContext'];
  onAddToTheme: (resource: Resource) => void;
  onRemoveFromTheme: (resource: Resource) => void;
  isResourceInTheme: (resourceId: string) => boolean;
  isBeingEdited: boolean;
}> = ({
  resource,
  onEdit,
  onDelete,
  onUpdate,
  isRemoving,
  isHighlighted,
  themeContext,
  onAddToTheme,
  onRemoveFromTheme,
  isResourceInTheme,
  isBeingEdited,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: resource.id });

  const style = {
    // Don't apply transform at all - keep all cards in their original positions during drag
    // Only show visual indicators, don't move cards
    transform: undefined,
    transition: undefined,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={isDragging ? 'z-50' : isOver ? 'z-40' : ''}
    >
      <StoreResourceCard
        resource={resource}
        onEdit={onEdit}
        onDelete={onDelete}
        onUpdate={onUpdate}
        isRemoving={isRemoving}
        isHighlighted={isHighlighted}
        themeContext={themeContext}
        onAddToTheme={onAddToTheme}
        onRemoveFromTheme={onRemoveFromTheme}
        isResourceInTheme={isResourceInTheme}
        isBeingEdited={isBeingEdited}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
};

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
  onReorder,
}) => {
  // Since StoreResourceLibrary only shows PAID products, we don't need to filter
  const [localResources, setLocalResources] = useState<Resource[]>(resources);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Update local resources when props change
  React.useEffect(() => {
    setLocalResources(resources);
  }, [resources]);

  // Configure sensors for drag and drop
  // PointerSensor for desktop/mouse, TouchSensor for mobile/touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Desktop: Require 8px of movement before activating drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Mobile: Wait 200ms before activating drag to distinguish from tap
        tolerance: 5, // Allow 5px of movement during delay period
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag over - update visual feedback
  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  };

  // Handle drag end - only update DB when actually dropped and position changed
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset drag state
    setActiveId(null);
    setOverId(null);

    // Only proceed if dropped over a different item (position actually changed)
    if (over && active.id !== over.id) {
      setLocalResources((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Only call onReorder (which saves to DB) when position actually changed
        if (onReorder) {
          // Call asynchronously to not block UI update
          Promise.resolve().then(() => {
            onReorder(newOrder);
          });
        }
        
        return newOrder;
      });
    } else {
      // If dropped in same position or cancelled, revert to original order
      setLocalResources(resources);
    }
  };

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
        
        {/* Resources Grid with Drag and Drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={resources.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((resource) => {
                const isActive = activeId === resource.id;
                const isOverThis = overId === resource.id && activeId !== resource.id;
                
                return (
                  <div 
                    key={resource.id}
                    data-resource-id={resource.id}
                    className={`transition-all duration-200 ${
                      isOverThis 
                        ? 'ring-4 ring-blue-500/60 ring-offset-2 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border-2 border-dashed border-blue-500/40' 
                        : ''
                    } ${
                      isActive 
                        ? 'opacity-20' 
                        : ''
                    }`}
                  >
                    <SortableResourceCard
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
                );
              })}
            </div>
          </SortableContext>
          {/* Drag overlay - shows the item being dragged with enhanced visibility */}
          <DragOverlay>
            {activeId ? (
              <div 
                className="opacity-95 rotate-1 scale-105 shadow-2xl border-2 border-blue-500/50 rounded-lg"
                style={{
                  cursor: 'grabbing',
                }}
              >
                <StoreResourceCard
                  resource={resources.find(r => r.id === activeId)!}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  isRemoving={false}
                  isHighlighted={false}
                  themeContext={themeContext}
                  onAddToTheme={onAddToTheme}
                  onRemoveFromTheme={onRemoveFromTheme}
                  isResourceInTheme={isResourceInTheme}
                  isBeingEdited={false}
                  dragHandleProps={{}}
                  isDragging={true}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    );
  };

  return (
    <div data-products-section>
      {/* Paid Resources Section */}
      {renderResourceSection(
        localResources,
        "Paid Digital Assets",
        <DollarSign className="w-5 h-5" strokeWidth={2.5} />,
        "text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700/50"
      )}

      {/* Empty State */}
      {localResources.length === 0 && (
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