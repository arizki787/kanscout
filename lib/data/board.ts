import { cacheTag, cacheLife } from "next/cache";
import connectDB from "@/lib/db";
import { JobApplication } from "@/lib/models";
import { PIPELINE_COLUMNS, type Board, type JobApplication as JobApplicationType } from "../models/models.types";
import { escapeRegex } from "../escape-regex";

function normalizeJobStatus(raw?: string): JobApplicationType["status"] {
  if (!raw) return "wishlist";
  const s = raw.toLowerCase().replace(/[-_\s]/g, "");
  if (s.includes("wish")) return "wishlist";
  if (s.includes("interview")) return "interviewing";
  if (s.includes("offer")) return "offer";
  if (s.includes("reject")) return "rejected";
  if (s.includes("ghost")) return "ghosted";
  if (s.includes("apply") || s === "applied") return "applied";
  return "wishlist";
}

export default async function getBoard(userId: string, query: string): Promise<Board | null> {
  "use cache";
  cacheTag(`board-${userId}`);
  cacheLife("minutes"); // fallback expiry, adjust as needed

  if (!userId) return null;

  await connectDB();

  const q = (query ?? "").trim().slice(0, 100);
  const safe = q ? escapeRegex(q) : null;

  const searchFilter = safe
    ? {
        $or: [
          { position: { $regex: safe, $options: "i" } },
          { company: { $regex: safe, $options: "i" } },
        ],
      }
    : {};

  const rawJobs = await JobApplication.find({
    userId,
    ...searchFilter,
  })
    .sort({ columnEnteredAt: -1, createdAt: -1 })
    .lean();

  const jobs: JobApplicationType[] = JSON.parse(JSON.stringify(rawJobs)).map(
    (job: Record<string, unknown>) => ({
      ...job,
      status: normalizeJobStatus(typeof job.status === "string" ? job.status : undefined),
    })
  ) as JobApplicationType[];

  return {
    _id: "job-hunt",
    name: "Job Hunt",
    columns: PIPELINE_COLUMNS.map((col, index) => ({
      _id: col.status,
      status: col.status,
      name: col.name,
      order: index,
      jobApplications: jobs.filter((j) => j.status === col.status),
    })),
  };
}
