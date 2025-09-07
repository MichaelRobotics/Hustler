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
  sourcePage?: 'resources' | 'funnelBuilder' | 'analytics';
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
    stages: [],
    blocks: {},
    connections: []
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
    <div className="h-screen w-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <button 
              onClick={onBack} 
              className="p-2 rounded-full touch-manipulation active:bg-gray-100 dark:active:bg-gray-700 transition-colors duration-200"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              title={`Back to ${sourcePage === 'funnelBuilder' ? 'Funnel Builder' : sourcePage === 'analytics' ? 'Analytics' : 'Resources'}`}
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            
            {/* Avatar Icon */}
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            
            <div>
              <Text size="3" weight="semi-bold" className="text-gray-900 dark:text-gray-100">
                {funnel.name} - Preview
              </Text>
              <Text size="1" className="text-gray-500 dark:text-gray-400">
                Testing funnel flow
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 min-h-0">
        <UserChat
          funnelFlow={funnelFlow}
          onMessageSent={handleMessageSent}
          onBack={onBack}
        />
      </div>
    </div>
  );
};

PreviewPage.displayName = 'PreviewPage';

export default PreviewPage;
