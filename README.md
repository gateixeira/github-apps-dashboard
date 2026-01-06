# GitHub Apps Dashboard

A web application to display and manage GitHub Apps in a GitHub Enterprise environment.

## Features

- **View by Apps**: See all GitHub Apps installed across your organizations, with their installations and repositories
- **View by Organizations**: Browse organizations and see all apps installed in each one
- **View by Repositories**: See which apps have access to specific repositories
- **Filtering**: Filter by organization, app owner, and specific apps
- **Repository Access**: View all repositories an app has access to

## Prerequisites

- Node.js 18+
- A GitHub Personal Access Token with the following scopes:
  - `read:org` - To list organizations
  - `repo` - To access repository information

## Setup

1. Clone the repository:
```bash
cd appdashboard
```

2. Install dependencies:
```bash
npm install
cd client && npm install && cd ..
```

3. Create a `.env` file (optional):
```bash
cp .env.example .env
```

4. Configure environment variables (optional):
```
GITHUB_TOKEN=your_personal_access_token
GITHUB_ENTERPRISE_URL=https://github.example.com/api/v3
PORT=3001
```

## Running the Application

### Development Mode

Run both the server and client in development mode:
```bash
npm run dev
```

Or run them separately:
```bash
# Terminal 1 - Server
npm run server

# Terminal 2 - Client
npm run client
```

The server runs on `http://localhost:3001` and the client on `http://localhost:5173`.

### Production Build

```bash
npm run build
npm start
```

## Usage

1. Open the application in your browser at `http://localhost:5173`
2. Enter your GitHub Enterprise URL (leave empty for github.com)
3. Enter your Personal Access Token
4. Click "Connect" to load your data

### View Modes

- **Apps View**: Shows all apps grouped by app, with expandable details showing installations and repositories
- **Organizations View**: Shows all organizations with their installed apps
- **Repositories View**: Shows repositories within a selected organization and their app access

### Filtering

- **Organization**: Filter to show only a specific organization's data
- **App Owner**: Filter apps by their owner (the organization or user that created the app)
- **App**: Filter to show a specific app across all organizations

## API Endpoints

The server exposes the following REST API endpoints:

- `GET /api/organizations` - List user's organizations
- `GET /api/organizations/:org/installations` - List app installations for an org
- `GET /api/organizations/:org/repositories` - List repositories for an org
- `GET /api/apps/:slug` - Get app details by slug
- `GET /api/installations/:id/repositories` - List repositories for an installation
- `POST /api/dashboard/data` - Get aggregated dashboard data

## Architecture

- **Backend**: Express.js with TypeScript, using `@octokit/rest` for GitHub API access
- **Frontend**: React with TypeScript, Vite for bundling
- **Styling**: Custom CSS with GitHub-inspired design

## Security Notes

- Personal Access Tokens are never stored on the server
- All GitHub API calls are made from the server side to protect your token
- For production use, consider implementing proper authentication and secure token storage
