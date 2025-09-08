import React from 'react';
import { Trash2, Sparkles, Target } from 'lucide-react';
import { Text, Button } from 'frosted-ui';
import { Resource, Funnel } from '../../types/resource';

// AssignedResourceCard component for displaying assigned products with removal functionality
interface AssignedResourceCardProps {
  resource: Resource;
  funnel: Funnel;
  onDelete: (resourceId: string, resourceName: string) => void;
  isGenerating?: boolean;
  isRemoving?: boolean;
}

export const AssignedResourceCard: React.FC<AssignedResourceCardProps> = ({
  resource,
  funnel,
  onDelete,
  isGenerating = false,
  isRemoving = false
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'AFFILIATE': return <Sparkles className="w-5 h-5 text-violet-400" strokeWidth={2.5} />;
      case 'MY_PRODUCTS': return <Target className="w-5 h-5 text-green-400" strokeWidth={2.5} />;
      default: return <Sparkles className="w-5 h-5" strokeWidth={2.5} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'AFFILIATE': return 'Affiliate';
      case 'MY_PRODUCTS': return 'My Product';
      default: return 'Product';
    }
  };

  return (
    <div className="group bg-gradient-to-br from-gray-50/80 via-gray-100/60 to-violet-50/40 dark:from-gray-800/80 dark:via-gray-700/60 dark:to-indigo-900/30 p-4 rounded-xl border border-border/50 dark:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getTypeIcon(resource.type)}
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
            {getTypeLabel(resource.type)}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            resource.category === 'PAID' 
              ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300' 
              : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
          }`}>
            {resource.category === 'PAID' ? 'Paid' : 'Free Value'}
          </span>
        </div>
        
        {/* Delete Button or Removing State - Only show when funnel is not live and not generating */}
        {!funnel.isDeployed && !isGenerating && (
          isRemoving ? (
            <span className="inline-flex items-center px-3 py-2 rounded-full text-xs font-medium bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/60 text-red-800 dark:text-red-200 border-2 border-red-300 dark:border-red-600 shadow-sm">
              <div className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full mr-2 animate-pulse" />
              <span className="hidden sm:inline font-semibold">Removing</span>
              <span className="sm:hidden">●</span>
            </span>
          ) : (
            <Button
              size="1"
              variant="ghost"
              color="red"
              onClick={() => onDelete(resource.id, resource.name)}
              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors"
              aria-label="Remove product"
            >
              <Trash2 size={14} strokeWidth={2.5} />
            </Button>
          )
        )}
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
  );
};
