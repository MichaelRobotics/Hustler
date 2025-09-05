'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUserCredits, canGenerate, consumeCredit } from '../actions/credit-actions';

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
        canGenerate()
      ]);
      setCredits(userCredits);
      setCanGenerateNow(canGen);
    } catch (err) {
      console.error('Error fetching credit data:', err);
      setError('Failed to load credit data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const consumeCreditForGeneration = useCallback(async (): Promise<boolean> => {
    try {
      const success = await consumeCredit();
      if (success) {
        setCredits(prev => {
          const newCredits = Math.max(0, prev - 1);
          setCanGenerateNow(newCredits > 0);
          return newCredits;
        });
      }
      return success;
    } catch (err) {
      console.error('Error consuming credit:', err);
      setError('Failed to consume credit');
      return false;
    }
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
    refresh
  };
}
