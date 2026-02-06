import type { FC } from 'react';
import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  TextInput,
  Select,
  Button,
  IconButton,
  Flash,
} from '@primer/react';
import { SyncIcon } from '@primer/octicons-react';
import type { Organization } from '../types';
import { getGitHubService } from '../services/github';

const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

const Toast = styled.div<{ $fading: boolean }>`
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 1000;
  animation: ${props => props.$fading ? fadeOut : 'none'} 0.3s ease-out forwards;
`;

const SettingsContainer = styled.div`
  padding: 16px;
  background: var(--bgColor-default, #fff);
  border-radius: 6px;
  border: 1px solid var(--borderColor-default, #d0d7de);
  margin-bottom: 16px;
`;

const SectionTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
`;

const FieldsTable = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  align-items: start;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: flex-end;
  
  @media (min-width: 641px) {
    align-self: center;
    margin-top: 20px;
  }
`;

const HeaderCell = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--fgColor-default, #1f2328);
  white-space: nowrap;
`;

const InputCell = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  
  input {
    width: 100%;
  }
`;

const CaptionCell = styled.div`
  font-size: 12px;
  color: var(--fgColor-muted, #656d76);
`;

const RequiredMarker = styled.span`
  color: var(--fgColor-danger, #cf222e);
`;

const WarningText = styled.span`
  color: var(--fgColor-attention, #9a6700);
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
  inactiveDays: number;
  onInactiveDaysChange: (days: number) => void;
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
  inactiveDays,
  onInactiveDaysChange,
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastFading, setToastFading] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setShowToast(true);
      setToastFading(false);
      
      const fadeTimer = setTimeout(() => {
        setToastFading(true);
      }, 2500);
      
      const hideTimer = setTimeout(() => {
        setShowToast(false);
      }, 2800);
      
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [isConnected]);

  const handleRefreshOrgs = async () => {
    if (!token) return;
    setLoadingOrgs(true);
    try {
      const github = getGitHubService(token, enterpriseUrl || undefined);
      const orgs = await github.getOrganizations();
      setOrganizations(orgs);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  return (
    <SettingsContainer>
      <SectionTitle>Connection Settings</SectionTitle>

      <FieldsTable>
        <FieldGroup>
          <HeaderCell>GitHub Enterprise URL (optional)</HeaderCell>
          <InputCell>
            <TextInput
              value={enterpriseUrl}
              onChange={(e) => onEnterpriseUrlChange(e.target.value)}
              placeholder="https://github.example.com/api/v3"
              block
            />
          </InputCell>
          <CaptionCell>Leave empty for github.com</CaptionCell>
        </FieldGroup>

        <FieldGroup>
          <HeaderCell>Personal Access Token</HeaderCell>
          <InputCell>
            <TextInput
              type="password"
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              block
            />
          </InputCell>
          <CaptionCell>Scopes: <code>radmin:org</code>, <code>audit_log</code>, <code>read:enterprise</code>, <code>repo</code></CaptionCell>
        </FieldGroup>

        <FieldGroup>
          <HeaderCell>Organization <RequiredMarker>*</RequiredMarker></HeaderCell>
          <InputCell>
            <Select
              value={selectedOrg}
              onChange={(e) => onSelectedOrgChange(e.target.value)}
              disabled={organizations.length === 0}
            >
              <Select.Option value="">Select an organization...</Select.Option>
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
          </InputCell>
          <CaptionCell>
            {!selectedOrg && organizations.length > 0 ? (
              <WarningText>⚠ Organization required</WarningText>
            ) : (
              'Click refresh to load organizations'
            )}
          </CaptionCell>
        </FieldGroup>

        <FieldGroup>
          <HeaderCell>Inactivity Period</HeaderCell>
          <InputCell>
            <TextInput
              type="number"
              value={inactiveDays === 0 ? '' : inactiveDays.toString()}
              onChange={(e) => {
                const rawValue = e.target.value;
                if (rawValue === '') {
                  onInactiveDaysChange(0);
                } else {
                  const value = parseInt(rawValue);
                  if (!isNaN(value)) {
                    onInactiveDaysChange(Math.min(180, Math.max(0, value)));
                  }
                }
              }}
              min={1}
              max={180}
              style={{ width: '80px' }}
            />
            <span>days</span>
          </InputCell>
          <CaptionCell>
            For audit log usage detection (max 180 days —{' '}
            <a href="https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/reviewing-the-audit-log-for-your-organization" target="_blank" rel="noopener noreferrer">
              GitHub API retention limit
            </a>)
          </CaptionCell>
        </FieldGroup>

        <ButtonGroup>
          <Button
            variant="primary"
            onClick={onConnect}
            disabled={!token || !selectedOrg || loading || inactiveDays < 1}
          >
            {loading ? 'Connecting...' : isConnected ? 'Reconnect' : 'Connect'}
          </Button>
        </ButtonGroup>
      </FieldsTable>

      {showToast && (
        <Toast $fading={toastFading}>
          <Flash variant="success">
            ✓ Connected
          </Flash>
        </Toast>
      )}
    </SettingsContainer>
  );
};
