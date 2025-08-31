'use client';

import React from 'react';
import { Button, Text } from 'frosted-ui';
import { 
  Zap, 
  Library, 
  MessageCircle, 
  Crown
} from 'lucide-react';

interface AdminSidebarProps {
  currentView: 'dashboard' | 'analytics' | 'resources' | 'resourceLibrary' | 'funnelBuilder' | 'preview';
  onViewChange: (view: 'dashboard' | 'analytics' | 'resources' | 'resourceLibrary' | 'funnelBuilder' | 'preview') => void;
  className?: string;
}

/**
 * --- Admin Sidebar Component ---
 * This component provides navigation between different admin views:
 * - Automations (Default dashboard view)
 * - Library (Product library without funnel context)
 * - Live Chat (Pro version upgrade prompt)
 * 
 * Following Whop's design patterns for clean, organized navigation.
 */
const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentView,
  onViewChange,
  className = ''
}) => {
  const isDashboardView = currentView === 'dashboard';
  const isLibraryView = currentView === 'resourceLibrary';
  const isAnalyticsView = currentView === 'analytics';
  const isResourcesView = currentView === 'resources';
  const isFunnelBuilderView = currentView === 'funnelBuilder';

  const handleViewChange = (view: 'dashboard' | 'analytics' | 'resources' | 'resourceLibrary' | 'funnelBuilder' | 'preview') => {
    onViewChange(view);
  };

    return (
    <>
      {/* Desktop Sidebar - Icons Only */}
      <div className={`hidden lg:block w-16 bg-surface/95 dark:bg-surface/90 border-r border-border/50 dark:border-border/30 backdrop-blur-sm transition-all duration-300 ${className}`}>
        {/* Desktop Navigation - Icons Only */}
        <div className="pt-12 px-4 space-y-20">
          {/* Automations - Default Dashboard */}
          <Button
            variant="ghost"
            color={isDashboardView ? "violet" : "gray"}
            onClick={() => handleViewChange('dashboard')}
            className={`w-full h-14 p-0 flex items-center justify-center transition-all duration-200 rounded-xl relative group ${
              isDashboardView 
                ? 'bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/30 dark:border-violet-500/40 text-violet-700 dark:text-violet-300' 
                : 'hover:bg-surface/80 dark:hover:bg-surface/60 text-foreground'
            }`}
            title="Automations - Manage funnels & analytics"
          >
            <div className="relative">
              <Zap size={24} strokeWidth={2} />
            </div>
            {isDashboardView && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full" />
            )}
            {/* Hover Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-surface/95 dark:bg-surface/90 border border-border/50 dark:border-border/30 rounded-lg text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Automations
            </div>
          </Button>

          {/* Library - Product Library */}
          <Button
            variant="ghost"
            color={isLibraryView ? "violet" : "gray"}
            onClick={() => handleViewChange('resourceLibrary')}
            className={`w-full h-14 p-0 flex items-center justify-center transition-all duration-200 rounded-xl relative group ${
              isLibraryView 
                ? 'bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/30 dark:border-violet-500/40 text-violet-700 dark:text-violet-300' 
                : 'hover:bg-surface/60 text-foreground'
            }`}
            title="Library - All available products"
          >
            <div className="relative">
              <Library size={24} strokeWidth={2} />
            </div>
            {isLibraryView && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full" />
            )}
            {/* Hover Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-surface/95 dark:bg-surface/90 border border-border/50 dark:border-border/30 rounded-lg text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Library
            </div>
          </Button>

          {/* Live Chat - Pro Version */}
          <Button
            variant="ghost"
            color="gray"
            onClick={() => {
              // Show pro version upgrade prompt
              alert('🚀 Upgrade to Pro Version to access Live Chat functionality!\n\nGet real-time conversation monitoring, customer support tools, and advanced analytics.');
            }}
            className="w-full h-14 p-0 flex items-center justify-center transition-all duration-200 rounded-xl hover:bg-surface/80 dark:hover:bg-surface/60 text-foreground group relative"
            title="Live Chat - Monitor conversations (Pro)"
          >
            <div className="relative">
              <MessageCircle size={24} strokeWidth={2} />
              <Crown size={14} className="absolute -top-1 -right-1 text-amber-500" />
            </div>
            {/* Hover Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-surface/95 dark:bg-surface/90 border border-border/50 dark:border-border/30 rounded-lg text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Live Chat
            </div>
          </Button>


        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 dark:bg-surface/90 border-t border-border/50 dark:border-border/30 backdrop-blur-sm shadow-2xl">
        <div className="flex items-center justify-around px-4 py-3">
          {/* Automations */}
          <Button
            variant="ghost"
            color={isDashboardView ? "violet" : "gray"}
            onClick={() => handleViewChange('dashboard')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ${
              isDashboardView 
                ? 'bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300' 
                : 'text-muted-foreground hover:text-foreground hover:bg-surface/80 dark:hover:bg-surface/60'
            }`}
          >
            <div className="relative mb-1">
              <Zap size={22} strokeWidth={2} />
            </div>
            <Text size="1" weight="semi-bold" className="text-xs">Automations</Text>
          </Button>

          {/* Library */}
          <Button
            variant="ghost"
            color={isLibraryView ? "violet" : "gray"}
            onClick={() => handleViewChange('resourceLibrary')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ${
              isLibraryView 
                ? 'bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300' 
                : 'text-muted-foreground hover:text-foreground hover:bg-surface/80 dark:hover:bg-surface/60'
            }`}
          >
            <div className="relative mb-1">
              <Library size={22} strokeWidth={2} />
            </div>
            <Text size="1" weight="semi-bold" className="text-xs">Library</Text>
          </Button>

          {/* Live Chat */}
          <Button
            variant="ghost"
            color="gray"
            onClick={() => {
              // Show pro version upgrade prompt
              alert('🚀 Upgrade to Pro Version to access Live Chat functionality!\n\nGet real-time conversation monitoring, customer support tools, and advanced analytics.');
            }}
            className="flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-surface/80 dark:hover:bg-surface/60"
          >
            <div className="relative mb-1">
              <MessageCircle size={22} strokeWidth={2} />
              <Crown size={12} className="absolute -top-1 -right-1 text-amber-500" />
            </div>
            <Text size="1" weight="semi-bold" className="text-xs">Chat</Text>
          </Button>


        </div>
      </div>
    </>
  );
};

export default AdminSidebar;
