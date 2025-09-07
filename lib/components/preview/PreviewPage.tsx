'use client';

import React from 'react';
import { ArrowLeft, User } from 'lucide-react';
import { Text } from 'frosted-ui';
import UserChat from '../userChat/UserChat';
import { FunnelFlow } from '../../types/funnel';
import { useTheme } from '../common/ThemeProvider';

interface Funnel {
  id: string;
  name: string;
  flow?: FunnelFlow;
  isDeployed?: boolean;
  wasEverDeployed?: boolean;
  resources?: any[];
}

interface PreviewPageProps {
  funnel: Funnel;
  onBack: () => void;
  sourcePage?: 'resources' | 'funnelBuilder' | 'analytics' | 'resourceLibrary';
}

/**
 * Preview Page Component
 * 
 * Dedicated preview page that shows the funnel flow as a chat interface.
 * Provides a clean, focused experience for testing the generated funnel.
 */
const PreviewPage: React.FC<PreviewPageProps> = ({ 
  funnel, 
  onBack,
  sourcePage = 'resources'
}) => {
  const { appearance } = useTheme();

  // Get the funnel flow, fallback to empty flow if not available
  const funnelFlow = funnel.flow || {
    startBlockId: '',
    stages: [],
    blocks: {}
  };

  const handleMessageSent = (message: string, conversationId?: string) => {
    // Handle message sent - could be used for analytics or logging
    console.log('Preview message sent:', {
      message,
      conversationId,
      funnelId: funnel.id,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
      {/* Whop Design System Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />
      
      {/* Header */}
      <div className="relative flex-shrink-0 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm border-b border-border/30 dark:border-border/20 shadow-lg px-4 py-3 safe-area-top z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <button 
              onClick={onBack} 
              className="p-2 rounded-full touch-manipulation active:bg-gray-100 dark:active:bg-gray-700 transition-colors duration-200"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              title={`Back to ${sourcePage === 'funnelBuilder' ? 'Funnel Builder' : sourcePage === 'analytics' ? 'Analytics' : sourcePage === 'resourceLibrary' ? 'Resource Library' : 'Resources'}`}
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            
            <div>
              <Text size="3" weight="semi-bold" className="text-gray-900 dark:text-gray-100">
                {funnel.name}
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="relative flex-1 min-h-0 z-10">
        <UserChat
          funnelFlow={funnelFlow}
          onMessageSent={handleMessageSent}
          onBack={onBack}
          hideAvatar={true}
        />
      </div>
    </div>
  );
};

PreviewPage.displayName = 'PreviewPage';

export default PreviewPage;
