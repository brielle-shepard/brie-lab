type Environment = Record<string, string | undefined>;
export type BlogOwner = { userId: string; tenantId: string };
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Trust identity headers only behind enabled App Service Authentication.
export function authConfigured(env: Environment = process.env) {
  return env.AZURE_AUTH_ENABLED === "true" && Boolean(env.WEBSITE_SITE_NAME) &&
    guid.test(env.AZURE_TENANT_ID ?? "") && guid.test(env.BLOG_OWNER_OBJECT_ID ?? "");
}
export function readAzureOwner(headers: Pick<Headers, "get">, env: Environment = process.env): BlogOwner | null {
  if (!authConfigured(env)) return null;
  const encoded = headers.get("x-ms-client-principal");
  if (!encoded || encoded.length > 65536) return null;
  try {
    const principal = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    if (principal.auth_typ !== "aad" || !Array.isArray(principal.claims)) return null;
    const getClaim = (...names: string[]) => {
      const values = principal.claims.filter((c: {typ?: unknown; val?: unknown}) =>
        typeof c.typ === "string" && names.includes(c.typ) && typeof c.val === "string"
      ).map((c: {val: string}) => c.val.toLowerCase());
      return new Set(values).size === 1 ? values[0] : null;
    };
    const userId = getClaim("oid", "http://schemas.microsoft.com/identity/claims/objectidentifier");
    const tenantId = getClaim("tid", "http://schemas.microsoft.com/identity/claims/tenantid");
    if (userId !== env.BLOG_OWNER_OBJECT_ID?.toLowerCase() || tenantId !== env.AZURE_TENANT_ID?.toLowerCase()) return null;
    return { userId, tenantId };
  } catch { return null; }
}
export function isSameOriginJson(request: Request, env: Environment = process.env): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json" || !env.SITE_ORIGIN) return false;
  // TLS terminates upstream: use the configured origin, never a client Host header.
  try { return new URL(origin).origin === new URL(env.SITE_ORIGIN).origin; } catch { return false; }
}
