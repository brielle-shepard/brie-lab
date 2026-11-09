# Brie’s Lab

Brielle’s systems engineering portfolio: practice problems, real-world skills, and notes from the lab. The interface keeps its black and yellow engineering workspace, teal accents, separate Home/About/Projects/Blog pages, portrait, and Markdown writing studio.

This repository contains the Azure adaptation of the existing Sites application. Azure deployment and domain cutover are not completed by adding this code to GitHub. The current Sites publication remains separate and unchanged.

| Component | Purpose |
| --- | --- |
| Next.js / React | Portfolio pages, blog, writing studio |
| Azure App Service, Linux, Node.js 24 | Application hosting |
| Azure Table Storage | Private, durable blog records |
| App Service Authentication / Microsoft Entra ID | Microsoft sign-in |
| GitHub Actions | Test, build, and optional deployment |

## Setup

Follow [the Azure setup guide](docs/azure-setup.md). Start with an owner-private staging deployment. Hosting and storage can incur Azure charges; review the portal estimate before creating resources.

**Pending asset:** the portrait at `public/images/brielle-profile.jpg` is currently withheld from this public repository pending the owner’s approval to publish the image file here. The existing Sites version still has the photo. Tests and builds can run without it, but deployment packaging intentionally stops until the portrait is supplied. Resolve this choice before enabling deployment.

The deployment workflow runs tests and builds on pushes. **Azure deployment is disabled until the repository variable `AZURE_DEPLOY_ENABLED` is set to `true`** and the other Azure variables and identity permissions are configured. No Azure credentials, blog entries, tenant IDs, or owner IDs belong in the repository.

## Development and verification

Use Node.js 24 LTS:

```sh
npm ci
npm test
npm run build
npm run package:azure
```

The production package is written to the ignored `azure-package/` directory. Start it in App Service with `node server.js`. `public/` and `.next/static/` are included in the package so the portrait and styles deploy with the application.

For local UI work, create an ignored `.env.local` and set `SITE_VISIBILITY=public`, then run `npm run dev`. Blog pages need configured Table Storage. The writing studio deliberately has no local authentication bypass. Tests exercise its actual API handlers with synthetic identities and an in-memory repository; they do not authenticate to a live tenant.

## Access and data

- Default visibility is private. Missing identity configuration fails closed.
- Author access requires both the configured Entra tenant and the owner’s immutable object ID; matching an email alone grants no access.
- Only Azure App Service with Authentication enabled may supply trusted identity headers. Never deploy this header-based authentication to a bare server or disable the App Service authentication middleware.
- Drafts are excluded from public blog pages and the latest-entry sidebar.
- Dates are assigned on the server. Edits and republishing retain the original publication date.
- Azure ETags and versions protect against lost edits. Markdown excludes raw HTML and executable link protocols.
- Blog records remain in Azure Storage across code deployments. The GitHub repository is not a blog-data backup.

See [the setup guide](docs/azure-setup.md#move-existing-blog-entries) for import/export and cutover checks.
