import type { FC } from 'react';
import styled from 'styled-components';
import {
  Avatar,
  Label,
  Link,
  CounterLabel,
  Text,
  Heading,
} from '@primer/react';
import type { Repository, AppInstallation, GitHubApp } from '../types';

interface RepoCardProps {
  repository: Repository;
  installations: AppInstallation[];
  apps: Map<string, GitHubApp>;
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
  border-bottom: 1px solid var(--borderColor-default, #d0d7de);
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

const AppsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 8px;
`;

const AppBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--bgColor-muted, #f6f8fa);
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
`;

const AppLabels = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
`;

export const RepoCard: FC<RepoCardProps> = ({ 
  repository, 
  installations,
  apps 
}) => {
  const getAppForInstallation = (inst: AppInstallation): GitHubApp | undefined => {
    return apps.get(inst.app_slug);
  };

  return (
    <Card>
      <CardHeader>
        <CardHeaderInfo>
          <Avatar src={repository.owner.avatar_url} size={40} alt={repository.owner.login} />
          <div>
            <Heading as="h3" sx={{ fontSize: 2, m: 0 }}>
              <Link href={repository.html_url} target="_blank">
                {repository.full_name}
              </Link>
            </Heading>
            {repository.description && (
              <Text sx={{ fontSize: 1, color: 'fg.muted' }}>{repository.description}</Text>
            )}
          </div>
        </CardHeaderInfo>
        <CardHeaderActions>
          {repository.private && <Label variant="danger">Private</Label>}
          <CounterLabel>{installations.length} app(s)</CounterLabel>
        </CardHeaderActions>
      </CardHeader>

      {installations.length > 0 && (
        <CardContent>
          <Heading as="h4" sx={{ fontSize: 0, mb: 2 }}>Apps with access to this repository</Heading>
          <AppsGrid>
            {installations.map(inst => {
              const app = getAppForInstallation(inst);
              return (
                <AppBox key={inst.id}>
                  {app?.owner && (
                    <Avatar src={app.owner.avatar_url} size={32} square alt={app.name} />
                  )}
                  <div style={{ flex: 1 }}>
                    <Text sx={{ fontWeight: 'bold', display: 'block' }}>{app?.name || inst.app_slug}</Text>
                    <Text sx={{ fontSize: 0, color: 'fg.muted' }}>@{inst.app_slug}</Text>
                    {app?.owner && (
                      <Text sx={{ fontSize: 0, color: 'fg.muted', display: 'block' }}>by {app.owner.login}</Text>
                    )}
                  </div>
                  <AppLabels>
                    <Label variant={inst.repository_selection === 'all' ? 'accent' : 'attention'} size="small">
                      {inst.repository_selection === 'all' ? 'All repos' : 'Selected'}
                    </Label>
                    {inst.suspended_at && <Label variant="danger" size="small">Suspended</Label>}
                  </AppLabels>
                </AppBox>
              );
            })}
          </AppsGrid>
        </CardContent>
      )}
    </Card>
  );
};
