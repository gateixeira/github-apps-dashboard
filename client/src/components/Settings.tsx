import type { FC } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import {
  FormControl,
  TextInput,
  Select,
  Button,
  IconButton,
  Flash,
  Heading,
} from '@primer/react';
import { SyncIcon } from '@primer/octicons-react';
import type { Organization } from '../types';
import { api } from '../services/api';

const SettingsContainer = styled.div`
  padding: 16px;
  background: var(--bgColor-default, #fff);
  border-radius: 6px;
  border: 1px solid var(--borderColor-default, #d0d7de);
  margin-bottom: 16px;
`;

const FieldsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
  margin-top: 16px;
`;

const SelectRow = styled.div`
  display: flex;
  gap: 8px;
`;

interface SettingsProps {
  token: string;
  enterpriseUrl: string;
  onTokenChange: (token: string) => void;
  onEnterpriseUrlChange: (url: string) => void;
  onConnect: () => void;
  isConnected: boolean;
  loading: boolean;
  selectedOrg: string;
  onSelectedOrgChange: (org: string) => void;
}

export const Settings: FC<SettingsProps> = ({
  token,
  enterpriseUrl,
  onTokenChange,
  onEnterpriseUrlChange,
  onConnect,
  isConnected,
  loading,
  selectedOrg,
  onSelectedOrgChange,
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const handleRefreshOrgs = async () => {
    if (!token) return;
    setLoadingOrgs(true);
    try {
      const orgs = await api.getOrganizations(token, enterpriseUrl || undefined);
      setOrganizations(orgs);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  return (
    <SettingsContainer>
      <Heading as="h2" sx={{ fontSize: 3, mt: 0, mb: 3 }}>Connection Settings</Heading>

      <FieldsRow>
        <FormControl>
          <FormControl.Label>GitHub Enterprise URL (optional)</FormControl.Label>
          <TextInput
            value={enterpriseUrl}
            onChange={(e) => onEnterpriseUrlChange(e.target.value)}
            placeholder="https://github.example.com/api/v3"
          />
          <FormControl.Caption>Leave empty for github.com</FormControl.Caption>
        </FormControl>

        <FormControl>
          <FormControl.Label>Personal Access Token</FormControl.Label>
          <TextInput
            type="password"
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxx"
          />
          <FormControl.Caption>
            Required scopes: <code>read:org</code>, <code>repo</code>
          </FormControl.Caption>
        </FormControl>

        <FormControl>
          <FormControl.Label>Filter by Organization</FormControl.Label>
          <SelectRow>
            <Select
              value={selectedOrg}
              onChange={(e) => onSelectedOrgChange(e.target.value)}
              disabled={organizations.length === 0}
            >
              <Select.Option value="">All Organizations</Select.Option>
              {organizations.map((org) => (
                <Select.Option key={org.login} value={org.login}>
                  {org.login}
                </Select.Option>
              ))}
            </Select>
            <IconButton
              icon={SyncIcon}
              aria-label="Refresh organizations"
              onClick={handleRefreshOrgs}
              disabled={!token || loadingOrgs}
            />
          </SelectRow>
          <FormControl.Caption>Click refresh to load available organizations</FormControl.Caption>
        </FormControl>

        <Button
          variant="primary"
          onClick={onConnect}
          disabled={!token || loading}
        >
          {loading ? 'Connecting...' : isConnected ? 'Reconnect' : 'Connect'}
        </Button>

        {isConnected && (
          <Flash variant="success">
            ✓ Connected to GitHub
          </Flash>
        )}
      </FieldsRow>
    </SettingsContainer>
  );
};
