import type { FC } from 'react';
import './Settings.css';

interface SettingsProps {
  token: string;
  enterpriseUrl: string;
  onTokenChange: (token: string) => void;
  onEnterpriseUrlChange: (url: string) => void;
  onConnect: () => void;
  isConnected: boolean;
  loading: boolean;
}

export const Settings: FC<SettingsProps> = ({
  token,
  enterpriseUrl,
  onTokenChange,
  onEnterpriseUrlChange,
  onConnect,
  isConnected,
  loading,
}) => {
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
