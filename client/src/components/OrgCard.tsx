import type { FC } from 'react';
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Avatar,
  Label,
  CounterLabel,
  Spinner,
  Select,
  FormControl,
  Text,
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

const Card = styled.div`
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
  margin-bottom: 8px;
  background: var(--bgColor-default, #fff);
  overflow: hidden;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--bgColor-muted, #f6f8fa);
  cursor: pointer;
`;

const CardHeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CardHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CardContent = styled.div`
  padding: 16px;
`;

const Section = styled.div`
  margin-bottom: 16px;
`;

const CardTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  margin: 0;
`;

const SectionHeader = styled.h4`
  font-size: 12px;
  font-weight: 600;
  margin: 0 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--borderColor-default, #d0d7de);
`;

const AppsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 8px;
`;

const AppBox = styled.div`
  padding: 12px;
  background: var(--bgColor-muted, #f6f8fa);
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
`;

const AppBoxHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const AppBoxLabels = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const RepoBox = styled.div`
  padding: 12px;
  background: var(--bgColor-muted, #f6f8fa);
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
`;

const LoadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

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
    <Card>
      <CardHeader onClick={() => setExpanded(!expanded)}>
        <CardHeaderInfo>
          <Avatar src={organization.avatar_url} size={48} square alt={organization.login} />
          <div>
            <CardTitle>{organization.login}</CardTitle>
            {organization.description && (
              <Text sx={{ fontSize: 0, color: 'fg.muted' }}>{organization.description}</Text>
            )}
          </div>
        </CardHeaderInfo>
        <CardHeaderActions>
          <CounterLabel>{installations.length} app(s) installed</CounterLabel>
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </CardHeaderActions>
      </CardHeader>

      {expanded && (
        <CardContent>
          <Section>
            <SectionHeader>Installed Apps</SectionHeader>
            {installations.length === 0 ? (
              <Text sx={{ color: 'fg.muted', fontStyle: 'italic' }}>No apps installed in this organization</Text>
            ) : (
              <AppsGrid>
                {installations.map(inst => {
                  const app = getAppForInstallation(inst);
                  return (
                    <AppBox key={inst.id}>
                      <AppBoxHeader>
                        {app?.owner && (
                          <Avatar src={app.owner.avatar_url} size={32} square alt={app.name} />
                        )}
                        <div>
                          <Text sx={{ fontWeight: 'bold' }}>{app?.name || inst.app_slug}</Text>
                          <Text sx={{ fontSize: 0, color: 'fg.muted', display: 'block' }}>@{inst.app_slug}</Text>
                        </div>
                        {inst.suspended_at && <Label variant="danger">Suspended</Label>}
                      </AppBoxHeader>
                      <AppBoxLabels>
                        <Label variant={inst.repository_selection === 'all' ? 'accent' : 'attention'}>
                          {inst.repository_selection === 'all' ? 'All repos' : 'Selected repos'}
                        </Label>
                        {app?.owner && (
                          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>by {app.owner.login}</Text>
                        )}
                      </AppBoxLabels>
                    </AppBox>
                  );
                })}
              </AppsGrid>
            )}
          </Section>

          <div>
            <SectionHeader>Repositories</SectionHeader>
            {loadingRepos ? (
              <LoadingRow>
                <Spinner size="small" />
                <Text sx={{ color: 'fg.muted' }}>Loading repositories...</Text>
              </LoadingRow>
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
                  <RepoBox>
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
                              <Text>{app?.name || inst.app_slug}</Text>
                              <Label variant="accent" size="small">All repos</Label>
                            </li>
                          );
                        })}
                    </ul>
                    <Text as="div" sx={{ mt: 2, fontSize: 0, color: 'fg.muted', fontStyle: 'italic' }}>
                      Note: Apps with "Selected repos" access require individual repository checks.
                    </Text>
                  </RepoBox>
                )}
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
