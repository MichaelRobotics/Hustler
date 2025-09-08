"use client";

import { useCallback, useEffect, useState } from "react";
import {
	canGenerate,
	consumeCredit,
	getUserCredits,
} from "../actions/credit-actions";

export interface UseCreditsReturn {
	credits: number;
	canGenerate: boolean;
	isLoading: boolean;
	error: string | null;
	consumeCredit: () => Promise<boolean>;
	refresh: () => Promise<void>;
}

export function useCredits(): UseCreditsReturn {
	const [credits, setCredits] = useState<number>(0);
	const [canGenerateNow, setCanGenerateNow] = useState<boolean>(true);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const fetchCreditData = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			const [userCredits, canGen] = await Promise.all([
				getUserCredits(),
				canGenerate(),
			]);
			setCredits(userCredits);
			setCanGenerateNow(canGen);
		} catch (err) {
			console.error("Error fetching credit data:", err);
			setError("Failed to load credit data");
		} finally {
			setIsLoading(false);
		}
	}, []);

	const consumeCreditForGeneration = useCallback(async (): Promise<boolean> => {
		try {
			// Note: Credit deduction is now handled server-side in the generation API
			// This function is kept for backward compatibility but just refreshes the balance
			await fetchCreditData();
			return true;
		} catch (err) {
			console.error("Error refreshing credit data:", err);
			setError("Failed to refresh credit data");
			return false;
		}
	}, [fetchCreditData]);

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
