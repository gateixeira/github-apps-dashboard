import type { FC } from 'react';
import { useState, useEffect } from 'react';
import type { GitHubApp, AppInstallation, Repository } from '../types';
import { api } from '../services/api';
import './AppCard.css';

interface AppCardProps {
  app: GitHubApp;
  installations: AppInstallation[];
  token: string;
  enterpriseUrl?: string;
}

export const AppCard: FC<AppCardProps> = ({ app, installations, token, enterpriseUrl }) => {
  const [expanded, setExpanded] = useState(false);
  const [repositories, setRepositories] = useState<Map<number, Repository[]>>(new Map());
  const [loadingRepos, setLoadingRepos] = useState<Set<number>>(new Set());

  const loadRepositories = async (installationId: number) => {
    if (repositories.has(installationId) || loadingRepos.has(installationId)) return;

    setLoadingRepos(prev => new Set(prev).add(installationId));
    try {
      const repos = await api.getInstallationRepositories(installationId, token, enterpriseUrl);
      setRepositories(prev => new Map(prev).set(installationId, repos));
    } catch (error) {
      console.error('Failed to load repositories:', error);
    } finally {
      setLoadingRepos(prev => {
        const next = new Set(prev);
        next.delete(installationId);
        return next;
      });
    }
  };

  useEffect(() => {
    if (expanded) {
      installations.forEach(inst => loadRepositories(inst.id));
    }
  }, [expanded, installations]);

  return (
    <div className="app-card">
      <div className="app-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="app-info">
          {app.owner && (
            <img src={app.owner.avatar_url} alt={app.owner.login} className="app-owner-avatar" />
          )}
          <div className="app-details">
            <h3 className="app-name">{app.name}</h3>
            <span className="app-slug">@{app.slug}</span>
            {app.owner && <span className="app-owner">by {app.owner.login}</span>}
          </div>
        </div>
        <div className="app-stats">
          <span className="installation-count">{installations.length} installation(s)</span>
          <span className={`expand-icon ${expanded ? 'expanded' : ''}`}>▼</span>
        </div>
      </div>

      {expanded && (
        <div className="app-card-body">
          {app.description && <p className="app-description">{app.description}</p>}
          
          <div className="installations-list">
            <h4>Installations</h4>
            {installations.map(inst => (
              <div key={inst.id} className="installation-item">
                <div className="installation-header">
                  <img src={inst.account.avatar_url} alt={inst.account.login} className="installation-avatar" />
                  <div className="installation-info">
                    <span className="installation-account">{inst.account.login}</span>
                    <span className="installation-type">{inst.account.type}</span>
                    <span className={`repo-selection ${inst.repository_selection}`}>
                      {inst.repository_selection === 'all' ? 'All repositories' : 'Selected repositories'}
                    </span>
                  </div>
                  {inst.suspended_at && <span className="suspended-badge">Suspended</span>}
                </div>
                
                <div className="installation-repos">
                  {loadingRepos.has(inst.id) && <span className="loading">Loading repositories...</span>}
                  {repositories.has(inst.id) && (
                    <ul className="repo-list">
                      {repositories.get(inst.id)!.map(repo => (
                        <li key={repo.id} className="repo-item">
                          <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                            {repo.full_name}
                          </a>
                          {repo.private && <span className="private-badge">Private</span>}
                        </li>
                      ))}
                      {repositories.get(inst.id)!.length === 0 && (
                        <li className="no-repos">No repositories accessible</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="app-permissions">
            <h4>Permissions</h4>
            <div className="permissions-grid">
              {Object.entries(app.permissions).map(([key, value]) => (
                <span key={key} className="permission-badge">
                  {key}: {value}
                </span>
              ))}
            </div>
          </div>

          {app.events.length > 0 && (
            <div className="app-events">
              <h4>Events</h4>
              <div className="events-grid">
                {app.events.map(event => (
                  <span key={event} className="event-badge">{event}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
