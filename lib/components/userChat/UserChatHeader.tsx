'use client';

import React from 'react';
import { Button, Text } from 'frosted-ui';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '../common/ThemeProvider';

interface UserChatHeaderProps {
  onBack?: () => void;
}

export const UserChatHeader: React.FC<UserChatHeaderProps> = ({ 
  onBack
}) => {
  const { appearance, toggleTheme } = useTheme();

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm py-3 px-4 sm:px-6 lg:px-8 border-b border-border/30 dark:border-border/20 shadow-lg">
      {/* Top Layer - AI Bot Info and Theme Switch */}
      <div className="flex items-center justify-between mb-3">
        {/* Left: Hustler Title */}
        <div className="flex items-center min-w-0 flex-1">
          <h1 className="fui-Heading text-black dark:text-white fui-r-size-6 fui-r-weight-bold">Hustler</h1>
        </div>
        
        {/* Right: Theme Switch */}
        <div className="flex-shrink-0 ml-2">
          <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
            <Button
              variant="ghost"
              size="2"
              onClick={toggleTheme}
              className="transition-all duration-200 hover:scale-105 p-1"
              title={appearance === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {appearance === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Bottom Layer - Back Button */}
      <div className="flex items-center justify-end mb-3">
        {onBack && (
          <Button
            variant="ghost"
            size="2"
            onClick={onBack}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-colors duration-200 dark:hover:bg-surface/60"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </Button>
        )}
      </div>
      
      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mb-3"></div>
    </div>
  );
};
