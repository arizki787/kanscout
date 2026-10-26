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

afterEach(() => {
  vi.clearAllMocks();
});
