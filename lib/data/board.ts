import { getSession } from "@/lib/auth/auth";
import connectDB from "@/lib/db";
import { Board } from "@/lib/models";

export default async function getBoard(userId: string, query: string) {
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
        // Only apply a match filter if a search term actually exists
        match: query?.trim()
          ? {
              $or: [
                { position: { $regex: query.trim(), $options: "i" } },
                { company: { $regex: query.trim(), $options: "i" } },
              ],
            }
          : {},
      },
    })
    .lean();

  if (!boardDoc) return null;

  const board = JSON.parse(JSON.stringify(boardDoc));

  return board;
}