import { useState, useEffect, useCallback } from 'react';
import { getGitHubService } from '../services/github';
import type { Repository, ViewMode } from '../types';

interface UseRepoViewOptions {
  viewMode: ViewMode;
  selectedOrg: string;
  token: string;
  enterpriseUrl: string;
}

export function useRepoView({ viewMode, selectedOrg, token, enterpriseUrl }: UseRepoViewOptions) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [repoAppsShown, setRepoAppsShown] = useState(6);

  useEffect(() => {
    const loadRepositories = async () => {
      if (viewMode === 'repositories' && selectedOrg && token) {
        setLoadingRepos(true);
        setSelectedRepo('');
        try {
          const github = getGitHubService(token, enterpriseUrl);
          const result = await github.getRepositoriesForOrg(selectedOrg);
          setRepositories(result.repositories);
        } catch (error) {
          console.error('Failed to load repositories:', error);
          setRepositories([]);
        } finally {
          setLoadingRepos(false);
        }
      } else if (viewMode !== 'repositories') {
        setRepositories([]);
        setSelectedRepo('');
      }
    };
    loadRepositories();
  }, [viewMode, selectedOrg, token, enterpriseUrl]);

  const selectRepo = useCallback((fullName: string) => {
    setSelectedRepo(fullName);
    setRepoAppsShown(6);
  }, []);

  const showMoreApps = useCallback(() => {
    setRepoAppsShown(prev => prev + 6);
  }, []);

  return {
    repositories,
    loadingRepos,
    selectedRepo,
    repoAppsShown,
    selectRepo,
    showMoreApps,
  };
}
