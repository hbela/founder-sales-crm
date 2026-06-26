/**
 * Asset URL helpers. Email clients require absolute https URLs — relative paths
 * render in a browser preview but break in recipients' inboxes. Host assets at
 * `apps/web/public/email-assets/<campaign>/…` (served at the site root) and pass
 * the deployed site origin as the base.
 */

const ABSOLUTE = /^https?:\/\//i;

/** Resolve an asset path to an absolute URL against `baseUrl`. Pass-through if
 *  it is already absolute. */
export function assetUrl(path: string, baseUrl: string): string {
  if (ABSOLUTE.test(path)) return path;
  if (!baseUrl) throw new Error(`assetUrl: baseUrl is required to absolutize "${path}"`);
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/** Throw if a URL is not an absolute https URL (use in a pre-send guard). */
export function assertAbsolute(url: string): string {
  if (!ABSOLUTE.test(url)) {
    throw new Error(`Email asset URL must be absolute (https://…), got: "${url}"`);
  }
  return url;
}

/** Bind a base URL once and get a terse `asset("campaign/hero.png")` resolver. */
export function createAssetResolver(baseUrl: string): (path: string) => string {
  return (path: string) => assetUrl(path, baseUrl);
}
