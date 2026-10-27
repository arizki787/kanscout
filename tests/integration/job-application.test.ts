import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDB } from "../helpers/db-test";
import {
  createJobApplication,
  updateJobApplication,
  deleteJobApplication,
} from "@/lib/actions/job-application";
import { initializeUserBoard } from "@/lib/init-user-board";
import { Column, JobApplication } from "@/lib/models";
import { IBoard } from "@/lib/models/board";
import { IColumn } from "@/lib/models/column";
import { mockSession } from "../helpers/auth-mock";
import { revalidatePath, updateTag } from "next/cache";
import { type JobSource } from "@/lib/job-source";
import mongoose from "mongoose";

describe("Job Application Server Actions", () => {
  setupTestDB();

  const userIdA = "user_A_123";
  const userIdB = "user_B_456";

  let boardA: IBoard;
  let wishListColA: IColumn;
  let appliedColA: IColumn;

  beforeEach(async () => {
    boardA = (await initializeUserBoard(userIdA)) as unknown as IBoard;
    const columns = (await Column.find({ boardId: boardA._id }).sort({ order: 1 })) as unknown as IColumn[];
    wishListColA = columns.find((c) => c.name === "Wish List")!;
    appliedColA = columns.find((c) => c.name === "Applied")!;

    mockSession({ id: userIdA, email: "userA@example.com" });
  });

  describe("Authentication & Security", () => {
    it("rejects unauthenticated requests", async () => {
      mockSession(null);

      const createRes = await createJobApplication({
        company: "Acme Inc",
        position: "Developer",
        location: "Remote",
        columnId: wishListColA._id.toString(),
        boardId: boardA._id.toString(),
      });
      expect(createRes).toEqual({ error: "Unauthorized" });

      const updateRes = await updateJobApplication(new mongoose.Types.ObjectId().toString(), {
        position: "Hacked",
      });
      expect(updateRes).toEqual({ error: "Unauthorized" });

      const deleteRes = await deleteJobApplication(new mongoose.Types.ObjectId().toString());
      expect(deleteRes).toEqual({ error: "Unauthorized " });
    });

    it("prevents User B from creating an application on User A's board", async () => {
      mockSession({ id: userIdB, email: "userB@example.com" });

      const res = await createJobApplication({
        company: "Evil Corp",
        position: "Spy",
        location: "Remote",
        columnId: wishListColA._id.toString(),
        boardId: boardA._id.toString(),
      });

      expect(res).toEqual({ error: "Board not found" });
    });

    it("prevents User B from updating or deleting User A's job application", async () => {
      // Create as User A
      const createRes = await createJobApplication({
        company: "Stripe",
        position: "Backend Engineer",
        location: "Remote",
        columnId: wishListColA._id.toString(),
        boardId: boardA._id.toString(),
      });
      const appId = createRes.data._id;

      // Switch to User B
      mockSession({ id: userIdB, email: "userB@example.com" });

      const updateRes = await updateJobApplication(appId, { company: "Hacked Company" });
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
        columnId: wishListColA._id.toString(),
        boardId: boardA._id.toString(),
      });
      expect(res).toEqual({ error: "Missing required fields" });
    });

    it("rejects invalid job source on creation and update", async () => {
      const createRes = await createJobApplication({
        company: "Apple",
        position: "iOS Engineer",
        location: "Cupertino",
        columnId: wishListColA._id.toString(),
        boardId: boardA._id.toString(),
        source: "unsupported-platform" as unknown as JobSource,
      });
      expect(createRes).toEqual({ error: "Invalid job source" });

      const validJob = await createJobApplication({
        company: "Apple",
        position: "iOS Engineer",
        location: "Cupertino",
        columnId: wishListColA._id.toString(),
        boardId: boardA._id.toString(),
      });

      const updateRes = await updateJobApplication(validJob.data._id, {
        source: "invalid_source" as unknown as JobSource,
      });
      expect(updateRes).toEqual({ error: "Invalid job source" });
    });
  });

  describe("createJobApplication", () => {
    it("creates a job, increments order by 100, sets column status, and adds reference to column", async () => {
      const firstJob = await createJobApplication({
        company: "Google",
        position: "Software Engineer",
        location: "Mountain View",
        columnId: wishListColA._id.toString(),
        boardId: boardA._id.toString(),
        jobUrl: "https://www.linkedin.com/jobs/view/123",
      });

      expect(firstJob.data).toBeDefined();
      expect(firstJob.data.order).toBe(0);
      expect(firstJob.data.status).toBe("wish-list");
      expect(firstJob.data.source).toBe("linkedin");
      expect(firstJob.data.appliedDate).toBeUndefined();

      // Check column reference
      const updatedCol = await Column.findById(wishListColA._id);
      expect(updatedCol?.jobApplications.map((id: mongoose.Types.ObjectId) => id.toString())).toContain(firstJob.data._id);

      // Check cache invalidation
      expect(updateTag).toHaveBeenCalledWith(`board-${userIdA}`);
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");

      // Create a second job in the same column
      const secondJob = await createJobApplication({
        company: "Meta",
        position: "Frontend Engineer",
        location: "Menlo Park",
        columnId: wishListColA._id.toString(),
        boardId: boardA._id.toString(),
      });

      expect(secondJob.data.order).toBe(100);
    });

    it("automatically sets appliedDate when created directly in the 'Applied' column", async () => {
      const appliedJob = await createJobApplication({
        company: "Netflix",
        position: "Fullstack Engineer",
        location: "Los Gatos",
        columnId: appliedColA._id.toString(),
        boardId: boardA._id.toString(),
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
        columnId: wishListColA._id.toString(),
        boardId: boardA._id.toString(),
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

    it("moves job across columns, syncing status, columnEnteredAt, and appliedDate", async () => {
      const created = await createJobApplication({
        company: "Microsoft",
        position: "Cloud Engineer",
        location: "Redmond",
        columnId: wishListColA._id.toString(),
        boardId: boardA._id.toString(),
      });

      expect(created.data.appliedDate).toBeUndefined();

      // Move from "Wish List" to "Applied"
      const moved = await updateJobApplication(created.data._id, {
        columnId: appliedColA._id.toString(),
      });

      expect(moved.data.columnId).toBe(appliedColA._id.toString());
      expect(moved.data.status).toBe("applied");
      expect(moved.data.appliedDate).toBeDefined();
      expect(moved.data.columnEnteredAt).toBeDefined();

      // Verify old column no longer contains the ID, and new column does
      const oldCol = await Column.findById(wishListColA._id);
      const newCol = await Column.findById(appliedColA._id);
      expect(oldCol?.jobApplications.map((id: mongoose.Types.ObjectId) => id.toString())).not.toContain(created.data._id);
      expect(newCol?.jobApplications.map((id: mongoose.Types.ObjectId) => id.toString())).toContain(created.data._id);
    });

    it("correctly shifts orders when moving an item within the same column", async () => {
      // Create 3 jobs in wishListColA (orders: 0, 100, 200)
      await createJobApplication({
        company: "Company 0",
        position: "Dev",
        location: "Remote",
        columnId: wishListColA._id.toString(),
        boardId: boardA._id.toString(),
      });

      await createJobApplication({
        company: "Company 1",
        position: "Dev",
        location: "Remote",
        columnId: wishListColA._id.toString(),
        boardId: boardA._id.toString(),
      });

      const job2 = (await createJobApplication({
        company: "Company 2",
        position: "Dev",
        location: "Remote",
        columnId: wishListColA._id.toString(),
        boardId: boardA._id.toString(),
      })).data;

      // Move job2 to index 0 (top of the column)
      await updateJobApplication(job2._id, {
        order: 0,
      });

      const updatedJobs = await JobApplication.find({ columnId: wishListColA._id }).sort({ order: 1 });
      // Expect job2 to be first, and previous jobs shifted
      expect(updatedJobs[0]._id.toString()).toBe(job2._id);
      expect(updatedJobs[0].order).toBe(0);
      expect(updatedJobs[1].order).toBeGreaterThan(0);
    });
  });

  describe("deleteJobApplication", () => {
    it("deletes the job application and removes its reference from the column", async () => {
      const created = await createJobApplication({
        company: "Discord",
        position: "Backend Engineer",
        location: "San Francisco",
        columnId: wishListColA._id.toString(),
        boardId: boardA._id.toString(),
      });

      const colBefore = await Column.findById(wishListColA._id);
      expect(colBefore?.jobApplications.map((id: mongoose.Types.ObjectId) => id.toString())).toContain(created.data._id);

      const deleteRes = await deleteJobApplication(created.data._id);
      expect(deleteRes).toEqual({ success: true });

      // Verify document is deleted
      const doc = await JobApplication.findById(created.data._id);
      expect(doc).toBeNull();

      // Verify removed from column
      const colAfter = await Column.findById(wishListColA._id);
      expect(colAfter?.jobApplications.map((id: mongoose.Types.ObjectId) => id.toString())).not.toContain(created.data._id);

      // Verify cache invalidation
      expect(updateTag).toHaveBeenCalledWith(`board-${userIdA}`);
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });
  });
});
