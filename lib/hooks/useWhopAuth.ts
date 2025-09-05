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
        // Check if we're in development mode
        if (process.env.NODE_ENV === 'development') {
          // In development, use test token
          setState({
            userToken: 'test-token',
            isLoading: false,
            error: null
          });
          return;
        }

        // In production, WHOP iframe SDK doesn't provide getUserToken method
        // The token is automatically passed via x-whop-user-token header to the backend
        // For frontend, we need to rely on the backend authentication
        if (iframeSdk) {
          // Iframe SDK is available, but we don't get token directly
          // The token is handled by the backend via headers
          setState({
            userToken: 'iframe-context', // Special marker for iframe context
            isLoading: false,
            error: null
          });
          return;
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

    // Only add x-whop-user-token header if we have a real token
    // In iframe context, the token is automatically passed by WHOP
    if (userToken !== 'iframe-context') {
      headers['x-whop-user-token'] = userToken;
    }

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
