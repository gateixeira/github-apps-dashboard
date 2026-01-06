import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  Spinner,
  Banner,
  Button,
  Header,
  Text,
} from '@primer/react';
import { MarkGithubIcon } from '@primer/octicons-react';
import { Settings } from './components/Settings';
import { FilterBar } from './components/FilterBar';
import { AppCard } from './components/AppCard';
import { OrgCard } from './components/OrgCard';
import { Pagination } from './components/Pagination';
import { useDashboardData } from './hooks/useDashboardData';
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

function App() {
  const [token, setToken] = useState('');
  const [enterpriseUrl, setEnterpriseUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    organization: '',
    appOwner: '',
    appSlug: '',
    repository: '',
    viewMode: 'apps',
  });
  const [allRepositories] = useState<Repository[]>([]);

  const { 
    organizations, 
    installations, 
    apps, 
    loading, 
    error, 
    pagination,
    setPage,
    refreshData 
  } = useDashboardData(isConnected ? token : '', enterpriseUrl, selectedOrg);

  const handleConnect = async () => {
    setIsConnected(true);
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

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
      if (filters.organization && inst.account.login !== filters.organization) {
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
  }, [installations, filters, apps]);

  const installationsByApp = useMemo(() => {
    const grouped = new Map<string, typeof installations>();
    filteredInstallations.forEach(inst => {
      const existing = grouped.get(inst.app_slug) || [];
      grouped.set(inst.app_slug, [...existing, inst]);
    });
    return grouped;
  }, [filteredInstallations]);

  const installationsByOrg = useMemo(() => {
    const grouped = new Map<string, typeof installations>();
    filteredInstallations.forEach(inst => {
      const existing = grouped.get(inst.account.login) || [];
      grouped.set(inst.account.login, [...existing, inst]);
    });
    return grouped;
  }, [filteredInstallations]);

  const filteredOrganizations = useMemo(() => {
    if (filters.organization) {
      return organizations.filter(org => org.login === filters.organization);
    }
    return organizations;
  }, [organizations, filters.organization]);

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
          <Spinner size="large" />
          <Text as="div" sx={{ color: 'fg.muted', mt: 3 }}>Loading data from GitHub...</Text>
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
            <SectionTitle>Apps ({pagination.totalCount})</SectionTitle>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              perPage={pagination.perPage}
              onPageChange={setPage}
            />
          </ContentHeader>
          {Array.from(installationsByApp.entries()).map(([slug, insts]) => {
            const app = apps.get(slug);
            if (!app) return null;
            return (
              <AppCard 
                key={slug} 
                app={app} 
                installations={insts}
                token={token}
                enterpriseUrl={enterpriseUrl}
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
                token={token}
                enterpriseUrl={enterpriseUrl}
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
      return (
        <div>
          <SectionTitle>Repositories</SectionTitle>
          <Text as="div" sx={{ color: 'fg.muted', mb: 3 }}>
            Select an organization to view its repositories and the apps installed on them.
          </Text>
          {filters.organization ? (
            filteredOrganizations.map(org => {
              const orgInstallations = installationsByOrg.get(org.login) || [];
              const totalForOrg = filteredOrganizations.length === 1 ? pagination.totalCount : undefined;
              const showPagination = filteredOrganizations.length === 1;
              return (
                <OrgCard
                  key={org.login}
                  organization={org}
                  installations={orgInstallations}
                  apps={apps}
                  token={token}
                  enterpriseUrl={enterpriseUrl}
                  totalInstallations={totalForOrg}
                  pagination={showPagination ? pagination : undefined}
                  onPageChange={showPagination ? setPage : undefined}
                />
              );
            })
          ) : (
            <EmptyState>
              <Text sx={{ color: 'fg.muted' }}>Please select an organization to view repositories.</Text>
            </EmptyState>
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
          <Header.Link href="#" sx={{ fontSize: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 2 }}>
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
              organizations={organizations}
              appOwners={appOwners}
              appSlugs={appSlugs}
              repositories={repositoryNames}
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          )}

          {renderContent()}
        </Content>
      </Main>

      <Footer>
        <Text sx={{ color: 'fg.muted', fontSize: 0 }}>
          GitHub Apps Dashboard - View installations across your GitHub Enterprise
        </Text>
      </Footer>
    </Container>
  );
}

export default App;
