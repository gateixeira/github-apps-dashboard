import type { FC } from 'react';
import styled from 'styled-components';
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

const RepoDescription = styled.span`
  font-size: 12px;
  color: var(--fgColor-muted, #656d76);
`;

const AppName = styled.span`
  font-weight: bold;
  display: block;
`;

const AppSlugLink = styled.a`
  font-size: 12px;
  color: var(--fgColor-muted, #656d76);
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

const AppOwner = styled.span`
  font-size: 12px;
  color: var(--fgColor-muted, #656d76);
  display: block;
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
            <CardTitle>
              <Link href={repository.html_url} target="_blank">
                {repository.full_name}
              </Link>
            </CardTitle>
            {repository.description && (
              <RepoDescription>{repository.description}</RepoDescription>
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
          <SectionHeader>Apps with access to this repository</SectionHeader>
          <AppsGrid>
            {installations.map(inst => {
              const app = getAppForInstallation(inst);
              return (
                <AppBox key={inst.id}>
                  {app?.owner && (
                    <Avatar src={app.owner.avatar_url} size={32} square alt={app.name} />
                  )}
                  <div style={{ flex: 1 }}>
                    <AppName>{app?.name || inst.app_slug}</AppName>
                    <AppSlugLink href={`https://github.com/apps/${inst.app_slug}`} target="_blank">@{inst.app_slug}</AppSlugLink>
                    {app?.owner && (
                      <AppOwner>by {app.owner.login}</AppOwner>
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
