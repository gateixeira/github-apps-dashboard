import styled from 'styled-components';
import { OrgCard } from './OrgCard';
import type { AppInstallation, GitHubApp, Organization } from '../types';

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

interface PaginationInfo {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

interface OrgsViewProps {
  filteredOrganizations: Organization[];
  installationsByOrg: Map<string, AppInstallation[]>;
  apps: Map<string, GitHubApp>;
  pagination: PaginationInfo;
  setPage: (page: number) => void;
}

export function OrgsView({
  filteredOrganizations,
  installationsByOrg,
  apps,
  pagination,
  setPage,
}: OrgsViewProps) {
  return (
    <div>
      <SectionTitle>Organizations ({filteredOrganizations.length})</SectionTitle>
      {filteredOrganizations.map(org => {
        const orgInstallations = installationsByOrg.get(org.login) || [];
        const totalForOrg = filteredOrganizations.length === 1 ? pagination.totalCount : undefined;
        const showPagination = filteredOrganizations.length === 1;
        return (
          <OrgCard
            key={org.login}
            organization={org}
            installations={orgInstallations}
            apps={apps}
            totalInstallations={totalForOrg}
            pagination={showPagination ? pagination : undefined}
            onPageChange={showPagination ? setPage : undefined}
          />
        );
      })}
      {filteredOrganizations.length === 0 && (
        <EmptyState>
          <MutedText>No organizations found matching your filters.</MutedText>
        </EmptyState>
      )}
    </div>
  );
}
