'use client';

import { useEffect, useState } from 'react';

// Safe iframe SDK hook that properly detects and uses Whop iframe SDK
export function useSafeIframeSdk() {
  const [iframeSdk, setIframeSdk] = useState<any>(null);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    const checkIframeContext = () => {
      try {
        // Check if we're in a Whop iframe context
        if (typeof window !== 'undefined') {
          // Check for Whop iframe SDK in multiple possible locations
          const sdk = (window as any).whopIframeSdk || 
                     (window as any).whop?.iframeSdk ||
                     (window as any).parent?.whopIframeSdk;
          
          if (sdk && typeof sdk.inAppPurchase === 'function') {
            setIframeSdk(sdk);
            setIsInIframe(true);
            console.log('Whop iframe SDK detected');
          } else {
            setIsInIframe(false);
            console.log('Whop iframe SDK not found');
          }
        }
      } catch (error) {
        console.log('Error checking iframe context:', error);
        setIsInIframe(false);
      }
    };

    // Check immediately
    checkIframeContext();

    // Also check after a short delay in case SDK loads later
    const timeout = setTimeout(checkIframeContext, 1000);

    return () => clearTimeout(timeout);
  }, []);

  return {
    iframeSdk,
    isInIframe,
    // Safe method to call inAppPurchase
    safeInAppPurchase: async (purchaseData: any) => {
      if (isInIframe && iframeSdk) {
        try {
          console.log('Attempting Whop payment with data:', purchaseData);
          const result = await iframeSdk.inAppPurchase(purchaseData);
          console.log('Whop payment result:', result);
          return result;
        } catch (error) {
          console.error('Whop iframe SDK purchase failed:', error);
          throw error;
        }
      } else {
        throw new Error('Whop iframe SDK not available - payment not possible');
      }
    }
  };
}
