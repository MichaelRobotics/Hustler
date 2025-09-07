'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Text } from 'frosted-ui';

interface PerformanceMetrics {
  renderTime: number;
  scrollTime: number;
  pathFindingTime: number;
  fps: number;
  memoryUsage?: number;
}

interface PerformanceMonitorProps {
  metrics: PerformanceMetrics;
  enabled?: boolean;
  showDetails?: boolean;
}

/**
 * Performance Monitor Component
 * 
 * Monitors and displays real-time performance metrics for the chat component
 * Helps identify performance bottlenecks during development
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  metrics,
  enabled = process.env.NODE_ENV === 'development',
  showDetails = false
}) => {
  const [fps, setFps] = useState(60);
  const [isVisible, setIsVisible] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  // FPS monitoring
  useEffect(() => {
    if (!enabled) return;

    const measureFPS = () => {
      frameCountRef.current++;
      const currentTime = performance.now();
      
      if (currentTime - lastTimeRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (currentTime - lastTimeRef.current)));
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }
      
      animationFrameRef.current = requestAnimationFrame(measureFPS);
    };

    animationFrameRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled]);

  // Memory usage monitoring (if available)
  const getMemoryUsage = () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  };

  const memoryUsage = getMemoryUsage();

  // Performance status
  const getPerformanceStatus = () => {
    if (fps < 30) return { status: 'critical', color: 'text-red-500' };
    if (fps < 45) return { status: 'warning', color: 'text-yellow-500' };
    if (metrics.renderTime > 16) return { status: 'warning', color: 'text-yellow-500' };
    if (metrics.scrollTime > 16) return { status: 'warning', color: 'text-yellow-500' };
    return { status: 'good', color: 'text-green-500' };
  };

  const performanceStatus = getPerformanceStatus();

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`
          mb-2 p-2 rounded-full shadow-lg transition-all duration-200
          ${performanceStatus.color} bg-white dark:bg-gray-800
          hover:scale-105 active:scale-95
        `}
        title="Performance Monitor"
      >
        <div className="w-4 h-4 flex items-center justify-center">
          <div className={`w-2 h-2 rounded-full ${performanceStatus.color.replace('text-', 'bg-')}`} />
        </div>
      </button>

      {/* Performance Panel */}
      {isVisible && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 min-w-[200px]">
          <div className="flex items-center justify-between mb-3">
            <Text size="2" weight="bold" className="text-gray-900 dark:text-white">
              Performance
            </Text>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          {/* FPS */}
          <div className="flex items-center justify-between mb-2">
            <Text size="1" className="text-gray-600 dark:text-gray-400">FPS</Text>
            <Text size="1" weight="medium" className={performanceStatus.color}>
              {fps}
            </Text>
          </div>

          {/* Render Time */}
          <div className="flex items-center justify-between mb-2">
            <Text size="1" className="text-gray-600 dark:text-gray-400">Render</Text>
            <Text size="1" weight="medium" className={metrics.renderTime > 16 ? 'text-yellow-500' : 'text-green-500'}>
              {metrics.renderTime.toFixed(1)}ms
            </Text>
          </div>

          {/* Scroll Time */}
          <div className="flex items-center justify-between mb-2">
            <Text size="1" className="text-gray-600 dark:text-gray-400">Scroll</Text>
            <Text size="1" weight="medium" className={metrics.scrollTime > 16 ? 'text-yellow-500' : 'text-green-500'}>
              {metrics.scrollTime.toFixed(1)}ms
            </Text>
          </div>

          {/* Path Finding Time */}
          <div className="flex items-center justify-between mb-2">
            <Text size="1" className="text-gray-600 dark:text-gray-400">Path Find</Text>
            <Text size="1" weight="medium" className={metrics.pathFindingTime > 16 ? 'text-yellow-500' : 'text-green-500'}>
              {metrics.pathFindingTime.toFixed(1)}ms
            </Text>
          </div>

          {/* Memory Usage (if available) */}
          {memoryUsage && showDetails && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <Text size="1" className="text-gray-600 dark:text-gray-400 mb-1">Memory</Text>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Text size="1" className="text-gray-500">Used</Text>
                  <Text size="1">{memoryUsage.used}MB</Text>
                </div>
                <div className="flex justify-between">
                  <Text size="1" className="text-gray-500">Total</Text>
                  <Text size="1">{memoryUsage.total}MB</Text>
                </div>
                <div className="flex justify-between">
                  <Text size="1" className="text-gray-500">Limit</Text>
                  <Text size="1">{memoryUsage.limit}MB</Text>
                </div>
              </div>
            </div>
          )}

          {/* Performance Status */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
            <div className="flex items-center justify-between">
              <Text size="1" className="text-gray-600 dark:text-gray-400">Status</Text>
              <Text size="1" weight="medium" className={performanceStatus.color}>
                {performanceStatus.status.toUpperCase()}
              </Text>
            </div>
          </div>

          {/* Performance Tips */}
          {performanceStatus.status !== 'good' && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <Text size="1" className="text-gray-600 dark:text-gray-400 mb-1">Tips</Text>
              <div className="space-y-1">
                {fps < 30 && (
                  <Text size="1" className="text-red-500">• Reduce animations</Text>
                )}
                {metrics.renderTime > 16 && (
                  <Text size="1" className="text-yellow-500">• Optimize re-renders</Text>
                )}
                {metrics.scrollTime > 16 && (
                  <Text size="1" className="text-yellow-500">• Use intersection observer</Text>
                )}
                {metrics.pathFindingTime > 16 && (
                  <Text size="1" className="text-yellow-500">• Cache path calculations</Text>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
