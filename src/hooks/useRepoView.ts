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
  const [loadingMoreRepos, setLoadingMoreRepos] = useState(false);
  const [hasMoreRepos, setHasMoreRepos] = useState(false);
  const [totalRepos, setTotalRepos] = useState<number | null>(null);
  const [repoPage, setRepoPage] = useState(1);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [repoAppsShown, setRepoAppsShown] = useState(6);

  useEffect(() => {
    const loadRepositories = async () => {
      if (viewMode === 'repositories' && selectedOrg && token) {
        setLoadingRepos(true);
        setSelectedRepo('');
        setRepoPage(1);
        try {
          const github = getGitHubService(token, enterpriseUrl);
          const result = await github.getRepositoriesForOrg(selectedOrg, 1);
          setRepositories(result.repositories);
          setHasMoreRepos(result.hasMore);
          setTotalRepos(result.totalCount);
        } catch (error) {
          console.error('Failed to load repositories:', error);
          setRepositories([]);
          setHasMoreRepos(false);
          setTotalRepos(null);
        } finally {
          setLoadingRepos(false);
        }
      } else if (viewMode !== 'repositories') {
        setRepositories([]);
        setSelectedRepo('');
        setHasMoreRepos(false);
        setTotalRepos(null);
        setRepoPage(1);
      }
    };
    loadRepositories();
  }, [viewMode, selectedOrg, token, enterpriseUrl]);

  const loadMoreRepos = useCallback(async () => {
    if (!selectedOrg || !token || loadingMoreRepos) return;
    const nextPage = repoPage + 1;
    setLoadingMoreRepos(true);
    try {
      const github = getGitHubService(token, enterpriseUrl);
      const result = await github.getRepositoriesForOrg(selectedOrg, nextPage);
      setRepositories(prev => [...prev, ...result.repositories]);
      setHasMoreRepos(result.hasMore);
      if (result.totalCount !== null) setTotalRepos(result.totalCount);
      setRepoPage(nextPage);
    } catch (error) {
      console.error('Failed to load more repositories:', error);
    } finally {
      setLoadingMoreRepos(false);
    }
  }, [selectedOrg, token, enterpriseUrl, repoPage, loadingMoreRepos]);

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
    loadingMoreRepos,
    hasMoreRepos,
    totalRepos,
    loadMoreRepos,
    selectedRepo,
    repoAppsShown,
    selectRepo,
    showMoreApps,
  };
}
