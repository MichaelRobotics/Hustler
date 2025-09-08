'use client';

import React, { useEffect, useRef } from 'react';

interface AdminPerformanceMonitorProps {
  componentName: string;
  enabled?: boolean;
}

/**
 * Performance monitoring component for Admin components
 * Tracks render times, re-render frequency, and performance metrics
 */
export const AdminPerformanceMonitor: React.FC<AdminPerformanceMonitorProps> = ({ 
  componentName, 
  enabled = process.env.NODE_ENV === 'development' 
}) => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());
  const mountTimeRef = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    renderCountRef.current += 1;
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - lastRenderTimeRef.current;
    const timeSinceMount = currentTime - mountTimeRef.current;

    // Log performance metrics
    console.log(`[Admin Performance] ${componentName}:`, {
      renderCount: renderCountRef.current,
      timeSinceLastRender: `${timeSinceLastRender.toFixed(2)}ms`,
      timeSinceMount: `${timeSinceMount.toFixed(2)}ms`,
      averageRenderInterval: `${(timeSinceMount / renderCountRef.current).toFixed(2)}ms`
    });

    // Warn about excessive re-renders
    if (renderCountRef.current > 10 && timeSinceLastRender < 100) {
      console.warn(`[Admin Performance Warning] ${componentName} is re-rendering too frequently!`);
    }

    lastRenderTimeRef.current = currentTime;
  });

  // Monitor memory usage in development
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const checkMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.log(`[Admin Memory] ${componentName}:`, {
          usedJSHeapSize: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          totalJSHeapSize: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
        });
      }
    };

    const interval = setInterval(checkMemoryUsage, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [componentName, enabled]);

  return null; // This component doesn't render anything
};

/**
 * Hook for measuring Admin component performance
 */
export const useAdminPerformanceMonitor = (componentName: string, enabled = true) => {
  const startTimeRef = useRef<number>(0);
  const operationCountRef = useRef<number>(0);

  const startTiming = () => {
    if (enabled) {
      startTimeRef.current = performance.now();
    }
  };

  const endTiming = (operation: string) => {
    if (enabled && startTimeRef.current > 0) {
      const duration = performance.now() - startTimeRef.current;
      operationCountRef.current += 1;
      
      console.log(`[Admin Performance] ${componentName} - ${operation}:`, {
        duration: `${duration.toFixed(2)}ms`,
        operationCount: operationCountRef.current
      });

      // Warn about slow operations
      if (duration > 16) { // More than one frame at 60fps
        console.warn(`[Admin Performance Warning] ${componentName} - ${operation} took ${duration.toFixed(2)}ms`);
      }
    }
  };

  return { startTiming, endTiming };
};

export default AdminPerformanceMonitor;
