import type { FC } from 'react';
import type { Repository, AppInstallation, GitHubApp } from '../types';
import './RepoCard.css';

interface RepoCardProps {
  repository: Repository;
  installations: AppInstallation[];
  apps: Map<string, GitHubApp>;
}

export const RepoCard: FC<RepoCardProps> = ({ 
  repository, 
  installations,
  apps 
}) => {
  const getAppForInstallation = (inst: AppInstallation): GitHubApp | undefined => {
    return apps.get(inst.app_slug);
  };

  return (
    <div className="repo-card">
      <div className="repo-card-header">
        <div className="repo-info">
          <img src={repository.owner.avatar_url} alt={repository.owner.login} className="repo-owner-avatar" />
          <div className="repo-details">
            <h3 className="repo-name">
              <a href={repository.html_url} target="_blank" rel="noopener noreferrer">
                {repository.full_name}
              </a>
            </h3>
            {repository.description && (
              <span className="repo-description">{repository.description}</span>
            )}
          </div>
        </div>
        <div className="repo-badges">
          {repository.private && <span className="private-badge">Private</span>}
          <span className="apps-count">{installations.length} app(s)</span>
        </div>
      </div>

      {installations.length > 0 && (
        <div className="repo-card-body">
          <h4>Apps with access to this repository</h4>
          <div className="repo-apps-grid">
            {installations.map(inst => {
              const app = getAppForInstallation(inst);
              return (
                <div key={inst.id} className="repo-app-item">
                  {app?.owner && (
                    <img src={app.owner.avatar_url} alt={app.name} className="repo-app-avatar" />
                  )}
                  <div className="repo-app-details">
                    <span className="repo-app-name">{app?.name || inst.app_slug}</span>
                    <span className="repo-app-slug">@{inst.app_slug}</span>
                    {app?.owner && (
                      <span className="repo-app-owner">by {app.owner.login}</span>
                    )}
                  </div>
                  <div className="repo-app-access">
                    <span className={`access-type ${inst.repository_selection}`}>
                      {inst.repository_selection === 'all' ? 'All repos' : 'Selected'}
                    </span>
                    {inst.suspended_at && <span className="suspended-badge">Suspended</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
