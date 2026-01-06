import type { FC } from 'react';
import { useState, useEffect } from 'react';
import {
  Avatar,
  Label,
  CounterLabel,
  Spinner,
  Select,
  FormControl,
} from '@primer/react';
import { ChevronDownIcon, ChevronUpIcon } from '@primer/octicons-react';
import type { Organization, AppInstallation, GitHubApp, Repository } from '../types';
import { api } from '../services/api';

interface OrgCardProps {
  organization: Organization;
  installations: AppInstallation[];
  apps: Map<string, GitHubApp>;
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
      const result = await api.getRepositoriesForOrg(organization.login, token, enterpriseUrl);
      setRepositories(result.repositories);
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
    <div style={cardStyle}>
      <div style={headerStyle} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar src={organization.avatar_url} size={48} square alt={organization.login} />
          <div>
            <h3 style={{ fontSize: 16, margin: 0 }}>{organization.login}</h3>
            {organization.description && (
              <span style={{ fontSize: 14, color: '#6e7781' }}>{organization.description}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CounterLabel>{installations.length} app(s) installed</CounterLabel>
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 12, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #d0d7de' }}>
              Installed Apps
            </h4>
            {installations.length === 0 ? (
              <span style={{ color: '#6e7781', fontStyle: 'italic' }}>No apps installed in this organization</span>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                {installations.map(inst => {
                  const app = getAppForInstallation(inst);
                  return (
                    <div
                      key={inst.id}
                      style={{
                        padding: 12,
                        background: '#f6f8fa',
                        border: '1px solid #d0d7de',
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        {app?.owner && (
                          <Avatar src={app.owner.avatar_url} size={32} square alt={app.name} />
                        )}
                        <div>
                          <span style={{ fontWeight: 'bold' }}>{app?.name || inst.app_slug}</span>
                          <span style={{ fontSize: 12, color: '#6e7781', display: 'block' }}>@{inst.app_slug}</span>
                        </div>
                        {inst.suspended_at && <Label variant="danger">Suspended</Label>}
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <Label variant={inst.repository_selection === 'all' ? 'accent' : 'attention'}>
                          {inst.repository_selection === 'all' ? 'All repos' : 'Selected repos'}
                        </Label>
                        {app?.owner && (
                          <span style={{ fontSize: 12, color: '#6e7781' }}>by {app.owner.login}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h4 style={{ fontSize: 12, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #d0d7de' }}>
              Repositories
            </h4>
            {loadingRepos ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Spinner size="small" />
                <span style={{ color: '#6e7781' }}>Loading repositories...</span>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 8 }}>
                  <FormControl>
                    <Select 
                      value={selectedRepo} 
                      onChange={(e) => setSelectedRepo(e.target.value)}
                    >
                      <Select.Option value="">Select a repository to see installed apps</Select.Option>
                      {repositories.map(repo => (
                        <Select.Option key={repo.id} value={repo.full_name}>{repo.name}</Select.Option>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                {selectedRepo && (
                  <div style={{ padding: 12, background: '#f6f8fa', border: '1px solid #d0d7de', borderRadius: 6 }}>
                    <div style={{ marginBottom: 8 }}>
                      Apps with access to <strong>{selectedRepo}</strong>:
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {installations
                        .filter(inst => inst.repository_selection === 'all')
                        .map(inst => {
                          const app = getAppForInstallation(inst);
                          return (
                            <li key={inst.id} style={{ padding: '4px 0', borderBottom: '1px solid #eaeef2', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>{app?.name || inst.app_slug}</span>
                              <Label variant="accent" size="small">All repos</Label>
                            </li>
                          );
                        })}
                    </ul>
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: '#6e7781', fontStyle: 'italic' }}>
                        Note: Apps with "Selected repos" access require individual repository checks.
                      </span>
                    </div>
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
