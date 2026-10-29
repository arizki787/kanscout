import { vi, afterEach } from "vitest";

// Mock next/cache globally
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

// Mock @/lib/auth/auth globally so it doesn't try to connect to real Mongo/Google Auth on import
vi.mock("@/lib/auth/auth", () => ({
  getSession: vi.fn(),
  auth: {
    api: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Mock @/lib/supabase/storage globally.
// uploadResumeToStorage now returns the stable app-relative URL (/api/profile/resume)
// instead of a Supabase public URL, because the bucket is private and access is
// gated through the authenticated GET /api/profile/resume route.
vi.mock("@/lib/supabase/storage", () => ({
  uploadResumeToStorage: vi.fn().mockResolvedValue({
    url: "/api/profile/resume",
    storagePath: "resumes/test/123-test.pdf",
  }),
  deleteResumeFromStorage: vi.fn().mockResolvedValue(undefined),
  getSignedResumeUrl: vi.fn().mockResolvedValue(
    "https://example.supabase.co/storage/v1/object/sign/kanscout-storage/resumes/test/123-test.pdf?token=abc"
  ),
  getSupabaseClient: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});
