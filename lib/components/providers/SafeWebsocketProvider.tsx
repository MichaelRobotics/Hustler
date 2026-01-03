"use client";

/**
 * SafeWebsocketProvider
 * 
 * Conditionally provides WebSocket context only when running inside the Whop iframe.
 * When running locally (outside iframe), it renders children without WebSocket functionality
 * to prevent connection errors and iframe SDK breakage.
 */

import { WhopWebsocketProvider } from "@whop/react";
import { useEffect, useState, type ReactNode } from "react";

interface SafeWebsocketProviderProps {
  children: ReactNode;
  /** Optional: Join a specific experience channel */
  joinExperience?: string;
  /** Optional: Join a custom channel */
  joinCustom?: string;
  /** Optional: Callback for app messages */
  onAppMessage?: (message: any) => void;
}

/**
 * Detects if we're running inside a Whop iframe
 * Returns true only when we're definitely in the Whop environment
 */
function useIsInWhopIframe(): boolean | null {
  const [isInWhopIframe, setIsInWhopIframe] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we're in an iframe
    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    
    if (!inIframe) {
      // Not in any iframe - definitely not in Whop
      setIsInWhopIframe(false);
      return;
    }

    // Check for Whop-specific indicators
    // The Whop iframe SDK sets up message listeners and provides specific methods
    // We can also check the referrer or other signals
    
    // Check if we have a parent that responds to Whop messages
    // For now, we'll use a simple heuristic: check if we're in an iframe
    // and if the parent origin looks like Whop
    try {
      // In development, allow WebSocket if explicitly enabled
      const forceWebSocket = typeof window !== "undefined" && 
        (window.location.search.includes("enableWebSocket=true") ||
         localStorage.getItem("forceWebSocket") === "true");
      
      if (forceWebSocket) {
        console.log("[SafeWebsocketProvider] WebSocket force-enabled via flag");
        setIsInWhopIframe(true);
        return;
      }

      // Check for Whop referrer or origin
      const referrer = document.referrer;
      const isWhopReferrer = referrer.includes("whop.com") || 
                            referrer.includes("whop.dev") ||
                            referrer.includes(".whop.");
      
      // In production iframe context with Whop referrer
      if (inIframe && isWhopReferrer) {
        console.log("[SafeWebsocketProvider] Detected Whop iframe context");
        setIsInWhopIframe(true);
        return;
      }

      // If in iframe but not from Whop, be cautious
      if (inIframe && !isWhopReferrer) {
        console.log("[SafeWebsocketProvider] In iframe but not from Whop - disabling WebSocket");
        setIsInWhopIframe(false);
        return;
      }

      // Default: not in Whop iframe
      setIsInWhopIframe(false);
    } catch (error) {
      // If we can't access parent info (cross-origin), assume we might be in Whop
      // But be conservative and disable WebSocket to avoid errors
      console.warn("[SafeWebsocketProvider] Could not determine iframe context:", error);
      setIsInWhopIframe(false);
    }
  }, []);

  return isInWhopIframe;
}

export function SafeWebsocketProvider({
  children,
  joinExperience,
  joinCustom,
  onAppMessage,
}: SafeWebsocketProviderProps) {
  const isInWhopIframe = useIsInWhopIframe();

  // Still loading - render children without provider
  if (isInWhopIframe === null) {
    return <>{children}</>;
  }

  // Not in Whop iframe - render children without WebSocket provider
  if (!isInWhopIframe) {
    console.log("[SafeWebsocketProvider] Not in Whop iframe - WebSocket disabled");
    return <>{children}</>;
  }

  // In Whop iframe - provide WebSocket context
  console.log("[SafeWebsocketProvider] In Whop iframe - WebSocket enabled");
  return (
    <WhopWebsocketProvider
      joinExperience={joinExperience}
      joinCustom={joinCustom}
      onAppMessage={onAppMessage}
    >
      {children}
    </WhopWebsocketProvider>
  );
}

export default SafeWebsocketProvider;

