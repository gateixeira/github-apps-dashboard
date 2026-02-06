import { useState, useEffect, useCallback, useRef } from 'react';
import { getGitHubService } from '../services/github';
import type { Repository, ViewMode } from '../types';

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

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
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadRepositories = async () => {
      if (viewMode === 'repositories' && selectedOrg && token) {
        // Cancel previous repo load
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const { signal } = controller;

        setLoadingRepos(true);
        setSelectedRepo('');
        setRepoPage(1);
        try {
          const github = getGitHubService(token, enterpriseUrl);
          const result = await github.getRepositoriesForOrg(selectedOrg, 1, 30, signal);
          if (signal.aborted) return;
          setRepositories(result.repositories);
          setHasMoreRepos(result.hasMore);
          setTotalRepos(result.totalCount);
        } catch (error) {
          if (isAbortError(error)) return;
          console.error('Failed to load repositories:', error);
          setRepositories([]);
          setHasMoreRepos(false);
          setTotalRepos(null);
        } finally {
          if (!controller.signal.aborted) {
            setLoadingRepos(false);
          }
        }
      } else if (viewMode !== 'repositories') {
        abortControllerRef.current?.abort();
        setRepositories([]);
        setSelectedRepo('');
        setHasMoreRepos(false);
        setTotalRepos(null);
        setRepoPage(1);
      }
    };
    loadRepositories();

    return () => {
      abortControllerRef.current?.abort();
    };
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
      if (isAbortError(error)) return;
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
