import { beforeEach, describe, expect, it } from "vitest";
import { addScoutedJobToWishlist } from "@/lib/actions/scouted-job";
import { JobApplication } from "@/lib/models";
import { mockSession } from "../helpers/auth-mock";
import { setupTestDB } from "../helpers/db-test";

describe("addScoutedJobToWishlist", () => {
  setupTestDB();

  const userId = "scouted_job_test_user";

  beforeEach(async () => {
    mockSession({ id: userId });
  });

  it("saves a discovered job into the wishlist", async () => {
    const result = await addScoutedJobToWishlist({
      title: "Frontend Engineer",
      company: "Acme",
      location: "Remote",
      url: "https://boards.greenhouse.io/acme/jobs/123",
      source: "greenhouse",
      description: "Build frontend features.",
    });

    expect("data" in result).toBe(true);
    if (!("data" in result)) return;
    expect(result.data.status).toBe("wishlist");
    expect(result.data.source).toBe("greenhouse");

    const saved = await JobApplication.findById(result.data._id);
    expect(saved).toBeDefined();
    expect(saved?.status).toBe("wishlist");
  });

  it("does not create duplicate wishlist entries for the same posting", async () => {
    const job = {
      title: "Frontend Engineer",
      company: "Acme",
      location: "Remote",
      url: "https://boards.greenhouse.io/acme/jobs/123",
      source: "greenhouse" as const,
    };

    const first = await addScoutedJobToWishlist(job);
    const second = await addScoutedJobToWishlist(job);

    expect("data" in first).toBe(true);
    expect("alreadySaved" in second && second.alreadySaved).toBe(true);
    expect(
      await JobApplication.countDocuments({ userId, jobUrl: job.url }),
    ).toBe(1);
  });

  it("rejects URLs that do not belong to one of the supported job providers", async () => {
    const result = await addScoutedJobToWishlist({
      title: "Frontend Engineer",
      company: "Acme",
      location: "Remote",
      url: "https://malicious-site.example.com/jobs/123",
      source: "other" as any,
    });

    expect("error" in result).toBe(true);
  });
});
