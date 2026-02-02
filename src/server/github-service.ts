import { Octokit } from '@octokit/rest';
import { GitHubApp, AppInstallation, Organization, Repository, AuditLogEntry, AppUsageInfo, AppUsageStatus, AuditLogProgress } from '../types';

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
      const response = await this.octokit.orgs.list({
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

  async getOrganizationsForUser(): Promise<Organization[]> {
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

  async getInstallationRepositories(installationId: number, token: string, page: number = 1, perPage: number = 30): Promise<{
    repositories: Repository[];
    totalCount: number;
    page: number;
    perPage: number;
  }> {
    try {
      const installationOctokit = new Octokit({
        auth: token,
        baseUrl: this.baseUrl,
      });

      const response = await installationOctokit.request('GET /user/installations/{installation_id}/repositories', {
        installation_id: installationId,
        per_page: perPage,
        page,
      });

      const repositories = response.data.repositories.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
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
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url,
        },
        description: repo.description || null,
        html_url: repo.html_url,
      }));
      
      return {
        repositories,
        page,
        perPage,
        hasMore: response.data.length === perPage,
      };
    } catch (error) {
      console.error(`Error fetching repositories for org ${org}:`, error);
      return { repositories: [], page: 1, perPage: 30, hasMore: false };
    }
  }

  async getAllInstallationsWithDetails(orgs: Organization[], page: number = 1, perPage: number = 30): Promise<{
    installations: AppInstallation[];
    apps: Map<string, GitHubApp>;
    totalCount: number;
    page: number;
    perPage: number;
  }> {
    const allInstallations: AppInstallation[] = [];
    const apps = new Map<string, GitHubApp>();
    let totalCount = 0;

    for (const org of orgs) {
      const result = await this.getAppInstallationsForOrg(org.login, page, perPage);
      allInstallations.push(...result.installations);
      totalCount += result.totalCount;

      for (const inst of result.installations) {
        if (!apps.has(inst.app_slug)) {
          const app = await this.getApp(inst.app_slug);
          if (app) {
            apps.set(inst.app_slug, app);
          }
        }
      }
    }

    return { installations: allInstallations, apps, totalCount, page, perPage };
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

      // Debug: log first entry on first page only
      if (!options.after && response.data && response.data.length > 0) {
        console.log(`Sample audit log entry for ${org}:`, JSON.stringify(response.data[0], null, 2));
      }

      // Extract cursor from Link header for pagination
      // The cursor is already URL-encoded in the link, we need to use it as-is
      // but the regex captures the encoded version
      let nextCursor: string | undefined;
      const linkHeader = response.headers.link;
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<[^>]*[?&]after=([^&>]+)[^>]*>;\s*rel="next"/);
        if (nextMatch) {
          // The cursor in the Link header is URL-encoded, we need to decode it once
          // to get the actual cursor value to pass to the next request
          try {
            nextCursor = decodeURIComponent(nextMatch[1]);
          } catch {
            nextCursor = nextMatch[1]; // Use as-is if decode fails
          }
        }
      }

      return { entries: response.data as AuditLogEntry[], nextCursor };
    } catch (error: any) {
      if (error.status === 403) {
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

    console.log(`Looking for app slugs: ${appSlugs.join(', ')}`);
    console.log(`Looking back ${inactiveDays} days (threshold: ${new Date(inactiveThreshold).toISOString()})`);

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
          entriesProcessed: appsChecked, // Reusing for apps checked
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
    // This is much more efficient than fetching all logs and filtering
    for (const slug of appSlugs) {
      appsChecked++;
      const botActorName = `${slug}[bot]`;
      
      sendProgress(appsChecked, appsFound, 'fetching', `Checking ${slug} (${appsChecked}/${appSlugs.length})...`);

      try {
        // Use phrase parameter to filter by actor - order=desc gives us most recent first
        const result = await this.getAuditLogsForOrg(org, {
          phrase: `actor:${botActorName}`,
          perPage: 1, // We only need the most recent entry
          order: 'desc',
        });

        const usage = usageMap.get(slug)!;

        if (result.entries.length > 0) {
          const entry = result.entries[0];
          const entryTime = entry.created_at || entry['@timestamp'];
          
          if (typeof entryTime === 'number') {
            const activityDate = new Date(entryTime).toISOString();
            usage.lastActivityAt = activityDate;
            usage.activityCount = 1; // We know there's at least one
            
            // Determine status based on whether the most recent activity is within threshold
            if (entryTime >= inactiveThreshold) {
              usage.status = 'active';
              appsFound++;
              console.log(`✓ ${slug}: Active (last activity: ${activityDate})`);
            } else {
              usage.status = 'inactive';
              console.log(`✗ ${slug}: Inactive (last activity: ${activityDate})`);
            }
          }
        } else {
          // No audit log entries found for this bot
          usage.status = 'inactive';
          console.log(`✗ ${slug}: No audit log entries found`);
        }
      } catch (error) {
        console.error(`Error checking audit logs for ${slug}:`, error);
        // Leave as unknown if we couldn't check
      }
    }

    sendProgress(appsChecked, appsFound, 'complete', `Complete! ${appsFound} active apps out of ${appSlugs.length} checked.`);

    console.log(`Audit log check for ${org}: ${appsChecked} apps checked, ${appsFound} active`);

    return usageMap;
  }
}
