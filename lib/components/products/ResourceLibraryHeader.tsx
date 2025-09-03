import React from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Heading, Button } from 'frosted-ui';
import { ThemeToggle } from '../common/ThemeToggle';
import { ResourceLibraryProps } from '../../types/resource';

interface ResourceLibraryHeaderProps extends Pick<ResourceLibraryProps, 'context' | 'onBack'> {
  onAddProduct: () => void;
  filteredResourcesCount: number;
}

export const ResourceLibraryHeader: React.FC<ResourceLibraryHeaderProps> = ({
  context,
  onBack,
  onAddProduct,
  filteredResourcesCount
}) => {
  return (
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
              onClick={onAddProduct}
              className={`px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 ${
                filteredResourcesCount === 0 ? 'animate-pulse animate-bounce' : ''
              }`}
            >
              <Plus size={20} strokeWidth={2.5} className={`transition-transform duration-300 ${
                filteredResourcesCount === 0 ? 'animate-spin' : 'group-hover:rotate-12'
              }`} />
              Add Product
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
