import styled from 'styled-components';
import {
  Spinner,
  Label,
  Avatar,
  Link,
  Button,
} from '@primer/react';
import { LockIcon } from '@primer/octicons-react';
import type { AppInstallation, GitHubApp, Repository } from '../types';

const SectionTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px;
`;

const MutedText = styled.span`
  color: var(--fgColor-muted, #656d76);
`;

const LoadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RepoViewContainer = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 16px;
  min-height: 400px;
`;

const RepoList = styled.div`
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
  background: var(--bgColor-default, #fff);
  overflow: hidden;
  max-height: 600px;
  overflow-y: auto;
`;

const RepoListItem = styled.div<{ $selected?: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid var(--borderColor-default, #d0d7de);
  cursor: pointer;
  background: ${props => props.$selected ? 'var(--bgColor-accent-muted, #ddf4ff)' : 'transparent'};
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: ${props => props.$selected ? 'var(--bgColor-accent-muted, #ddf4ff)' : 'var(--bgColor-muted, #f6f8fa)'};
  }
`;

const RepoName = styled.div`
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RepoMeta = styled.div`
  font-size: 12px;
  color: var(--fgColor-muted, #6e7781);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`;

const RepoDetails = styled.div`
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
  background: var(--bgColor-default, #fff);
  padding: 16px;
`;

const RepoDetailsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--borderColor-default, #d0d7de);
`;

const RepoDetailsTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0;
`;

const RepoDetailsDescription = styled.p`
  font-size: 14px;
  color: var(--fgColor-muted, #6e7781);
  margin: 0;
`;

const AppsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const AppItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bgColor-muted, #f6f8fa);
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
`;

const AppItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const AppItemName = styled.div`
  font-weight: 600;
  font-size: 14px;
`;

const AppItemSlug = styled.div`
  font-size: 12px;
  color: var(--fgColor-muted, #6e7781);
`;

const ShowMoreContainer = styled.div`
  margin-top: 12px;
  text-align: center;
`;

const RepoSelectHint = styled.div`
  color: var(--fgColor-muted, #656d76);
  font-style: italic;
  margin-top: 8px;
  font-size: 14px;
`;

interface ReposViewProps {
  repositories: Repository[];
  loadingRepos: boolean;
  loadingMoreRepos: boolean;
  hasMoreRepos: boolean;
  totalRepos: number | null;
  loadMoreRepos: () => void;
  selectedRepo: string;
  repoAppsShown: number;
  selectRepo: (fullName: string) => void;
  showMoreApps: () => void;
  selectedOrg: string;
  installationsByOrg: Map<string, AppInstallation[]>;
  apps: Map<string, GitHubApp>;
}

export function ReposView({
  repositories,
  loadingRepos,
  loadingMoreRepos,
  hasMoreRepos,
  totalRepos,
  loadMoreRepos,
  selectedRepo,
  repoAppsShown,
  selectRepo,
  showMoreApps,
  selectedOrg,
  installationsByOrg,
  apps,
}: ReposViewProps) {
  const orgInstallations = selectedOrg
    ? installationsByOrg.get(selectedOrg) || []
    : [];

  const selectedRepository = repositories.find(r => r.full_name === selectedRepo);

  const allRepoApps = orgInstallations.filter(inst => inst.repository_selection === 'all');
  const visibleApps = allRepoApps.slice(0, repoAppsShown);
  const hasMore = allRepoApps.length > repoAppsShown;
  const remainingCount = allRepoApps.length - repoAppsShown;

  return (
    <div>
      <SectionTitle>Repositories {repositories.length > 0 && `(${repositories.length}${totalRepos !== null && totalRepos > repositories.length ? `/${totalRepos}` : ''})`}</SectionTitle>
      {loadingRepos ? (
        <LoadingRow>
          <Spinner size="small" />
          <MutedText>Loading repositories...</MutedText>
        </LoadingRow>
      ) : repositories.length === 0 ? (
        <EmptyState>
          <MutedText>No repositories found for this organization.</MutedText>
        </EmptyState>
      ) : (
        <RepoViewContainer>
          <RepoList>
            {repositories.map(repo => (
              <RepoListItem 
                key={repo.id} 
                $selected={repo.full_name === selectedRepo}
                onClick={() => selectRepo(repo.full_name)}
              >
                <RepoName>{repo.name}</RepoName>
                <RepoMeta>
                  {repo.private && (
                    <>
                      <LockIcon size={12} />
                      <span>Private</span>
                    </>
                  )}
                </RepoMeta>
              </RepoListItem>
            ))}
            {hasMoreRepos && (
              <RepoListItem as="div" onClick={loadMoreRepos} style={{ textAlign: 'center', cursor: loadingMoreRepos ? 'default' : 'pointer' }}>
                {loadingMoreRepos ? (
                  <LoadingRow style={{ justifyContent: 'center' }}>
                    <Spinner size="small" />
                    <MutedText>Loading...</MutedText>
                  </LoadingRow>
                ) : (
                  <Button variant="invisible" onClick={loadMoreRepos}>Show more repositories</Button>
                )}
              </RepoListItem>
            )}
          </RepoList>

          <RepoDetails>
            {!selectedRepo ? (
              <EmptyState>
                <MutedText>Select a repository to see installed apps</MutedText>
              </EmptyState>
            ) : selectedRepository && (
              <>
                <RepoDetailsHeader>
                  <Avatar src={selectedRepository.owner.avatar_url} size={40} alt={selectedRepository.owner.login} />
                  <div>
                    <RepoDetailsTitle>
                      <Link href={selectedRepository.html_url} target="_blank">{selectedRepository.full_name}</Link>
                    </RepoDetailsTitle>
                    {selectedRepository.description && (
                      <RepoDetailsDescription>{selectedRepository.description}</RepoDetailsDescription>
                    )}
                  </div>
                  {selectedRepository.private && <Label variant="danger">Private</Label>}
                </RepoDetailsHeader>

                <SectionTitle>Apps with access</SectionTitle>
                <AppsList>
                  {visibleApps.map(inst => {
                    const app = apps.get(inst.app_slug);
                    return (
                      <AppItem key={inst.id}>
                        {app?.owner && (
                          <Avatar src={app.owner.avatar_url} size={32} square alt={app.name} />
                        )}
                        <AppItemInfo>
                          <AppItemName>{app?.name || inst.app_slug}</AppItemName>
                          <AppItemSlug>@{inst.app_slug}</AppItemSlug>
                        </AppItemInfo>
                        <Label variant="accent" size="small">All repos</Label>
                      </AppItem>
                    );
                  })}
                  {hasMore && (
                    <ShowMoreContainer>
                      <Button 
                        variant="invisible" 
                        onClick={showMoreApps}
                      >
                        Show more ({remainingCount} remaining)
                      </Button>
                    </ShowMoreContainer>
                  )}
                </AppsList>
                <RepoSelectHint>
                  Note: Apps with "Selected repos" access require individual repository checks.
                </RepoSelectHint>
              </>
            )}
          </RepoDetails>
        </RepoViewContainer>
      )}
    </div>
  );
}
