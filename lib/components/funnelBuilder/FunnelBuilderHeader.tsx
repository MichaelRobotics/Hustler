'use client';

import React from 'react';
import { Heading, Button } from 'frosted-ui';
import { ArrowLeft, Play } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

interface FunnelBuilderHeaderProps {
  onBack: () => void;
  isDeployed: boolean;
  selectedOffer: string | null;
  hasFlow: boolean;
  hasApiError: boolean;
  onOpenOfferSelection: () => void;
  onOpenOfflineConfirmation: () => void;
  onDeploy: () => void;
}

export const FunnelBuilderHeader: React.FC<FunnelBuilderHeaderProps> = ({
  onBack,
  isDeployed,
  selectedOffer,
  hasFlow,
  hasApiError,
  onOpenOfferSelection,
  onOpenOfflineConfirmation,
  onDeploy
}) => {
  return (
    <div className="sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-border/30 dark:border-border/20 shadow-lg">
      {/* Top Section: Back Button + Title */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          size="2"
          variant="ghost"
          color="gray"
          onClick={onBack}
          className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-colors duration-200 dark:hover:bg-surface/60"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </Button>
        
        <div>
          <Heading size="6" weight="bold" className="text-black dark:text-white">
            Funnel Builder
          </Heading>
        </div>
      </div>
      
      {/* Subtle Separator Line */}
      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mb-4" />
      
      {/* Bottom Section: Action Buttons - Always Horizontal Layout */}
      <div className="flex justify-between items-center gap-2 sm:gap-3">
        {/* Left Side: Offers Button */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <Button
            size="3"
            variant="ghost"
            color="violet"
            onClick={onOpenOfferSelection}
            className={`px-4 sm:px-6 py-3 border transition-all duration-200 group ${
              selectedOffer 
                ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-400 dark:border-violet-500 text-violet-700 dark:text-violet-300' 
                : 'border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
            }`}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <span className="font-semibold text-sm sm:text-base">
              Offers
            </span>
          </Button>
        </div>
        
        {/* Center: Theme Toggle */}
        <div className="flex-shrink-0">
          <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
            <ThemeToggle />
          </div>
        </div>
        
        {/* Right Side: Go Live Button */}
        <div className="flex-shrink-0">
          {isDeployed ? (
            <Button
              size="3"
              color="red"
              onClick={onOpenOfflineConfirmation}
              className="px-4 sm:px-6 py-3 shadow-lg shadow-red-500/25 group bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 transition-all duration-200 cursor-pointer"
            >
              {/* Live Status Icon */}
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="red" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="red" />
                <circle cx="12" cy="12" r="3" fill="white" />
              </svg>
              {/* Live Text */}
              <span className="font-semibold text-sm sm:text-base text-red-600 dark:text-red-400">Live</span>
            </Button>
          ) : (
            <Button
              size="3"
              color="green"
              onClick={onDeploy} 
              disabled={!hasFlow || hasApiError} 
              className="px-4 sm:px-6 py-3 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 dark:shadow-green-500/30 dark:hover:shadow-green-500/50 group bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
              title={hasApiError ? "Cannot go live due to generation error" : !hasFlow ? "Generate funnel first" : ""}
            >
              <Play size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-300 sm:w-5 sm:h-5" />
              <span className="ml-2 font-semibold text-sm sm:text-base">Go Live</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

