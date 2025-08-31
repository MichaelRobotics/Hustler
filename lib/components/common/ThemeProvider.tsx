'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme } from 'frosted-ui';

type ThemeContextType = {
  appearance: 'light' | 'dark';
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setAppearance(savedTheme);
    } else {
      // Check system preference if no saved theme
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setAppearance(systemPrefersDark ? 'dark' : 'light');
    }
  }, []);

  // Apply dark class to HTML element for Tailwind dark mode
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (appearance === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [appearance]);

  const toggleTheme = () => {
    const newTheme = appearance === 'dark' ? 'light' : 'dark';
    setAppearance(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ appearance, toggleTheme }}>
      <Theme
        appearance={appearance}
        // Neutral color - provides the base gray palette for the UI
        grayColor="gray"
        // Accent color - used for primary actions, links, and interactive elements
        accentColor="violet"
        // Semantic colors for different states and purposes
        infoColor="sky"
        successColor="green"
        warningColor="amber"
        dangerColor="red"
      >
        {children}
      </Theme>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
