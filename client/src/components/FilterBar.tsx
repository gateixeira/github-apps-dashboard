import type { FC } from 'react';
import type { Organization, FilterState, ViewMode } from '../types';
import './FilterBar.css';

interface FilterBarProps {
  organizations: Organization[];
  appOwners: string[];
  appSlugs: string[];
  repositories: string[];
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

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
    <div className="filter-bar">
      <div className="filter-group">
        <label htmlFor="view-mode">View Mode</label>
        <select
          id="view-mode"
          value={filters.viewMode}
          onChange={(e) => onFilterChange({ viewMode: e.target.value as ViewMode })}
        >
          {viewModes.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="organization">Organization</label>
        <select
          id="organization"
          value={filters.organization}
          onChange={(e) => onFilterChange({ organization: e.target.value })}
        >
          <option value="">All Organizations</option>
          {organizations.map((org) => (
            <option key={org.login} value={org.login}>
              {org.login}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="app-owner">App Owner</label>
        <select
          id="app-owner"
          value={filters.appOwner}
          onChange={(e) => onFilterChange({ appOwner: e.target.value })}
        >
          <option value="">All Owners</option>
          {appOwners.map((owner) => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="app-slug">App</label>
        <select
          id="app-slug"
          value={filters.appSlug}
          onChange={(e) => onFilterChange({ appSlug: e.target.value })}
        >
          <option value="">All Apps</option>
          {appSlugs.map((slug) => (
            <option key={slug} value={slug}>
              {slug}
            </option>
          ))}
        </select>
      </div>

      {filters.viewMode === 'repositories' && (
        <div className="filter-group">
          <label htmlFor="repository">Repository</label>
          <select
            id="repository"
            value={filters.repository}
            onChange={(e) => onFilterChange({ repository: e.target.value })}
          >
            <option value="">All Repositories</option>
            {repositories.map((repo) => (
              <option key={repo} value={repo}>
                {repo}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
