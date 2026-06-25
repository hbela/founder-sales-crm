import { glmJson, isGlmConfigured } from "./glm.js";

export interface WebsiteExtraction {
  generalEmail: string | null;
  legalName: string | null;
  dentistCount: number | null;
  employeeCount: number | null;
  locationCount: number | null;
  hasOnlineBooking: boolean;
}

export { isGlmConfigured };

const MAX_PAGES = 4; // homepage + up to 3 relevant subpages
const PER_PAGE_CHARS = 7000;
const TOTAL_CHARS = 16000;

// Subpages that typically list the team / staff / branches. Hungarian first,
// since the target market is Hungarian dental clinics, then English fallbacks.
const TEAM_KEYWORDS = [
  "rolunk", "rólunk", "kolleg", "kollég", "csapat", "orvos", "munkatars", "munkatárs",
  "szemelyzet", "személyzet", "bemutatkoz", "team", "about", "staff", "doctors", "dentist",
];
const CONTACT_KEYWORDS = ["kapcsolat", "elerhet", "elérhet", "contact", "rendelo", "rendelő"];

interface RankedLink {
  url: string;
  score: number;
}

/** Fetch a single page's raw HTML, following redirects. */
async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  const res = await fetch(normalized, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FounderCRM-Prospecting/1.0)" },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Website fetch ${res.status} for ${normalized}`);
  }
  return { html: await res.text(), finalUrl: res.url };
}

/** Lightweight HTML → text (no parser dependency). */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rank same-host links by how likely they are to list staff/branches. */
function rankLinks(html: string, baseUrl: string): RankedLink[] {
  const base = new URL(baseUrl);
  const best = new Map<string, RankedLink>(); // keyed by pathname, dedupes nav links
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) continue;
    let abs: URL;
    try {
      abs = new URL(href, baseUrl);
    } catch {
      continue;
    }
    if (abs.protocol !== "http:" && abs.protocol !== "https:") continue;
    if (abs.host !== base.host) continue;
    if (abs.pathname === base.pathname || abs.pathname === "/") continue;

    const text = (m[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    const haystack = `${abs.pathname.toLowerCase()} ${text}`;
    let score = 0;
    if (TEAM_KEYWORDS.some((k) => haystack.includes(k))) score += 3;
    if (CONTACT_KEYWORDS.some((k) => haystack.includes(k))) score += 1;
    if (score === 0) continue;

    const existing = best.get(abs.pathname);
    if (!existing || score > existing.score) {
      best.set(abs.pathname, { url: abs.href, score });
    }
  }

  return [...best.values()].sort((a, b) => b.score - a.score);
}

/**
 * Gather text from the clinic's homepage plus the most relevant subpages
 * (team/about/contact), where dentist rosters and branch lists usually live.
 */
async function gatherSiteText(website: string): Promise<string> {
  const { html, finalUrl } = await fetchHtml(website);
  const chunks: string[] = [`PAGE ${finalUrl}\n${htmlToText(html).slice(0, PER_PAGE_CHARS)}`];

  const ranked = rankLinks(html, finalUrl).slice(0, MAX_PAGES - 1);
  for (const link of ranked) {
    try {
      const sub = await fetchHtml(link.url);
      chunks.push(`PAGE ${link.url}\n${htmlToText(sub.html).slice(0, PER_PAGE_CHARS)}`);
    } catch {
      // Skip unreachable subpages; the homepage text is still useful.
    }
  }

  return chunks.join("\n\n").slice(0, TOTAL_CHARS);
}

function buildPrompt(brandName: string, websiteText: string): string {
  // Applies docs/Advanced GLM 5.2 Prompt Engineering.md principles:
  // persona framing, explicit output schema, "never invent" guard, low temperature.
  return `You are a meticulous B2B data-extraction specialist analysing a dental clinic's website. The text below is concatenated from several pages of the site (homepage, "about/team" page, contact page); each page begins with a "PAGE <url>" marker.

CLINIC: ${brandName}

WEBSITE TEXT (truncated, multiple pages):
"""
${websiteText}
"""

TASK: Extract only facts that are explicitly present in the text. If a field is not stated, return null. Never guess or invent values.

Counting guidance:
- A "dentist" is a person presented as a doctor/dentist — typically a name prefixed with "Dr." and/or a Hungarian title such as "fogorvos", "fogszakorvos", "szájsebész", "fogszabályozó szakorvos", or the English "dentist"/"doctor". Count each distinct such person once.
- "employeeCount" is the TOTAL number of distinct staff members listed on the team page — dentists PLUS hygienists ("dentálhigiénikus"), assistants ("asszisztens", "szakasszisztens"), coordinators ("koordinátor"), and any other named staff. Only count if a team/staff roster is actually present.
- Do NOT count the same person under multiple roles. dentistCount must be <= employeeCount when both are known.

Return a JSON object with EXACTLY these keys:
{
  "generalEmail": string | null,      // a generic clinic email such as info@/rendelo@/recepcio@; prefer non-personal addresses
  "legalName": string | null,         // registered company / legal entity name (e.g. "... Kft.") if stated
  "dentistCount": number | null,      // number of dentists/doctors listed, per the guidance above
  "employeeCount": number | null,     // total staff members listed, per the guidance above
  "locationCount": number | null,     // number of clinic locations/branches, if stated
  "hasOnlineBooking": boolean         // true only if an online booking / appointment widget or link is present
}`;
}

/**
 * Enrich a prospect from its website using GLM. Crawls the homepage plus the
 * most relevant subpages (team/about/contact) so staff rosters are seen.
 */
export async function enrichFromWebsite(brandName: string, website: string): Promise<WebsiteExtraction> {
  if (!isGlmConfigured()) {
    throw new Error("GLM_API_KEY not set. Add it to .env to enable website enrichment (see .env.example).");
  }
  const text = await gatherSiteText(website);
  const extracted = await glmJson<Partial<WebsiteExtraction>>(buildPrompt(brandName, text), {
    temperature: 0.2,
    maxTokens: 1024,
  });

  const dentistCount = toInt(extracted.dentistCount);
  let employeeCount = toInt(extracted.employeeCount);
  // Guard against the model reporting fewer staff than dentists.
  if (dentistCount != null && employeeCount != null && employeeCount < dentistCount) {
    employeeCount = dentistCount;
  }

  return {
    generalEmail: normalizeEmail(extracted.generalEmail),
    legalName: nonEmpty(extracted.legalName),
    dentistCount,
    employeeCount,
    locationCount: toInt(extracted.locationCount),
    hasOnlineBooking: Boolean(extracted.hasOnlineBooking),
  };
}

function normalizeEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed) ? trimmed : null;
}

function nonEmpty(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function toInt(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}
