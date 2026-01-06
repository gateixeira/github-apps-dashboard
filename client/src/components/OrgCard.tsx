import type { FC } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import {
  Avatar,
  Label,
  CounterLabel,
  Text,
  Link,
} from '@primer/react';
import { ChevronDownIcon, ChevronUpIcon } from '@primer/octicons-react';
import type { Organization, AppInstallation, GitHubApp } from '../types';
import { Pagination } from './Pagination';

interface PaginationInfo {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

interface OrgCardProps {
  organization: Organization;
  installations: AppInstallation[];
  apps: Map<string, GitHubApp>;
  totalInstallations?: number;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
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

const AppsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 8px;
`;

const AppBox = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr;
  grid-template-rows: auto auto;
  gap: 0 12px;
  padding: 12px;
  background: var(--bgColor-muted, #f6f8fa);
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
`;

const AppAvatar = styled.div`
  grid-row: 1 / 3;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  
  img {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 6px;
  }
`;

const AppInfo = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const AppName = styled.span`
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AppSlugLink = styled(Link)`
  font-size: 12px;
  color: var(--fgColor-muted, #6e7781);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &:hover {
    color: var(--fgColor-accent, #0969da);
  }
`;

const AppLabels = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin-top: 4px;
`;

const AppOwnerText = styled.span`
  font-size: 12px;
  color: var(--fgColor-muted, #6e7781);
  margin-left: 4px;
`;



const AppsSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--borderColor-default, #d0d7de);
`;

const AppsSectionTitle = styled.h4`
  font-size: 12px;
  font-weight: 600;
  margin: 0;
`;

export const OrgCard: FC<OrgCardProps> = ({ 
  organization, 
  installations, 
  apps,
  totalInstallations,
  pagination,
  onPageChange,
}) => {
  const [expanded, setExpanded] = useState(false);

  const displayCount = totalInstallations ?? installations.length;

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
          <CounterLabel>{displayCount} app(s) installed</CounterLabel>
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </CardHeaderActions>
      </CardHeader>

      {expanded && (
        <CardContent>
          <Section>
            <AppsSectionHeader>
              <AppsSectionTitle>Installed Apps</AppsSectionTitle>
              {pagination && onPageChange && pagination.totalPages > 1 && (
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  totalCount={pagination.totalCount}
                  perPage={pagination.perPage}
                  onPageChange={onPageChange}
                />
              )}
            </AppsSectionHeader>
            {installations.length === 0 ? (
              <Text sx={{ color: 'fg.muted', fontStyle: 'italic' }}>No apps installed in this organization</Text>
            ) : (
              <AppsGrid>
                {installations.map(inst => {
                  const app = getAppForInstallation(inst);
                  return (
                    <AppBox key={inst.id}>
                      <AppAvatar>
                        {app?.owner && (
                          <img src={app.owner.avatar_url} alt={app.name} />
                        )}
                      </AppAvatar>
                      <AppInfo>
                        <AppName>{app?.name || inst.app_slug}</AppName>
                        <AppSlugLink href={`https://github.com/apps/${inst.app_slug}`} target="_blank">@{inst.app_slug}</AppSlugLink>
                      </AppInfo>
                      <AppLabels>
                        <Label variant={inst.repository_selection === 'all' ? 'accent' : 'attention'}>
                          {inst.repository_selection === 'all' ? 'All repos' : 'Selected repos'}
                        </Label>
                        {inst.suspended_at && <Label variant="danger">Suspended</Label>}
                        {app?.owner && (
                          <AppOwnerText>by {app.owner.login}</AppOwnerText>
                        )}
                      </AppLabels>
                    </AppBox>
                  );
                })}
              </AppsGrid>
            )}
          </Section>
        </CardContent>
      )}
    </Card>
  );
};
