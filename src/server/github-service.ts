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
    const response = await this.octokit.orgs.listForAuthenticatedUser({
      per_page: 100,
    });
    
    return response.data.map(org => ({
      login: org.login,
      id: org.id,
      avatar_url: org.avatar_url,
      description: org.description || null,
    }));
  }

  async getAppInstallationsForOrg(org: string): Promise<AppInstallation[]> {
    try {
      const response = await this.octokit.orgs.listAppInstallations({
        org,
        per_page: 100,
      });
      
      return response.data.installations.map(inst => {
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
    } catch (error) {
      console.error(`Error fetching installations for org ${org}:`, error);
      return [];
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

  async getInstallationRepositories(installationId: number, token: string): Promise<Repository[]> {
    try {
      const installationOctokit = new Octokit({
        auth: token,
        baseUrl: this.baseUrl,
      });

      const response = await installationOctokit.request('GET /user/installations/{installation_id}/repositories', {
        installation_id: installationId,
        per_page: 100,
      });

      return response.data.repositories.map((repo: any) => ({
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
    } catch (error) {
      console.error(`Error fetching repositories for installation ${installationId}:`, error);
      return [];
    }
  }

  async getRepositoriesForOrg(org: string): Promise<Repository[]> {
    const repos: Repository[] = [];
    let page = 1;
    
    while (true) {
      const response = await this.octokit.repos.listForOrg({
        org,
        per_page: 100,
        page,
      });
      
      if (response.data.length === 0) break;
      
      repos.push(...response.data.map(repo => ({
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
      })));
      
      page++;
      if (response.data.length < 100) break;
    }
    
    return repos;
  }

  async getAllInstallationsWithDetails(orgs: Organization[]): Promise<{
    installations: AppInstallation[];
    apps: Map<string, GitHubApp>;
  }> {
    const allInstallations: AppInstallation[] = [];
    const apps = new Map<string, GitHubApp>();

    for (const org of orgs) {
      const installations = await this.getAppInstallationsForOrg(org.login);
      allInstallations.push(...installations);

      for (const inst of installations) {
        if (!apps.has(inst.app_slug)) {
          const app = await this.getApp(inst.app_slug);
          if (app) {
            apps.set(inst.app_slug, app);
          }
        }
      }
    }

    return { installations: allInstallations, apps };
  }
}
