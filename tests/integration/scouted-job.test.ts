import { beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { addScoutedJobToWishlist } from "@/lib/actions/scouted-job";
import { initializeUserBoard } from "@/lib/init-user-board";
import { Column, JobApplication } from "@/lib/models";
import type { IBoard } from "@/lib/models/board";
import { mockSession } from "../helpers/auth-mock";
import { setupTestDB } from "../helpers/db-test";

describe("addScoutedJobToWishlist", () => {
  setupTestDB();

  const userId = "scouted_job_test_user";
  let board: IBoard;

  beforeEach(async () => {
    board = (await initializeUserBoard(userId)) as unknown as IBoard;
    mockSession({ id: userId });
  });

  it("saves a discovered job into the existing Wish List column", async () => {
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
    expect(result.data.status).toBe("wish-list");
    expect(result.data.source).toBe("greenhouse");

    const wishlist = await Column.findOne({
      boardId: board._id,
      name: "Wish List",
    });
    expect(
      wishlist?.jobApplications.map((id: mongoose.Types.ObjectId) =>
        id.toString(),
      ),
    ).toContain(result.data._id.toString());
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
      url: "https://example.com/jobs/123",
      source: "greenhouse",
    });

    expect(result).toEqual({ error: "Invalid job details." });
  });
});
