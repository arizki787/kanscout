import { afterEach, describe, expect, it, vi } from "vitest";

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

import { generateJobMatchScores } from "@/lib/ai/match-jobs";

const originalApiKey = process.env.GEMINI_API_KEY;
const originalGroqApiKey = process.env.GROQ_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  if (originalApiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalApiKey;
  }
  if (originalGroqApiKey === undefined) {
    delete process.env.GROQ_API_KEY;
  } else {
    process.env.GROQ_API_KEY = originalGroqApiKey;
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

  it("returns validated percentage scores from Gemini", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.GROQ_API_KEY;
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        scores: [{ url: jobs[0].url, score: 87.6 }],
      }),
    });

    await expect(generateJobMatchScores(profile, jobs)).resolves.toEqual([
      { url: jobs[0].url, score: 88 },
    ]);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: { responseMimeType: "application/json" },
      }),
    );
  });

  it("ignores invalid scores rather than displaying fabricated percentages", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.GROQ_API_KEY;
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

  it("requires a configured Gemini API key", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    await expect(generateJobMatchScores(profile, jobs)).rejects.toThrow(
      "GEMINI_API_KEY or GROQ_API_KEY is not configured",
    );
  });

  it("falls back to Groq when Gemini fails", async () => {
    process.env.GEMINI_API_KEY = "invalid-gemini-key";
    process.env.GROQ_API_KEY = "test-groq-key";
    mockGenerateContent.mockRejectedValueOnce(new Error("Invalid API key"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
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
      ),
    );

    await expect(generateJobMatchScores(profile, jobs)).resolves.toEqual([
      { url: jobs[0].url, score: 91 },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-groq-key",
        }),
        body: expect.stringContaining('"model":"openai/gpt-oss-120b"'),
      }),
    );
  });
});
