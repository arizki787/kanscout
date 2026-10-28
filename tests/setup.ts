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

// Mock @/lib/supabase/storage globally
vi.mock("@/lib/supabase/storage", () => ({
  uploadResumeToStorage: vi.fn().mockResolvedValue({
    url: "https://example.supabase.co/storage/v1/object/public/kanscout-storage/resumes/test.pdf",
    storagePath: "resumes/test/123-test.pdf",
  }),
  deleteResumeFromStorage: vi.fn().mockResolvedValue(undefined),
  getSupabaseClient: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});
