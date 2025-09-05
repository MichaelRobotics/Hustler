'use client';

import { useEffect, useState } from 'react';
import { useIframeSdk } from "@whop/react";

interface WhopAuthState {
  userToken: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to get WHOP user authentication token
 * Uses official WHOP iframe SDK for production, test token for development
 */
export function useWhopAuth(): WhopAuthState {
  const iframeSdk = useIframeSdk();
  const [state, setState] = useState<WhopAuthState>({
    userToken: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const getAuthToken = async () => {
      try {
        // Check if we're in development mode or localhost
        const isDevelopment = process.env.NODE_ENV === 'development' || 
            (typeof window !== 'undefined' && window.location.hostname === 'localhost');
        
        console.log('useWhopAuth: Environment check', {
          NODE_ENV: process.env.NODE_ENV,
          hostname: typeof window !== 'undefined' ? window.location.hostname : 'undefined',
          isDevelopment
        });
        
        if (isDevelopment) {
          // In development, use test token
          console.log('useWhopAuth: Using test token for development');
          setState({
            userToken: 'test-token',
            isLoading: false,
            error: null
          });
          return;
        }

        // In production, try to get token from iframe context
        console.log('useWhopAuth: Checking iframe SDK', { iframeSdk: !!iframeSdk });
        
        if (iframeSdk) {
          // Try to get token from iframe SDK or window context
          try {
            // Check if iframeSdk has getUserToken method (using any type to avoid TypeScript errors)
            if (typeof (iframeSdk as any).getUserToken === 'function') {
              const token = await (iframeSdk as any).getUserToken();
              setState({
                userToken: token,
                isLoading: false,
                error: null
              });
              return;
            }
            
            // Try to get token from window context (WHOP might expose it)
            if (typeof window !== 'undefined') {
              const whopToken = (window as any).whopUserToken || 
                               (window as any).whop?.userToken ||
                               (window as any).parent?.whopUserToken;
              
              if (whopToken) {
                setState({
                  userToken: whopToken,
                  isLoading: false,
                  error: null
                });
                return;
              }
            }
            
            // Fallback: iframe context without explicit token
            setState({
              userToken: 'iframe-context', // Special marker for iframe context
              isLoading: false,
              error: null
            });
            return;
          } catch (error) {
            console.error('Error getting token from iframe SDK:', error);
            setState({
              userToken: 'iframe-context',
              isLoading: false,
              error: null
            });
            return;
          }
        }

        // Fallback: try legacy methods if iframe SDK is not available
        if (typeof window !== 'undefined') {
          // Check for WHOP iframe SDK in window object (legacy support)
          const whopSdk = (window as any).whopIframeSdk || 
                         (window as any).whop?.iframeSdk ||
                         (window as any).parent?.whopIframeSdk;

          if (whopSdk && typeof whopSdk.getUserToken === 'function') {
            try {
              const token = await whopSdk.getUserToken();
              setState({
                userToken: token,
                isLoading: false,
                error: null
              });
              return;
            } catch (error) {
              console.error('Failed to get user token from legacy WHOP SDK:', error);
            }
          }

          // Alternative: Check if we're in a WHOP iframe and token is available in window
          if ((window as any).whopUserToken) {
            setState({
              userToken: (window as any).whopUserToken,
              isLoading: false,
              error: null
            });
            return;
          }

          // Fallback: try to get token from URL parameters
          const urlParams = new URLSearchParams(window.location.search);
          const tokenFromUrl = urlParams.get('token') || urlParams.get('userToken');
          
          if (tokenFromUrl) {
            setState({
              userToken: tokenFromUrl,
              isLoading: false,
              error: null
            });
            return;
          }

          // Check for token in localStorage (for development/testing)
          const tokenFromStorage = localStorage.getItem('whop-user-token');
          if (tokenFromStorage) {
            setState({
              userToken: tokenFromStorage,
              isLoading: false,
              error: null
            });
            return;
          }
        }

        // No token found
        setState({
          userToken: null,
          isLoading: false,
          error: 'No WHOP user token found'
        });
      } catch (error) {
        setState({
          userToken: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to get authentication token'
        });
      }
    };

    getAuthToken();
  }, [iframeSdk]);

  return state;
}

/**
 * Hook to make authenticated API requests
 */
export function useAuthenticatedFetch() {
  const { userToken, isLoading, error } = useWhopAuth();

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    if (isLoading) {
      throw new Error('Authentication still loading');
    }

    if (!userToken) {
      throw new Error('No authentication token available');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add existing headers from options
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      });
    }

    // Add x-whop-user-token header for all requests
    if (userToken && userToken !== 'iframe-context') {
      headers['x-whop-user-token'] = userToken;
    }
    
    // For iframe context, WHOP should automatically include the token in the request headers
    // If we don't have a token, we'll make the request anyway and let WHOP handle it

    return fetch(url, {
      ...options,
      headers
    });
  };

  return {
    authenticatedFetch,
    userToken,
    isLoading,
    error
  };
}
