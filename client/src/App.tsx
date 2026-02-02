import { useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import {
  Spinner,
  Banner,
  Button,
  Header,
  Text,
  Label,
  Avatar,
  Link,
} from '@primer/react';
import { MarkGithubIcon, LockIcon } from '@primer/octicons-react';
import { Settings } from './components/Settings';
import { FilterBar } from './components/FilterBar';
import { AppCard } from './components/AppCard';
import { OrgCard } from './components/OrgCard';
import { Pagination } from './components/Pagination';
import { AuditLogProgress } from './components/AuditLogProgress';
import { LoadingProgress } from './components/LoadingProgress';
import { useDashboardData } from './hooks/useDashboardData';
import { useAppUsage } from './hooks/useAppUsage';
import { api } from './services/api';
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
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
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

function App() {
  const [token, setToken] = useState('');
  const [enterpriseUrl, setEnterpriseUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
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

  const { 
    organizations, 
    installations, 
    apps, 
    loading, 
    loadingProgress,
    error, 
    pagination,
    setPage,
    refreshData 
  } = useDashboardData(isConnected ? token : '', enterpriseUrl, selectedOrg);

  const {
    loading: usageLoading,
    loadUsage,
    getUsageForApp,
    inactiveDays,
    configLoaded,
    progress: usageProgress,
  } = useAppUsage(isConnected ? token : '', enterpriseUrl);

  // Load app usage when apps are loaded and config is ready
  useEffect(() => {
    if (apps.size > 0 && organizations.length > 0 && configLoaded) {
      const appSlugs = Array.from(apps.keys());
      const orgLogins = organizations.map(o => o.login);
      loadUsage(orgLogins, appSlugs);
    }
  }, [apps, organizations, loadUsage, configLoaded]);

  const handleConnect = async () => {
    setIsConnected(true);
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Load repositories when switching to repositories view with an org selected
  useEffect(() => {
    const loadRepositories = async () => {
      if (filters.viewMode === 'repositories' && selectedOrg && token) {
        setLoadingRepos(true);
        setSelectedRepo('');
        try {
          const result = await api.getRepositoriesForOrg(selectedOrg, token, enterpriseUrl);
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
          <Text sx={{ color: 'fg.muted' }}>Connect to your GitHub Enterprise to view installed apps across organizations.</Text>
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
              <Text as="div" sx={{ color: 'fg.muted', mt: 3 }}>Loading data from GitHub...</Text>
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
              Apps ({installationsByApp.size})
            </SectionTitle>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              perPage={pagination.perPage}
              onPageChange={setPage}
            />
          </ContentHeader>
          {usageLoading && usageProgress && (
            <AuditLogProgress 
              progress={usageProgress}
              totalOrgs={organizations.length}
            />
          )}
          {Array.from(installationsByApp.entries()).map(([slug, insts]) => {
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
              <Text sx={{ color: 'fg.muted' }}>No apps found matching your filters.</Text>
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
              <Text sx={{ color: 'fg.muted' }}>No organizations found matching your filters.</Text>
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
              <Text sx={{ color: 'fg.muted' }}>Loading repositories...</Text>
            </LoadingRow>
          ) : repositories.length === 0 ? (
            <EmptyState>
              <Text sx={{ color: 'fg.muted' }}>No repositories found for this organization.</Text>
            </EmptyState>
          ) : (
            <RepoViewContainer>
              <RepoList>
                {repositories.map(repo => (
                  <RepoListItem 
                    key={repo.id} 
                    $selected={repo.full_name === selectedRepo}
                    onClick={() => setSelectedRepo(repo.full_name)}
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
                    <Text sx={{ color: 'fg.muted' }}>Select a repository to see installed apps</Text>
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
                      {orgInstallations
                        .filter(inst => inst.repository_selection === 'all')
                        .map(inst => {
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
                    </AppsList>
                    <Text as="div" sx={{ mt: 2, fontSize: 0, color: 'fg.muted', fontStyle: 'italic' }}>
                      Note: Apps with "Selected repos" access require individual repository checks.
                    </Text>
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

  return (
    <Container>
      <Header>
        <Header.Item>
          <Header.Link href="#" sx={{ fontSize: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MarkGithubIcon size={32} />
            GitHub Apps Dashboard
          </Header.Link>
        </Header.Item>
        <Header.Item full>
          <Text sx={{ color: 'header.text', opacity: 0.7, ml: 2 }}>
            View and manage GitHub Apps across your enterprise organizations
          </Text>
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
        <Text sx={{ color: 'fg.muted', fontSize: 0 }}>
          GitHub Apps Dashboard{' | '}View installations across your GitHub Enterprise{' | '}Made by{' '}
          <a href="https://github.com/gateixeira" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
            @gateixeira
          </a>
          {' | '}
          <a href="https://github.com/gateixeira/github-apps-dashboard" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
            View on GitHub
          </a>
        </Text>
      </Footer>
    </Container>
  );
}

export default App;
