import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GitHubService } from './github-service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const DEFAULT_INACTIVE_DAYS = parseInt(process.env.INACTIVE_DAYS || '90', 10);

console.log(`Server config: PORT=${PORT}, INACTIVE_DAYS=${DEFAULT_INACTIVE_DAYS}`);

app.use(cors());
app.use(express.json());

const getGitHubService = (req: Request): GitHubService => {
  const token = req.headers.authorization?.replace('Bearer ', '') || process.env.GITHUB_TOKEN || '';
  const baseUrl = (req.headers['x-github-enterprise-url'] as string) || process.env.GITHUB_ENTERPRISE_URL;
  return new GitHubService(token, baseUrl);
};

const getPaginationParams = (req: Request): { page: number; perPage: number } => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string) || 30));
  return { page, perPage };
};

// Get all organizations
app.get('/api/organizations', async (req: Request, res: Response) => {
  try {
    const githubService = getGitHubService(req);
    const orgs = await githubService.getOrganizationsForUser();
    res.json(orgs);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get app installations for an organization
app.get('/api/organizations/:org/installations', async (req: Request, res: Response) => {
  try {
    const githubService = getGitHubService(req);
    const { org } = req.params;
    const { page, perPage } = getPaginationParams(req);
    const result = await githubService.getAppInstallationsForOrg(org, page, perPage);
    res.json(result);
  } catch (error) {
    console.error('Error fetching installations:', error);
    res.status(500).json({ error: 'Failed to fetch installations' });
  }
});

// Get app details by slug
app.get('/api/apps/:slug', async (req: Request, res: Response) => {
  try {
    const githubService = getGitHubService(req);
    const { slug } = req.params;
    const app = await githubService.getApp(slug);
    if (app) {
      res.json(app);
    } else {
      res.status(404).json({ error: 'App not found' });
    }
  } catch (error) {
    console.error('Error fetching app:', error);
    res.status(500).json({ error: 'Failed to fetch app' });
  }
});

// Get repositories for an installation
app.get('/api/installations/:installationId/repositories', async (req: Request, res: Response) => {
  try {
    const githubService = getGitHubService(req);
    const token = req.headers.authorization?.replace('Bearer ', '') || process.env.GITHUB_TOKEN || '';
    const { installationId } = req.params;
    const { page, perPage } = getPaginationParams(req);
    const result = await githubService.getInstallationRepositories(parseInt(installationId), token, page, perPage);
    res.json(result);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Get repositories for an organization
app.get('/api/organizations/:org/repositories', async (req: Request, res: Response) => {
  try {
    const githubService = getGitHubService(req);
    const { org } = req.params;
    const { page, perPage } = getPaginationParams(req);
    const result = await githubService.getRepositoriesForOrg(org, page, perPage);
    res.json(result);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Get all installations with app details for multiple orgs
app.post('/api/dashboard/data', async (req: Request, res: Response) => {
  try {
    const githubService = getGitHubService(req);
    const { organizations, page, perPage } = req.body;
    
    if (!organizations || !Array.isArray(organizations)) {
      return res.status(400).json({ error: 'Organizations array required' });
    }

    const result = await githubService.getAllInstallationsWithDetails(
      organizations,
      page || 1,
      perPage || 30
    );
    res.json({
      installations: result.installations,
      apps: Array.from(result.apps.values()),
      totalCount: result.totalCount,
      page: result.page,
      perPage: result.perPage,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get app usage from audit logs for an organization
app.get('/api/organizations/:org/app-usage', async (req: Request, res: Response) => {
  try {
    const githubService = getGitHubService(req);
    const { org } = req.params;
    const inactiveDays = parseInt(req.query.inactive_days as string) || DEFAULT_INACTIVE_DAYS;
    const appSlugs = (req.query.app_slugs as string)?.split(',') || [];

    if (appSlugs.length === 0) {
      return res.status(400).json({ error: 'app_slugs query parameter required (comma-separated)' });
    }

    const usageMap = await githubService.getAppUsageFromAuditLogs(org, appSlugs, inactiveDays);
    const usage = Array.from(usageMap.values());

    res.json({
      organization: org,
      inactiveDays,
      usage,
    });
  } catch (error) {
    console.error('Error fetching app usage:', error);
    res.status(500).json({ error: 'Failed to fetch app usage data' });
  }
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Get server config (for frontend to use server-side defaults)
app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    inactiveDays: DEFAULT_INACTIVE_DAYS,
  });
});

// SSE endpoint for streaming app usage progress
app.get('/api/organizations/:org/app-usage/stream', async (req: Request, res: Response) => {
  const githubService = getGitHubService(req);
  const { org } = req.params;
  const inactiveDays = parseInt(req.query.inactive_days as string) || DEFAULT_INACTIVE_DAYS;
  const appSlugs = (req.query.app_slugs as string)?.split(',') || [];

  if (appSlugs.length === 0) {
    res.status(400).json({ error: 'app_slugs query parameter required (comma-separated)' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  try {
    const usageMap = await githubService.getAppUsageFromAuditLogs(
      org,
      appSlugs,
      inactiveDays,
      (progress) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      }
    );

    // Send final result
    const usage = Array.from(usageMap.values());
    res.write(`data: ${JSON.stringify({ type: 'complete', org, usage })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Error fetching app usage:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', org, error: 'Failed to fetch app usage data' })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
