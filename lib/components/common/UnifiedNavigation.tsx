'use client';

import React, { useState } from 'react';
import { Eye, Library, Zap, Plus, Edit3, RefreshCw } from 'lucide-react';

interface UnifiedNavigationProps {
  onPreview?: () => void;
  onFunnelProducts?: () => void;
  onGeneration?: () => void;
  onEdit?: () => void; // New: Go to FunnelBuilder
  isGenerated?: boolean;
  isGenerating?: boolean;
  className?: string;
  showOnPage?: 'resources' | 'aibuilder' | 'preview' | 'all' | 'analytics';
}

const UnifiedNavigation: React.FC<UnifiedNavigationProps> = ({
  onPreview,
  onFunnelProducts,
  onGeneration,
  onEdit,
  isGenerated = false,
  isGenerating = false,
  className = '',
  showOnPage = 'all'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Only show on specified pages (hide on analytics)
  if (showOnPage === 'analytics' || (showOnPage !== 'all' && showOnPage !== 'resources' && showOnPage !== 'aibuilder' && showOnPage !== 'preview')) {
    return null;
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <div className="flex flex-col items-center gap-3">
        {/* Preview Button - Show on resources and aibuilder pages, only if funnel is generated */}
        {isExpanded && onPreview && (showOnPage === 'resources' || showOnPage === 'aibuilder') && isGenerated && (
          <button
            data-accent-color="blue"
            aria-label="Preview view"
            className="fui-reset fui-BaseButton fui-Button w-12 h-12 rounded-full shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-110 transition-all duration-300 group fui-r-size-2 fui-variant-surface bg-blue-500 text-white"
            onClick={onPreview}
            title="Preview view"
          >
            <Eye size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-200" />
          </button>
        )}

        {/* Funnel Products Button - Show on aibuilder and preview pages */}
        {isExpanded && onFunnelProducts && (showOnPage === 'aibuilder' || showOnPage === 'preview') && (
          <button
            data-accent-color="violet"
            aria-label="Funnel Products"
            className="fui-reset fui-BaseButton fui-Button w-12 h-12 rounded-full shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-110 transition-all duration-300 group fui-r-size-2 fui-variant-surface bg-violet-500 text-white"
            onClick={onFunnelProducts}
            title="Funnel Products"
          >
            <Library size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-200" />
          </button>
        )}

        {/* Edit Button - Show on resources and preview pages, only if funnel is generated */}
        {isExpanded && onEdit && (showOnPage === 'resources' || showOnPage === 'preview') && isGenerated && (
          <button
            data-accent-color="orange"
            aria-label="Edit Funnel"
            className="fui-reset fui-BaseButton fui-Button w-12 h-12 rounded-full shadow-2xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-110 transition-all duration-300 group fui-r-size-2 fui-variant-surface bg-orange-500 text-white"
            onClick={onEdit}
            title="Edit Funnel"
          >
            <Edit3 size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-200" />
          </button>
        )}

        {/* Generation/Regeneration Button */}
        {isExpanded && onGeneration && (
          <button
            data-accent-color="green"
            aria-label={isGenerated ? "Regenerate funnel" : "Generate funnel"}
            className="fui-reset fui-BaseButton fui-Button w-12 h-12 rounded-full shadow-2xl shadow-green-500/25 hover:shadow-green-500/40 hover:scale-110 transition-all duration-300 group fui-r-size-2 fui-variant-surface bg-green-500 text-white"
            onClick={onGeneration}
            title={isGenerated ? "Regenerate funnel" : "Generate funnel"}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : isGenerated ? (
              <RefreshCw size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-200" />
            ) : (
              <Zap size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-200" />
            )}
          </button>
        )}

        {/* Main Toggle Button */}
        <button
          data-accent-color="violet"
          aria-label={isExpanded ? "Collapse navigation" : "Expand navigation"}
          className="fui-reset fui-BaseButton fui-Button w-14 h-14 rounded-full shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-110 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 dark:shadow-lg group fui-r-size-3 fui-variant-surface bg-violet-500 text-white"
          onClick={toggleExpanded}
          title={isExpanded ? "Collapse navigation" : "Expand navigation"}
        >
          <Plus 
            size={24} 
            strokeWidth={2.5} 
            className={`transition-transform duration-300 ${isExpanded ? 'rotate-45' : 'rotate-0'}`} 
          />
        </button>
      </div>
    </div>
  );
};

export default UnifiedNavigation;
