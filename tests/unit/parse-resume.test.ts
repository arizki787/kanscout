import { describe, it, expect, vi } from "vitest";
import { parseResumeWithGemini } from "@/lib/ai/parse-resume";

// Mock @google/genai
const mockGenerateContent = vi.fn();
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
  };
});

describe("parseResumeWithGemini", () => {
  const dummyBuffer = Buffer.from("dummy pdf content");

  it("throws error if GEMINI_API_KEY is not set", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    await expect(parseResumeWithGemini(dummyBuffer)).rejects.toThrow(
      "GEMINI_API_KEY is not set"
    );

    process.env.GEMINI_API_KEY = originalKey;
  });

  it("parses valid JSON response from Gemini into structured profile sections", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    const mockResponseData = {
      personalInfo: {
        fullName: "Alex Morgan",
        email: "alex@example.com",
        phone: "+1 234 567 890",
        location: "Seattle, WA",
        links: {
          linkedin: "https://linkedin.com/in/alexmorgan",
          github: "https://github.com/alexmorgan",
          portfolio: "https://alexmorgan.dev",
        },
      },
      professionalSummary: "Senior software engineer with 6+ years of experience.",
      skills: ["React", "Next.js", "TypeScript", "Node.js"],
      workExperience: [
        {
          company: "TechNova",
          role: "Senior Full Stack Engineer",
          location: "Remote",
          startDate: "Jan 2021",
          endDate: "Present",
          isCurrent: true,
          description: "Leading frontend architecture.",
        },
      ],
      education: [
        {
          institution: "University of Washington",
          degree: "Bachelor of Science",
          fieldOfStudy: "Computer Science",
          startDate: "2015",
          endDate: "2019",
          gpa: "3.85",
        },
      ],
      projects: [
        {
          title: "AI Job Tracker",
          description: "Kanban board with AI auto-import.",
          technologies: ["React", "Tailwind CSS"],
          link: "https://github.com/alexmorgan/job-tracker",
        },
      ],
      certifications: [
        {
          name: "AWS Certified Developer",
          issuer: "Amazon Web Services",
          issueDate: "2023",
          credentialUrl: "https://aws.amazon.com/verification",
        },
      ],
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(mockResponseData),
    });

    const result = await parseResumeWithGemini(dummyBuffer);

    expect(result.personalInfo.fullName).toBe("Alex Morgan");
    expect(result.personalInfo.email).toBe("alex@example.com");
    expect(result.professionalSummary).toBe(
      "Senior software engineer with 6+ years of experience."
    );
    expect(result.skills).toEqual(["React", "Next.js", "TypeScript", "Node.js"]);
    expect(result.workExperience).toHaveLength(1);
    expect(result.workExperience[0].company).toBe("TechNova");
    expect(result.education).toHaveLength(1);
    expect(result.education[0].institution).toBe("University of Washington");
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].title).toBe("AI Job Tracker");
    expect(result.certifications).toHaveLength(1);
    expect(result.certifications[0].name).toBe("AWS Certified Developer");
  });

  it("handles markdown json wrapped responses cleanly", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    const mockResponseData = {
      personalInfo: { fullName: "Sarah Connor" },
      skills: ["Cybersecurity"],
      workExperience: [],
      education: [],
      projects: [],
      certifications: [],
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: "```json\n" + JSON.stringify(mockResponseData) + "\n```",
    });

    const result = await parseResumeWithGemini(dummyBuffer);
    expect(result.personalInfo.fullName).toBe("Sarah Connor");
    expect(result.skills).toEqual(["Cybersecurity"]);
  });
});
