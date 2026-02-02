import { useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import {
  Spinner,
  Banner,
  Button,
  Header,
  Label,
  Avatar,
  Link,
  useTheme,
  ProgressBar,
} from '@primer/react';
import { MarkGithubIcon, LockIcon, SunIcon, MoonIcon } from '@primer/octicons-react';
import { Settings } from './components/Settings';
import { FilterBar } from './components/FilterBar';
import { AppCard } from './components/AppCard';
import { OrgCard } from './components/OrgCard';
import { Pagination } from './components/Pagination';
import { AuditLogProgress } from './components/AuditLogProgress';
import { LoadingProgress } from './components/LoadingProgress';
import { useDashboardData } from './hooks/useDashboardData';
import { useAppUsage } from './hooks/useAppUsage';
import { getGitHubService } from './services/github';
import type { FilterState, Repository } from './types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Main = styled.main`
  flex: 1;
  background: var(--bgColor-muted, #f6f8fa);
`;

const Content = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
`;

const WelcomeBox = styled.div`
  text-align: center;
  padding: 48px 32px;
  background: var(--bgColor-default, #fff);
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
`;

const ContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px;
`;

const SectionTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
`;

const WelcomeTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 16px 0;
`;

const WelcomeDescription = styled.p`
  font-size: 14px;
  color: var(--fgColor-muted, #656d76);
  margin: 0 0 12px 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.5;
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 24px auto;
  max-width: 600px;
  text-align: left;
`;

const FeatureItem = styled.li`
  font-size: 14px;
  color: var(--fgColor-default, #1f2328);
  padding: 10px 0;
  padding-left: 28px;
  position: relative;
  line-height: 1.5;
  
  &::before {
    content: "✓";
    color: var(--fgColor-success, #1a7f37);
    font-weight: bold;
    position: absolute;
    left: 0;
  }
`;

const FeatureTitle = styled.strong`
  color: var(--fgColor-default, #1f2328);
`;

const RepoLink = styled.a`
  color: var(--fgColor-accent, #0969da);
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

const Footer = styled.footer`
  background: var(--bgColor-muted, #f6f8fa);
  border-top: 1px solid var(--borderColor-default, #d0d7de);
  padding: 16px;
  text-align: center;
`;

const LoadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MutedText = styled.span`
  color: var(--fgColor-muted, #656d76);
`;

const LoadingMessage = styled.div`
  color: var(--fgColor-muted, #656d76);
  margin-top: 12px;
`;

const FooterText = styled.span`
  color: var(--fgColor-muted, #656d76);
  font-size: 12px;
`;

const HeaderTitle = styled.a`
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--header-fgColor-default, #fff);
  text-decoration: none;
  &:hover {
    text-decoration: none;
  }
`;

const HeaderSubtitle = styled.span`
  color: var(--header-fgColor-default, #fff);
  opacity: 0.7;
  margin-left: 8px;
`;

const ThemeButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: var(--header-fgColor-default, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    opacity: 0.8;
  }
`;

const RepoSelectHint = styled.div`
  color: var(--fgColor-muted, #656d76);
  font-style: italic;
  margin-top: 8px;
  font-size: 14px;
`;

const RepoViewContainer = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 16px;
  min-height: 400px;
`;

const RepoList = styled.div`
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
  background: var(--bgColor-default, #fff);
  overflow: hidden;
  max-height: 600px;
  overflow-y: auto;
`;

const RepoListItem = styled.div<{ $selected?: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid var(--borderColor-default, #d0d7de);
  cursor: pointer;
  background: ${props => props.$selected ? 'var(--bgColor-accent-muted, #ddf4ff)' : 'transparent'};
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: ${props => props.$selected ? 'var(--bgColor-accent-muted, #ddf4ff)' : 'var(--bgColor-muted, #f6f8fa)'};
  }
`;

const RepoName = styled.div`
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RepoMeta = styled.div`
  font-size: 12px;
  color: var(--fgColor-muted, #6e7781);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`;

const RepoDetails = styled.div`
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
  background: var(--bgColor-default, #fff);
  padding: 16px;
`;

const RepoDetailsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--borderColor-default, #d0d7de);
`;

const RepoDetailsTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0;
`;

const RepoDetailsDescription = styled.p`
  font-size: 14px;
  color: var(--fgColor-muted, #6e7781);
  margin: 0;
`;

const AppsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const AppItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bgColor-muted, #f6f8fa);
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
`;

const AppItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const AppItemName = styled.div`
  font-weight: 600;
  font-size: 14px;
`;

const AppItemSlug = styled.div`
  font-size: 12px;
  color: var(--fgColor-muted, #6e7781);
`;

const ShowMoreContainer = styled.div`
  margin-top: 12px;
  text-align: center;
`;

const BackgroundLoadingBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bgColor-accent-muted, #ddf4ff);
  border-radius: 6px;
  margin-bottom: 16px;
`;

const BackgroundLoadingText = styled.span`
  font-size: 13px;
  color: var(--fgColor-accent, #0969da);
  white-space: nowrap;
`;

const BackgroundProgressWrapper = styled.div`
  flex: 1;
  min-width: 100px;
`;

function App() {
  const [token, setToken] = useState('');
  const [enterpriseUrl, setEnterpriseUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [inactiveDays, setInactiveDays] = useState(90);
  const [filters, setFilters] = useState<FilterState>({
    appOwner: '',
    appSlug: '',
    repository: '',
    viewMode: 'apps',
    usageFilter: 'all',
  });
  const [allRepositories] = useState<Repository[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [repoAppsShown, setRepoAppsShown] = useState(6);
  const [appsPage, setAppsPage] = useState(1);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const { 
    organizations, 
    installations, 
    apps, 
    loading, 
    loadingProgress,
    backgroundProgress,
    error, 
    pagination,
    setPage,
    refreshData 
  } = useDashboardData(isConnected ? token : '', enterpriseUrl, selectedOrg);

  // Track when first load completes
  const handleFirstLoadComplete = () => {
    if (isFirstLoad && !loading && installations.length > 0) {
      setIsFirstLoad(false);
    }
  };

  // Call this when loading transitions to false
  if (!loading && isFirstLoad && installations.length > 0) {
    handleFirstLoadComplete();
  }

  const {
    loading: usageLoading,
    loadUsage,
    getUsageForApp,
    configLoaded,
    progress: usageProgress,
  } = useAppUsage(isConnected ? token : '', enterpriseUrl, inactiveDays);

  // Track a refresh counter to force re-fetching usage data on Reconnect
  const [usageRefreshKey, setUsageRefreshKey] = useState(0);

  // Load app usage when apps are loaded and config is ready, or when refresh is triggered
  useEffect(() => {
    if (apps.size > 0 && organizations.length > 0 && configLoaded) {
      const appSlugs = Array.from(apps.keys());
      const orgLogins = organizations.map(o => o.login);
      loadUsage(orgLogins, appSlugs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps, organizations, configLoaded, usageRefreshKey]);

  const handleConnect = async () => {
    if (isConnected) {
      // Trigger a full refresh of data and usage
      refreshData();
      setUsageRefreshKey(prev => prev + 1);
      setAppsPage(1);
      setIsFirstLoad(true);
    } else {
      setIsConnected(true);
    }
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setAppsPage(1); // Reset to first page when filters change
  };

  // Load repositories when switching to repositories view with an org selected
  useEffect(() => {
    const loadRepositories = async () => {
      if (filters.viewMode === 'repositories' && selectedOrg && token) {
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
      } else if (filters.viewMode !== 'repositories') {
        setRepositories([]);
        setSelectedRepo('');
      }
    };
    loadRepositories();
  }, [filters.viewMode, selectedOrg, token, enterpriseUrl]);

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
      // Filter by selected org (from Settings, always set)
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
    const grouped = new Map<string, typeof installations>();
    filteredInstallations.forEach(inst => {
      // Filter by usage status
      if (filters.usageFilter !== 'all') {
        const usage = getUsageForApp(inst.app_slug);
        if (filters.usageFilter === 'active') {
          // Show only active apps
          if (!usage || usage.status !== 'active') {
            return;
          }
        } else if (filters.usageFilter === 'inactive') {
          // Show only inactive apps (including unknown)
          if (usage && usage.status === 'active') {
            return;
          }
        }
      }
      const existing = grouped.get(inst.app_slug) || [];
      grouped.set(inst.app_slug, [...existing, inst]);
    });
    return grouped;
  }, [filteredInstallations, filters.usageFilter, getUsageForApp]);

  // Paginated apps for display (30 per page)
  const APPS_PER_PAGE = 30;
  const paginatedApps = useMemo(() => {
    const allApps = Array.from(installationsByApp.entries());
    const startIndex = (appsPage - 1) * APPS_PER_PAGE;
    const endIndex = startIndex + APPS_PER_PAGE;
    return allApps.slice(startIndex, endIndex);
  }, [installationsByApp, appsPage]);

  // Total pages based on API totalCount (expected total), loaded pages based on current data
  const expectedTotalApps = pagination.totalCount;
  const expectedTotalPages = Math.ceil(expectedTotalApps / APPS_PER_PAGE);
  const loadedAppsPages = Math.ceil(installationsByApp.size / APPS_PER_PAGE);

  const installationsByOrg = useMemo(() => {
    const grouped = new Map<string, typeof installations>();
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

  const renderContent = () => {
    if (!isConnected) {
      return (
        <WelcomeBox>
          <WelcomeTitle>Welcome to GitHub Apps Dashboard</WelcomeTitle>
          <WelcomeDescription>
            View and analyze GitHub App installations across your organizations. 
            Identify inactive apps, check installation scopes, and understand your GitHub Apps landscape.
          </WelcomeDescription>
          
          <FeatureList>
            <FeatureItem>
              <FeatureTitle>100% Client-Only:</FeatureTitle> Your token never leaves your browser. All API calls go directly to GitHub.
            </FeatureItem>
            <FeatureItem>
              <FeatureTitle>Privacy First:</FeatureTitle> No server, no storage, no tracking. Your credentials are only used in-memory during your session.
            </FeatureItem>
            <FeatureItem>
              <FeatureTitle>Rate Limit Aware:</FeatureTitle> Respects GitHub API rate limits associated with your Personal Access Token.
            </FeatureItem>
            <FeatureItem>
              <FeatureTitle>Open Source:</FeatureTitle> Fully transparent and auditable. View the source on <RepoLink href="https://github.com/gateixeira/github-apps-dashboard" target="_blank" rel="noopener noreferrer">GitHub</RepoLink>.
            </FeatureItem>
          </FeatureList>
          
          <MutedText>Enter your token above and select an organization to get started.</MutedText>
        </WelcomeBox>
      );
    }

    if (loading) {
      return (
        <WelcomeBox>
          {loadingProgress ? (
            <LoadingProgress progress={loadingProgress} />
          ) : (
            <>
              <Spinner size="large" />
              <LoadingMessage>Loading data from GitHub...</LoadingMessage>
            </>
          )}
        </WelcomeBox>
      );
    }

    if (error) {
      return (
        <Banner variant="critical" title="Error">
          <p>{error}</p>
          <Button variant="danger" onClick={refreshData}>Retry</Button>
        </Banner>
      );
    }

    if (filters.viewMode === 'apps') {
      return (
        <div>
          <ContentHeader>
            <SectionTitle>
              Apps ({installationsByApp.size}{expectedTotalApps > installationsByApp.size ? ` of ${expectedTotalApps}` : ''})
            </SectionTitle>
            <Pagination
              currentPage={appsPage}
              totalPages={expectedTotalPages}
              totalCount={expectedTotalApps}
              perPage={APPS_PER_PAGE}
              onPageChange={setAppsPage}
              loadedPages={loadedAppsPages}
            />
          </ContentHeader>
          {backgroundProgress && backgroundProgress.isLoading && (
            <BackgroundLoadingBar>
              <BackgroundLoadingText>
                Loading more apps... ({backgroundProgress.installationsLoaded} installations, {backgroundProgress.appsLoaded} apps)
              </BackgroundLoadingText>
              <BackgroundProgressWrapper>
                <ProgressBar 
                  progress={(backgroundProgress.pagesLoaded / backgroundProgress.totalPages) * 100}
                  barSize="small"
                  aria-label="Background loading progress"
                />
              </BackgroundProgressWrapper>
              <BackgroundLoadingText>
                {Math.round((backgroundProgress.pagesLoaded / backgroundProgress.totalPages) * 100)}%
              </BackgroundLoadingText>
            </BackgroundLoadingBar>
          )}
          {isFirstLoad && usageLoading && usageProgress && (
            <AuditLogProgress 
              progress={usageProgress}
              totalOrgs={organizations.length}
            />
          )}
          {paginatedApps.map(([slug, insts]) => {
            const app = apps.get(slug);
            if (!app) return null;
            const usageInfo = getUsageForApp(slug);
            return (
              <AppCard 
                key={slug} 
                app={app} 
                installations={insts}
                token={token}
                enterpriseUrl={enterpriseUrl}
                usageInfo={usageInfo}
              />
            );
          })}
          {installationsByApp.size === 0 && (
            <EmptyState>
              <MutedText>No apps found matching your filters.</MutedText>
            </EmptyState>
          )}
        </div>
      );
    }

    if (filters.viewMode === 'organizations') {
      return (
        <div>
          <SectionTitle>Organizations ({filteredOrganizations.length})</SectionTitle>
          {filteredOrganizations.map(org => {
            const orgInstallations = installationsByOrg.get(org.login) || [];
            const totalForOrg = filteredOrganizations.length === 1 ? pagination.totalCount : undefined;
            const showPagination = filteredOrganizations.length === 1;
            return (
              <OrgCard
                key={org.login}
                organization={org}
                installations={orgInstallations}
                apps={apps}
                totalInstallations={totalForOrg}
                pagination={showPagination ? pagination : undefined}
                onPageChange={showPagination ? setPage : undefined}
              />
            );
          })}
          {filteredOrganizations.length === 0 && (
            <EmptyState>
              <MutedText>No organizations found matching your filters.</MutedText>
            </EmptyState>
          )}
        </div>
      );
    }

    if (filters.viewMode === 'repositories') {
      const getAppForInstallation = (inst: typeof installations[0]) => {
        return apps.get(inst.app_slug);
      };

      // Get installations for the selected organization
      const orgInstallations = selectedOrg 
        ? installationsByOrg.get(selectedOrg) || []
        : [];

      // Find the selected repository object
      const selectedRepository = repositories.find(r => r.full_name === selectedRepo);

      return (
        <div>
          <SectionTitle>Repositories {repositories.length > 0 && `(${repositories.length})`}</SectionTitle>
          {loadingRepos ? (
            <LoadingRow>
              <Spinner size="small" />
              <MutedText>Loading repositories...</MutedText>
            </LoadingRow>
          ) : repositories.length === 0 ? (
            <EmptyState>
              <MutedText>No repositories found for this organization.</MutedText>
            </EmptyState>
          ) : (
            <RepoViewContainer>
              <RepoList>
                {repositories.map(repo => (
                  <RepoListItem 
                    key={repo.id} 
                    $selected={repo.full_name === selectedRepo}
                    onClick={() => {
                      setSelectedRepo(repo.full_name);
                      setRepoAppsShown(6);
                    }}
                  >
                    <RepoName>{repo.name}</RepoName>
                    <RepoMeta>
                      {repo.private && (
                        <>
                          <LockIcon size={12} />
                          <span>Private</span>
                        </>
                      )}
                    </RepoMeta>
                  </RepoListItem>
                ))}
              </RepoList>

              <RepoDetails>
                {!selectedRepo ? (
                  <EmptyState>
                    <MutedText>Select a repository to see installed apps</MutedText>
                  </EmptyState>
                ) : selectedRepository && (
                  <>
                    <RepoDetailsHeader>
                      <Avatar src={selectedRepository.owner.avatar_url} size={40} alt={selectedRepository.owner.login} />
                      <div>
                        <RepoDetailsTitle>
                          <Link href={selectedRepository.html_url} target="_blank">{selectedRepository.full_name}</Link>
                        </RepoDetailsTitle>
                        {selectedRepository.description && (
                          <RepoDetailsDescription>{selectedRepository.description}</RepoDetailsDescription>
                        )}
                      </div>
                      {selectedRepository.private && <Label variant="danger">Private</Label>}
                    </RepoDetailsHeader>

                    <SectionTitle>Apps with access</SectionTitle>
                    <AppsList>
                      {(() => {
                        const allRepoApps = orgInstallations.filter(inst => inst.repository_selection === 'all');
                        const visibleApps = allRepoApps.slice(0, repoAppsShown);
                        const hasMore = allRepoApps.length > repoAppsShown;
                        const remainingCount = allRepoApps.length - repoAppsShown;
                        
                        return (
                          <>
                            {visibleApps.map(inst => {
                              const app = getAppForInstallation(inst);
                              return (
                                <AppItem key={inst.id}>
                                  {app?.owner && (
                                    <Avatar src={app.owner.avatar_url} size={32} square alt={app.name} />
                                  )}
                                  <AppItemInfo>
                                    <AppItemName>{app?.name || inst.app_slug}</AppItemName>
                                    <AppItemSlug>@{inst.app_slug}</AppItemSlug>
                                  </AppItemInfo>
                                  <Label variant="accent" size="small">All repos</Label>
                                </AppItem>
                              );
                            })}
                            {hasMore && (
                              <ShowMoreContainer>
                                <Button 
                                  variant="invisible" 
                                  onClick={() => setRepoAppsShown(prev => prev + 6)}
                                >
                                  Show more ({remainingCount} remaining)
                                </Button>
                              </ShowMoreContainer>
                            )}
                          </>
                        );
                      })()}
                    </AppsList>
                    <RepoSelectHint>
                      Note: Apps with "Selected repos" access require individual repository checks.
                    </RepoSelectHint>
                  </>
                )}
              </RepoDetails>
            </RepoViewContainer>
          )}
        </div>
      );
    }

    return null;
  };

  const { resolvedColorMode, setColorMode } = useTheme();
  const isDark = resolvedColorMode === 'night' || resolvedColorMode === 'dark';

  return (
    <Container>
      <Header>
        <Header.Item>
          <HeaderTitle href="#">
            <MarkGithubIcon size={32} />
            GitHub Apps Dashboard
          </HeaderTitle>
        </Header.Item>
        <Header.Item full>
          <HeaderSubtitle>
            View and manage GitHub Apps across your organizations
          </HeaderSubtitle>
        </Header.Item>
        <Header.Item>
          <ThemeButton
            onClick={() => setColorMode(isDark ? 'day' : 'night')}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </ThemeButton>
        </Header.Item>
      </Header>

      <Main>
        <Content>
          <Settings
            token={token}
            enterpriseUrl={enterpriseUrl}
            onTokenChange={setToken}
            onEnterpriseUrlChange={setEnterpriseUrl}
            onConnect={handleConnect}
            isConnected={isConnected}
            loading={loading}
            selectedOrg={selectedOrg}
            onSelectedOrgChange={setSelectedOrg}
            inactiveDays={inactiveDays}
            onInactiveDaysChange={setInactiveDays}
          />

          {isConnected && !loading && (
            <FilterBar
              appOwners={appOwners}
              appSlugs={appSlugs}
              repositories={repositoryNames}
              filters={filters}
              onFilterChange={handleFilterChange}
              inactiveDays={inactiveDays}
            />
          )}

          {renderContent()}
        </Content>
      </Main>

      <Footer>
        <FooterText>
          GitHub Apps Dashboard{' | '}View installations across your GitHub Enterprise{' | '}Made by{' '}
          <a href="https://github.com/gateixeira" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
            @gateixeira
          </a>
          {' | '}
          <a href="https://github.com/gateixeira/github-apps-dashboard" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
            View on GitHub
          </a>
        </FooterText>
      </Footer>
    </Container>
  );
}

export default App;
