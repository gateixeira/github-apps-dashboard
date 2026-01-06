import { Octokit } from '@octokit/rest';
import { GitHubApp, AppInstallation, Organization, Repository } from '../types';

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
}
