# Deploy Cathedra to AWS Amplify

The repository prepares static hosting. It does not create AWS resources or connect GitHub. Deployment requires separate explicit approval.

## Prepare the export

Run the following from the repository root with Node.js 22:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright test
```

Make sure that `out/index.html` and `out/_next/` exist. Preview the export with `npm run preview`. Use synthetic records during validation.

The build produces static assets through Next.js `output: "export"`. It does not require a Next.js server. [Next.js static export documentation](https://nextjs.org/docs/app/getting-started/deploying)

## Connect GitHub after approval

1. Open AWS Amplify Hosting and create a hosted application from GitHub.
2. Authorize access to the Cathedra repository.
3. Select the reviewed `main` branch.
4. Use the repository root as the application root.
5. Review `amplify.yml` before starting the deployment.
6. Make sure that the build uses Node.js 22, `npm ci`, and `npm run build`.
7. Make sure that the artifact directory is `out`.
8. Make sure that the application platform is `WEB`.
9. Start the deployment after the platform and build configuration match.

Do not accept `WEB_COMPUTE` or a server runtime. Framework detection can select the wrong platform. An `out` artifact directory alone does not establish the platform.

If the console does not expose the platform, inspect it with an authenticated AWS CLI:

```bash
aws amplify get-app --app-id APP_ID --region REGION --query 'app.platform' --output text
```

Replace `APP_ID` and `REGION` with the values for the selected application. The result must be `WEB`.

If it reports another platform, pause deployment and use the approved correction:

```bash
aws amplify update-app --app-id APP_ID --region REGION --platform WEB
```

This command changes AWS configuration. Run it only within an explicitly approved deployment task. AWS documents this platform conversion for static exports. [Amplify static platform guidance](https://github.com/aws-amplify/amplify-hosting/blob/main/FAQ.md#convert-an-ssr-app-to-ssg)

No database, authentication service, backend build, or Amplify data client is required. Do not add student records as environment variables or repository files.

## Validate the hosted application

Use the default Amplify HTTPS hostname initially. The application code is public at that address. Roster data remains private to each browser profile.

After deployment, complete these checks:

1. Open the root page and reload it directly.
2. Make sure that all application assets load from the same origin.
3. Make sure that `Content-Security-Policy` matches `customHttp.yml` in the document response.
4. Create synthetic sections and students, then assign a seat.
5. Reload the page and make sure that the records persist.
6. Test JSON export and confirmed restoration with synthetic data.
7. Make sure that roster operations create no requests with student data.
8. Test the 3D scene, camera controls, and 2D fallback.
9. Make sure that the deployment uses `WEB` and has no application compute runtime.

Amplify reads custom headers from root `customHttp.yml`. Redeploy after changing that file. [AWS custom header configuration](https://docs.aws.amazon.com/amplify/latest/userguide/setting-custom-headers.html)

The Content Security Policy blocks network connections and workers. It allows inline scripts for the Next.js bootstrap and inline styles for the interface. Inline script permission limits protection against script injection. Do not add untrusted HTML or remote assets.

After the connection is active, updates to the connected branch can trigger builds. Review that behavior before merging production changes. No live deployment or GitHub connection is asserted by these files.

## Transfer data and roll back

An origin is the protocol, hostname, and port of a site. LocalStorage belongs to that origin and browser profile. A custom domain, another branch hostname, or another browser opens a separate dataset.

Before changing the address or browser, export a JSON backup. Open the new address and restore that backup manually. Keep backups private and outside GitHub and AWS.

Before a release that changes storage format, export a backup. Record the deployed commit and storage version.

For a code-only regression, redeploy a known good compatible commit through Amplify. Use a reviewed revert commit or the console redeployment control. Do not reset shared Git history.

A code rollback does not reverse LocalStorage mutations. If storage versions differ, use a compatible application version and its matching backup. Do not force older code to read an unsupported snapshot. Retain the original data for recovery.
