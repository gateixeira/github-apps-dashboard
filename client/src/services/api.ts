import axios from 'axios';
import type { Organization, AppInstallation, GitHubApp, Repository, AppUsageInfo, AuditLogEvent } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface InstallationsResponse {
  installations: AppInstallation[];
  totalCount: number;
  page: number;
  perPage: number;
}

export interface RepositoriesResponse {
  repositories: Repository[];
  totalCount?: number;
  page: number;
  perPage: number;
  hasMore?: boolean;
}

export interface DashboardDataResponse {
  installations: AppInstallation[];
  apps: GitHubApp[];
  totalCount: number;
  page: number;
  perPage: number;
}

export interface AppUsageResponse {
  organization: string;
  inactiveDays: number;
  usage: AppUsageInfo[];
}

const getHeaders = (token: string, enterpriseUrl?: string) => {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (enterpriseUrl) {
    headers['x-github-enterprise-url'] = enterpriseUrl;
  }
  return headers;
};

export const api = {
  async getOrganizations(token: string, enterpriseUrl?: string): Promise<Organization[]> {
    const response = await axios.get(`${API_BASE}/api/organizations`, {
      headers: getHeaders(token, enterpriseUrl),
    });
    return response.data;
  },

  async getInstallationsForOrg(
    org: string,
    token: string,
    enterpriseUrl?: string,
    page: number = 1,
    perPage: number = 30
  ): Promise<InstallationsResponse> {
    const response = await axios.get(`${API_BASE}/api/organizations/${org}/installations`, {
      headers: getHeaders(token, enterpriseUrl),
      params: { page, per_page: perPage },
    });
    return response.data;
  },

  async getApp(slug: string, token: string, enterpriseUrl?: string): Promise<GitHubApp | null> {
    try {
      const response = await axios.get(`${API_BASE}/api/apps/${slug}`, {
        headers: getHeaders(token, enterpriseUrl),
      });
      return response.data;
    } catch {
      return null;
    }
  },

  async getInstallationRepositories(
    installationId: number,
    token: string,
    enterpriseUrl?: string,
    page: number = 1,
    perPage: number = 30
  ): Promise<RepositoriesResponse> {
    const response = await axios.get(`${API_BASE}/api/installations/${installationId}/repositories`, {
      headers: getHeaders(token, enterpriseUrl),
      params: { page, per_page: perPage },
    });
    return response.data;
  },

  async getRepositoriesForOrg(
    org: string,
    token: string,
    enterpriseUrl?: string,
    page: number = 1,
    perPage: number = 30
  ): Promise<RepositoriesResponse> {
    const response = await axios.get(`${API_BASE}/api/organizations/${org}/repositories`, {
      headers: getHeaders(token, enterpriseUrl),
      params: { page, per_page: perPage },
    });
    return response.data;
  },

  async getDashboardData(
    organizations: Organization[],
    token: string,
    enterpriseUrl?: string,
    page: number = 1,
    perPage: number = 30
  ): Promise<DashboardDataResponse> {
    const response = await axios.post(`${API_BASE}/api/dashboard/data`, 
      { organizations, page, perPage },
      { headers: getHeaders(token, enterpriseUrl) }
    );
    return response.data;
  },

  async getAppUsage(
    org: string,
    appSlugs: string[],
    token: string,
    enterpriseUrl?: string,
    inactiveDays: number = 90
  ): Promise<AppUsageResponse> {
    const response = await axios.get(`${API_BASE}/api/organizations/${org}/app-usage`, {
      headers: getHeaders(token, enterpriseUrl),
      params: {
        app_slugs: appSlugs.join(','),
        inactive_days: inactiveDays,
      },
    });
    return response.data;
  },

  async getConfig(): Promise<{ inactiveDays: number }> {
    const response = await axios.get(`${API_BASE}/api/config`);
    return response.data;
  },

  streamAppUsage(
    org: string,
    appSlugs: string[],
    token: string,
    inactiveDays: number = 90,
    enterpriseUrl?: string,
    onEvent: (event: AuditLogEvent) => void = () => {}
  ): () => void {
    const params = new URLSearchParams({
      app_slugs: appSlugs.join(','),
      inactive_days: inactiveDays.toString(),
    });
    
    const url = `${API_BASE}/api/organizations/${org}/app-usage/stream?${params}`;
    
    const eventSource = new EventSource(url, {
      // Note: EventSource doesn't support custom headers, so we'll use a different approach
    });

    // Since EventSource doesn't support custom headers, we need to pass token via query param
    // For now, let's create a fetch-based SSE reader
    const abortController = new AbortController();
    
    fetch(`${API_BASE}/api/organizations/${org}/app-usage/stream?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(enterpriseUrl ? { 'x-github-enterprise-url': enterpriseUrl } : {}),
      },
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6)) as AuditLogEvent;
                onEvent(event);
              } catch (e) {
                console.error('Failed to parse SSE event:', e);
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('SSE stream error:', err);
          onEvent({ type: 'error', org, error: err.message });
        }
      });

    eventSource.close(); // We're using fetch instead

    return () => {
      abortController.abort();
    };
  },
};
