import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Spinner,
  Banner,
  Button,
  Header,
  useTheme,
} from '@primer/react';
import { MarkGithubIcon, SunIcon, MoonIcon } from '@primer/octicons-react';
import { Settings } from './components/Settings';
import { FilterBar } from './components/FilterBar';
import { AppsView } from './components/AppsView';
import { OrgsView } from './components/OrgsView';
import { ReposView } from './components/ReposView';
import { LoadingProgress } from './components/LoadingProgress';
import { useDashboardData } from './hooks/useDashboardData';
import { useAppUsage } from './hooks/useAppUsage';
import { useAppFilters, APPS_PER_PAGE } from './hooks/useAppFilters';
import { useRepoView } from './hooks/useRepoView';
import { useAppState } from './hooks/useAppState';
import type { Repository } from './types';

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
  
  @media (max-width: 640px) {
    padding: 16px 12px;
  }
`;

const WelcomeBox = styled.div`
  text-align: center;
  padding: 48px 32px;
  background: var(--bgColor-default, #fff);
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
  
  @media (max-width: 640px) {
    padding: 24px 16px;
  }
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

function App() {
  const { state, dispatch, setToken, setEnterpriseUrl, setSelectedOrg, setInactiveDays } = useAppState();
  const {
    token, enterpriseUrl, isConnected, selectedOrg, inactiveDays,
    isFirstLoad, usageLoadingStarted, smoothedAuditProgress, usageRefreshKey,
  } = state;
  const [allRepositories] = useState<Repository[]>([]);

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

  const {
    loading: usageLoading,
    loadUsage,
    getUsageForApp,
    configLoaded,
    progress: usageProgress,
  } = useAppUsage(isConnected ? token : '', enterpriseUrl, inactiveDays);

  const {
    filters,
    handleFilterChange,
    appsPage,
    setAppsPage,
    appOwners,
    appSlugs,
    repositoryNames,
    installationsByApp,
    installationsByOrg,
    filteredOrganizations,
    paginatedApps,
    expectedTotalApps,
    expectedTotalPages,
    loadedAppsPages,
  } = useAppFilters({
    installations,
    apps,
    organizations,
    selectedOrg,
    pagination,
    getUsageForApp,
    allRepositories,
  });

  const {
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
  } = useRepoView({
    viewMode: filters.viewMode,
    selectedOrg,
    token,
    enterpriseUrl,
  });

  // Track when first load completes
  useEffect(() => {
    if (isFirstLoad && !loading && usageLoadingStarted && !usageLoading && installations.length > 0) {
      dispatch({ type: 'FIRST_LOAD_COMPLETE' });
    }
  }, [isFirstLoad, loading, usageLoadingStarted, usageLoading, installations.length, dispatch]);

  // Smooth the audit progress - only allow values to increase
  useEffect(() => {
    if (usageProgress) {
      dispatch({
        type: 'UPDATE_AUDIT_PROGRESS',
        payload: {
          checked: usageProgress.appsChecked,
          total: usageProgress.totalApps,
          found: usageProgress.appsFound,
        },
      });
    }
  }, [usageProgress, dispatch]);

  // Reset smoothed progress when audit log checking is complete
  useEffect(() => {
    if (!isFirstLoad && smoothedAuditProgress.total > 0 && smoothedAuditProgress.checked >= smoothedAuditProgress.total) {
      const timer = setTimeout(() => {
        dispatch({ type: 'RESET_AUDIT_PROGRESS' });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isFirstLoad, smoothedAuditProgress.checked, smoothedAuditProgress.total, dispatch]);

  // Load app usage when apps are loaded and config is ready
  useEffect(() => {
    if (apps.size > 0 && organizations.length > 0 && configLoaded) {
      dispatch({ type: 'USAGE_LOADING_STARTED' });
      const slugs = Array.from(apps.keys());
      const orgLogins = organizations.map(o => o.login);
      loadUsage(orgLogins, slugs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps, organizations, configLoaded, usageRefreshKey]);

  const handleConnect = async () => {
    if (isConnected) {
      refreshData();
      dispatch({ type: 'RECONNECT' });
      setAppsPage(1);
    } else {
      dispatch({ type: 'CONNECT' });
    }
  };

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
        <AppsView
          installationsByApp={installationsByApp}
          paginatedApps={paginatedApps}
          apps={apps}
          appsPage={appsPage}
          setAppsPage={setAppsPage}
          expectedTotalApps={expectedTotalApps}
          expectedTotalPages={expectedTotalPages}
          loadedAppsPages={loadedAppsPages}
          appsPerPage={APPS_PER_PAGE}
          backgroundProgress={backgroundProgress}
          isFirstLoad={isFirstLoad}
          smoothedAuditProgress={smoothedAuditProgress}
          usageLoading={usageLoading}
          usageLoadingStarted={usageLoadingStarted}
          usageProgress={usageProgress}
          organizations={organizations}
          token={token}
          enterpriseUrl={enterpriseUrl}
          getUsageForApp={getUsageForApp}
        />
      );
    }

    if (filters.viewMode === 'organizations') {
      return (
        <OrgsView
          filteredOrganizations={filteredOrganizations}
          installationsByOrg={installationsByOrg}
          apps={apps}
          pagination={pagination}
          setPage={setPage}
        />
      );
    }

    if (filters.viewMode === 'repositories') {
      return (
        <ReposView
          repositories={repositories}
          loadingRepos={loadingRepos}
          loadingMoreRepos={loadingMoreRepos}
          hasMoreRepos={hasMoreRepos}
          totalRepos={totalRepos}
          loadMoreRepos={loadMoreRepos}
          selectedRepo={selectedRepo}
          repoAppsShown={repoAppsShown}
          selectRepo={selectRepo}
          showMoreApps={showMoreApps}
          selectedOrg={selectedOrg}
          installationsByOrg={installationsByOrg}
          apps={apps}
        />
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
