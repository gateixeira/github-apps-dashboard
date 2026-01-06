import { useState, useMemo } from 'react';
import { Settings } from './components/Settings';
import { FilterBar } from './components/FilterBar';
import { AppCard } from './components/AppCard';
import { OrgCard } from './components/OrgCard';
import { useDashboardData } from './hooks/useDashboardData';
import type { FilterState, Repository } from './types';
import './App.css';

function App() {
  const [token, setToken] = useState('');
  const [enterpriseUrl, setEnterpriseUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
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
    refreshData 
  } = useDashboardData(isConnected ? token : '', enterpriseUrl);

  const handleConnect = async () => {
    setIsConnected(true);
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Extract unique app owners
  const appOwners = useMemo(() => {
    const owners = new Set<string>();
    apps.forEach(app => {
      if (app.owner) {
        owners.add(app.owner.login);
      }
    });
    return Array.from(owners).sort();
  }, [apps]);

  // Extract unique app slugs
  const appSlugs = useMemo(() => {
    return Array.from(apps.keys()).sort();
  }, [apps]);

  // Extract unique repository names from all repositories
  const repositoryNames = useMemo(() => {
    return allRepositories.map(r => r.full_name).sort();
  }, [allRepositories]);

  // Filter installations based on current filters
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

  // Group installations by app for Apps view
  const installationsByApp = useMemo(() => {
    const grouped = new Map<string, typeof installations>();
    filteredInstallations.forEach(inst => {
      const existing = grouped.get(inst.app_slug) || [];
      grouped.set(inst.app_slug, [...existing, inst]);
    });
    return grouped;
  }, [filteredInstallations]);

  // Group installations by organization for Organizations view
  const installationsByOrg = useMemo(() => {
    const grouped = new Map<string, typeof installations>();
    filteredInstallations.forEach(inst => {
      const existing = grouped.get(inst.account.login) || [];
      grouped.set(inst.account.login, [...existing, inst]);
    });
    return grouped;
  }, [filteredInstallations]);

  // Filter organizations based on selected org filter
  const filteredOrganizations = useMemo(() => {
    if (filters.organization) {
      return organizations.filter(org => org.login === filters.organization);
    }
    return organizations;
  }, [organizations, filters.organization]);

  const renderContent = () => {
    if (!isConnected) {
      return (
        <div className="empty-state">
          <h3>Welcome to GitHub Apps Dashboard</h3>
          <p>Connect to your GitHub Enterprise to view installed apps across organizations.</p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading data from GitHub...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-state">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={refreshData}>Retry</button>
        </div>
      );
    }

    if (filters.viewMode === 'apps') {
      return (
        <div className="apps-view">
          <h2>Apps ({installationsByApp.size})</h2>
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
            <div className="empty-state">
              <p>No apps found matching your filters.</p>
            </div>
          )}
        </div>
      );
    }

    if (filters.viewMode === 'organizations') {
      return (
        <div className="orgs-view">
          <h2>Organizations ({filteredOrganizations.length})</h2>
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
            <div className="empty-state">
              <p>No organizations found matching your filters.</p>
            </div>
          )}
        </div>
      );
    }

    if (filters.viewMode === 'repositories') {
      return (
        <div className="repos-view">
          <h2>Repositories</h2>
          <p className="view-note">
            Select an organization to view its repositories and the apps installed on them.
          </p>
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
            <div className="empty-state">
              <p>Please select an organization to view repositories.</p>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔧 GitHub Apps Dashboard</h1>
        <p>View and manage GitHub Apps across your enterprise organizations</p>
      </header>

      <main className="app-main">
        <Settings
          token={token}
          enterpriseUrl={enterpriseUrl}
          onTokenChange={setToken}
          onEnterpriseUrlChange={setEnterpriseUrl}
          onConnect={handleConnect}
          isConnected={isConnected}
          loading={loading}
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
      </main>

      <footer className="app-footer">
        <p>GitHub Apps Dashboard - View installations across your GitHub Enterprise</p>
      </footer>
    </div>
  );
}

export default App;
