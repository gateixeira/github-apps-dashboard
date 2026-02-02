import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { AppUsageInfo, AuditLogProgress } from '../types';

export interface UsageProgress {
  org: string;
  appsChecked: number;
  totalApps: number;
  appsFound: number;
  currentPhase: 'fetching' | 'processing' | 'complete';
  message: string;
}

interface UseAppUsageResult {
  usage: Map<string, AppUsageInfo>;
  loading: boolean;
  error: string | null;
  inactiveDays: number;
  configLoaded: boolean;
  progress: UsageProgress | null;
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
  const [progress, setProgress] = useState<UsageProgress | null>(null);
  const inactiveDaysRef = useRef(inactiveDays);
  const abortFnsRef = useRef<Array<() => void>>([]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortFnsRef.current.forEach(fn => fn());
    };
  }, []);

  const loadUsage = useCallback(async (orgs: string[], appSlugs: string[]) => {
    if (!token || appSlugs.length === 0 || orgs.length === 0) return;

    // Abort any existing streams
    abortFnsRef.current.forEach(fn => fn());
    abortFnsRef.current = [];

    setLoading(true);
    setError(null);
    setProgress(null);

    const usageMap = new Map<string, AppUsageInfo>();
    const days = inactiveDaysRef.current;
    let completedOrgs = 0;

    // Process orgs sequentially to avoid overwhelming the server
    for (const org of orgs) {
      await new Promise<void>((resolve) => {
        const abort = api.streamAppUsage(
          org,
          appSlugs,
          token,
          days,
          enterpriseUrl,
          (event) => {
            if (event.type === 'progress') {
              const progressEvent = event as AuditLogProgress;
              setProgress({
                org: progressEvent.org,
                appsChecked: progressEvent.pagesProcessed, // Reusing pagesProcessed for appsChecked
                totalApps: appSlugs.length,
                appsFound: progressEvent.appsFound,
                currentPhase: progressEvent.currentPhase,
                message: progressEvent.message,
              });
            } else if (event.type === 'complete') {
              // Merge results
              for (const usageInfo of event.usage) {
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
              completedOrgs++;
              resolve();
            } else if (event.type === 'error') {
              console.error(`Error fetching app usage for ${org}:`, event.error);
              resolve();
            }
          }
        );
        abortFnsRef.current.push(abort);
      });
    }

    setUsage(usageMap);
    setLoading(false);
    setProgress(null);
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
    progress,
    loadUsage,
    getUsageForApp,
  };
}
