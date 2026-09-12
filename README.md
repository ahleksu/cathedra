# Cathedra

Cathedra is a browser-only classroom seating map for an Industry Lecturer at the University of Makati.

The application models a fixed 42-seat computer laboratory. Configurable sections keep student rosters and seat assignments separate. Student data stays in the current browser, with manual JSON backup and restoration.

The application is implemented locally. Manual acceptance is pending. AWS hosting configuration is prepared, but no AWS deployment is claimed.

## Local development

Use Node.js 22 and npm. Run these commands from the repository root:

```bash
npm ci
npm run dev
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript validation |
| `npm test` | Run Vitest tests |
| `npm run build` | Export static files to `out/` |
| `npm run preview` | Serve the static export locally |
| `npx playwright test` | Run browser tests against the export |

Build the export before browser tests. If Playwright browsers are absent, run `npx playwright install chromium`.

## Controls and data

Hold Space to orbit, pan, or zoom on desktop. Use `R`, `I`, and `T` for Reset, Instructor, and Top-down views. Touch navigation uses an explicit toggle. Seat selection and search keep the camera position unless you choose Focus.

LocalStorage belongs to a browser profile and site address. Browser clearing or switching browsers can remove access to stored rosters. Export JSON backups regularly and keep them private. Restoration replaces the full application dataset after confirmation.

The app does not encrypt LocalStorage or provide a login. Use a private browser profile on a trusted device. Hosting receives ordinary page and asset requests, but roster contents never belong in those requests.

## AWS hosting

Next.js uses `output: "export"`. Amplify configuration builds with `npm ci` and `npm run build`, then publishes `out/`. The platform must be static `WEB`.

Read [the deployment guide](docs/DEPLOYMENT.md) before connecting GitHub. It covers separate deployment approval, default hostnames, header validation, and rollback. No database or backend service is required.

## Contribution and security

Follow [CONTRIBUTING.md](CONTRIBUTING.md) for Issue, branch, and PR requirements. Report vulnerabilities privately through [SECURITY.md](SECURITY.md).

The pending Changeset records the new user capability. Release versioning and deployment are separate tasks.
