import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Organization, AppInstallation, GitHubApp, Repository } from '../types';

interface UseDashboardDataResult {
  organizations: Organization[];
  installations: AppInstallation[];
  apps: Map<string, GitHubApp>;
  repositories: Map<number, Repository[]>;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  loadRepositoriesForInstallation: (installationId: number) => Promise<void>;
}

export function useDashboardData(token: string, enterpriseUrl?: string): UseDashboardDataResult {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [installations, setInstallations] = useState<AppInstallation[]>([]);
  const [apps, setApps] = useState<Map<string, GitHubApp>>(new Map());
  const [repositories, setRepositories] = useState<Map<number, Repository[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const orgs = await api.getOrganizations(token, enterpriseUrl);
      setOrganizations(orgs);

      const allInstallations: AppInstallation[] = [];
      const appsMap = new Map<string, GitHubApp>();

      for (const org of orgs) {
        try {
          const orgInstallations = await api.getInstallationsForOrg(org.login, token, enterpriseUrl);
          allInstallations.push(...orgInstallations);

          for (const inst of orgInstallations) {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token, enterpriseUrl]);

  const loadRepositoriesForInstallation = useCallback(async (installationId: number) => {
    if (repositories.has(installationId)) return;

    try {
      const repos = await api.getInstallationRepositories(installationId, token, enterpriseUrl);
      setRepositories(prev => new Map(prev).set(installationId, repos));
    } catch (e) {
      console.error(`Error loading repositories for installation ${installationId}:`, e);
    }
  }, [token, enterpriseUrl, repositories]);

  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token, enterpriseUrl]);

  return {
    organizations,
    installations,
    apps,
    repositories,
    loading,
    error,
    refreshData,
    loadRepositoriesForInstallation,
  };
}
