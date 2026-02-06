import { useState, useMemo, useCallback } from 'react';
import type { FilterState, AppInstallation, GitHubApp, Organization, Repository, AppUsageInfo } from '../types';

export const APPS_PER_PAGE = 30;

interface PaginationInfo {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

interface UseAppFiltersOptions {
  installations: AppInstallation[];
  apps: Map<string, GitHubApp>;
  organizations: Organization[];
  selectedOrg: string;
  pagination: PaginationInfo;
  getUsageForApp: (appSlug: string) => AppUsageInfo | undefined;
  allRepositories: Repository[];
}

export function useAppFilters({
  installations,
  apps,
  organizations,
  selectedOrg,
  pagination,
  getUsageForApp,
  allRepositories,
}: UseAppFiltersOptions) {
  const [filters, setFilters] = useState<FilterState>({
    appOwner: '',
    appSlug: '',
    repository: '',
    viewMode: 'apps',
    usageFilter: 'all',
  });
  const [appsPage, setAppsPage] = useState(1);

  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setAppsPage(1);
  }, []);

  const appOwners = useMemo(() => {
    const owners = new Set<string>();
    apps.forEach(app => {
      if (app.owner) {
        owners.add(app.owner.login);
      }
    });
    return Array.from(owners).sort();
  }, [apps]);

  const appSlugs = useMemo(() => {
    return Array.from(apps.keys()).sort();
  }, [apps]);

  const repositoryNames = useMemo(() => {
    return allRepositories.map(r => r.full_name).sort();
  }, [allRepositories]);

  const filteredInstallations = useMemo(() => {
    return installations.filter(inst => {
      if (selectedOrg && inst.account.login !== selectedOrg) {
        return false;
      }
      if (filters.appSlug && inst.app_slug !== filters.appSlug) {
        return false;
      }
      if (filters.appOwner) {
        const app = apps.get(inst.app_slug);
        if (!app?.owner || app.owner.login !== filters.appOwner) {
          return false;
        }
      }
      return true;
    });
  }, [installations, filters, apps, selectedOrg]);

  const installationsByApp = useMemo(() => {
    const grouped = new Map<string, AppInstallation[]>();
    filteredInstallations.forEach(inst => {
      if (filters.usageFilter !== 'all') {
        const usage = getUsageForApp(inst.app_slug);
        if (filters.usageFilter === 'active') {
          if (!usage || usage.status !== 'active') return;
        } else if (filters.usageFilter === 'inactive') {
          if (usage && usage.status === 'active') return;
        }
      }
      const existing = grouped.get(inst.app_slug) || [];
      grouped.set(inst.app_slug, [...existing, inst]);
    });
    return grouped;
  }, [filteredInstallations, filters.usageFilter, getUsageForApp]);

  const paginatedApps = useMemo(() => {
    const allApps = Array.from(installationsByApp.entries());
    const startIndex = (appsPage - 1) * APPS_PER_PAGE;
    return allApps.slice(startIndex, startIndex + APPS_PER_PAGE);
  }, [installationsByApp, appsPage]);

  const expectedTotalApps = pagination.totalCount;
  const expectedTotalPages = Math.ceil(expectedTotalApps / APPS_PER_PAGE);
  const loadedAppsPages = Math.ceil(installationsByApp.size / APPS_PER_PAGE);

  const installationsByOrg = useMemo(() => {
    const grouped = new Map<string, AppInstallation[]>();
    filteredInstallations.forEach(inst => {
      const existing = grouped.get(inst.account.login) || [];
      grouped.set(inst.account.login, [...existing, inst]);
    });
    return grouped;
  }, [filteredInstallations]);

  const filteredOrganizations = useMemo(() => {
    if (selectedOrg) {
      return organizations.filter(org => org.login === selectedOrg);
    }
    return organizations;
  }, [organizations, selectedOrg]);

  return {
    filters,
    handleFilterChange,
    appsPage,
    setAppsPage,
    appOwners,
    appSlugs,
    repositoryNames,
    filteredInstallations,
    installationsByApp,
    installationsByOrg,
    filteredOrganizations,
    paginatedApps,
    expectedTotalApps,
    expectedTotalPages,
    loadedAppsPages,
  };
}
