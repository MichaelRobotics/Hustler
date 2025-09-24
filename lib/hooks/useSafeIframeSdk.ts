"use client";

import { useIframeSdk } from "@whop/react";
import { useEffect, useState } from "react";

// Safe iframe SDK hook that properly detects and uses Whop iframe SDK
export function useSafeIframeSdk() {
	const iframeSdk = useIframeSdk();
	const [isInIframe, setIsInIframe] = useState(false);

	useEffect(() => {
		// Check if iframe SDK is available
		if (iframeSdk && typeof iframeSdk.inAppPurchase === "function") {
			setIsInIframe(true);
			console.log("Whop iframe SDK detected via @whop/react");
		} else {
			setIsInIframe(false);
			console.log("Whop iframe SDK not available");
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
