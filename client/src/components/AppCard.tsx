import type { FC } from 'react';
import { useState, useEffect } from 'react';
import {
  Avatar,
  Label,
  Link,
  Spinner,
  CounterLabel,
} from '@primer/react';
import { ChevronDownIcon, ChevronUpIcon } from '@primer/octicons-react';
import type { GitHubApp, AppInstallation, Repository } from '../types';
import { api } from '../services/api';

interface AppCardProps {
  app: GitHubApp;
  installations: AppInstallation[];
  token: string;
  enterpriseUrl?: string;
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
  cursor: 'pointer',
};

export const AppCard: FC<AppCardProps> = ({ app, installations, token, enterpriseUrl }) => {
  const [expanded, setExpanded] = useState(false);
  const [repositories, setRepositories] = useState<Map<number, Repository[]>>(new Map());
  const [loadingRepos, setLoadingRepos] = useState<Set<number>>(new Set());

  const loadRepositories = async (installationId: number) => {
    if (repositories.has(installationId) || loadingRepos.has(installationId)) return;

    setLoadingRepos(prev => new Set(prev).add(installationId));
    try {
      const result = await api.getInstallationRepositories(installationId, token, enterpriseUrl);
      setRepositories(prev => new Map(prev).set(installationId, result.repositories));
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
    <div style={cardStyle}>
      <div style={headerStyle} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {app.owner && (
            <Avatar src={app.owner.avatar_url} size={40} square alt={app.owner.login} />
          )}
          <div>
            <h3 style={{ fontSize: 16, margin: 0 }}>{app.name}</h3>
            <span style={{ fontSize: 12, color: '#6e7781' }}>@{app.slug}</span>
            {app.owner && (
              <span style={{ fontSize: 12, color: '#6e7781', marginLeft: 4 }}>by {app.owner.login}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CounterLabel>{installations.length} installation(s)</CounterLabel>
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 16 }}>
          {app.description && (
            <div style={{ color: '#6e7781', marginBottom: 16 }}>{app.description}</div>
          )}
          
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 12, marginBottom: 8 }}>Installations</h4>
            {installations.map(inst => (
              <div
                key={inst.id}
                style={{
                  padding: 12,
                  background: '#f6f8fa',
                  border: '1px solid #d0d7de',
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Avatar src={inst.account.avatar_url} size={32} alt={inst.account.login} />
                  <div>
                    <span style={{ fontWeight: 'bold' }}>{inst.account.login}</span>
                    <span style={{ fontSize: 12, color: '#6e7781', marginLeft: 4 }}>{inst.account.type}</span>
                  </div>
                  <Label variant={inst.repository_selection === 'all' ? 'accent' : 'attention'}>
                    {inst.repository_selection === 'all' ? 'All repositories' : 'Selected repositories'}
                  </Label>
                  {inst.suspended_at && <Label variant="danger">Suspended</Label>}
                </div>
                
                <div>
                  {loadingRepos.has(inst.id) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Spinner size="small" />
                      <span style={{ fontSize: 12, color: '#6e7781' }}>Loading repositories...</span>
                    </div>
                  )}
                  {repositories.has(inst.id) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {repositories.get(inst.id)!.map(repo => (
                        <Label key={repo.id}>
                          <Link href={repo.html_url} target="_blank">
                            {repo.full_name}
                          </Link>
                          {repo.private && <Label size="small" variant="danger">Private</Label>}
                        </Label>
                      ))}
                      {repositories.get(inst.id)!.length === 0 && (
                        <span style={{ fontSize: 12, color: '#6e7781', fontStyle: 'italic' }}>
                          No repositories accessible
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 12, marginBottom: 8 }}>Permissions</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {Object.entries(app.permissions).map(([key, value]) => (
                <Label key={key} variant="accent">
                  {key}: {value}
                </Label>
              ))}
            </div>
          </div>

          {app.events.length > 0 && (
            <div>
              <h4 style={{ fontSize: 12, marginBottom: 8 }}>Events</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {app.events.map(event => (
                  <Label key={event} variant="success">{event}</Label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
