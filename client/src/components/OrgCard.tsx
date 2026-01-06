import type { FC } from 'react';
import { useState, useEffect } from 'react';
import type { Organization, AppInstallation, GitHubApp, Repository } from '../types';
import { api } from '../services/api';
import './OrgCard.css';

interface OrgCardProps {
  organization: Organization;
  installations: AppInstallation[];
  apps: Map<string, GitHubApp>;
  token: string;
  enterpriseUrl?: string;
}

export const OrgCard: FC<OrgCardProps> = ({ 
  organization, 
  installations, 
  apps,
  token, 
  enterpriseUrl 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>('');

  useEffect(() => {
    if (expanded && repositories.length === 0) {
      loadRepositories();
    }
  }, [expanded]);

  const loadRepositories = async () => {
    setLoadingRepos(true);
    try {
      const repos = await api.getRepositoriesForOrg(organization.login, token, enterpriseUrl);
      setRepositories(repos);
    } catch (error) {
      console.error('Failed to load repositories:', error);
    } finally {
      setLoadingRepos(false);
    }
  };

  const getAppForInstallation = (inst: AppInstallation): GitHubApp | undefined => {
    return apps.get(inst.app_slug);
  };

  return (
    <div className="org-card">
      <div className="org-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="org-info">
          <img src={organization.avatar_url} alt={organization.login} className="org-avatar" />
          <div className="org-details">
            <h3 className="org-name">{organization.login}</h3>
            {organization.description && (
              <span className="org-description">{organization.description}</span>
            )}
          </div>
        </div>
        <div className="org-stats">
          <span className="installation-count">{installations.length} app(s) installed</span>
          <span className={`expand-icon ${expanded ? 'expanded' : ''}`}>▼</span>
        </div>
      </div>

      {expanded && (
        <div className="org-card-body">
          <div className="org-apps-section">
            <h4>Installed Apps</h4>
            {installations.length === 0 ? (
              <p className="no-apps">No apps installed in this organization</p>
            ) : (
              <div className="apps-grid">
                {installations.map(inst => {
                  const app = getAppForInstallation(inst);
                  return (
                    <div key={inst.id} className="org-app-item">
                      <div className="org-app-header">
                        {app?.owner && (
                          <img src={app.owner.avatar_url} alt={app.name} className="org-app-avatar" />
                        )}
                        <div className="org-app-info">
                          <span className="org-app-name">{app?.name || inst.app_slug}</span>
                          <span className="org-app-slug">@{inst.app_slug}</span>
                        </div>
                        {inst.suspended_at && <span className="suspended-badge">Suspended</span>}
                      </div>
                      <div className="org-app-meta">
                        <span className={`repo-selection ${inst.repository_selection}`}>
                          {inst.repository_selection === 'all' ? 'All repos' : 'Selected repos'}
                        </span>
                        {app?.owner && (
                          <span className="app-owner-info">by {app.owner.login}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="org-repos-section">
            <h4>Repositories</h4>
            {loadingRepos ? (
              <p className="loading">Loading repositories...</p>
            ) : (
              <>
                <select 
                  value={selectedRepo} 
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="repo-selector"
                >
                  <option value="">Select a repository to see installed apps</option>
                  {repositories.map(repo => (
                    <option key={repo.id} value={repo.full_name}>{repo.name}</option>
                  ))}
                </select>

                {selectedRepo && (
                  <div className="repo-apps">
                    <p className="repo-apps-info">
                      Apps with access to <strong>{selectedRepo}</strong>:
                    </p>
                    <ul className="repo-apps-list">
                      {installations
                        .filter(inst => inst.repository_selection === 'all')
                        .map(inst => {
                          const app = getAppForInstallation(inst);
                          return (
                            <li key={inst.id}>
                              {app?.name || inst.app_slug}
                              <span className="all-repos-badge">All repos</span>
                            </li>
                          );
                        })}
                    </ul>
                    <p className="repo-apps-note">
                      Note: Apps with "Selected repos" access require individual repository checks.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
