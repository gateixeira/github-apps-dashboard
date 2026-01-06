import type { FC } from 'react';
import { useState } from 'react';
import type { Organization } from '../types';
import { api } from '../services/api';
import './Settings.css';

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
    <div className="settings-panel">
      <h2>Connection Settings</h2>
      <div className="settings-form">
        <div className="setting-group">
          <label htmlFor="enterprise-url">GitHub Enterprise URL (optional)</label>
          <input
            id="enterprise-url"
            type="text"
            value={enterpriseUrl}
            onChange={(e) => onEnterpriseUrlChange(e.target.value)}
            placeholder="https://github.example.com/api/v3"
          />
          <small>Leave empty for github.com</small>
        </div>

        <div className="setting-group">
          <label htmlFor="token">Personal Access Token</label>
          <input
            id="token"
            type="password"
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxx"
          />
          <small>
            Required scopes: <code>read:org</code>, <code>repo</code>
          </small>
        </div>

        <div className="setting-group">
          <label htmlFor="filter-org">Filter by Organization</label>
          <div className="org-filter-row">
            <select
              id="filter-org"
              value={selectedOrg}
              onChange={(e) => onSelectedOrgChange(e.target.value)}
              disabled={organizations.length === 0}
            >
              <option value="">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.login} value={org.login}>
                  {org.login}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="refresh-btn"
              onClick={handleRefreshOrgs}
              disabled={!token || loadingOrgs}
              title="Refresh organizations"
            >
              {loadingOrgs ? '⟳' : '↻'}
            </button>
          </div>
          <small>Click refresh to load available organizations</small>
        </div>

        <button 
          className="connect-btn" 
          onClick={onConnect} 
          disabled={!token || loading}
        >
          {loading ? 'Connecting...' : isConnected ? 'Reconnect' : 'Connect'}
        </button>

        {isConnected && (
          <div className="connection-status connected">
            ✓ Connected to GitHub
          </div>
        )}
      </div>
    </div>
  );
};
