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

  // Reset smoothed progress when audit log checking is complete
  useEffect(() => {
    if (!isFirstLoad && smoothedAuditProgress.total > 0 && smoothedAuditProgress.checked >= smoothedAuditProgress.total) {
      const timer = setTimeout(() => {
        dispatch({ type: 'RESET_AUDIT_PROGRESS' });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isFirstLoad, smoothedAuditProgress.checked, smoothedAuditProgress.total, dispatch]);

  // Load app usage when apps are loaded and config is ready
  useEffect(() => {
    if (apps.size > 0 && organizations.length > 0 && configLoaded) {
      dispatch({ type: 'USAGE_LOADING_STARTED' });
      const slugs = Array.from(apps.keys());
      const orgLogins = organizations.map(o => o.login);
      loadUsage(orgLogins, slugs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps, organizations, configLoaded, usageRefreshKey]);

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
