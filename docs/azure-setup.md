# Deploy Brie’s Lab from GitHub to Azure

This guide is for the Azure adaptation in this repository, not the original Cloudflare/Sites deployment bundle. Use your lab tenant in the Azure portal. All resource creation and account authorization are performed by you in your own browser. No infrastructure is provisioned by cloning this repository or running its tests.

## 1. Review hosting costs and create the web app

In Azure Portal, select **App Services → Create → Web App**:

| Setting | Value |
| --- | --- |
| Subscription | Your active lab subscription |
| Resource group | Create `rg-brie-lab` |
| Name | An available name, such as `brie-lab-web` |
| Publish | Code |
| Runtime | Node.js 24 LTS |
| Operating system | Linux |
| Region | A supported region near you, for example West US 2 |
| Pricing | Review Basic B1 for custom-domain HTTPS; F1 is only suitable for preliminary testing on the Azure hostname |
| Deployment | Leave automatic deployment off during initial setup; this repository supplies its own workflow |

App Service B1 and Storage have ongoing charges. Read the displayed estimate before creating them. Deleting only the web app does not necessarily delete its billable App Service plan. Use a dedicated resource group and an Azure cost budget with alerts; a budget alert does not impose a hard spending cap.

After creation:

1. In the web app’s **Settings → Configuration / General settings**, set the startup command to `node server.js`.
2. Enable **HTTPS Only**. Keep basic publishing authentication disabled.
3. Under **Identity → System assigned**, enable the identity and save.
4. Under **Environment variables**, add `SCM_DO_BUILD_DURING_DEPLOYMENT=false`. GitHub builds the complete deployable package.

## 2. Create storage for the blog

1. Create a **Storage account** in the same resource group: Standard performance, locally redundant storage (LRS), StorageV2. Use an available lowercase name.
2. Keep anonymous blob access disabled. Blog data is accessed server-side; no browser CORS rule or public container is needed.
3. Under **Storage browser → Tables**, create a table named `BlogPosts`. If the portal reports a data-access permission issue, ensure your administrator account has the appropriate Table data role for creating the table.
4. Under the storage account’s **Access control (IAM)**, assign **Storage Table Data Contributor** to the web app’s system-assigned managed identity, scoped to this storage account. Allow time for the assignment to propagate.
5. Copy the **Table service endpoint** from the account’s endpoints page. It looks like `https://ACCOUNT.table.core.windows.net`.

This uses the web app’s managed identity. Do not put a storage key or connection string in GitHub, frontend code, or a screenshot. This is regular Azure Storage Tables; Cosmos DB is not required.

## 3. Configure Microsoft sign-in and owner access

1. Open the web app’s **Authentication → Add identity provider → Microsoft**.
2. Use the lab’s workforce tenant and **current tenant / single tenant** accounts. Let Azure create a dedicated app registration for Brie’s Lab if necessary.
3. Initially choose **Require authentication**, with unauthenticated users redirected to Microsoft sign-in. Keep the provider enabled at all times.
4. In **Microsoft Entra ID → Overview**, copy the tenant ID.
5. In **Microsoft Entra ID → Users → your lab user → Overview**, copy your user’s **Object ID**. This is not the app registration’s object ID or application/client ID.
6. Set these web app **Environment variables** and save/restart:

| Name | Value |
| --- | --- |
| `AZURE_AUTH_ENABLED` | `true`, only after Authentication above is enabled |
| `AZURE_TENANT_ID` | The lab tenant ID |
| `BLOG_OWNER_OBJECT_ID` | Your lab user’s Object ID |
| `SITE_ORIGIN` | The exact HTTPS origin shown on the web app Overview page, with no path |
| `SITE_VISIBILITY` | `private` |
| `AZURE_STORAGE_TABLE_ENDPOINT` | The Table service endpoint |
| `AZURE_STORAGE_TABLE_NAME` | `BlogPosts` |

`WEBSITE_SITE_NAME` is supplied by App Service. Do not simulate it on another host. The app accepts owner identity only from App Service’s authenticated headers and requires both tenant and user object IDs. Other tenant users are denied by the application.

## 4. Authorize GitHub deployment without a stored password

Use a dedicated **user-assigned managed identity** for deployment, separate from the web app’s system-assigned storage identity:

1. In Azure Portal, search **Managed Identities**, create a user-assigned identity named `brie-lab-deploy` in the same resource group.
2. On this identity, open **Federated credentials → Add credential**. Choose the GitHub Actions scenario.
3. Set organization/user `brielle-shepard`, repository `brie-lab`, entity type **Branch**, branch `main`. Keep the default Azure token-exchange audience. Save.
4. On the **web app’s** IAM page, grant this deployment identity **Website Contributor** scoped to that web app, not the entire subscription.
5. Copy the deployment identity’s **Client ID**, your tenant ID, and the subscription ID.
6. In GitHub → this repository → **Settings → Secrets and variables → Actions → Variables**, add:

| Repository variable | Value |
| --- | --- |
| `AZURE_CLIENT_ID` | Deployment identity’s Client ID |
| `AZURE_TENANT_ID` | Lab tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID |
| `AZURE_WEBAPP_NAME` | The web app resource name, not its full hostname |
| `AZURE_DEPLOY_ENABLED` | `true`, after all setup steps above are complete |

These identifiers are not passwords. OIDC exchanges GitHub’s short-lived identity for an Azure token; no client secret or publish profile is required. Restrict repository write access because pushes to `main` can deploy after enabling this switch.

Run **Actions → Check and deploy Brie Lab → Run workflow**, selecting `main`. The workflow first tests and builds, then uploads the standalone application package. Subsequent pushes to `main` follow the same process. Pull requests run checks but cannot deploy. Avoid adding a second autogenerated deployment workflow in Azure Deployment Center.

## 5. Verify the private Azure version

Use the default HTTPS hostname copied from Azure’s Overview page:

1. Sign in with your lab account; check Home, About (including your portrait), Projects, and Blog.
2. Open `/studio`, save a disposable draft, and confirm it does not appear in `/blog` or the latest-entry sidebar.
3. Publish the test entry, then edit it. Confirm the initial published date remains unchanged.
4. Attempt conflicting edits in two tabs; the stale tab must receive a conflict message.
5. Sign out and test from a private browser window. The site should still require sign-in while visibility is private. An authenticated user with a different object ID must not access the studio or write APIs.
6. Recycle the web app and verify saved entries remain; they are in Table Storage rather than the application filesystem.

Local automated tests cover request authorization, draft filtering, date retention, stale edits, Unicode storage encoding, and safe Markdown. Live Entra authentication, Azure role assignments, Table service access, TLS, and DNS still require the checks above in your tenant.

## Move existing blog entries

No current blog data is bundled in this repository. Before changing DNS:

1. Sign in to the existing Sites writing studio as its owner. In that same signed-in browser, open `/api/blog/posts` on the existing site and save the JSON response privately to `imports/posts.json` in your local checkout. The original endpoint lists at most 200 entries; verify the export contains every entry before proceeding. More than 200 entries require a full source database export.
2. Keep a separate protected copy. Do not add this file to Git; the `imports/`, `exports/`, and `backups/` directories are ignored.
3. On a local Node.js 24 environment with Azure CLI signed in to the lab tenant and Table data permissions, set the table endpoint and `BLOG_OWNER_OBJECT_ID` in your environment. Then validate:

```sh
node --experimental-strip-types scripts/import-blog.mjs imports/posts.json
```

4. When validation succeeds, rerun with `--apply`. Import preserves IDs, titles, bodies, publication dates, creation dates, edit dates, versions, and draft states. It reassigns ownership to your configured Entra user. It never overwrites a different destination entry; retries skip identical entries.
5. Verify entry counts and both draft and published examples in the Azure studio. Keep the original site and export until the move has been verified.

For later backups, run `node --experimental-strip-types scripts/export-blog.mjs` with authenticated Table access. It writes a dated JSON file in `exports/`. Store backups securely outside this repository.

## 6. Connect brielab.info

Only do this after the Azure version and any data import pass verification:

1. On the web app, open **Custom domains → Add custom domain** and enter `brielab.info`. A domain purchased through Microsoft 365 is not automatically an Azure App Service Domain; choose the option for an existing external domain when appropriate.
2. Choose the free **App Service Managed Certificate** and SNI binding on Basic or higher. Azure will show the required DNS values.
3. If Microsoft manages the domain’s DNS, open **Microsoft 365 admin center → Settings → Domains → brielab.info → DNS records**. Otherwise follow the DNS-provider link shown there.

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | The app IP address shown by Azure |
| TXT | `asuid` | Azure’s domain verification ID |
| CNAME, if adding www | `www` | The exact default app hostname supplied by Azure |
| TXT, if adding www | `asuid.www` | Azure’s verification ID |

Keep Microsoft 365 MX, SPF, DKIM, autodiscover, and verification records. Do not replace the nameservers or create a CNAME at the root. Resolve conflicting existing website records only after confirming what they serve.

4. Return to Azure, validate the records, add the domain, and wait for the certificate status to show **Secured**. Add `www.brielab.info` separately if desired.
5. In the Microsoft identity provider’s app registration, add the web redirect URI `https://brielab.info/.auth/login/aad/callback`. Retain the existing Azure-hostname callback during transition. Add a corresponding callback for `www` only if it will be used for sign-in.
6. Update `SITE_ORIGIN` to `https://brielab.info`. Use that origin for the writing studio; writes from the old hostname are intentionally rejected once the canonical origin changes.
7. Recheck sign-in, draft saves, published entries, HTTPS, and Microsoft 365 mail.

Visibility remains private. When you explicitly decide to open the portfolio to visitors, change App Service Authentication to **Allow unauthenticated requests** while keeping the Microsoft provider enabled, and set `SITE_VISIBILITY=public`. `/studio` and its write APIs still require the configured owner. Verify unauthorized requests remain blocked before sharing the URL.

## Official references

- [GitHub Actions deployment to App Service](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions)
- [Microsoft identity provider for App Service](https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-provider-aad)
- [Trusted App Service identity headers](https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-user-identities)
- [Azure Tables JavaScript SDK](https://learn.microsoft.com/en-us/javascript/api/overview/azure/data-tables-readme)
- [Map an existing domain to App Service](https://learn.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-custom-domain)
- [Microsoft 365 website DNS records](https://learn.microsoft.com/en-us/microsoft-365/admin/dns/update-dns-records-to-retain-current-hosting-provider)
