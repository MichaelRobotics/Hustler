"use client";

import { useIframeSdk } from "@whop/react";
import { useEffect, useState } from "react";

// Safe iframe SDK hook that properly detects and uses Whop iframe SDK
export function useSafeIframeSdk() {
	const iframeSdk = useIframeSdk();
	const [isInIframe, setIsInIframe] = useState(false);

	useEffect(() => {
		// Enhanced iframe SDK detection for mobile compatibility
		const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		
		// Check if iframe SDK is available
		if (iframeSdk && typeof iframeSdk.inAppPurchase === "function") {
			setIsInIframe(true);
			console.log("✅ Whop iframe SDK detected via @whop/react");
			console.log("📱 Mobile debug - User Agent:", navigator.userAgent);
			console.log("📱 Mobile debug - isMobile:", isMobile);
			console.log("📱 Mobile debug - iframeSdk methods:", Object.keys(iframeSdk));
		} else {
			setIsInIframe(false);
			console.log("❌ Whop iframe SDK not available");
			console.log("📱 Mobile debug - iframeSdk:", iframeSdk);
			console.log("📱 Mobile debug - inAppPurchase function:", iframeSdk?.inAppPurchase);
			console.log("📱 Mobile debug - isMobile:", isMobile);
			
			// Mobile-specific iframe detection fallback
			if (isMobile) {
				console.log("📱 Mobile iframe detection fallback - checking window.parent");
				if (window.parent && window.parent !== window) {
					console.log("📱 Mobile iframe context detected via window.parent");
					// Try to access parent iframe SDK
					try {
						const parentSdk = (window.parent as any).whopIframeSdk;
						if (parentSdk && typeof parentSdk.inAppPurchase === "function") {
							console.log("📱 Mobile iframe SDK found in parent window");
							setIsInIframe(true);
						}
					} catch (error) {
						console.log("📱 Mobile iframe SDK access blocked:", error);
					}
				}
			}
		}
	}, [iframeSdk]);

	return {
		iframeSdk,
		isInIframe,
		// Safe method to call inAppPurchase
		safeInAppPurchase: async (purchaseData: any) => {
			if (isInIframe && iframeSdk) {
				try {
					console.log("Attempting Whop payment with data:", purchaseData);
					const result = await iframeSdk.inAppPurchase(purchaseData);
					console.log("Whop payment result:", result);
					return result;
				} catch (error) {
					console.error("Whop iframe SDK purchase failed:", error);
					throw error;
				}
			} else {
				throw new Error("Whop iframe SDK not available - payment not possible");
			}
		},
	};
}
