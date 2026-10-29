import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDB } from "../helpers/db-test";
import { mockSession } from "../helpers/auth-mock";
import { GET } from "@/app/api/profile/resume/route";
import Profile from "@/lib/models/profile";
import "@/lib/models";
import { vi } from "vitest";
import * as storage from "@/lib/supabase/storage";

describe("GET /api/profile/resume", () => {
  setupTestDB();

  const userId = "user_resume_route_test_123";
  const storagePath = "resumes/user_resume_route_test_123/1730000000-resume.pdf";
  const fakeSignedUrl =
    "https://example.supabase.co/storage/v1/object/sign/kanscout-storage/resumes/test.pdf?token=abc";

  beforeEach(() => {
    mockSession({ id: userId, email: "test@example.com", name: "Test User" });
    vi.mocked(storage.getSignedResumeUrl).mockResolvedValue(fakeSignedUrl);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSession(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when user has no resume", async () => {
    // No profile created — should return 404
    const res = await GET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/no resume/i);
  });

  it("redirects (307) to a signed URL when resume exists", async () => {
    await Profile.create({
      userId,
      personalInfo: { fullName: "Test User", email: "test@example.com" },
      skills: [],
      workExperience: [],
      education: [],
      projects: [],
      certifications: [],
      resume: {
        url: "/api/profile/resume",
        storagePath,
        fileName: "resume.pdf",
        fileSize: 12345,
        uploadedAt: new Date(),
      },
    });

    const res = await GET();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(fakeSignedUrl);
    expect(storage.getSignedResumeUrl).toHaveBeenCalledWith(storagePath, 60);
  });
});
