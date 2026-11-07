import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractPostingDescription,
  fetchPostingDescription,
  normalizeBraveResult,
  searchScoutedJobs,
} from "@/lib/scout/jobs";
import {
  formatJobPostedAt,
  getScoutedJobPage,
} from "@/lib/scout/pagination";

const originalBraveApiKey = process.env.BRAVE_SEARCH_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalBraveApiKey === undefined) {
    delete process.env.BRAVE_SEARCH_API_KEY;
  } else {
    process.env.BRAVE_SEARCH_API_KEY = originalBraveApiKey;
  }
});

describe("job listing pagination", () => {
  it("shows at most 10 jobs per page and returns the remaining jobs on the last page", () => {
    const jobs = Array.from({ length: 25 }, (_, index) => `job-${index + 1}`);

    expect(getScoutedJobPage(jobs, 1)).toHaveLength(10);
    expect(getScoutedJobPage(jobs, 2)).toHaveLength(10);
    expect(getScoutedJobPage(jobs, 3)).toEqual([
      "job-21",
      "job-22",
      "job-23",
      "job-24",
      "job-25",
    ]);
  });
});

describe("job posted-at formatting", () => {
  const now = new Date("2026-11-04T20:00:00Z");

  it("formats timestamps as days or months ago", () => {
    expect(formatJobPostedAt("2026-11-02T20:00:00Z", now)).toBe("2 days ago");
    expect(formatJobPostedAt("2026-10-05T20:00:00Z", now)).toBe("1 month ago");
    expect(formatJobPostedAt("2026-10-04T20:00:00Z", now)).toBe(
      "More than 1 month ago",
    );
    expect(formatJobPostedAt("2025-11-04T20:00:00Z", now)).toBe(
      "More than 1 month ago",
    );
  });

  it("preserves existing relative text and handles missing or invalid values", () => {
    expect(formatJobPostedAt("2 days ago", now)).toBe("2 days ago");
    expect(formatJobPostedAt(null, now)).toBeNull();
    expect(formatJobPostedAt("not a date", now)).toBe("not a date");
  });
});

describe("scouted job normalization", () => {
  it("normalizes a Brave result from an allowed provider", () => {
    const job = normalizeBraveResult(
      {
        title: "Senior Engineer at Acme",
        url: "https://boards.greenhouse.io/acme/jobs/123",
        description: "Build reliable services & collaborate with the team.",
        page_age: "2026-10-30T00:00:00Z",
      },
      "greenhouse",
    );

    expect(job).toMatchObject({
      title: "Senior Engineer",
      company: "Acme",
      source: "greenhouse",
      snippet: "Build reliable services & collaborate with the team.",
      postedAt: "2026-10-30T00:00:00Z",
    });
  });

  it("rejects insecure, unrelated, or mismatched provider URLs", () => {
    expect(
      normalizeBraveResult(
        {
          title: "Engineer",
          url: "http://boards.greenhouse.io/acme/jobs/123",
          description: "Job description",
        },
        "greenhouse",
      ),
    ).toBeNull();
    expect(
      normalizeBraveResult(
        {
          title: "Engineer",
          url: "https://example.com/jobs/123",
          description: "Job description",
        },
        "greenhouse",
      ),
    ).toBeNull();
  });
});

describe("job posting description extraction", () => {
  it("prefers the full JobPosting schema description", () => {
    const html = `<html><script type="application/ld+json">
      {"@type":"JobPosting","description":"<p>Build and maintain software systems for our customers.</p>"}
    </script><body>Navigation text</body></html>`;

    expect(extractPostingDescription(html)).toBe(
      "Build and maintain software systems for our customers.",
    );
  });

  it("does not treat a short page summary as a full description", () => {
    expect(
      extractPostingDescription(
        '<html><meta name="description" content="A short summary"></html>',
      ),
    ).toBeNull();
  });

  it("fetches descriptions only from supported HTTPS postings", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        `<script type="application/ld+json">{"@type":"JobPosting","description":"<p>Build and maintain software systems for our customers.</p>"}</script>`,
        { headers: { "content-type": "text/html" } },
      ),
    );
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      fetchPostingDescription("https://jobs.lever.co/acme/123"),
    ).resolves.toBe("Build and maintain software systems for our customers.");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://jobs.lever.co/acme/123",
      expect.objectContaining({ redirect: "error" }),
    );
    await expect(
      fetchPostingDescription("https://example.com/jobs/123"),
    ).resolves.toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("searchScoutedJobs", () => {
  it("searches all requested platforms and attaches posting descriptions", async () => {
    process.env.BRAVE_SEARCH_API_KEY = "test-key";
    const postingUrls = {
      greenhouse: "https://boards.greenhouse.io/acme/jobs/1",
      lever: "https://jobs.lever.co/acme/2",
      workable: "https://apply.workable.com/acme/j/3",
      wellfound: "https://wellfound.com/jobs/4",
    };
    const mockFetch = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.hostname === "api.search.brave.com") {
          const entry = Object.entries(postingUrls).find(([source]) =>
            url.searchParams.get("q")?.includes(`site:${{
              greenhouse: "boards.greenhouse.io",
              lever: "jobs.lever.co",
              workable: "apply.workable.com",
              wellfound: "wellfound.com",
            }[source as keyof typeof postingUrls]}`),
          );
          if (!entry) return Response.json({ web: { results: [] } });
          const [source, postingUrl] = entry;
          return Response.json({
            web: {
              results: [
                {
                  title: `Engineer at ${source}`,
                  url: postingUrl,
                  description: "Search result summary",
                  page_age: "2026-10-30T00:00:00Z",
                },
              ],
            },
          });
        }

        const headers = new Headers(init?.headers);
        expect(headers.get("Accept")).toBe("text/html");
        return new Response(
          `<script type="application/ld+json">{"@type":"JobPosting","description":"<p>Build and maintain software systems for our customers.</p>"}</script>`,
          { headers: { "content-type": "text/html" } },
        );
      },
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await searchScoutedJobs("React engineer", "Jakarta");

    expect(result.jobs).toHaveLength(4);
    expect(result.unavailableSources).toEqual([]);
    expect(new Set(result.jobs.map((job) => job.source)).size).toBe(4);
    expect(result.jobs.every((job) => job.description === null)).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(4);

    const braveHeaders = new Headers(mockFetch.mock.calls[0][1]?.headers);
    expect(braveHeaders.get("X-Subscription-Token")).toBe("test-key");
    const braveUrl = new URL(
      mockFetch.mock.calls[0][0] instanceof Request
        ? mockFetch.mock.calls[0][0].url
        : mockFetch.mock.calls[0][0].toString(),
    );
    expect(braveUrl.searchParams.get("q")).toContain("React engineer");
    expect(braveUrl.searchParams.get("q")).toContain("Jakarta");
    expect(braveUrl.searchParams.get("freshness")).toBe("pm");
  });
});
