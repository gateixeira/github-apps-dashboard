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

export interface DashboardData {
  apps: GitHubApp[];
  installations: AppInstallation[];
  organizations: Organization[];
  repositories: Map<number, Repository[]>;
}

export interface FilterState {
  organization: string;
  appOwner: string;
  appId: number | null;
  viewMode: 'apps' | 'installations';
  showUnusedOnly: boolean;
}

export interface AuditLogEntry {
  '@timestamp': number;
  action: string;
  actor: string;
  actor_id?: number;
  created_at: number;
  org?: string;
  repo?: string;
  programmatic_access_type?: string;
}

export type AppUsageStatus = 'active' | 'inactive' | 'unknown';

export interface AppUsageInfo {
  appSlug: string;
  lastActivityAt: string | null;
  activityCount: number;
  status: AppUsageStatus;
}

export interface AuditLogProgress {
  type: 'progress';
  org: string;
  pagesProcessed: number;
  entriesProcessed: number;
  appsFound: number;
  currentPhase: 'fetching' | 'processing' | 'complete';
  message: string;
}

export interface AuditLogComplete {
  type: 'complete';
  org: string;
  usage: AppUsageInfo[];
}

export interface AuditLogError {
  type: 'error';
  org: string;
  error: string;
}

export type AuditLogEvent = AuditLogProgress | AuditLogComplete | AuditLogError;
