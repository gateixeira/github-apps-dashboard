import { useState, useEffect, useCallback, useRef } from 'react';
import { getGitHubService } from '../services/github';
import type { Organization, AppInstallation, GitHubApp, Repository } from '../types';

interface PaginationInfo {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

export interface LoadingProgress {
  phase: 'organizations' | 'installations' | 'apps' | 'repositories' | 'complete';
  message: string;
  currentOrg?: string;
  orgsProcessed: number;
  totalOrgs: number;
  installationsLoaded: number;
  appsLoaded: number;
  repositoriesLoaded: number;
}

export interface BackgroundProgress {
  isLoading: boolean;
  pagesLoaded: number;
  totalPages: number;
  installationsLoaded: number;
  appsLoaded: number;
}

interface UseDashboardDataResult {
  organizations: Organization[];
  installations: AppInstallation[];
  apps: Map<string, GitHubApp>;
  repositories: Map<number, Repository[]>;
  loading: boolean;
  loadingProgress: LoadingProgress | null;
  backgroundProgress: BackgroundProgress | null;
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
  const [backgroundProgress, setBackgroundProgress] = useState<BackgroundProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    perPage: PER_PAGE,
    totalCount: 0,
    totalPages: 0,
  });

  const abortedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!token) return;

    // Cancel any previous in-flight load, then reset for this invocation
    abortedRef.current = true;
    abortedRef.current = false;
    abortedRef.current = false;

    const github = getGitHubService(token, enterpriseUrl);

    setLoading(true);
    setError(null);
    setBackgroundProgress(null);
    setLoadingProgress({
      phase: 'organizations',
      message: 'Fetching organizations...',
      orgsProcessed: 0,
      totalOrgs: 0,
      installationsLoaded: 0,
      appsLoaded: 0,
      repositoriesLoaded: 0,
    });

    try {
      const allOrgs = await github.getOrganizations();
      if (abortedRef.current) return;

      const orgsToProcess = filterOrg 
        ? allOrgs.filter(org => org.login === filterOrg) 
        : allOrgs;
      setOrganizations(orgsToProcess);

      setLoadingProgress({
        phase: 'installations',
        message: `Found ${orgsToProcess.length} organization${orgsToProcess.length !== 1 ? 's' : ''}`,
        orgsProcessed: 0,
        totalOrgs: orgsToProcess.length,
        installationsLoaded: 0,
        appsLoaded: 0,
        repositoriesLoaded: 0,
      });

      // Track installations and apps across all orgs
      let allInstallations: AppInstallation[] = [];
      const appsMap = new Map<string, GitHubApp>();
      let totalCount = 0;
      
      // Track pagination info per org for background loading
      const orgPagination: Map<string, { totalCount: number; pagesLoaded: number; totalPages: number }> = new Map();

      // PHASE 1: Load first page of each org (initial fast load)
      for (let i = 0; i < orgsToProcess.length; i++) {
        if (abortedRef.current) return;
        const org = orgsToProcess[i];
        
        setLoadingProgress({
          phase: 'installations',
          message: `Loading installations from ${org.login}...`,
          currentOrg: org.login,
          orgsProcessed: i,
          totalOrgs: orgsToProcess.length,
          installationsLoaded: allInstallations.length,
          appsLoaded: appsMap.size,
          repositoriesLoaded: 0,
        });

        try {
          const result = await github.getAppInstallationsForOrg(org.login, 1, PER_PAGE);
          if (abortedRef.current) return;

          allInstallations.push(...result.installations);
          totalCount += result.totalCount;
          
          // Track how many pages this org has
          const totalPages = Math.ceil(result.totalCount / PER_PAGE);
          orgPagination.set(org.login, { totalCount: result.totalCount, pagesLoaded: 1, totalPages });

          for (const inst of result.installations) {
            if (abortedRef.current) return;
            if (!appsMap.has(inst.app_slug)) {
              setLoadingProgress({
                phase: 'apps',
                message: `Loading app: ${inst.app_slug}...`,
                currentOrg: org.login,
                orgsProcessed: i,
                totalOrgs: orgsToProcess.length,
                installationsLoaded: allInstallations.length,
                appsLoaded: appsMap.size,
                repositoriesLoaded: 0,
              });
              
              const app = await github.getApp(inst.app_slug);
              if (abortedRef.current) return;
              if (app) {
                appsMap.set(inst.app_slug, app);
              }
            }
          }
        } catch (e) {
          console.error(`Error loading installations for ${org.login}:`, e);
        }
      }

      if (abortedRef.current) return;

      // Update state with first page data
      setInstallations(allInstallations);
      setApps(appsMap);
      setPagination({
        page: 1,
        perPage: PER_PAGE,
        totalCount,
        totalPages: Math.ceil(totalCount / PER_PAGE),
      });
      
      setLoadingProgress({
        phase: 'complete',
        message: `Loaded ${appsMap.size} apps with ${allInstallations.length} installations`,
        orgsProcessed: orgsToProcess.length,
        totalOrgs: orgsToProcess.length,
        installationsLoaded: allInstallations.length,
        appsLoaded: appsMap.size,
        repositoriesLoaded: 0,
      });
      
      // End initial loading - UI is now visible
      setLoading(false);
      setLoadingProgress(null);
      
      // PHASE 2: Background loading of remaining pages
      const orgsNeedingMorePages = Array.from(orgPagination.entries())
        .filter(([, info]) => info.totalPages > 1);
      
      if (orgsNeedingMorePages.length > 0) {
        const totalPagesOverall = orgsNeedingMorePages.reduce((sum, [, info]) => sum + info.totalPages, 0);
        let pagesLoadedSoFar = orgsNeedingMorePages.length; // Already loaded page 1 of each
        
        setBackgroundProgress({
          isLoading: true,
          pagesLoaded: pagesLoadedSoFar,
          totalPages: totalPagesOverall,
          installationsLoaded: allInstallations.length,
          appsLoaded: appsMap.size,
        });
        
        // Load remaining pages for each org
        for (const [orgLogin, info] of orgsNeedingMorePages) {
          for (let page = 2; page <= info.totalPages; page++) {
            if (abortedRef.current) return;
            try {
              const result = await github.getAppInstallationsForOrg(orgLogin, page, PER_PAGE);
              if (abortedRef.current) return;

              allInstallations = [...allInstallations, ...result.installations];
              
              // Load app details for new installations
              for (const inst of result.installations) {
                if (abortedRef.current) return;
                if (!appsMap.has(inst.app_slug)) {
                  const app = await github.getApp(inst.app_slug);
                  if (abortedRef.current) return;
                  if (app) {
                    appsMap.set(inst.app_slug, app);
                  }
                }
              }
              
              pagesLoadedSoFar++;
              
              // Update state progressively
              setInstallations([...allInstallations]);
              setApps(new Map(appsMap));
              setBackgroundProgress({
                isLoading: true,
                pagesLoaded: pagesLoadedSoFar,
                totalPages: totalPagesOverall,
                installationsLoaded: allInstallations.length,
                appsLoaded: appsMap.size,
              });
            } catch (e) {
              console.error(`Error loading page ${page} for ${orgLogin}:`, e);
            }
          }
        }

        if (abortedRef.current) return;
        
        // Background loading complete
        setBackgroundProgress({
          isLoading: false,
          pagesLoaded: totalPagesOverall,
          totalPages: totalPagesOverall,
          installationsLoaded: allInstallations.length,
          appsLoaded: appsMap.size,
        });
      }
    } catch (e) {
      if (!abortedRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
        setLoading(false);
        setLoadingProgress(null);
      }
    }
  }, [token, enterpriseUrl, filterOrg]);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setPage = useCallback((_page: number) => {
    // Pagination is now handled by progressive loading, not explicit page changes
    // This function is kept for API compatibility but no longer triggers page loads
  }, []);

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
      loadData();
    }
    return () => {
      abortedRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, enterpriseUrl, filterOrg]);

  return {
    organizations,
    installations,
    apps,
    repositories,
    loading,
    loadingProgress,
    backgroundProgress,
    error,
    pagination,
    setPage,
    refreshData,
    loadRepositoriesForInstallation,
  };
}
