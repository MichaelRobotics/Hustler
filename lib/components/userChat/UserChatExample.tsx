'use client';

import React, { useState } from 'react';
import { FunnelFlow } from '../../types/funnel';
import { UserChatPage, UserChatContainer } from './index';
import { mockFunnelFlow, mockFunnelFlows } from './mockData';

/**
 * --- User Chat Example Component ---
 * This component demonstrates how to use the UserChat components
 * with realistic mock funnel data for testing and development.
 */

const UserChatExample: React.FC = () => {
  const [viewMode, setViewMode] = useState<'page' | 'container'>('page');
  const [selectedFunnel, setSelectedFunnel] = useState<keyof typeof mockFunnelFlows>('ecommerce');
  const [conversationId] = useState(`conv-${Date.now()}`);

  const handleMessageSent = (message: string, convId?: string) => {
    console.log('Message sent:', message, 'to conversation:', convId);
    // Here you would typically send to your analytics or backend
  };

  const currentFunnel = mockFunnelFlows[selectedFunnel];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              User Chat Example
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('page')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'page'
                    ? 'bg-violet-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Full Page
              </button>
              <button
                onClick={() => setViewMode('container')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'container'
                    ? 'bg-violet-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Container
              </button>
            </div>
          </div>
          
          {/* Funnel Selection */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Test Funnel:
            </span>
            <div className="flex gap-2">
              {Object.keys(mockFunnelFlows).map((funnelKey) => (
                <button
                  key={funnelKey}
                  onClick={() => setSelectedFunnel(funnelKey as keyof typeof mockFunnelFlows)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    selectedFunnel === funnelKey
                      ? 'bg-violet-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {funnelKey === 'ecommerce' ? 'E-commerce' : 
                   funnelKey === 'coaching' ? 'Coaching' : 
                   funnelKey === 'saas' ? 'SaaS' : funnelKey}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      {viewMode === 'page' ? (
        <UserChatPage
          funnelFlow={currentFunnel}
          conversationId={conversationId}
          onMessageSent={handleMessageSent}
        />
      ) : (
        <div className="max-w-4xl mx-auto p-4">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Embedded Chat Example - {selectedFunnel === 'ecommerce' ? 'E-commerce' : 
                                       selectedFunnel === 'coaching' ? 'Coaching' : 
                                       selectedFunnel === 'saas' ? 'SaaS' : selectedFunnel} Funnel
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              This shows how the chat can be embedded in other pages with custom sizing. Try different funnels above!
            </p>
          </div>
          <UserChatContainer
            funnelFlow={currentFunnel}
            conversationId={conversationId}
            onMessageSent={handleMessageSent}
            height="600px"
            className="shadow-lg"
          />
        </div>
      )}
    </div>
  );
};

export default UserChatExample;
