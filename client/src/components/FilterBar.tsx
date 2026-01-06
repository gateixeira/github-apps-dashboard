import type { FC } from 'react';
import { FormControl, Select } from '@primer/react';
import type { Organization, FilterState, ViewMode } from '../types';

interface FilterBarProps {
  organizations: Organization[];
  appOwners: string[];
  appSlugs: string[];
  repositories: string[];
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

const containerStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: 16,
  padding: 16,
  background: '#f6f8fa',
  borderRadius: 6,
  border: '1px solid #d0d7de',
  marginBottom: 16,
};

export const FilterBar: FC<FilterBarProps> = ({
  organizations,
  appOwners,
  appSlugs,
  repositories,
  filters,
  onFilterChange,
}) => {
  const viewModes: { value: ViewMode; label: string }[] = [
    { value: 'apps', label: 'View by Apps' },
    { value: 'organizations', label: 'View by Organizations' },
    { value: 'repositories', label: 'View by Repositories' },
  ];

  return (
    <div style={containerStyle}>
      <FormControl>
        <FormControl.Label>View Mode</FormControl.Label>
        <Select
          value={filters.viewMode}
          onChange={(e) => onFilterChange({ viewMode: e.target.value as ViewMode })}
        >
          {viewModes.map((mode) => (
            <Select.Option key={mode.value} value={mode.value}>
              {mode.label}
            </Select.Option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormControl.Label>Organization</FormControl.Label>
        <Select
          value={filters.organization}
          onChange={(e) => onFilterChange({ organization: e.target.value })}
        >
          <Select.Option value="">All Organizations</Select.Option>
          {organizations.map((org) => (
            <Select.Option key={org.login} value={org.login}>
              {org.login}
            </Select.Option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormControl.Label>App Owner</FormControl.Label>
        <Select
          value={filters.appOwner}
          onChange={(e) => onFilterChange({ appOwner: e.target.value })}
        >
          <Select.Option value="">All Owners</Select.Option>
          {appOwners.map((owner) => (
            <Select.Option key={owner} value={owner}>
              {owner}
            </Select.Option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormControl.Label>App</FormControl.Label>
        <Select
          value={filters.appSlug}
          onChange={(e) => onFilterChange({ appSlug: e.target.value })}
        >
          <Select.Option value="">All Apps</Select.Option>
          {appSlugs.map((slug) => (
            <Select.Option key={slug} value={slug}>
              {slug}
            </Select.Option>
          ))}
        </Select>
      </FormControl>

      {filters.viewMode === 'repositories' && (
        <FormControl>
          <FormControl.Label>Repository</FormControl.Label>
          <Select
            value={filters.repository}
            onChange={(e) => onFilterChange({ repository: e.target.value })}
          >
            <Select.Option value="">All Repositories</Select.Option>
            {repositories.map((repo) => (
              <Select.Option key={repo} value={repo}>
                {repo}
              </Select.Option>
            ))}
          </Select>
        </FormControl>
      )}
    </div>
  );
};
