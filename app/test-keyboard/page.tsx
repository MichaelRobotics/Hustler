'use client';

import React, { useState, useEffect } from 'react';

export default function TestKeyboardPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile keyboard detection and handling
  useEffect(() => {
    if (!isMobile) return;

    const initialViewportHeight = window.innerHeight;

    const handleKeyboardChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      const keyboardThreshold = 150;
      const isKeyboardOpenNow = heightDifference > keyboardThreshold;
      
      setIsKeyboardOpen(isKeyboardOpenNow);
      setKeyboardHeight(isKeyboardOpenNow ? heightDifference : 0);
    };

    const handleInputFocus = () => {
      setIsInputFocused(true);
      setTimeout(handleKeyboardChange, 300);
    };

    const handleInputBlur = () => {
      setIsInputFocused(false);
      setTimeout(handleKeyboardChange, 300);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleKeyboardChange);
    } else {
      window.addEventListener('resize', handleKeyboardChange);
    }

    document.addEventListener('focusin', handleInputFocus);
    document.addEventListener('focusout', handleInputBlur);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleKeyboardChange);
      } else {
        window.removeEventListener('resize', handleKeyboardChange);
      }
      document.removeEventListener('focusin', handleInputFocus);
      document.removeEventListener('focusout', handleInputBlur);
    };
  }, [isMobile]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          🧪 Mobile Keyboard Animation Test
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Test Container */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
            style={{
              height: isMobile && isKeyboardOpen ? `calc(100vh - ${keyboardHeight}px)` : '500px',
              transition: 'height 0.3s ease-out'
            }}
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Test Container
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This container should adjust its height when the keyboard opens on mobile.
                </p>
              </div>
              
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Try focusing the input below to test keyboard animations.
                </p>
              </div>
              
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The container height should smoothly transition when keyboard opens/closes.
                </p>
              </div>
            </div>
          </div>
          
          {/* Status Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Status Panel
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobile:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isMobile ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isMobile ? 'YES' : 'NO'}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Keyboard:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isKeyboardOpen ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {isKeyboardOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Input Focus:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isInputFocused ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {isInputFocused ? 'YES' : 'NO'}
                </span>
              </div>
              
              {isKeyboardOpen && (
                <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Keyboard Height:</span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                    {keyboardHeight}px
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Test Input */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Test Input
          </h2>
          
          <div 
            className="relative"
            style={{
              position: isMobile && isKeyboardOpen ? 'fixed' : 'relative',
              bottom: isMobile && isKeyboardOpen ? '0px' : 'auto',
              left: isMobile && isKeyboardOpen ? '0px' : 'auto',
              right: isMobile && isKeyboardOpen ? '0px' : 'auto',
              zIndex: isMobile && isKeyboardOpen ? 50 : 'auto',
              backgroundColor: isMobile && isKeyboardOpen ? 'var(--surface)' : 'transparent',
              borderTop: isMobile && isKeyboardOpen ? '1px solid var(--border)' : 'none',
              transition: 'all 0.3s ease-out'
            }}
          >
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Type here to test keyboard animations..."
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
              />
              <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Send
              </button>
            </div>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            📱 Testing Instructions
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <li>• Resize your browser to mobile width (375px) or use mobile device</li>
            <li>• Tap the input field to open the keyboard</li>
            <li>• Watch the container height adjust smoothly</li>
            <li>• Check the status panel for real-time updates</li>
            <li>• The input should become fixed at bottom when keyboard opens</li>
            <li>• Tap outside or send message to close keyboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
