# Cathedra

Privacy-first 3D classroom seating map for an Industry Lecturer at the University of Makati.

**Status:** Pre-implementation

## Overview
Cathedra is a strictly Client-Side Rendered (CSR) Next.js application designed as a single-user tool for an instructor. It utilizes React Three Fiber to programmatically generate an accurate 3D scene of the computer laboratory and stores all state locally to guarantee student privacy.

## Requirements
- Node.js (for local development)
- A modern web browser with LocalStorage support

## Setup
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install
```

## Commands
| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development server |
| `npm run build` | Build the Next.js static export |
| `npm run lint` | Lint the source code |
| `npm run test` | Run component tests (Vitest) |
| `npx playwright test` | Run E2E tests |

## Configuration
No server-side configuration is required. State is stored purely in LocalStorage.

## CI/CD
Deployment is managed automatically by **AWS Amplify Hosting**. Pushing changes to the `main` branch on GitHub will trigger the Amplify pipeline, which builds the static export and deploys it globally via CloudFront.

## Validation
Ensure all tests and linting pass before opening a Pull Request.
