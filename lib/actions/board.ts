import connectDB from "../db";
import { Board } from "../models";

export async function getBoard(userId: string) {
  "use cache";

  await connectDB();

  const boardDoc = await Board.findOne({
    userId: userId,
    name: "Job Hunt",
  })
    .populate({
      path: "columns",
      populate: {
        path: "jobApplications",
      },
    })
    .lean();

  if (!boardDoc) return null;

  const board = JSON.parse(JSON.stringify(boardDoc));

  return board;
}