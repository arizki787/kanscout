import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

import { scoreJobsForCurrentUser } from "@/lib/actions/job-match";
import Profile from "@/lib/models/profile";
import { mockSession } from "../helpers/auth-mock";
import { setupTestDB } from "../helpers/db-test";

describe("scoreJobsForCurrentUser", () => {
  setupTestDB();

  const userId = "job_match_test_user";
  const jobUrl = "https://jobs.lever.co/acme/123";
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    mockSession({ id: userId });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  });

  it("fetches a posting description and scores it against only relevant profile data", async () => {
    process.env.GEMINI_API_KEY = "test-key";
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

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          `<script type="application/ld+json">{"@type":"JobPosting","description":"<p>Build and maintain software systems for our customers.</p>"}</script>`,
          { headers: { "content-type": "text/html" } },
        ),
      ),
    );
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ scores: [{ url: jobUrl, score: 82 }] }),
    });

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
    const prompt = String(mockGenerateContent.mock.calls[0][0].contents);
    expect(prompt).toContain("TypeScript");
    expect(prompt).not.toContain("private@example.com");
    expect(prompt).not.toContain("Private Name");
  });

  it("returns an explicit unscored result when a full posting description is unavailable", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    await Profile.create({
      userId,
      skills: ["TypeScript"],
      workExperience: [],
      education: [],
      projects: [],
      certifications: [],
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Not HTML", {
          headers: { "content-type": "text/plain" },
        }),
      ),
    );

    await expect(
      scoreJobsForCurrentUser([{ url: jobUrl }]),
    ).resolves.toEqual({
      error: "Job descriptions are not available for match scoring.",
      descriptions: [{ url: jobUrl, description: null }],
    });
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});
