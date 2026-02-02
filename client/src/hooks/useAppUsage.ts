import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { AppUsageInfo } from '../types';

interface UseAppUsageResult {
  usage: Map<string, AppUsageInfo>;
  loading: boolean;
  error: string | null;
  inactiveDays: number;
  configLoaded: boolean;
  loadUsage: (orgs: string[], appSlugs: string[]) => Promise<void>;
  getUsageForApp: (appSlug: string) => AppUsageInfo | undefined;
}

export function useAppUsage(
  token: string,
  enterpriseUrl?: string
): UseAppUsageResult {
  const [usage, setUsage] = useState<Map<string, AppUsageInfo>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inactiveDays, setInactiveDays] = useState(90);
  const [configLoaded, setConfigLoaded] = useState(false);
  const inactiveDaysRef = useRef(inactiveDays);

  // Keep ref in sync
  useEffect(() => {
    inactiveDaysRef.current = inactiveDays;
  }, [inactiveDays]);

  // Fetch server config on mount
  useEffect(() => {
    api.getConfig().then(config => {
      setInactiveDays(config.inactiveDays);
      inactiveDaysRef.current = config.inactiveDays;
      setConfigLoaded(true);
    }).catch(err => {
      console.error('Failed to fetch config:', err);
      setConfigLoaded(true); // Still mark as loaded to unblock
    });
  }, []);

  const loadUsage = useCallback(async (orgs: string[], appSlugs: string[]) => {
    if (!token || appSlugs.length === 0 || orgs.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const usageMap = new Map<string, AppUsageInfo>();
      const days = inactiveDaysRef.current;

      // Fetch usage for each organization and aggregate
      for (const org of orgs) {
        try {
          const response = await api.getAppUsage(org, appSlugs, token, enterpriseUrl, days);
          
          for (const usageInfo of response.usage) {
            const existing = usageMap.get(usageInfo.appSlug);
            
            if (!existing) {
              usageMap.set(usageInfo.appSlug, usageInfo);
            } else {
              // Aggregate: take the most recent activity
              const existingTime = existing.lastActivityAt ? new Date(existing.lastActivityAt).getTime() : 0;
              const newTime = usageInfo.lastActivityAt ? new Date(usageInfo.lastActivityAt).getTime() : 0;
              
              if (newTime > existingTime) {
                existing.lastActivityAt = usageInfo.lastActivityAt;
              }
              existing.activityCount += usageInfo.activityCount;
              
              // Update status: active beats inactive beats unknown
              if (usageInfo.status === 'active') {
                existing.status = 'active';
              } else if (usageInfo.status === 'inactive' && existing.status === 'unknown') {
                existing.status = 'inactive';
              }
            }
          }
        } catch (e) {
          console.error(`Error fetching app usage for ${org}:`, e);
        }
      }

      setUsage(usageMap);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load app usage data');
    } finally {
      setLoading(false);
    }
  }, [token, enterpriseUrl]);

  const getUsageForApp = useCallback((appSlug: string): AppUsageInfo | undefined => {
    return usage.get(appSlug);
  }, [usage]);

  return {
    usage,
    loading,
    error,
    inactiveDays,
    configLoaded,
    loadUsage,
    getUsageForApp,
  };
}
