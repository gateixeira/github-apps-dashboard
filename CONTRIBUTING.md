# Contributing to GitHub Apps Dashboard

First off, thank you for considering contributing to GitHub Apps Dashboard! It's people like you that make this tool useful for the community.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct: be respectful, inclusive, and considerate in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/gateixeira/github-apps-dashboard/issues) to avoid duplicates.

When creating a bug report, please include:

- **A clear and descriptive title**
- **Steps to reproduce the issue**
- **Expected behavior** - What you expected to happen
- **Actual behavior** - What actually happened
- **Screenshots** - If applicable
- **Environment details**:
  - Node.js version
  - Browser and version
  - Operating system

### Suggesting Enhancements

Enhancement suggestions are welcome! Please create an issue with:

- **A clear and descriptive title**
- **Detailed description** of the proposed feature
- **Use case** - Why this feature would be useful
- **Possible implementation** - If you have ideas on how to implement it

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies**: `npm install && cd client && npm install`
3. **Make your changes** following the code style guidelines
4. **Test your changes** thoroughly
5. **Update documentation** if needed
6. **Submit a pull request**

## Development Setup

### Prerequisites

- Node.js 18+
- npm

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/github-apps-dashboard.git
cd github-apps-dashboard

# Install dependencies
npm install
cd client && npm install && cd ..

# Start development server
npm run dev
```

### Project Structure

```
github-apps-dashboard/
├── src/server/          # Express.js backend
├── client/src/          # React frontend
│   ├── components/      # React components
│   ├── hooks/           # Custom hooks
│   ├── services/        # API services
│   └── types/           # TypeScript types
└── docs/                # Documentation
```

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Define proper types - avoid `any` when possible
- Use interfaces for object shapes
- Use meaningful variable and function names

### React

- Use functional components with hooks
- Keep components focused and small
- Use styled-components for styling
- Follow the existing component patterns

### General

- Write clear, self-documenting code
- Add comments for complex logic
- Keep functions focused on a single responsibility
- Use meaningful commit messages

## Commit Messages

Use clear and meaningful commit messages:

```
feat: add new feature
fix: resolve bug in component
docs: update README
style: format code
refactor: restructure component
test: add tests for feature
chore: update dependencies
```

## Review Process

1. All submissions require review
2. Maintainers may request changes
3. Once approved, your PR will be merged

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing! 🎉
