import { useState, useEffect, useCallback } from 'react';
import { getGitHubService } from '../services/github';
import type { Organization, AppInstallation, GitHubApp, Repository } from '../types';

interface PaginationInfo {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

export interface LoadingProgress {
  phase: 'organizations' | 'installations' | 'apps' | 'complete';
  message: string;
  currentOrg?: string;
  orgsProcessed: number;
  totalOrgs: number;
  appsLoaded: number;
}

interface UseDashboardDataResult {
  organizations: Organization[];
  installations: AppInstallation[];
  apps: Map<string, GitHubApp>;
  repositories: Map<number, Repository[]>;
  loading: boolean;
  loadingProgress: LoadingProgress | null;
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
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    perPage: PER_PAGE,
    totalCount: 0,
    totalPages: 0,
  });

  const loadData = useCallback(async (page: number) => {
    if (!token) return;

    const github = getGitHubService(token, enterpriseUrl);

    setLoading(true);
    setError(null);
    setLoadingProgress({
      phase: 'organizations',
      message: 'Fetching organizations...',
      orgsProcessed: 0,
      totalOrgs: 0,
      appsLoaded: 0,
    });

    try {
      const allOrgs = await github.getOrganizations();
      const orgsToProcess = filterOrg 
        ? allOrgs.filter(org => org.login === filterOrg) 
        : allOrgs;
      setOrganizations(orgsToProcess);

      setLoadingProgress({
        phase: 'installations',
        message: `Found ${orgsToProcess.length} organization${orgsToProcess.length !== 1 ? 's' : ''}`,
        orgsProcessed: 0,
        totalOrgs: orgsToProcess.length,
        appsLoaded: 0,
      });

      const allInstallations: AppInstallation[] = [];
      const appsMap = new Map<string, GitHubApp>();
      let totalCount = 0;

      for (let i = 0; i < orgsToProcess.length; i++) {
        const org = orgsToProcess[i];
        
        setLoadingProgress({
          phase: 'installations',
          message: `Loading installations from ${org.login}...`,
          currentOrg: org.login,
          orgsProcessed: i,
          totalOrgs: orgsToProcess.length,
          appsLoaded: appsMap.size,
        });

        try {
          const result = await github.getAppInstallationsForOrg(org.login, page, PER_PAGE);
          allInstallations.push(...result.installations);
          totalCount += result.totalCount;

          for (const inst of result.installations) {
            if (!appsMap.has(inst.app_slug)) {
              setLoadingProgress({
                phase: 'apps',
                message: `Loading app: ${inst.app_slug}...`,
                currentOrg: org.login,
                orgsProcessed: i,
                totalOrgs: orgsToProcess.length,
                appsLoaded: appsMap.size,
              });
              
              const app = await github.getApp(inst.app_slug);
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
      
      setLoadingProgress({
        phase: 'complete',
        message: `Loaded ${appsMap.size} apps with ${allInstallations.length} installations`,
        orgsProcessed: orgsToProcess.length,
        totalOrgs: orgsToProcess.length,
        appsLoaded: appsMap.size,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  }, [token, enterpriseUrl, filterOrg]);

  const refreshData = useCallback(async () => {
    await loadData(1);
  }, [loadData]);

  const setPage = useCallback((page: number) => {
    loadData(page);
  }, [loadData]);

  const loadRepositoriesForInstallation = useCallback(async (installationId: number, page: number = 1) => {
    if (!token) return;
    const github = getGitHubService(token, enterpriseUrl);
    
    try {
      const result = await github.getInstallationRepositories(installationId, page, PER_PAGE);
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
    loadingProgress,
    error,
    pagination,
    setPage,
    refreshData,
    loadRepositoriesForInstallation,
  };
}
