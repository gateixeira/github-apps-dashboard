import axios from 'axios';
import type { Organization, AppInstallation, GitHubApp, Repository } from '../types';

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
};
