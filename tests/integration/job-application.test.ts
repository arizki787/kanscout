import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDB } from "../helpers/db-test";
import {
  createJobApplication,
  updateJobApplication,
  deleteJobApplication,
} from "@/lib/actions/job-application";
import { JobApplication } from "@/lib/models";
import { mockSession } from "../helpers/auth-mock";
import { revalidatePath, updateTag } from "next/cache";
import { type JobSource } from "@/lib/job-source";
import mongoose from "mongoose";

describe("Job Application Server Actions (Single Collection)", () => {
  setupTestDB();

  const userIdA = "user_A_123";
  const userIdB = "user_B_456";

  beforeEach(async () => {
    mockSession({ id: userIdA, email: "userA@example.com" });
  });

  describe("Authentication & Security", () => {
    it("rejects unauthenticated requests", async () => {
      mockSession(null);

      const createRes = await createJobApplication({
        company: "Acme Inc",
        position: "Developer",
        location: "Remote",
        status: "wishlist",
      });
      expect(createRes).toEqual({ error: "Unauthorized" });

      const updateRes = await updateJobApplication(
        new mongoose.Types.ObjectId().toString(),
        { position: "Hacked" }
      );
      expect(updateRes).toEqual({ error: "Unauthorized" });

      const deleteRes = await deleteJobApplication(
        new mongoose.Types.ObjectId().toString()
      );
      expect(deleteRes).toEqual({ error: "Unauthorized" });
    });

    it("prevents User B from updating or deleting User A's job application", async () => {
      // Create as User A
      const createRes = await createJobApplication({
        company: "Stripe",
        position: "Backend Engineer",
        location: "Remote",
        status: "wishlist",
      });
      const appId = createRes.data._id;

      // Switch to User B
      mockSession({ id: userIdB, email: "userB@example.com" });

      const updateRes = await updateJobApplication(appId, {
        company: "Hacked Company",
      });
      expect(updateRes).toEqual({ error: "Unauthorized" });

      const deleteRes = await deleteJobApplication(appId);
      expect(deleteRes).toEqual({ error: "Unauthorized" });
    });
  });

  describe("Validation", () => {
    it("rejects creation if required fields are missing", async () => {
      const res = await createJobApplication({
        company: "",
        position: "Dev",
        location: "Remote",
      });
      expect(res).toEqual({ error: "Missing required fields" });
    });

    it("rejects invalid job source on creation and update", async () => {
      const createRes = await createJobApplication({
        company: "Apple",
        position: "iOS Engineer",
        location: "Cupertino",
        source: "unsupported-platform" as unknown as JobSource,
      });
      expect(createRes).toEqual({ error: "Invalid job source" });

      const validJob = await createJobApplication({
        company: "Apple",
        position: "iOS Engineer",
        location: "Cupertino",
      });

      const updateRes = await updateJobApplication(validJob.data._id, {
        source: "invalid_source" as unknown as JobSource,
      });
      expect(updateRes).toEqual({ error: "Invalid job source" });
    });

    it("rejects invalid status", async () => {
      const createRes = await createJobApplication({
        company: "Apple",
        position: "iOS Engineer",
        status: "invalid_status" as any,
      });
      expect(createRes).toEqual({ error: "Invalid job status" });
    });
  });

  describe("createJobApplication", () => {
    it("creates a job with default wishlist status, infers source, and invalidates cache", async () => {
      const firstJob = await createJobApplication({
        company: "Google",
        position: "Software Engineer",
        location: "Mountain View",
        jobUrl: "https://www.linkedin.com/jobs/view/123",
      });

      expect(firstJob.data).toBeDefined();
      expect(firstJob.data.status).toBe("wishlist");
      expect(firstJob.data.source).toBe("linkedin");
      expect(firstJob.data.appliedDate).toBeUndefined();
      expect(firstJob.data.columnEnteredAt).toBeDefined();

      // Check cache invalidation
      expect(updateTag).toHaveBeenCalledWith(`board-${userIdA}`);
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("automatically sets appliedDate when created directly with 'applied' status", async () => {
      const appliedJob = await createJobApplication({
        company: "Netflix",
        position: "Fullstack Engineer",
        location: "Los Gatos",
        status: "applied",
      });

      expect(appliedJob.data.status).toBe("applied");
      expect(appliedJob.data.appliedDate).toBeDefined();
    });
  });

  describe("updateJobApplication", () => {
    it("updates simple fields (notes, salary, tags)", async () => {
      const created = await createJobApplication({
        company: "Amazon",
        position: "SDE I",
        location: "Seattle",
      });

      const updated = await updateJobApplication(created.data._id, {
        salary: "$150,000",
        notes: "Referral from friend",
        tags: ["High Priority", "Remote"],
      });

      expect(updated.data.salary).toBe("$150,000");
      expect(updated.data.notes).toBe("Referral from friend");
      expect(updated.data.tags).toEqual(["High Priority", "Remote"]);
    });

    it("transitions status, updating columnEnteredAt and appliedDate", async () => {
      const created = await createJobApplication({
        company: "Microsoft",
        position: "Cloud Engineer",
        location: "Redmond",
        status: "wishlist",
      });

      expect(created.data.appliedDate).toBeUndefined();

      // Move from "wishlist" to "applied"
      const moved = await updateJobApplication(created.data._id, {
        status: "applied",
      });

      expect(moved.data.status).toBe("applied");
      expect(moved.data.appliedDate).toBeDefined();
      expect(moved.data.columnEnteredAt).toBeDefined();
    });
  });

  describe("deleteJobApplication", () => {
    it("deletes the job application document", async () => {
      const created = await createJobApplication({
        company: "Discord",
        position: "Backend Engineer",
        location: "San Francisco",
      });

      const deleteRes = await deleteJobApplication(created.data._id);
      expect(deleteRes).toEqual({ success: true });

      // Verify document is deleted
      const doc = await JobApplication.findById(created.data._id);
      expect(doc).toBeNull();

      // Verify cache invalidation
      expect(updateTag).toHaveBeenCalledWith(`board-${userIdA}`);
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });
  });
});
