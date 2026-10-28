import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDB } from "../helpers/db-test";
import { getProfile, saveProfile } from "@/lib/actions/profile";
import { mockSession } from "../helpers/auth-mock";
import Profile from "@/lib/models/profile";
import "@/lib/models"; // ensure all models are registered

describe("Profile Server Actions", () => {
  setupTestDB();

  const userId = "user_profile_test_123";

  beforeEach(() => {
    mockSession({ id: userId, email: "test@example.com", name: "Test User" });
  });

  describe("Authentication & Security", () => {
    it("getProfile rejects unauthenticated requests", async () => {
      mockSession(null);
      const result = await getProfile();
      expect(result).toEqual({ error: "Unauthorized" });
    });

    it("saveProfile rejects unauthenticated requests", async () => {
      mockSession(null);
      const result = await saveProfile({ skills: ["TypeScript"] });
      expect(result).toEqual({ error: "Unauthorized" });
    });
  });

  describe("getProfile", () => {
    it("returns default profile structure when no profile exists", async () => {
      const result = await getProfile();
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.data?.personalInfo?.email).toBe("test@example.com");
      expect(result.data?.personalInfo?.fullName).toBe("Test User");
      expect(result.data?.skills).toEqual([]);
      expect(result.data?.workExperience).toEqual([]);
      expect(result.data?.education).toEqual([]);
      expect(result.data?.projects).toEqual([]);
      expect(result.data?.certifications).toEqual([]);
    });

    it("returns existing profile when it exists", async () => {
      // Create a profile first
      await Profile.create({
        userId,
        personalInfo: {
          fullName: "John Doe",
          email: "john@example.com",
          phone: "+1234567890",
          location: "New York, NY",
        },
        professionalSummary: "Experienced software engineer",
        skills: ["TypeScript", "React", "Node.js"],
        workExperience: [],
        education: [],
        projects: [],
        certifications: [],
      });

      const result = await getProfile();
      expect(result.data).toBeDefined();
      expect(result.data?.personalInfo?.fullName).toBe("John Doe");
      expect(result.data?.skills).toEqual(["TypeScript", "React", "Node.js"]);
      expect(result.data?.professionalSummary).toBe("Experienced software engineer");
    });
  });

  describe("saveProfile", () => {
    it("creates a new profile if none exists", async () => {
      const result = await saveProfile({
        personalInfo: {
          fullName: "Jane Doe",
          email: "jane@example.com",
          phone: "+9876543210",
          location: "San Francisco, CA",
          links: { linkedin: "https://linkedin.com/in/janedoe" },
        },
        professionalSummary: "Full stack developer",
        skills: ["Python", "Django", "React"],
        workExperience: [
          {
            company: "Tech Corp",
            role: "Senior Developer",
            location: "Remote",
            startDate: "Jan 2022",
            isCurrent: true,
          },
        ],
        education: [
          {
            institution: "MIT",
            degree: "Bachelor of Science",
            fieldOfStudy: "Computer Science",
            startDate: "2018",
            endDate: "2022",
          },
        ],
        projects: [],
        certifications: [],
      });

      expect(result).toEqual({ success: true });

      const saved = await Profile.findOne({ userId });
      expect(saved).not.toBeNull();
      expect(saved?.personalInfo?.fullName).toBe("Jane Doe");
      expect(saved?.skills).toEqual(["Python", "Django", "React"]);
      expect(saved?.workExperience?.[0]?.company).toBe("Tech Corp");
    });

    it("updates existing profile (upsert)", async () => {
      // Save initial profile
      await saveProfile({
        personalInfo: { fullName: "Initial Name", email: "init@example.com" },
        skills: ["JavaScript"],
      });

      // Update the profile
      await saveProfile({
        personalInfo: { fullName: "Updated Name", email: "updated@example.com" },
        skills: ["TypeScript", "Go"],
        professionalSummary: "Updated summary",
      });

      const saved = await Profile.findOne({ userId });
      expect(saved?.personalInfo?.fullName).toBe("Updated Name");
      expect(saved?.skills).toEqual(["TypeScript", "Go"]);
      expect(saved?.professionalSummary).toBe("Updated summary");
    });

    it("saves projects and certifications correctly", async () => {
      const result = await saveProfile({
        projects: [
          {
            title: "My Portfolio",
            description: "Personal portfolio website",
            technologies: ["React", "Next.js"],
            link: "https://myportfolio.com",
          },
        ],
        certifications: [
          {
            name: "AWS Solutions Architect",
            issuer: "Amazon",
            issueDate: "June 2023",
            credentialUrl: "https://aws.amazon.com/certification",
          },
        ],
      });

      expect(result).toEqual({ success: true });

      const saved = await Profile.findOne({ userId });
      expect(saved?.projects?.[0]?.title).toBe("My Portfolio");
      expect(saved?.projects?.[0]?.technologies).toEqual(["React", "Next.js"]);
      expect(saved?.certifications?.[0]?.name).toBe("AWS Solutions Architect");
    });
  });
});
