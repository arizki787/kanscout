import { vi } from "vitest";
import * as authModule from "@/lib/auth/auth";

export interface MockUser {
  id: string;
  email?: string;
  name?: string;
}

type SessionResult = Awaited<ReturnType<typeof authModule.getSession>>;

export function mockSession(user: MockUser | null) {
  const getSessionMock = vi.mocked(authModule.getSession);
  if (!user) {
    getSessionMock.mockResolvedValue(null as unknown as SessionResult);
  } else {
    getSessionMock.mockResolvedValue({
      user: {
        id: user.id,
        email: user.email ?? "test@example.com",
        name: user.name ?? "Test User",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      session: {
        id: "test-session-id",
        userId: user.id,
        token: "test-token",
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as unknown as SessionResult);
  }
}
