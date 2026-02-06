import styled from 'styled-components';
import { ProgressBar } from '@primer/react';
import { AppCard } from './AppCard';
import { Pagination } from './Pagination';
import { SectionTitle, EmptyState, MutedText } from './shared/styles';
import type { AppInstallation, GitHubApp } from '../types';
import type { BackgroundProgress } from '../hooks/useDashboardData';
import type { AppUsageInfo } from '../types';

const ContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
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
  smoothedAuditProgress: { checked: number; total: number; found: number };
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
  smoothedAuditProgress,
  token,
  enterpriseUrl,
  getUsageForApp,
}: AppsViewProps) {
  // Use expectedTotalApps as the denominator while Phase 2 is still loading
  const activityTotal = backgroundProgress?.isLoading
    ? Math.max(smoothedAuditProgress.total, expectedTotalApps)
    : smoothedAuditProgress.total;
  const activityProgress = activityTotal > 0 ? Math.min((smoothedAuditProgress.checked / activityTotal) * 100, 100) : 0;

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
      {activityTotal > 0 && smoothedAuditProgress.checked < activityTotal && (
        <AuditLogLoadingBar>
          <AuditLogLoadingText>
            Checking activity... ({smoothedAuditProgress.checked}/{activityTotal} apps, {smoothedAuditProgress.found} active)
          </AuditLogLoadingText>
          <BackgroundProgressWrapper>
            <ProgressBar 
              progress={activityProgress}
              barSize="small"
              aria-label="Audit log loading progress"
            />
          </BackgroundProgressWrapper>
          <AuditLogLoadingText>
            {Math.round(activityProgress)}%
          </AuditLogLoadingText>
        </AuditLogLoadingBar>
      )}
      {paginatedApps.length > 0 ? (
        paginatedApps.map(([slug, insts]) => {
          const app = apps.get(slug);
          if (!app) return null;
          const usageInfo = getUsageForApp(slug);
          return (
            <AppCard 
              key={slug}
              app={app} 
              installations={insts}
              token={token}
              enterpriseUrl={enterpriseUrl}
              usageInfo={usageInfo}
            />
          );
        })
      ) : (
        <EmptyState>
          <MutedText>No apps found matching your filters.</MutedText>
        </EmptyState>
      )}
    </div>
  );
}

export default AppsView;
