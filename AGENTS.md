# Project Instructions

## Project Intent

**Project:** Cathedra

Cathedra is a privacy-first 3D classroom seating map for an Industry Lecturer at the University of Makati. Status: Pre-implementation.

## Sources of Truth

| Concern | Authority |
| --- | --- |
| Product behavior, scope, and acceptance | `docs/PRD.md` |
| Complete technical design | `docs/ARCHITECTURE.md` |
| Critical technical context | `docs/ARCHITECTURE_ESSENTIALS.md` |
| Application threats and controls | `docs/SECURITY.md` |
| Test strategy, cases, and evidence | `docs/TEST_CASES.md` |
| Human contribution workflow | `CONTRIBUTING.md` |
| Vulnerability reporting | root `SECURITY.md` |
| User-facing release history | `CHANGELOG.md` |

Executable code, schemas, migrations, manifests, configuration, CI, and tests prove current behavior. Accepted documents define target intent. Surface disagreements before changing affected definitions.

## Context Routing

- Read `docs/PRD.md` and `docs/TEST_CASES.md` before changing product behavior, scope, or acceptance outcomes.
- Read `docs/ARCHITECTURE_ESSENTIALS.md` before changing code, APIs, data models, dependencies, infrastructure, deployment, or security-sensitive behavior.
- Read the complete `docs/ARCHITECTURE.md` when a task changes or challenges an architectural decision or hard boundary.
- Read root `SECURITY.md` and `docs/SECURITY.md` before changing authentication, authorization, trust boundaries, sensitive data, secrets, privacy, or abuse controls.
- Read `CONTRIBUTING.md` and the matching `.github/ISSUE_TEMPLATE/` file before planning ordinary repository work.
- Read `.github/PULL_REQUEST_TEMPLATE.md` before preparing delivery evidence.
- Read `CHANGELOG.md` for every user-visible change.

If an ignored local context document is absent, do not invent it. For architecture-sensitive work, ask the user to run `/setup-project` or provide the missing decision.

## Repository Structure

- `docs/`: Project context documents (local/ignored)
- `.changeset/`: Changesets versioning config
- `src/`: Next.js source code (future)

## Setup and Commands

- `npm run dev`: Start local development server
- `npm run build`: Build Next.js application (export)
- `npm run lint`: Lint source code
- `npm test`: Run component tests (Vitest)
- `npx playwright test`: Run E2E tests

Treat a configured command as declared until it is actually executed. Report the exact command and result.

## Architecture Boundaries

- Strictly Client-Side Rendering (CSR) with `output: "export"`. No server-side runtime.
- Absolute privacy: All state (4 section rosters) stored exclusively in the browser's LocalStorage/IndexedDB.
- No backend database connections.

## Development Workflow

1. Every ordinary change begins with a GitHub Issue.
2. Select the matching workflow:
   - Incorrect behavior: `.github/ISSUE_TEMPLATE/bug_report.md`
   - New product capability: `.github/ISSUE_TEMPLATE/feature_request.md`
   - Documentation: `.github/ISSUE_TEMPLATE/documentation.md`
   - Chore, test, dependency, build, or CI: `.github/ISSUE_TEMPLATE/maintenance.md`
   - Refactoring, performance, architecture, or breaking change: `.github/ISSUE_TEMPLATE/technical_proposal.md`
   - Suspected vulnerability: the private route in root `SECURITY.md`, never a public Issue
3. Create a branch from `main` using `<type>/<issue-number>-<short-kebab-description>`.
4. Use Conventional Commits and a matching Conventional Commit-formatted PR title.
5. Preserve the documented architecture and security boundaries.
6. Verify applicable success, validation, permission, failure, recovery, security, and regression paths.
7. Synchronize affected requirements, architecture, security, test cases, configuration, examples, and changelog content.
8. Open a focused PR targeting `main` and include `Closes #<issue-number>`.

The Issue owns the problem and accepted outcome. The PR owns delivered scope and evidence. `CHANGELOG.md` owns the concise consequence for users.

## Versioning Discipline

- Follow Semantic Versioning for every releasable project artifact.
- Classify each PR as `major`, `minor`, `patch`, or `none` using public-contract impact, not commit type alone.
- Mark incompatible changes with `!` in the Conventional Commit header and document migration and rollback consequences.
- If the project uses Changesets, add a pending `.changeset/*.md` file for user-visible changes and run `changeset version` during the local release flow. Do not add a hand-maintained `Unreleased` section. If the project does not use Changesets, update `CHANGELOG.md` under `Unreleased`. End each ordinary public entry with its Issue reference, such as `(#42)`. A security entry may omit a private advisory reference until disclosure is safe. Explain `none` when no entry is needed.
- Keep internal refactoring, tests, chores, and documentation at `none` unless they alter observable public behavior.
- Preserve the repository's canonical version source.
- Change versions only in an explicitly requested release task.
- Treat released changelog entries and release tags as immutable.
- Obtain explicit approval before creating tags, GitHub Releases, publishing packages, or deploying releases.

## Testing

- Component testing using Vitest and React Testing Library.
- E2E testing using Playwright (specifically testing LocalStorage persistence and 3D canvas rendering).

Generated test cases default to `Pending`. Record `Pass`, `Fail`, or `Conditional Pass` only with execution evidence. A failure or conditional pass requires a useful note.

## Security

- Vulnerabilities must be reported privately to `help@ahleksu.dev`.
- Absolutely no data is to be sent from the browser to any external server (CSR only).

Keep secrets out of code, documentation, logs, test fixtures, screenshots, Issues, and pull requests. Route suspected vulnerabilities privately.

## Documentation Reconciliation

When sources conflict:

1. Identify every conflicting file or executable source.
2. Separate current behavior from accepted target intent.
3. Explain compatibility, data, security, test, and migration impact.
4. Recommend one canonical definition.
5. Obtain a decision before editing affected content.
6. Update authoritative and derived documents together.

## Definition of Done

- The linked Issue's acceptance criteria are satisfied.
- Relevant validation was executed or explicitly reported as unavailable.
- Success, failure, and regression paths are covered proportionally.
- Requirements, architecture, security, test cases, environment examples, and changelog are synchronized when affected.
- No secret, unresolved project marker, unsupported command, or contradictory identifier was introduced.
- The PR contains the linked Issue, SemVer impact, changelog decision, exact verification evidence, risks, and rollback when applicable.
