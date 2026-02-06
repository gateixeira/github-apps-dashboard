import styled from 'styled-components';
import { ProgressBar } from '@primer/react';
import { Virtuoso } from 'react-virtuoso';
import { AppCard } from './AppCard';
import { Pagination } from './Pagination';
import { AuditLogProgress } from './AuditLogProgress';
import type { AppInstallation, GitHubApp, Organization } from '../types';
import type { BackgroundProgress } from '../hooks/useDashboardData';
import type { UsageProgress } from '../hooks/useAppUsage';
import type { AppUsageInfo } from '../types';

const ContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
`;

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

const BackgroundLoadingBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bgColor-accent-muted, #ddf4ff);
  border-radius: 6px;
  margin-bottom: 16px;
`;

const BackgroundLoadingText = styled.span`
  font-size: 13px;
  color: var(--fgColor-accent, #0969da);
  white-space: nowrap;
`;

const BackgroundProgressWrapper = styled.div`
  flex: 1;
  min-width: 100px;
  
  [data-component="ProgressBar"] > span {
    transition: width 0.3s ease-out;
  }
`;

const AuditLogLoadingBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bgColor-attention-muted, #fff8c5);
  border-radius: 6px;
  margin-bottom: 16px;
`;

const AuditLogLoadingText = styled.span`
  font-size: 13px;
  color: var(--fgColor-attention, #9a6700);
  white-space: nowrap;
`;

interface AppsViewProps {
  installationsByApp: Map<string, AppInstallation[]>;
  paginatedApps: [string, AppInstallation[]][];
  apps: Map<string, GitHubApp>;
  appsPage: number;
  setAppsPage: (page: number) => void;
  expectedTotalApps: number;
  expectedTotalPages: number;
  loadedAppsPages: number;
  appsPerPage: number;
  backgroundProgress: BackgroundProgress | null;
  isFirstLoad: boolean;
  smoothedAuditProgress: { checked: number; total: number; found: number };
  usageLoading: boolean;
  usageLoadingStarted: boolean;
  usageProgress: UsageProgress | null;
  organizations: Organization[];
  token: string;
  enterpriseUrl: string;
  getUsageForApp: (slug: string) => AppUsageInfo | undefined;
}

export function AppsView({
  installationsByApp,
  paginatedApps,
  apps,
  appsPage,
  setAppsPage,
  expectedTotalApps,
  expectedTotalPages,
  loadedAppsPages,
  appsPerPage,
  backgroundProgress,
  isFirstLoad,
  smoothedAuditProgress,
  usageLoading,
  usageLoadingStarted,
  usageProgress,
  organizations,
  token,
  enterpriseUrl,
  getUsageForApp,
}: AppsViewProps) {
  return (
    <div>
      <ContentHeader>
        <SectionTitle>
          Apps ({installationsByApp.size}{expectedTotalApps > installationsByApp.size ? ` of ${expectedTotalApps}` : ''})
        </SectionTitle>
        <Pagination
          currentPage={appsPage}
          totalPages={expectedTotalPages}
          totalCount={expectedTotalApps}
          perPage={appsPerPage}
          onPageChange={setAppsPage}
          loadedPages={loadedAppsPages}
        />
      </ContentHeader>
      {backgroundProgress && backgroundProgress.isLoading && (
        <BackgroundLoadingBar>
          <BackgroundLoadingText>
            Loading more apps... ({backgroundProgress.installationsLoaded} installations, {backgroundProgress.appsLoaded} apps)
          </BackgroundLoadingText>
          <BackgroundProgressWrapper>
            <ProgressBar 
              progress={(backgroundProgress.pagesLoaded / backgroundProgress.totalPages) * 100}
              barSize="small"
              aria-label="Background loading progress"
            />
          </BackgroundProgressWrapper>
          <BackgroundLoadingText>
            {Math.round((backgroundProgress.pagesLoaded / backgroundProgress.totalPages) * 100)}%
          </BackgroundLoadingText>
        </BackgroundLoadingBar>
      )}
      {!isFirstLoad && smoothedAuditProgress.total > 0 && smoothedAuditProgress.checked < smoothedAuditProgress.total && (
        <AuditLogLoadingBar>
          <AuditLogLoadingText>
            Checking activity... ({smoothedAuditProgress.checked}/{smoothedAuditProgress.total} apps, {smoothedAuditProgress.found} active)
          </AuditLogLoadingText>
          <BackgroundProgressWrapper>
            <ProgressBar 
              progress={smoothedAuditProgress.total > 0 ? Math.min((smoothedAuditProgress.checked / smoothedAuditProgress.total) * 100, 100) : 0}
              barSize="small"
              aria-label="Audit log loading progress"
            />
          </BackgroundProgressWrapper>
          <AuditLogLoadingText>
            {smoothedAuditProgress.total > 0 ? Math.min(Math.round((smoothedAuditProgress.checked / smoothedAuditProgress.total) * 100), 100) : 0}%
          </AuditLogLoadingText>
        </AuditLogLoadingBar>
      )}
      {isFirstLoad && (usageLoading || usageLoadingStarted) && (
        <AuditLogProgress 
          progress={usageProgress || {
            org: organizations[0]?.login || '',
            appsChecked: 0,
            totalApps: apps.size,
            appsFound: 0,
            currentPhase: 'fetching' as const,
            message: 'Preparing to scan audit logs...',
          }}
          totalOrgs={organizations.length}
        />
      )}
      {paginatedApps.length > 0 ? (
        <Virtuoso
          useWindowScroll
          data={paginatedApps}
          computeItemKey={(_, [slug]) => slug}
          itemContent={(_, [slug, insts]) => {
            const app = apps.get(slug);
            if (!app) return <div />;
            const usageInfo = getUsageForApp(slug);
            return (
              <AppCard 
                app={app} 
                installations={insts}
                token={token}
                enterpriseUrl={enterpriseUrl}
                usageInfo={usageInfo}
              />
            );
          }}
        />
      ) : (
        <EmptyState>
          <MutedText>No apps found matching your filters.</MutedText>
        </EmptyState>
      )}
    </div>
  );
}

export default AppsView;
