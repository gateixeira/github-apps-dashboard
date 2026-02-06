import type { FC } from 'react';
import styled from 'styled-components';
import { FormControl, Select, SegmentedControl } from '@primer/react';
import { InfoIcon } from '@primer/octicons-react';
import type { FilterState, ViewMode, UsageFilter } from '../types';

interface FilterBarProps {
  appOwners: string[];
  appSlugs: string[];
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  inactiveDays?: number;
}

const FilterContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px;
  background: var(--bgColor-default, #fff);
  border-radius: 6px;
  border: 1px solid var(--borderColor-default, #d0d7de);
  margin-bottom: 16px;
  align-items: flex-end;
`;

const InfoText = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--fgColor-muted, #656d76);
  padding: 8px 0;
`;

export const FilterBar: FC<FilterBarProps> = ({
  appOwners,
  appSlugs,
  filters,
  onFilterChange,
  inactiveDays = 90,
}) => {
  const viewModes: { value: ViewMode; label: string }[] = [
    { value: 'apps', label: 'View by Apps' },
    { value: 'organizations', label: 'View by Organizations' },
    { value: 'repositories', label: 'View by Repositories' },
  ];

  return (
    <FilterContainer>
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

      <FormControl>
        <FormControl.Label>App Activity</FormControl.Label>
        <SegmentedControl
          aria-label="App activity filter"
          onChange={(index) => {
            const values: UsageFilter[] = ['all', 'active', 'inactive'];
            onFilterChange({ usageFilter: values[index] });
          }}
        >
          <SegmentedControl.Button selected={filters.usageFilter === 'all'}>
            All
          </SegmentedControl.Button>
          <SegmentedControl.Button selected={filters.usageFilter === 'active'}>
            Active
          </SegmentedControl.Button>
          <SegmentedControl.Button selected={filters.usageFilter === 'inactive'}>
            Inactive
          </SegmentedControl.Button>
        </SegmentedControl>
      </FormControl>

      <InfoText>
        <InfoIcon size={14} />
        <span>
          <strong>Inactive</strong> = no activity in audit logs for the past {inactiveDays} days
        </span>
      </InfoText>
    </FilterContainer>
  );
};
