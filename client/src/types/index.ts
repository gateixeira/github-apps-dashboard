export interface GitHubApp {
  id: number;
  slug: string;
  name: string;
  owner: {
    login: string;
    type: string;
    avatar_url: string;
  } | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  permissions: Record<string, string>;
  events: string[];
  installations_count?: number;
}

export interface AppInstallation {
  id: number;
  app_id: number;
  app_slug: string;
  target_id: number;
  target_type: string;
  account: {
    login: string;
    type: string;
    avatar_url: string;
  };
  repository_selection: string;
  permissions: Record<string, string>;
  events: string[];
  created_at: string;
  updated_at: string;
  suspended_at: string | null;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  html_url: string;
}

export interface Organization {
  login: string;
  id: number;
  avatar_url: string;
  description: string | null;
}

export type ViewMode = 'apps' | 'organizations' | 'repositories';

export interface FilterState {
  organization: string;
  appOwner: string;
  appSlug: string;
  repository: string;
  viewMode: ViewMode;
}
