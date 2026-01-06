# GitHub Apps Dashboard

> ⚠️ **Important**: this app was 100% vibe-coded in a few hours using [GitHub Copilot CLI](https://github.com/github/copilot-cli) and Claude Opus 4.5.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)

A modern web application to view and manage GitHub Apps installed across your GitHub Enterprise organizations. Get visibility into which apps have access to your repositories and organizations.

![GitHub Apps Dashboard Screenshot](docs/screenshot.png)

## ✨ Features

- **🔍 View by Apps** - See all GitHub Apps installed across your organizations, with expandable details showing installations, permissions, events, and repository access
- **🏢 View by Organizations** - Browse organizations and see all apps installed in each one with pagination support
- **📁 View by Repositories** - Two-column layout showing repositories on the left and app access details on the right
- **🎯 Powerful Filtering** - Filter by organization, app owner, and specific apps
- **🔒 Repository Access** - View all repositories an app has access to, with visibility indicators
- **📊 Pagination** - Handle large numbers of apps and installations efficiently
- **🎨 GitHub-Styled UI** - Built with [Primer React](https://primer.style/react/) for a native GitHub look and feel

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## 🔧 Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **GitHub Personal Access Token** with the following scopes:
  - `read:org` - To list organizations and their app installations
  - `repo` - To access repository information

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/gateixeira/github-apps-dashboard.git
cd github-apps-dashboard
```

### 2. Install dependencies

```bash
npm install
cd client && npm install && cd ..
```

### 3. Start the development server

```bash
npm run dev
```

### 4. Open your browser

Navigate to [http://localhost:5173](http://localhost:5173)

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory (optional):

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_TOKEN` | Personal Access Token (can also be entered in the UI) | - |
| `GITHUB_ENTERPRISE_URL` | Enterprise API URL (e.g., `https://github.example.com/api/v3`) | `https://api.github.com` |
| `PORT` | Server port | `3001` |

### Running in Production

```bash
# Build both server and client
npm run build

# Start the production server
npm start
```

## 📖 Usage

### Getting Started

1. Open the application in your browser
2. Enter your GitHub Enterprise URL (leave empty for github.com)
3. Enter your Personal Access Token with required scopes
4. Click **Connect** to load your data

### View Modes

#### Apps View
Shows all GitHub Apps grouped by app. Click on an app to expand and see:
- Description and owner information
- All organizations where the app is installed
- Repository access (all repos vs. selected repos)
- Permissions and subscribed events
- List of accessible repositories

#### Organizations View
Shows all organizations with their installed apps:
- Expand an organization to see all installed apps
- Pagination support for organizations with many apps
- Quick view of app access levels (All repos / Selected repos)

#### Repositories View
Two-column layout for repository-centric exploration:
- **Left panel**: Scrollable list of repositories with private/public indicators
- **Right panel**: Selected repository details with list of apps that have access
- Filter by organization to narrow down the repository list

### Filtering Options

| Filter | Description |
|--------|-------------|
| **Organization** | Show only a specific organization's data |
| **App Owner** | Filter apps by their owner (organization or user) |
| **App** | Filter to show a specific app across all organizations |

## 🔌 API Reference

The server exposes the following REST API endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/organizations` | List user's organizations |
| `GET` | `/api/organizations/:org/installations` | List app installations for an organization |
| `GET` | `/api/organizations/:org/repositories` | List repositories for an organization |
| `GET` | `/api/apps/:slug` | Get app details by slug |
| `GET` | `/api/installations/:id/repositories` | List repositories for an installation |
| `POST` | `/api/dashboard/data` | Get aggregated dashboard data |

### Authentication

All API endpoints require authentication via the `Authorization` header:

```
Authorization: Bearer <your_github_token>
```

For enterprise instances, include the enterprise URL:

```
X-GitHub-Enterprise-URL: https://github.example.com/api/v3
```

## 🏗️ Architecture

```
github-apps-dashboard/
├── src/
│   └── server/           # Express.js backend
│       ├── index.ts      # Server entry point
│       └── github-service.ts  # GitHub API service
├── client/
│   └── src/
│       ├── components/   # React components
│       ├── hooks/        # Custom React hooks
│       ├── services/     # API client
│       └── types/        # TypeScript types
├── package.json
└── README.md
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Express.js 5, TypeScript, [@octokit/rest](https://github.com/octokit/rest.js) |
| **Frontend** | React 19, TypeScript, [Vite](https://vitejs.dev/) |
| **UI Components** | [Primer React](https://primer.style/react/), styled-components |
| **Styling** | CSS Variables with GitHub Primer design tokens |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run the linter and tests
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Add comments for complex logic
- Update documentation as needed

### Reporting Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/gateixeira/github-apps-dashboard/issues/new) with:

- A clear description of the issue
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Screenshots if applicable

## 🔒 Security

### Token Handling

- Personal Access Tokens are **never stored** on the server
- Tokens are passed via HTTP headers and used only for the duration of the request
- All GitHub API calls are made from the server side to protect your token from exposure

### Production Recommendations

For production deployments, consider:

- [ ] Implementing proper user authentication (OAuth, SSO)
- [ ] Using secure token storage (environment variables, secrets manager)
- [ ] Enabling HTTPS with valid certificates
- [ ] Setting up rate limiting
- [ ] Adding request logging and monitoring

### Reporting Security Vulnerabilities

If you discover a security vulnerability, please send an email to the repository owner instead of opening a public issue.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [GitHub](https://github.com) for the amazing API and platform
- [Primer](https://primer.style/) for the design system
- [Octokit](https://github.com/octokit) for the excellent GitHub API client

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/gateixeira">@gateixeira</a>
</p>
