# Verification evidence

Local execution completed on September 12, 2026, with Node.js 24.13.0 on macOS. Amplify targets Node.js 22. AWS execution remains pending.

| Command | Result |
| --- | --- |
| `npm run lint` | Pass, no warnings |
| `npm run typecheck` | Pass |
| `npm test` | Pass, 38 tests across five files |
| `npm run build` | Pass, static export to `out/` |
| `npx playwright test` | Pass, 28 tests across desktop and mobile Chromium |
| `git diff --check` | Pass |

Tests use synthetic records. Browser coverage includes section isolation, seating, recovery, quota failures, stale tabs, WebGL fallback, camera navigation, and request inspection. The privacy test loads the production header policy and inspects requests during roster operations.

The camera preset test originally read geometry before rendering completed. Waiting for the projected position resolved that test failure. The full browser suite then passed.

The rendered desktop room shows three seats per left row, four per right row, a central aisle, pale desks, side windows, and an instructor desk. Room dimensions are estimates. The instructor accepted the local preview on September 13, 2026.

Other browser engines, physical touch devices, and AWS deployment remain pending. Passing automated tests does not establish those outcomes.
