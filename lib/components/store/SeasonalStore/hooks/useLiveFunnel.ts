import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../../../../utils/api-client';
import type { FunnelFlow } from '../../../../types/funnel';

interface UseLiveFunnelProps {
  experienceId?: string;
}

export function useLiveFunnel({ experienceId }: UseLiveFunnelProps) {
  const [funnelFlow, setFunnelFlow] = useState<FunnelFlow | null>(null);
  const [liveFunnel, setLiveFunnel] = useState<any>(null);
  const [isFunnelActive, setIsFunnelActive] = useState(false);
  const [isFunnelCheckComplete, setIsFunnelCheckComplete] = useState(false);

  const loadLiveFunnel = useCallback(async () => {
    if (!experienceId) return;

    try {
      console.log('[useLiveFunnel] Loading live funnel for experience:', experienceId);
      const response = await apiGet(`/api/funnels/live`, experienceId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.hasLiveFunnel && data.funnelFlow) {
          const funnelData = {
            id: data.funnel.id,
            name: data.funnel.name,
            flow: data.funnelFlow,
            isDeployed: data.funnel.isDeployed,
            resources: data.resources || [],
          };
          setLiveFunnel(funnelData);
          setFunnelFlow(data.funnelFlow);
          setIsFunnelActive(true);
          console.log('[useLiveFunnel] Live funnel loaded:', funnelData);
        } else {
          console.log('[useLiveFunnel] No live funnel found');
          setLiveFunnel(null);
          setFunnelFlow(null);
          setIsFunnelActive(false);
        }
      } else {
        console.log('[useLiveFunnel] No live funnel found');
        setLiveFunnel(null);
        setFunnelFlow(null);
        setIsFunnelActive(false);
      }

      setIsFunnelCheckComplete(true);
    } catch (error) {
      console.error('[useLiveFunnel] Error loading live funnel:', error);
      setLiveFunnel(null);
      setFunnelFlow(null);
      setIsFunnelActive(false);
      setIsFunnelCheckComplete(true);
    }
  }, [experienceId]);

  useEffect(() => {
    loadLiveFunnel();
  }, [loadLiveFunnel]);

  return {
    funnelFlow,
    liveFunnel,
    isFunnelActive,
    isFunnelCheckComplete,
    loadLiveFunnel,
  };
}


