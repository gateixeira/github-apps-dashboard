import { useEffect, useCallback } from 'react';
import { useDashboardData } from './useDashboardData';
import { useAppUsage } from './useAppUsage';
import { useAppState } from './useAppState';
import type { AppState } from './useAppState';

type Dispatch = (action: Parameters<ReturnType<typeof useAppState>['dispatch']>[0]) => void;

interface UseDashboardOrchestrationOptions {
  state: AppState;
  dispatch: Dispatch;
}

export function useDashboardOrchestration({
  state,
  dispatch,
}: UseDashboardOrchestrationOptions) {
  const {
    token, enterpriseUrl, isConnected, selectedOrg, inactiveDays,
    isFirstLoad, usageLoadingStarted, smoothedAuditProgress, usageRefreshKey,
  } = state;

  const dashboardData = useDashboardData(isConnected ? token : '', enterpriseUrl, selectedOrg);
  const {
    organizations,
    installations,
    apps,
    loading,
    refreshData,
  } = dashboardData;

  const appUsage = useAppUsage(isConnected ? token : '', enterpriseUrl, inactiveDays);
  const {
    loading: usageLoading,
    loadUsage,
    configLoaded,
    progress: usageProgress,
  } = appUsage;

  // Track when first load completes
  useEffect(() => {
    if (isFirstLoad && !loading && usageLoadingStarted && !usageLoading && installations.length > 0) {
      dispatch({ type: 'FIRST_LOAD_COMPLETE' });
    }
  }, [isFirstLoad, loading, usageLoadingStarted, usageLoading, installations.length, dispatch]);

  // Smooth the audit progress — only allow values to increase
  useEffect(() => {
    if (usageProgress) {
      dispatch({
        type: 'UPDATE_AUDIT_PROGRESS',
        payload: {
          checked: usageProgress.appsChecked,
          total: usageProgress.totalApps,
          found: usageProgress.appsFound,
        },
      });
    }
  }, [usageProgress, dispatch]);

  // Re-scan activity after Phase 2 background loading completes to cover all apps
  const { backgroundProgress } = dashboardData;

  // Reset smoothed progress when audit log checking is complete (and no background loading pending)
  useEffect(() => {
    if (!isFirstLoad && smoothedAuditProgress.total > 0 && smoothedAuditProgress.checked >= smoothedAuditProgress.total && !backgroundProgress?.isLoading) {
      const timer = setTimeout(() => {
        dispatch({ type: 'RESET_AUDIT_PROGRESS' });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isFirstLoad, smoothedAuditProgress.checked, smoothedAuditProgress.total, backgroundProgress?.isLoading, dispatch]);

  // Load app usage when apps are loaded and config is ready
  useEffect(() => {
    if (apps.size > 0 && organizations.length > 0 && configLoaded && !usageLoadingStarted) {
      dispatch({ type: 'USAGE_LOADING_STARTED' });
      const slugs = Array.from(apps.keys());
      const orgLogins = organizations.map(o => o.login);
      loadUsage(orgLogins, slugs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps, organizations, configLoaded, usageRefreshKey, usageLoadingStarted]);

  // Re-scan activity after Phase 2 background loading completes to cover all apps
  useEffect(() => {
    if (backgroundProgress && !backgroundProgress.isLoading && apps.size > 0 && organizations.length > 0) {
      const slugs = Array.from(apps.keys());
      const orgLogins = organizations.map(o => o.login);
      loadUsage(orgLogins, slugs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundProgress?.isLoading]);

  const handleConnect = useCallback(() => {
    if (isConnected) {
      refreshData();
      dispatch({ type: 'RECONNECT' });
    } else {
      dispatch({ type: 'CONNECT' });
    }
  }, [isConnected, refreshData, dispatch]);

  return {
    dashboardData,
    appUsage,
    handleConnect,
  };
}
