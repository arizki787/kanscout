import { cacheTag, cacheLife } from "next/cache";
import connectDB from "@/lib/db";
import { Board } from "@/lib/models";
import { escapeRegex } from "../escape-regex";

export default async function getBoard(userId: string, query: string) {
  "use cache";
  cacheTag(`board-${userId}`);
  cacheLife("minutes"); // fallback expiry, adjust as needed

  await connectDB();

  const q = (query ?? "").trim().slice(0, 100);
  const safe = q ? escapeRegex(q) : null;

  const boardDoc = await Board.findOne({ userId, name: "Job Hunt" })
    .populate({
      path: "columns",
      populate: {
        path: "jobApplications",
        match: safe
          ? {
              $or: [
                { position: { $regex: safe, $options: "i" } },
                { company: { $regex: safe, $options: "i" } },
              ],
            }
          : {},
      },
    })
    .lean();

  if (!boardDoc) return null;

  return JSON.parse(JSON.stringify(boardDoc));
}