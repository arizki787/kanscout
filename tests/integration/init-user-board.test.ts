import { describe, it, expect } from "vitest";
import { initializeUserBoard } from "@/lib/init-user-board";
import { Board, Column } from "@/lib/models";
import { setupTestDB } from "../helpers/db-test";

describe("initializeUserBoard", () => {
  setupTestDB();

  const testUserId = "user_test_board_init";

  it("creates a Job Hunt board with all 6 default columns for a new user", async () => {
    const board = await initializeUserBoard(testUserId);

    expect(board).toBeDefined();
    expect(board.name).toBe("Job Hunt");
    expect(board.userId).toBe(testUserId);
    expect(board.columns).toHaveLength(6);

    const columns = await Column.find({ boardId: board._id }).sort({ order: 1 });
    expect(columns).toHaveLength(6);

    const expectedColumnNames = [
      "Wish List",
      "Applied",
      "Interviewing",
      "Offer",
      "Rejected",
      "Ghosted",
    ];
    expect(columns.map((col) => col.name)).toEqual(expectedColumnNames);
    expect(columns.map((col) => col.order)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("is idempotent and does not duplicate columns when run multiple times", async () => {
    const firstRun = await initializeUserBoard(testUserId);
    const secondRun = await initializeUserBoard(testUserId);

    expect(firstRun._id.toString()).toBe(secondRun._id.toString());

    const totalBoards = await Board.countDocuments({ userId: testUserId });
    const totalColumns = await Column.countDocuments({ boardId: firstRun._id });

    expect(totalBoards).toBe(1);
    expect(totalColumns).toBe(6);
  });
});
