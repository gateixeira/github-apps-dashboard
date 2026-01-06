import { useState, useMemo } from 'react';
import {
  Spinner,
  Banner,
  Button,
  Header,
} from '@primer/react';
import { MarkGithubIcon } from '@primer/octicons-react';
import { Settings } from './components/Settings';
import { FilterBar } from './components/FilterBar';
import { AppCard } from './components/AppCard';
import { OrgCard } from './components/OrgCard';
import { Pagination } from './components/Pagination';
import { useDashboardData } from './hooks/useDashboardData';
import type { FilterState, Repository } from './types';

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column' as const },
  main: { flex: 1 },
  content: { maxWidth: 1400, margin: '0 auto', padding: '32px 24px' },
  welcomeBox: { textAlign: 'center' as const, padding: '48px 32px', background: '#fff', border: '1px solid #d0d7de', borderRadius: 6 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' as const, gap: 8 },
  emptyState: { textAlign: 'center' as const, padding: 32, color: '#6e7781' },
  footer: { background: '#f6f8fa', borderTop: '1px solid #d0d7de', padding: 16, textAlign: 'center' as const },
};

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
        <div style={styles.welcomeBox}>
          <h3 style={{ marginBottom: 8 }}>Welcome to GitHub Apps Dashboard</h3>
          <span style={{ color: '#6e7781' }}>Connect to your GitHub Enterprise to view installed apps across organizations.</span>
        </div>
      );
    }

    if (loading) {
      return (
        <div style={styles.welcomeBox}>
          <Spinner size="large" />
          <div style={{ marginTop: 16, color: '#6e7781' }}>Loading data from GitHub...</div>
        </div>
      );
    }

    if (error) {
      return (
        <Banner variant="critical" title="Error">
          <p>{error}</p>
          <Button onClick={refreshData}>Retry</Button>
        </Banner>
      );
    }

    if (filters.viewMode === 'apps') {
      return (
        <div>
          <div style={styles.header}>
            <h2 style={{ fontSize: 20, margin: 0 }}>Apps ({pagination.totalCount})</h2>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              perPage={pagination.perPage}
              onPageChange={setPage}
            />
          </div>
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
            <div style={styles.emptyState}>
              No apps found matching your filters.
            </div>
          )}
        </div>
      );
    }

    if (filters.viewMode === 'organizations') {
      return (
        <div>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Organizations ({filteredOrganizations.length})</h2>
          {filteredOrganizations.map(org => (
            <OrgCard
              key={org.login}
              organization={org}
              installations={installationsByOrg.get(org.login) || []}
              apps={apps}
              token={token}
              enterpriseUrl={enterpriseUrl}
            />
          ))}
          {filteredOrganizations.length === 0 && (
            <div style={styles.emptyState}>
              No organizations found matching your filters.
            </div>
          )}
        </div>
      );
    }

    if (filters.viewMode === 'repositories') {
      return (
        <div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Repositories</h2>
          <div style={{ color: '#6e7781', marginBottom: 16 }}>
            Select an organization to view its repositories and the apps installed on them.
          </div>
          {filters.organization ? (
            filteredOrganizations.map(org => (
              <OrgCard
                key={org.login}
                organization={org}
                installations={installationsByOrg.get(org.login) || []}
                apps={apps}
                token={token}
                enterpriseUrl={enterpriseUrl}
              />
            ))
          ) : (
            <div style={styles.emptyState}>
              Please select an organization to view repositories.
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div style={styles.container}>
      <Header>
        <Header.Item>
          <Header.Link href="#" style={{ fontSize: 16, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MarkGithubIcon size={32} />
            GitHub Apps Dashboard
          </Header.Link>
        </Header.Item>
        <Header.Item full>
          <span style={{ color: 'rgba(255,255,255,0.7)', marginLeft: 8 }}>
            View and manage GitHub Apps across your enterprise organizations
          </span>
        </Header.Item>
      </Header>

      <div style={styles.main}>
        <div style={styles.content}>
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
        </div>
      </div>

      <footer style={styles.footer}>
        <span style={{ color: '#6e7781', fontSize: 12 }}>
          GitHub Apps Dashboard - View installations across your GitHub Enterprise
        </span>
      </footer>
    </div>
  );
}

export default App;
