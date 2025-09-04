'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Heading, Button } from 'frosted-ui';
import { ArrowLeft, Search, ArrowUpDown, X } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import { LiveChatFilters } from '../../types/liveChat';

interface LiveChatHeaderProps {
  onBack: () => void;
  filters: LiveChatFilters;
  searchQuery: string;
  onFiltersChange: (filters: LiveChatFilters) => void;
  onSearchChange: (query: string) => void;
}

const LiveChatHeader: React.FC<LiveChatHeaderProps> = ({
  onBack,
  filters,
  searchQuery,
  onFiltersChange,
  onSearchChange
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when mobile search opens
  useEffect(() => {
    if (isMobileSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isMobileSearchOpen]);

  // Handle mobile search input change
  const handleMobileSearchChange = (value: string) => {
    setMobileSearchQuery(value);
    onSearchChange(value);
  };

  // Handle mobile search close
  const handleMobileSearchClose = () => {
    setIsMobileSearchOpen(false);
    setMobileSearchQuery('');
    onSearchChange('');
  };

  // Handle mobile search open
  const handleMobileSearchOpen = () => {
    setIsMobileSearchOpen(true);
    setMobileSearchQuery(searchQuery);
  };
  return (
    <div className="sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-border/30 dark:border-border/20 shadow-lg">
      {/* Top Section: Back Button + Title + Search */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
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
          
          {/* Title - Hidden on mobile when search is open */}
          <div className={`transition-all duration-300 ${isMobileSearchOpen ? 'sm:block hidden' : 'block'}`}>
            <Heading size="6" weight="bold" className="text-black dark:text-white">
              Live Chat
            </Heading>
          </div>
        </div>

        {/* Search Field - Desktop Full, Mobile Icon Only */}
        <div className="hidden sm:block">
          <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2 bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 transition-all duration-200 w-64"
              />
            </div>
          </div>
        </div>
        
        {/* Mobile Search - Icon Button or Expanded Input */}
        <div className="sm:hidden">
          {!isMobileSearchOpen ? (
            /* Mobile Search Icon Button */
            <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-200">
              <Button
                size="3"
                variant="ghost"
                color="violet"
                onClick={handleMobileSearchOpen}
                className="px-4 py-3 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-all duration-200 group"
                title="Search conversations"
              >
                <Search size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-300" />
              </Button>
            </div>
          ) : (
            /* Mobile Search Input - Expanded */
            <div className="flex items-center gap-2 animate-in slide-in-from-right duration-300">
              <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search users..."
                    value={mobileSearchQuery}
                    onChange={(e) => handleMobileSearchChange(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 transition-all duration-200 w-48"
                  />
                </div>
              </div>
              <Button
                size="2"
                variant="ghost"
                color="gray"
                onClick={handleMobileSearchClose}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-colors duration-200"
                title="Close search"
              >
                <X size={16} strokeWidth={2.5} />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Subtle Separator Line */}
      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mb-4" />
      
      {/* Bottom Section: Filter Buttons, Sort Button, and Theme Toggle */}
      <div className="flex justify-between items-center gap-2 sm:gap-3">
        {/* Left Side: Toggle Filter Button */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <div className={`p-1 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-200 ${
            (filters.status || 'open') === 'open'
              ? 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-500 shadow-green-500/25 dark:shadow-green-500/30' 
              : 'bg-gray-50 dark:bg-gray-900/30 border-gray-400 dark:border-gray-500 shadow-gray-500/25 dark:shadow-gray-500/30'
          }`}>
            <Button
              size="3"
              variant="ghost"
              color={(filters.status || 'open') === 'open' ? 'green' : 'gray'}
              onClick={() => onFiltersChange({ ...filters, status: (filters.status || 'open') === 'open' ? 'closed' : 'open' })}
              className={`px-4 sm:px-6 py-3 transition-all duration-200 group ${
                (filters.status || 'open') === 'open'
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="font-semibold text-sm sm:text-base">
                {(filters.status || 'open') === 'open' ? 'Open' : 'Closed'}
              </span>
            </Button>
          </div>
        </div>
        
        {/* Center: Theme Toggle */}
        <div className="flex-shrink-0">
          <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
            <ThemeToggle />
          </div>
        </div>
        
        {/* Right Side: Sort Button */}
        <div className="flex-shrink-0">
          <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-200">
            <Button
              size="3"
              variant="ghost"
              color="violet"
              onClick={() => onFiltersChange({ ...filters, sortBy: (filters.sortBy || 'newest') === 'newest' ? 'oldest' : 'newest' })}
              className="px-4 sm:px-6 py-3 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-all duration-200 group"
              title={`Sort by ${(filters.sortBy || 'newest') === 'newest' ? 'Oldest' : 'Newest'}`}
            >
              <ArrowUpDown size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-300 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveChatHeader;