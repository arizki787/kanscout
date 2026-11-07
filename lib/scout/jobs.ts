import { cacheLife } from "next/cache";
import { inferJobSource, type JobSource } from "@/lib/job-source";

export interface ScoutedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: Exclude<JobSource, "linkedin" | "jobstreet" | "indeed" | "glints" | "dealls" | "other">;
  snippet: string;
  description: string | null;
  postedAt: string | null;
}

export interface ScoutedJobsResult {
  jobs: ScoutedJob[];
  unavailableSources: string[];
}

const SEARCH_SOURCE_CONFIG = [
  {
    source: "greenhouse",
    domains: ["boards.greenhouse.io", "job-boards.greenhouse.io"],
  },
  { source: "lever", domains: ["jobs.lever.co"] },
  { source: "workable", domains: ["apply.workable.com"] },
  { source: "wellfound", domains: ["wellfound.com"] },
] as const satisfies ReadonlyArray<{
  source: ScoutedJob["source"];
  domains: readonly string[];
}>;

const MAX_RESULTS_PER_SOURCE = 20;
const MAX_JOBS = 40;
const MAX_DESCRIPTION_LENGTH = 12_000;
const MAX_HTML_BYTES = 1_000_000;

interface BraveWebResult {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  page_age?: unknown;
  age?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanText(value: string) {
  const decodeCodePoint = (value: string, radix: number) => {
    const codePoint = Number.parseInt(value, radix);
    return codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : " ";
  };

  return value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|section|article)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, value: string) => decodeCodePoint(value, 10))
    .replace(/&#x([a-f\d]+);/gi, (_, value: string) =>
      decodeCodePoint(value, 16),
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeJobTitle(title: string, company: string) {
  const cleaned = cleanText(title);
  const suffix = new RegExp(`\\s+(?:at|@|\\|)\\s+${company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  return cleaned.replace(suffix, "").trim() || cleaned;
}

function companyFromResult(
  title: string,
  url: URL,
  source: ScoutedJob["source"],
) {
  const titleMatch = cleanText(title).match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (titleMatch?.[2]) return titleMatch[2].trim();

  if (source === "wellfound") return "Company listed in posting";
  const slug = url.pathname
    .split("/")
    .filter(Boolean)
    .find((segment) => !["job", "jobs", "careers", "positions"].includes(segment.toLowerCase()));
  if (!slug) return "Company";
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseBraveResults(value: unknown) {
  if (!isRecord(value) || !isRecord(value.web) || !Array.isArray(value.web.results)) {
    return [];
  }
  return value.web.results;
}

export function normalizeBraveResult(
  value: unknown,
  source: ScoutedJob["source"],
): ScoutedJob | null {
  if (!isRecord(value)) return null;
  const result = value as BraveWebResult;
  if (
    typeof result.title !== "string" ||
    typeof result.url !== "string" ||
    typeof result.description !== "string"
  ) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(result.url);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    inferJobSource(url.href) !== source
  ) {
    return null;
  }

  const snippet = cleanText(result.description).slice(0, 1_000);
  if (!snippet) return null;

  const company = companyFromResult(result.title, url, source);
  const title = normalizeJobTitle(result.title, company);

  return {
    id: url.href,
    title,
    company,
    location: "See listing",
    url: url.href,
    source,
    snippet,
    description: null,
    postedAt:
      typeof result.page_age === "string"
        ? result.page_age
        : typeof result.age === "string"
          ? result.age
          : null,
  };
}

function extractJobPostingDescription(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const description = extractJobPostingDescription(item);
      if (description) return description;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  const type = value["@type"];
  const isJobPosting =
    type === "JobPosting" ||
    (Array.isArray(type) && type.includes("JobPosting"));
  if (isJobPosting && typeof value.description === "string") {
    return cleanText(value.description);
  }

  if (Array.isArray(value["@graph"])) {
    return extractJobPostingDescription(value["@graph"]);
  }
  return null;
}

export function extractPostingDescription(html: string): string | null {
  const jsonLdScripts = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const script of jsonLdScripts) {
    try {
      const description = extractJobPostingDescription(JSON.parse(script[1]));
      if (description) return description.slice(0, MAX_DESCRIPTION_LENGTH);
    } catch {
      continue;
    }
  }

  const mainContent =
    html.match(/<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)>/i)?.[1] ??
    html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (!mainContent) return null;
  const withoutNoise = mainContent.replace(
    /<(script|style|noscript|svg|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,
    " ",
  );
  const text = cleanText(withoutNoise);
  return text.length >= 200
    ? text.slice(0, MAX_DESCRIPTION_LENGTH)
    : null;
}

function isAllowedPostingUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const source = inferJobSource(url.href);
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    ["greenhouse", "lever", "workable", "wellfound"].includes(source)
  );
}

async function readLimitedBody(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = MAX_HTML_BYTES - total;
    const chunk = value.subarray(0, remaining);
    chunks.push(chunk);
    total += chunk.byteLength;
    if (chunk.byteLength < value.byteLength) {
      await reader.cancel();
      break;
    }
    if (total >= MAX_HTML_BYTES) await reader.cancel();
  }

  return new TextDecoder().decode(
    chunks.reduce((all, chunk) => {
      const combined = new Uint8Array(all.length + chunk.length);
      combined.set(all);
      combined.set(chunk, all.length);
      return combined;
    }, new Uint8Array()),
  );
}

export async function fetchPostingDescription(url: string) {
  if (!isAllowedPostingUrl(url)) return null;

  try {
    const response = await fetch(url, {
      headers: { Accept: "text/html" },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.toLowerCase().includes("text/html")) {
      return null;
    }
    return extractPostingDescription(await readLimitedBody(response));
  } catch {
    return null;
  }
}

async function searchSource(
  query: string,
  location: string,
  source: (typeof SEARCH_SOURCE_CONFIG)[number],
  apiKey: string,
) {
  const searchQuery = [
    source.domains.length === 1
      ? `site:${source.domains[0]}`
      : `(${source.domains.map((domain) => `site:${domain}`).join(" OR ")})`,
    query || "job opening",
    location,
  ]
    .filter(Boolean)
    .join(" ");
  const endpoint = new URL("https://api.search.brave.com/res/v1/web/search");
  endpoint.searchParams.set("q", searchQuery);
  endpoint.searchParams.set("count", String(MAX_RESULTS_PER_SOURCE));
  endpoint.searchParams.set("freshness", "pm");

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Brave Search returned HTTP ${response.status}.`);
  }

  const results: ScoutedJob[] = [];
  for (const item of parseBraveResults(await response.json())) {
    const job = normalizeBraveResult(item, source.source);
    if (job) results.push(job);
  }
  return results;
}

export async function searchScoutedJobs(
  rawQuery: string,
  rawLocation: string,
): Promise<ScoutedJobsResult> {
  "use cache";
  cacheLife("minutes");

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error("BRAVE_SEARCH_API_KEY is not configured.");
  }

  const query = rawQuery.trim().slice(0, 120);
  const location = rawLocation.trim().slice(0, 80);
  const responses = await Promise.all(
    SEARCH_SOURCE_CONFIG.map(async (source) => {
      try {
        return {
          source,
          jobs: await searchSource(query, location, source, apiKey),
        };
      } catch (error) {
        console.error(
          `[Agent Jobs] ${source.source} search failed:`,
          error,
        );
        return { source, jobs: null };
      }
    }),
  );

  const unavailableSources = responses
    .filter((response) => response.jobs === null)
    .map((response) => response.source.source);
  const jobsBySource = responses.map((response) => response.jobs ?? []);
  const candidates: ScoutedJob[] = [];
  for (let index = 0; candidates.length < MAX_JOBS; index += 1) {
    const round = jobsBySource
      .map((sourceJobs) => sourceJobs[index])
      .filter((job): job is ScoutedJob => Boolean(job));
    if (round.length === 0) break;
    candidates.push(...round.slice(0, MAX_JOBS - candidates.length));
  }

  if (candidates.length === 0 && unavailableSources.length > 0) {
    throw new Error("No job search sources are available right now.");
  }

  const unique = new Map<string, ScoutedJob>();
  for (const job of candidates) {
    if (!unique.has(job.url)) unique.set(job.url, job);
  }

  const jobs = [...unique.values()].slice(0, MAX_JOBS);

  return {
    jobs,
    unavailableSources,
  };
}
