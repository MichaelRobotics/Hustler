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
			
			const [userCredits, canGen] = await Promise.all([
				getUserCredits(experienceId),
				canGenerate(user, experienceId),
			]);
			setCredits(userCredits);
			setCanGenerateNow(canGen);
		} catch (err) {
			console.error("Error fetching credit data:", err);
			setError("Failed to load credit data");
		} finally {
			setIsLoading(false);
		}
	}, [user]);

	const consumeCreditForGeneration = useCallback(async (): Promise<boolean> => {
		if (!user) {
			return false;
		}

		try {
			// Get experienceId from user context
			const experienceId = user?.experienceId || process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID || "";
			
			if (!experienceId) {
				throw new Error("Experience ID not found");
			}
			
			// Use the updated consumeCredit function with user context and experienceId
			const success = await consumeCredit(user, experienceId);
			if (success) {
				await fetchCreditData(); // Refresh the balance
			}
			return success;
		} catch (err) {
			console.error("Error consuming credit:", err);
			setError("Failed to consume credit");
			return false;
		}
	}, [user, fetchCreditData]);

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
