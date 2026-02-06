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

export type RepositoryVisibility = 'public' | 'private' | 'internal';

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  visibility: RepositoryVisibility;
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

export type AppUsageStatus = 'active' | 'inactive' | 'unknown';

export type UsageFilter = 'all' | 'active' | 'inactive';

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

export interface AuditLogEntry {
  actor?: string;
  actor_id?: number;
  action?: string;
  created_at?: number;
  '@timestamp'?: number;
  org?: string;
  repo?: string;
  [key: string]: unknown;
}

export interface FilterState {
  appOwner: string;
  appSlug: string;
  repository: string;
  viewMode: ViewMode;
  usageFilter: UsageFilter;
}
