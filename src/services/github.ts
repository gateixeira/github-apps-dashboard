import { Octokit } from '@octokit/rest';
import type { 
  Organization, 
  AppInstallation, 
  GitHubApp, 
  Repository,
  AppUsageInfo,
  AuditLogProgress,
  AuditLogEntry,
} from '../types';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  visibility?: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  html_url: string;
}

interface OctokitError {
  status?: number;
  message?: string;
}

export class GitHubService {
  private octokit: Octokit;
  private baseUrl: string;

  constructor(token: string, baseUrl?: string) {
    this.baseUrl = baseUrl || 'https://api.github.com';
    this.octokit = new Octokit({
      auth: token,
      baseUrl: this.baseUrl,
    });
  }

  async getOrganizations(): Promise<Organization[]> {
    const orgs: Organization[] = [];
    let page = 1;
    
    while (true) {
      const response = await this.octokit.orgs.listForAuthenticatedUser({
        per_page: 100,
        page,
      });
      
      if (response.data.length === 0) break;
      
      orgs.push(...response.data.map(org => ({
        login: org.login,
        id: org.id,
        avatar_url: org.avatar_url,
        description: org.description || null,
      })));
      
      page++;
      if (response.data.length < 100) break;
    }
    
    return orgs;
  }

  async getAppInstallationsForOrg(org: string, page: number = 1, perPage: number = 30): Promise<{
    installations: AppInstallation[];
    totalCount: number;
    page: number;
    perPage: number;
  }> {
    try {
      const response = await this.octokit.orgs.listAppInstallations({
        org,
        per_page: perPage,
        page,
      });
      
      const installations = response.data.installations.map(inst => {
        const account = inst.account as { login?: string; type?: string; avatar_url?: string } | null;
        return {
          id: inst.id,
          app_id: inst.app_id,
          app_slug: inst.app_slug,
          target_id: inst.target_id,
          target_type: inst.target_type,
          account: {
            login: account?.login || '',
            type: account?.type || '',
            avatar_url: account?.avatar_url || '',
          },
          repository_selection: inst.repository_selection,
          permissions: inst.permissions as Record<string, string>,
          events: inst.events,
          created_at: inst.created_at,
          updated_at: inst.updated_at,
          suspended_at: inst.suspended_at || null,
        };
      });
      
      return {
        installations,
        totalCount: response.data.total_count,
        page,
        perPage,
      };
    } catch (error) {
      console.error(`Error fetching installations for org ${org}:`, error);
      return { installations: [], totalCount: 0, page: 1, perPage: 30 };
    }
  }

  async getApp(appSlug: string): Promise<GitHubApp | null> {
    try {
      const response = await this.octokit.apps.getBySlug({
        app_slug: appSlug,
      });
      
      const app = response.data;
      if (!app) return null;
      
      const owner = app.owner as { login?: string; type?: string; avatar_url?: string } | null;
      return {
        id: app.id,
        slug: app.slug || appSlug,
        name: app.name,
        owner: owner ? {
          login: owner.login || '',
          type: owner.type || 'Organization',
          avatar_url: owner.avatar_url || '',
        } : null,
        description: app.description || null,
        created_at: app.created_at,
        updated_at: app.updated_at,
        permissions: app.permissions as Record<string, string>,
        events: app.events || [],
        installations_count: app.installations_count,
      };
    } catch (error) {
      console.error(`Error fetching app ${appSlug}:`, error);
      return null;
    }
  }

  async getInstallationRepositories(installationId: number, page: number = 1, perPage: number = 30): Promise<{
    repositories: Repository[];
    totalCount: number;
    page: number;
    perPage: number;
  }> {
    try {
      const response = await this.octokit.request('GET /user/installations/{installation_id}/repositories', {
        installation_id: installationId,
        per_page: perPage,
        page,
      });

      const repositories = response.data.repositories.map((repo: GitHubRepository) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        visibility: (repo.visibility || (repo.private ? 'private' : 'public')) as 'public' | 'private' | 'internal',
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url,
        },
        description: repo.description || null,
        html_url: repo.html_url,
      }));
      
      return {
        repositories,
        totalCount: response.data.total_count,
        page,
        perPage,
      };
    } catch (error) {
      console.error(`Error fetching repositories for installation ${installationId}:`, error);
      return { repositories: [], totalCount: 0, page: 1, perPage: 30 };
    }
  }

  async getRepositoriesForOrg(org: string, page: number = 1, perPage: number = 30): Promise<{
    repositories: Repository[];
    page: number;
    perPage: number;
    hasMore: boolean;
    totalCount: number | null;
  }> {
    try {
      const response = await this.octokit.repos.listForOrg({
        org,
        per_page: perPage,
        page,
      });
      
      const repositories = response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        visibility: (repo.visibility || (repo.private ? 'private' : 'public')) as 'public' | 'private' | 'internal',
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url,
        },
        description: repo.description || null,
        html_url: repo.html_url,
      }));

      // Parse total from Link header's last page
      let totalCount: number | null = null;
      const linkHeader = response.headers.link;
      if (linkHeader) {
        const lastMatch = linkHeader.match(/[&?]page=(\d+)[^>]*>;\s*rel="last"/);
        if (lastMatch) {
          totalCount = parseInt(lastMatch[1]) * perPage;
        }
      }
      // If no Link header (single page), total is the data length
      if (totalCount === null && response.data.length < perPage) {
        totalCount = (page - 1) * perPage + response.data.length;
      }
      
      return {
        repositories,
        page,
        perPage,
        hasMore: response.data.length === perPage,
        totalCount,
      };
    } catch (error) {
      console.error(`Error fetching repositories for org ${org}:`, error);
      return { repositories: [], page: 1, perPage: 30, hasMore: false, totalCount: null };
    }
  }

  async getAuditLogsForOrg(
    org: string,
    options: {
      phrase?: string;
      include?: string;
      after?: string;
      before?: string;
      order?: 'asc' | 'desc';
      perPage?: number;
    } = {}
  ): Promise<{ entries: AuditLogEntry[]; nextCursor?: string }> {
    try {
      const response = await this.octokit.request('GET /orgs/{org}/audit-log', {
        org,
        phrase: options.phrase,
        include: options.include || 'all',
        after: options.after,
        before: options.before,
        order: options.order || 'desc',
        per_page: options.perPage || 100,
      });

      // Extract cursor from Link header for pagination
      let nextCursor: string | undefined;
      const linkHeader = response.headers.link;
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<[^>]*[?&]after=([^&>]+)[^>]*>;\s*rel="next"/);
        if (nextMatch) {
          try {
            nextCursor = decodeURIComponent(nextMatch[1]);
          } catch {
            nextCursor = nextMatch[1];
          }
        }
      }

      return { entries: response.data as AuditLogEntry[], nextCursor };
    } catch (error: unknown) {
      const octokitError = error as OctokitError;
      if (octokitError.status === 403) {
        console.error(`No audit log access for org ${org}: requires admin:org scope`);
        return { entries: [] };
      }
      console.error(`Error fetching audit logs for org ${org}:`, error);
      return { entries: [] };
    }
  }

  async getAppUsageFromAuditLogs(
    org: string,
    appSlugs: string[],
    inactiveDays: number = 90,
    onProgress?: (progress: AuditLogProgress) => void
  ): Promise<Map<string, AppUsageInfo>> {
    const usageMap = new Map<string, AppUsageInfo>();
    const now = Date.now();
    const inactiveThreshold = now - inactiveDays * 24 * 60 * 60 * 1000;

    // Initialize all apps as unknown
    for (const slug of appSlugs) {
      usageMap.set(slug, {
        appSlug: slug,
        lastActivityAt: null,
        activityCount: 0,
        status: 'unknown',
      });
    }

    // Helper to send progress updates
    const sendProgress = (appsChecked: number, appsFound: number, phase: 'fetching' | 'processing' | 'complete', message: string) => {
      if (onProgress) {
        onProgress({
          type: 'progress',
          org,
          pagesProcessed: appsChecked,
          entriesProcessed: appsChecked,
          appsFound,
          currentPhase: phase,
          message,
        });
      }
    };

    sendProgress(0, 0, 'fetching', `Checking ${appSlugs.length} apps in ${org}...`);

    let appsChecked = 0;
    let appsFound = 0;

    // Query audit logs for each app individually using the phrase parameter
    for (const slug of appSlugs) {
      appsChecked++;
      const botActorName = `${slug}[bot]`;
      
      sendProgress(appsChecked, appsFound, 'fetching', `Checking ${slug} (${appsChecked}/${appSlugs.length})...`);

      try {
        const result = await this.getAuditLogsForOrg(org, {
          phrase: `actor:${botActorName}`,
          perPage: 1,
          order: 'desc',
        });

        const usage = usageMap.get(slug)!;

        if (result.entries.length > 0) {
          const entry = result.entries[0];
          const entryTime = entry.created_at || entry['@timestamp'];
          
          if (typeof entryTime === 'number') {
            const activityDate = new Date(entryTime).toISOString();
            usage.lastActivityAt = activityDate;
            usage.activityCount = 1;
            
            if (entryTime >= inactiveThreshold) {
              usage.status = 'active';
              appsFound++;
            } else {
              usage.status = 'inactive';
            }
          }
        } else {
          usage.status = 'inactive';
        }
      } catch (error) {
        console.error(`Error checking audit logs for ${slug}:`, error);
      }
    }

    sendProgress(appsChecked, appsFound, 'complete', `Complete! ${appsFound} active apps out of ${appSlugs.length} checked.`);

    return usageMap;
  }
}

// Singleton-like factory to avoid recreating clients
let cachedService: GitHubService | null = null;
let cachedToken: string | null = null;
let cachedBaseUrl: string | undefined = undefined;

export function getGitHubService(token: string, baseUrl?: string): GitHubService {
  if (cachedService && cachedToken === token && cachedBaseUrl === baseUrl) {
    return cachedService;
  }
  cachedService = new GitHubService(token, baseUrl);
  cachedToken = token;
  cachedBaseUrl = baseUrl;
  return cachedService;
}

export function clearGitHubServiceCache(): void {
  cachedService = null;
  cachedToken = null;
  cachedBaseUrl = undefined;
}
