'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface KeyboardContextType {
  isKeyboardOpen: boolean;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
  keyboardHeight: number;
}

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

export const useKeyboard = () => {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboard must be used within a KeyboardProvider');
  }
  return context;
};

interface KeyboardProviderProps {
  children: ReactNode;
}

export const KeyboardProvider: React.FC<KeyboardProviderProps> = ({ children }) => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Detect mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobile) return;

    // Use Visual Viewport API for accurate keyboard detection
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const viewport = window.visualViewport;
        const windowHeight = window.innerHeight;
        const viewportHeight = viewport.height;
        const heightDifference = windowHeight - viewportHeight;
        
        // Consider keyboard open if viewport height is significantly less than window height
        const keyboardOpen = heightDifference > 150; // Threshold for keyboard detection
        
        setIsKeyboardOpen(keyboardOpen);
        setKeyboardHeight(keyboardOpen ? heightDifference : 0);
      }
    };

    // Fallback for browsers without Visual Viewport API
    const handleResize = () => {
      if (!window.visualViewport) {
        const windowHeight = window.innerHeight;
        const screenHeight = window.screen.height;
        const heightDifference = screenHeight - windowHeight;
        
        // Consider keyboard open if window height is significantly less than screen height
        const keyboardOpen = heightDifference > 150;
        
        setIsKeyboardOpen(keyboardOpen);
        setKeyboardHeight(keyboardOpen ? heightDifference : 0);
      }
    };

    // Add event listeners
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    } else {
      window.addEventListener('resize', handleResize);
    }

    // Cleanup
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Auto-hide typing state when keyboard closes
  useEffect(() => {
    if (!isKeyboardOpen) {
      setIsTyping(false);
    }
  }, [isKeyboardOpen]);

  const value: KeyboardContextType = {
    isKeyboardOpen,
    isTyping,
    setIsTyping,
    keyboardHeight
  };

  return (
    <KeyboardContext.Provider value={value}>
      {children}
    </KeyboardContext.Provider>
  );
};
