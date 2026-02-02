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
        // Debug: log link header to see format
        console.log(`Link header: ${linkHeader}`);
        
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
    const sendProgress = (pagesProcessed: number, entriesProcessed: number, phase: 'fetching' | 'processing' | 'complete', message: string) => {
      const appsFound = Array.from(usageMap.values()).filter(u => u.activityCount > 0).length;
      if (onProgress) {
        onProgress({
          type: 'progress',
          org,
          pagesProcessed,
          entriesProcessed,
          appsFound,
          currentPhase: phase,
          message,
        });
      }
    };

    // Collect all bot actors found in audit logs for debugging
    const botActorsFound = new Set<string>();
    let totalEntriesProcessed = 0;
    let pagesProcessed = 0;
    let cursor: string | undefined;
    let hasMorePages = true;
    let consecutivePagesWithOldEntries = 0;

    sendProgress(0, 0, 'fetching', `Starting audit log scan for ${org}...`);

    // Paginate through audit logs
    // Stop when we've seen 3 consecutive pages where ALL entries are older than threshold
    while (hasMorePages && consecutivePagesWithOldEntries < 3) {
      sendProgress(pagesProcessed, totalEntriesProcessed, 'fetching', `Fetching page ${pagesProcessed + 1}...`);
      
      const result = await this.getAuditLogsForOrg(org, {
        perPage: 100,
        after: cursor,
      });

      const auditLogs = result.entries;
      pagesProcessed++;

      if (auditLogs.length === 0) {
        break;
      }

      totalEntriesProcessed += auditLogs.length;
      sendProgress(pagesProcessed, totalEntriesProcessed, 'processing', `Processing ${totalEntriesProcessed.toLocaleString()} entries...`);
      
      // Check if any entry in this page is within our threshold
      let hasRecentEntry = false;

      // Process audit logs and match with app slugs
      for (const entry of auditLogs) {
        const entryTime = entry.created_at || entry['@timestamp'];
        if (typeof entryTime === 'number' && entryTime >= inactiveThreshold) {
          hasRecentEntry = true;
        }

        if (!entry.actor) continue;

        let matchingSlug: string | undefined;

        // Method 1: Check if actor is a bot (e.g., "dependabot[bot]" -> "dependabot")
        const botMatch = entry.actor.match(/^(.+)\[bot\]$/i);
        if (botMatch) {
          const actorSlug = botMatch[1].toLowerCase();
          botActorsFound.add(actorSlug);

          // Find matching app slug (case-insensitive, also handle hyphen variations)
          matchingSlug = appSlugs.find(
            slug => slug.toLowerCase() === actorSlug || 
                    slug.toLowerCase().replace(/-/g, '') === actorSlug.replace(/-/g, '')
          );
        }

        // Method 2: Check application_name field for OAuth/Integration events
        if (!matchingSlug && (entry as any).application_name) {
          const appName = ((entry as any).application_name as string).toLowerCase();
          matchingSlug = appSlugs.find(
            slug => appName.includes(slug.toLowerCase()) ||
                    slug.toLowerCase().replace(/-/g, ' ') === appName.replace(/-/g, ' ')
          );
          if (matchingSlug) {
            botActorsFound.add(`${(entry as any).application_name} (via application_name)`);
          }
        }

        if (matchingSlug) {
          const usage = usageMap.get(matchingSlug)!;
          
          // Handle both timestamp formats (epoch ms or ISO string)
          let activityDate: string;
          if (typeof entryTime === 'number') {
            activityDate = new Date(entryTime).toISOString();
          } else {
            activityDate = new Date(entryTime).toISOString();
          }

          usage.activityCount++;

          // Update last activity if this is more recent
          if (!usage.lastActivityAt || activityDate > usage.lastActivityAt) {
            usage.lastActivityAt = activityDate;
          }

          // Determine status based on activity
          const lastActivityMs = new Date(usage.lastActivityAt).getTime();
          usage.status = lastActivityMs >= inactiveThreshold ? 'active' : 'inactive';
        }
      }

      // Track if this page had all old entries
      if (hasRecentEntry) {
        consecutivePagesWithOldEntries = 0;
      } else {
        consecutivePagesWithOldEntries++;
        console.log(`Page ${Math.floor(totalEntriesProcessed / 100)} had no recent entries (consecutive: ${consecutivePagesWithOldEntries})`);
      }

      // Get cursor for next page from Link header
      if (result.nextCursor) {
        cursor = result.nextCursor;
        hasMorePages = true;
      } else {
        hasMorePages = false;
      }

      // Safety limit to avoid infinite loops
      if (totalEntriesProcessed >= 10000) {
        console.log(`Reached safety limit of 10000 entries for ${org}`);
        break;
      }
    }

    console.log(`Audit logs for ${org}: ${totalEntriesProcessed} entries processed`);
    console.log(`Bot actors found in audit logs: ${Array.from(botActorsFound).join(', ')}`);

    // Mark apps with no matches as inactive (no bot activity found)
    for (const [slug, usage] of usageMap) {
      if (usage.status === 'unknown' && usage.activityCount === 0) {
        usage.status = 'inactive';
      }
    }

    const appsFound = Array.from(usageMap.values()).filter(u => u.activityCount > 0).length;
    sendProgress(pagesProcessed, totalEntriesProcessed, 'complete', `Complete! Found activity for ${appsFound} apps in ${totalEntriesProcessed.toLocaleString()} entries.`);

    return usageMap;
  }
}
