"use client";

import { useCallback, useEffect, useState } from "react";
import {
	canGenerate,
	consumeCredit,
	getUserCredits,
} from "../actions/credit-actions";
import type { AuthenticatedUser } from "../types/user";

export interface UseCreditsReturn {
	credits: number;
	canGenerate: boolean;
	isLoading: boolean;
	error: string | null;
	consumeCredit: () => Promise<boolean>;
	refresh: () => Promise<void>;
}

export function useCredits(user: AuthenticatedUser | null): UseCreditsReturn {
	const [credits, setCredits] = useState<number>(0);
	const [canGenerateNow, setCanGenerateNow] = useState<boolean>(true);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const fetchCreditData = useCallback(async () => {
		if (!user) {
			setCredits(0);
			setCanGenerateNow(false);
			setIsLoading(false);
			return;
		}

		try {
			setIsLoading(true);
			setError(null);
			
			// Get experienceId from user context
			const experienceId = user?.experienceId || process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID || "";
			
			if (!experienceId) {
				throw new Error("Experience ID not found");
			}
			
			// Only fetch credits - canGenerate check is now handled server-side for security
			const userCredits = await getUserCredits(experienceId);
			setCredits(userCredits);
			// Note: canGenerateNow is now determined by server-side validation
			// Client-side check removed to prevent security bypass
			setCanGenerateNow(true); // Let server handle the actual validation
		} catch (err) {
			console.error("Error fetching credit data:", err);
			setError("Failed to load credit data");
		} finally {
			setIsLoading(false);
		}
	}, [user]);

	// Note: Credit consumption is now handled server-side for security
	// Client-side credit consumption removed to prevent bypassing
	const consumeCreditForGeneration = useCallback(async (): Promise<boolean> => {
		// Credit deduction is handled server-side in the generation API
		// This function is kept for compatibility but does nothing
		return true;
	}, []);

	const refresh = useCallback(async () => {
		await fetchCreditData();
	}, [fetchCreditData]);

	useEffect(() => {
		fetchCreditData();
	}, [fetchCreditData]);

	return {
		credits,
		canGenerate: canGenerateNow,
		isLoading,
		error,
		consumeCredit: consumeCreditForGeneration,
		refresh,
	};
}
