import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scoreJobsForCurrentUser } from "@/lib/actions/job-match";
import Profile from "@/lib/models/profile";
import { mockSession } from "../helpers/auth-mock";
import { setupTestDB } from "../helpers/db-test";

describe("scoreJobsForCurrentUser", () => {
  setupTestDB();

  const userId = "job_match_test_user";
  const jobUrl = "https://jobs.lever.co/acme/123";
  const originalGeminiApiKey = process.env.GEMINI_API_KEY;
  const originalAgnesApiKey = process.env.AGNES_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    mockSession({ id: userId });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    if (originalGeminiApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalGeminiApiKey;
    }
    if (originalAgnesApiKey === undefined) {
      delete process.env.AGNES_API_KEY;
    } else {
      process.env.AGNES_API_KEY = originalAgnesApiKey;
    }
  });

  it("fetches a posting description and scores it against only relevant profile data", async () => {
    process.env.AGNES_API_KEY = "test-agnes-key";
    await Profile.create({
      userId,
      personalInfo: {
        fullName: "Private Name",
        email: "private@example.com",
        location: "Jakarta",
      },
      professionalSummary: "Frontend developer",
      skills: ["TypeScript", "React"],
      workExperience: [],
      education: [],
      projects: [],
      certifications: [],
    });

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          `<script type="application/ld+json">{"@type":"JobPosting","description":"<p>Build and maintain software systems for our customers.</p>"}</script>`,
          { headers: { "content-type": "text/html" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    scores: [{ url: jobUrl, score: 82 }],
                  }),
                },
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", mockFetch);

    const result = await scoreJobsForCurrentUser([{ url: jobUrl }]);

    expect(result).toMatchObject({
      scores: [{ url: jobUrl, score: 82 }],
      descriptions: [
        {
          url: jobUrl,
          description: "Build and maintain software systems for our customers.",
        },
      ],
    });
    const prompt = String(
      JSON.parse(mockFetch.mock.calls[1][1].body).messages[0].content,
    );
    expect(prompt).toContain("TypeScript");
    expect(prompt).not.toContain("private@example.com");
    expect(prompt).not.toContain("Private Name");
    expect(mockFetch.mock.calls[1][0]).toBe(
      "https://apihub.agnes-ai.com/v1/chat/completions",
    );
  });

  it("returns an explicit unscored result when a full posting description is unavailable", async () => {
    process.env.AGNES_API_KEY = "test-agnes-key";
    await Profile.create({
      userId,
      skills: ["TypeScript"],
      workExperience: [],
      education: [],
      projects: [],
      certifications: [],
    });

    const mockFetch = vi.fn().mockResolvedValue(
      new Response("Not HTML", {
        headers: { "content-type": "text/plain" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      scoreJobsForCurrentUser([{ url: jobUrl }]),
    ).resolves.toEqual({
      error: "Job descriptions are not available for match scoring.",
      descriptions: [{ url: jobUrl, description: null }],
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
