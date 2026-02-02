import { useState, useCallback, useEffect, useRef } from 'react';
import { getGitHubService } from '../services/github';
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

const DEFAULT_INACTIVE_DAYS = 90;

export function useAppUsage(
  token: string,
  enterpriseUrl?: string
): UseAppUsageResult {
  const [usage, setUsage] = useState<Map<string, AppUsageInfo>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inactiveDays] = useState(DEFAULT_INACTIVE_DAYS);
  const [progress, setProgress] = useState<UsageProgress | null>(null);
  const inactiveDaysRef = useRef(inactiveDays);
  const abortedRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    inactiveDaysRef.current = inactiveDays;
  }, [inactiveDays]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortedRef.current = true;
    };
  }, []);

  const loadUsage = useCallback(async (orgs: string[], appSlugs: string[]) => {
    if (!token || appSlugs.length === 0 || orgs.length === 0) return;

    abortedRef.current = false;
    setLoading(true);
    setError(null);
    setProgress(null);

    const github = getGitHubService(token, enterpriseUrl);
    const usageMap = new Map<string, AppUsageInfo>();
    const days = inactiveDaysRef.current;

    // Process orgs sequentially
    for (const org of orgs) {
      if (abortedRef.current) break;

      try {
        const orgUsage = await github.getAppUsageFromAuditLogs(
          org,
          appSlugs,
          days,
          (progressEvent: AuditLogProgress) => {
            if (abortedRef.current) return;
            setProgress({
              org: progressEvent.org,
              appsChecked: progressEvent.pagesProcessed,
              totalApps: appSlugs.length,
              appsFound: progressEvent.appsFound,
              currentPhase: progressEvent.currentPhase,
              message: progressEvent.message,
            });
          }
        );

        // Merge results
        for (const [appSlug, usageInfo] of orgUsage) {
          const existing = usageMap.get(appSlug);
          
          if (!existing) {
            usageMap.set(appSlug, usageInfo);
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
      } catch (err) {
        console.error(`Error fetching app usage for ${org}:`, err);
      }
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
    configLoaded: true, // Always loaded since we don't fetch from server
    progress,
    loadUsage,
    getUsageForApp,
  };
}
