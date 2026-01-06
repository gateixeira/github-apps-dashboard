import type { FC } from 'react';
import {
  Avatar,
  Label,
  Link,
  CounterLabel,
} from '@primer/react';
import type { Repository, AppInstallation, GitHubApp } from '../types';

interface RepoCardProps {
  repository: Repository;
  installations: AppInstallation[];
  apps: Map<string, GitHubApp>;
}

const cardStyle = {
  border: '1px solid #d0d7de',
  borderRadius: 6,
  marginBottom: 8,
  background: '#fff',
  overflow: 'hidden' as const,
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 16,
  background: '#f6f8fa',
  borderBottom: '1px solid #d0d7de',
};

export const RepoCard: FC<RepoCardProps> = ({ 
  repository, 
  installations,
  apps 
}) => {
  const getAppForInstallation = (inst: AppInstallation): GitHubApp | undefined => {
    return apps.get(inst.app_slug);
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar src={repository.owner.avatar_url} size={40} alt={repository.owner.login} />
          <div>
            <h3 style={{ fontSize: 16, margin: 0 }}>
              <Link href={repository.html_url} target="_blank">
                {repository.full_name}
              </Link>
            </h3>
            {repository.description && (
              <span style={{ fontSize: 14, color: '#6e7781' }}>{repository.description}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {repository.private && <Label variant="danger">Private</Label>}
          <CounterLabel>{installations.length} app(s)</CounterLabel>
        </div>
      </div>

      {installations.length > 0 && (
        <div style={{ padding: 16 }}>
          <h4 style={{ fontSize: 12, marginBottom: 8 }}>Apps with access to this repository</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
            {installations.map(inst => {
              const app = getAppForInstallation(inst);
              return (
                <div
                  key={inst.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 12,
                    background: '#f6f8fa',
                    border: '1px solid #d0d7de',
                    borderRadius: 6,
                  }}
                >
                  {app?.owner && (
                    <Avatar src={app.owner.avatar_url} size={32} square alt={app.name} />
                  )}
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 'bold', display: 'block' }}>{app?.name || inst.app_slug}</span>
                    <span style={{ fontSize: 12, color: '#6e7781' }}>@{inst.app_slug}</span>
                    {app?.owner && (
                      <span style={{ fontSize: 12, color: '#6e7781', display: 'block' }}>by {app.owner.login}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <Label variant={inst.repository_selection === 'all' ? 'accent' : 'attention'} size="small">
                      {inst.repository_selection === 'all' ? 'All repos' : 'Selected'}
                    </Label>
                    {inst.suspended_at && <Label variant="danger" size="small">Suspended</Label>}
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
