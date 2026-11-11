import { afterEach, describe, expect, it, vi } from "vitest";

const mockGenerateContent = vi.hoisted(() => vi.fn());
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

import { generateJobMatchScores } from "@/lib/ai/match-jobs";

const originalGeminiApiKey = process.env.GEMINI_API_KEY;
const originalAgnesApiKey = process.env.AGNES_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
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

describe("generateJobMatchScores", () => {
  const profile = {
    skills: ["TypeScript", "React"],
    workExperience: [],
    education: [],
    projects: [],
    certifications: [],
  };
  const jobs = [
    {
      url: "https://jobs.lever.co/acme/123",
      description: "Build React applications with TypeScript.",
    },
  ];

  it("uses Gemini first and returns validated percentage scores", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    delete process.env.AGNES_API_KEY;
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ scores: [{ url: jobs[0].url, score: 87.6 }] }),
    });
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    await expect(generateJobMatchScores(profile, jobs)).resolves.toEqual([
      { url: jobs[0].url, score: 88 },
    ]);
    expect(mockGenerateContent).toHaveBeenCalledOnce();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("ignores invalid scores rather than displaying fabricated percentages", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    delete process.env.AGNES_API_KEY;
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        scores: [
          { url: jobs[0].url, score: 150 },
          { url: "https://jobs.lever.co/acme/456", score: 60 },
        ],
      }),
    });

    await expect(generateJobMatchScores(profile, jobs)).resolves.toEqual([
      { url: "https://jobs.lever.co/acme/456", score: 60 },
    ]);
  });

  it("falls back to Agnes with agnes-2.5-flash when Gemini fails", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.AGNES_API_KEY = "test-agnes-key";
    mockGenerateContent.mockRejectedValueOnce(new Error("Gemini unavailable"));
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  scores: [{ url: jobs[0].url, score: 91 }],
                }),
              },
            },
          ],
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", mockFetch);

    await expect(generateJobMatchScores(profile, jobs)).resolves.toEqual([
      { url: jobs[0].url, score: 91 },
    ]);
    expect(mockGenerateContent).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      "https://apihub.agnes-ai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-agnes-key",
        }),
        body: expect.stringContaining('"model":"agnes-2.5-flash"'),
      }),
    );
  });

  it("requires at least one configured provider key", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.AGNES_API_KEY;
    await expect(generateJobMatchScores(profile, jobs)).rejects.toThrow(
      "GEMINI_API_KEY or AGNES_API_KEY is not configured",
    );
  });
});
