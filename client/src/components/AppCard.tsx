import type { FC } from 'react';
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Avatar,
  Label,
  Link,
  Spinner,
  CounterLabel,
  Text,
} from '@primer/react';
import { ChevronDownIcon, ChevronUpIcon, ClockIcon, AlertIcon, CheckCircleIcon } from '@primer/octicons-react';
import type { GitHubApp, AppInstallation, Repository, AppUsageInfo } from '../types';
import { api } from '../services/api';

interface AppCardProps {
  app: GitHubApp;
  installations: AppInstallation[];
  token: string;
  enterpriseUrl?: string;
  usageInfo?: AppUsageInfo;
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

const InstallationCard = styled.div`
  padding: 12px;
  background: var(--bgColor-muted, #f6f8fa);
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
  margin-bottom: 8px;
`;

const InstallationHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const LabelGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
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
`;

const UsageBadge = styled.div<{ $status: 'active' | 'inactive' | 'unknown' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ $status }) => 
    $status === 'active' ? 'var(--bgColor-success-muted, #dafbe1)' :
    $status === 'inactive' ? 'var(--bgColor-danger-muted, #ffebe9)' :
    'var(--bgColor-muted, #f6f8fa)'
  };
  color: ${({ $status }) => 
    $status === 'active' ? 'var(--fgColor-success, #1a7f37)' :
    $status === 'inactive' ? 'var(--fgColor-danger, #cf222e)' :
    'var(--fgColor-muted, #656d76)'
  };
`;

const formatLastActivity = (dateStr: string | null): string => {
  if (!dateStr) return 'No activity found';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

export const AppCard: FC<AppCardProps> = ({ app, installations, token, enterpriseUrl, usageInfo }) => {
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
    <Card>
      <CardHeader onClick={() => setExpanded(!expanded)}>
        <CardHeaderInfo>
          {app.owner && (
            <Avatar src={app.owner.avatar_url} size={40} square alt={app.owner.login} />
          )}
          <div>
            <CardTitle>{app.name}</CardTitle>
            <Link href={`${enterpriseUrl || 'https://github.com'}/apps/${app.slug}`} target="_blank" sx={{ fontSize: 0, color: 'fg.muted' }}>@{app.slug}</Link>
            {app.owner && (
              <Text sx={{ fontSize: 0, color: 'fg.muted', ml: 1 }}> by {app.owner.login}</Text>
            )}
          </div>
        </CardHeaderInfo>
        <CardHeaderActions>
          {usageInfo && (
            <UsageBadge $status={usageInfo.status}>
              {usageInfo.status === 'active' && <CheckCircleIcon size={12} />}
              {usageInfo.status === 'inactive' && <AlertIcon size={12} />}
              {usageInfo.status === 'unknown' && <ClockIcon size={12} />}
              {usageInfo.status === 'active' ? 'Active' : usageInfo.status === 'inactive' ? 'Inactive' : 'Unknown'}
            </UsageBadge>
          )}
          <CounterLabel>{installations.length} installation(s)</CounterLabel>
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </CardHeaderActions>
      </CardHeader>

      {expanded && (
        <CardContent>
          {app.description && (
            <Text as="div" sx={{ color: 'fg.muted', mb: 3 }}>{app.description}</Text>
          )}

          {usageInfo && (
            <Section>
              <SectionHeader>Usage Activity</SectionHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Text sx={{ fontSize: 1 }}>
                  <strong>Last activity:</strong> {formatLastActivity(usageInfo.lastActivityAt)}
                </Text>
                {usageInfo.activityCount > 0 && (
                  <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
                    ({usageInfo.activityCount} actions in audit log)
                  </Text>
                )}
              </div>
            </Section>
          )}
          
          <Section>
            <SectionHeader>Installations</SectionHeader>
            {installations.map(inst => (
              <InstallationCard key={inst.id}>
                <InstallationHeader>
                  <Avatar src={inst.account.avatar_url} size={32} alt={inst.account.login} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text sx={{ fontWeight: 'bold' }}>{inst.account.login}</Text>
                    <Label>{inst.account.type}</Label>
                  </div>
                  <Label variant={inst.repository_selection === 'all' ? 'accent' : 'attention'}>
                    {inst.repository_selection === 'all' ? 'All repositories' : 'Selected repositories'}
                  </Label>
                  {inst.suspended_at && <Label variant="danger">Suspended</Label>}
                </InstallationHeader>
                
                <div>
                  {loadingRepos.has(inst.id) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Spinner size="small" />
                      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Loading repositories...</Text>
                    </div>
                  )}
                  {repositories.has(inst.id) && (
                    <LabelGroup>
                      {repositories.get(inst.id)!.map(repo => (
                        <Label key={repo.id} sx={{ display: 'inline-flex', alignItems: 'center' }}>
                          <Link href={repo.html_url} target="_blank">
                            {repo.full_name}
                          </Link>
                          {repo.private && <span style={{ marginLeft: '8px' }}><Label size="small" variant="danger">Private</Label></span>}
                        </Label>
                      ))}
                      {repositories.get(inst.id)!.length === 0 && (
                        <Text sx={{ fontSize: 0, color: 'fg.muted', fontStyle: 'italic' }}>
                          No repositories accessible
                        </Text>
                      )}
                    </LabelGroup>
                  )}
                </div>
              </InstallationCard>
            ))}
          </Section>

          <Section>
            <SectionHeader>Permissions</SectionHeader>
            <LabelGroup>
              {Object.entries(app.permissions).map(([key, value]) => (
                <Label key={key} variant="accent">
                  {key}: {value}
                </Label>
              ))}
            </LabelGroup>
          </Section>

          {app.events.length > 0 && (
            <div>
              <SectionHeader>Events</SectionHeader>
              <LabelGroup>
                {app.events.map(event => (
                  <Label key={event} variant="success">{event}</Label>
                ))}
              </LabelGroup>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
