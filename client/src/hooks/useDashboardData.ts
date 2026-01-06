import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Organization, AppInstallation, GitHubApp, Repository } from '../types';

interface PaginationInfo {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

interface UseDashboardDataResult {
  organizations: Organization[];
  installations: AppInstallation[];
  apps: Map<string, GitHubApp>;
  repositories: Map<number, Repository[]>;
  loading: boolean;
  error: string | null;
  pagination: PaginationInfo;
  setPage: (page: number) => void;
  refreshData: () => Promise<void>;
  loadRepositoriesForInstallation: (installationId: number, page?: number) => Promise<void>;
}

const PER_PAGE = 30;

export function useDashboardData(token: string, enterpriseUrl?: string, filterOrg?: string): UseDashboardDataResult {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [installations, setInstallations] = useState<AppInstallation[]>([]);
  const [apps, setApps] = useState<Map<string, GitHubApp>>(new Map());
  const [repositories, setRepositories] = useState<Map<number, Repository[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    perPage: PER_PAGE,
    totalCount: 0,
    totalPages: 0,
  });

  const loadData = useCallback(async (page: number) => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const allOrgs = await api.getOrganizations(token, enterpriseUrl);
      const orgsToProcess = filterOrg 
        ? allOrgs.filter(org => org.login === filterOrg) 
        : allOrgs;
      setOrganizations(orgsToProcess);

      const allInstallations: AppInstallation[] = [];
      const appsMap = new Map<string, GitHubApp>();
      let totalCount = 0;

      for (const org of orgsToProcess) {
        try {
          const result = await api.getInstallationsForOrg(org.login, token, enterpriseUrl, page, PER_PAGE);
          allInstallations.push(...result.installations);
          totalCount += result.totalCount;

          for (const inst of result.installations) {
            if (!appsMap.has(inst.app_slug)) {
              const app = await api.getApp(inst.app_slug, token, enterpriseUrl);
              if (app) {
                appsMap.set(inst.app_slug, app);
              }
            }
          }
        } catch (e) {
          console.error(`Error loading installations for ${org.login}:`, e);
        }
      }

      setInstallations(allInstallations);
      setApps(appsMap);
      setPagination({
        page,
        perPage: PER_PAGE,
        totalCount,
        totalPages: Math.ceil(totalCount / PER_PAGE),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token, enterpriseUrl, filterOrg]);

  const refreshData = useCallback(async () => {
    await loadData(1);
  }, [loadData]);

  const setPage = useCallback((page: number) => {
    loadData(page);
  }, [loadData]);

  const loadRepositoriesForInstallation = useCallback(async (installationId: number, page: number = 1) => {
    try {
      const result = await api.getInstallationRepositories(installationId, token, enterpriseUrl, page, PER_PAGE);
      setRepositories(prev => new Map(prev).set(installationId, result.repositories));
    } catch (e) {
      console.error(`Error loading repositories for installation ${installationId}:`, e);
    }
  }, [token, enterpriseUrl]);

  useEffect(() => {
    if (token) {
      loadData(1);
    }
  }, [token, enterpriseUrl, filterOrg]);

  return {
    organizations,
    installations,
    apps,
    repositories,
    loading,
    error,
    pagination,
    setPage,
    refreshData,
    loadRepositoriesForInstallation,
  };
}
