'use client';

import { useState, useEffect, useCallback } from 'react';
import { FunnelWithResources } from '../actions/funnel-actions';
import { ResourceWithFunnels } from '../actions/resource-actions';

interface DashboardData {
  funnels: {
    funnels: FunnelWithResources[];
    total: number;
    page: number;
    limit: number;
  };
  resources: {
    resources: ResourceWithFunnels[];
    total: number;
    page: number;
    limit: number;
  };
  user: {
    id: string;
    experienceId: string;
    accessLevel: string;
  };
}

export function useDashboardData() {
  const [funnels, setFunnels] = useState<FunnelWithResources[]>([]);
  const [resources, setResources] = useState<ResourceWithFunnels[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch combined dashboard data
  const fetchDashboardData = useCallback(async (page: number = 1, limit: number = 10, search?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (search) {
        params.append('search', search);
      }
      
      const response = await fetch(`/api/dashboard-data?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const dashboardData: DashboardData = data.data;
        setFunnels(dashboardData.funnels.funnels);
        setResources(dashboardData.resources.resources);
        setUser(dashboardData.user);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(errorMessage);
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Update funnel in local state (for optimistic updates)
  const updateFunnel = useCallback((funnelId: string, updates: Partial<FunnelWithResources>) => {
    setFunnels(prev => prev.map(f => f.id === funnelId ? { ...f, ...updates } : f));
  }, []);

  // Add new funnel to local state
  const addFunnel = useCallback((newFunnel: FunnelWithResources) => {
    setFunnels(prev => [...prev, newFunnel]);
  }, []);

  // Remove funnel from local state
  const removeFunnel = useCallback((funnelId: string) => {
    setFunnels(prev => prev.filter(f => f.id !== funnelId));
  }, []);

  // Update resource in local state
  const updateResource = useCallback((resourceId: string, updates: Partial<ResourceWithFunnels>) => {
    setResources(prev => prev.map(r => r.id === resourceId ? { ...r, ...updates } : r));
  }, []);

  // Add new resource to local state
  const addResource = useCallback((newResource: ResourceWithFunnels) => {
    setResources(prev => [...prev, newResource]);
  }, []);

  // Remove resource from local state
  const removeResource = useCallback((resourceId: string) => {
    setResources(prev => prev.filter(r => r.id !== resourceId));
  }, []);

  return {
    // Data
    funnels,
    resources,
    user,
    loading,
    error,
    
    // Actions
    fetchDashboardData,
    updateFunnel,
    addFunnel,
    removeFunnel,
    updateResource,
    addResource,
    removeResource,
  };
}
