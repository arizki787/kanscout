"use server";

import { getSession } from "@/lib/auth/auth";
import connectDB from "@/lib/db";
import { createJobApplication } from "@/lib/actions/job-application";
import { initializeUserBoard } from "@/lib/init-user-board";
import { Board, Column, JobApplication } from "@/lib/models";
import { inferJobSource, type JobSource } from "@/lib/job-source";

export interface ScoutedJobInput {
  title: string;
  company: string;
  location: string;
  url: string;
  source: JobSource;
  description?: string | null;
}

function isSecureScoutedJobUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      inferJobSource(url.href) !== "other"
    );
  } catch {
    return false;
  }
}

export async function addScoutedJobToWishlist(job: ScoutedJobInput) {
  const session = await getSession();
  if (!session?.user) return { error: "Unauthorized" };

  if (
    !job ||
    typeof job.title !== "string" ||
    !job.title.trim() ||
    job.title.length > 200 ||
    typeof job.company !== "string" ||
    !job.company.trim() ||
    job.company.length > 200 ||
    typeof job.location !== "string" ||
    job.location.length > 200 ||
    typeof job.url !== "string" ||
    job.url.length > 2_000 ||
    !isSecureScoutedJobUrl(job.url) ||
    typeof job.source !== "string" ||
    inferJobSource(job.url) !== job.source ||
    !["greenhouse", "lever", "workable", "wellfound"].includes(job.source) ||
    (job.description != null &&
      (typeof job.description !== "string" || job.description.length > 12_000))
  ) {
    return { error: "Invalid job details." };
  }

  await connectDB();
  const board = await initializeUserBoard(session.user.id);
  const boardForUser = await Board.findOne({
    _id: board._id,
    userId: session.user.id,
  });
  if (!boardForUser) return { error: "Job board not found." };

  const wishlist = await Column.findOne({
    boardId: boardForUser._id,
    name: /^wish list$/i,
  });
  if (!wishlist) return { error: "Wish List column not found." };

  const existing = await JobApplication.findOne({
    userId: session.user.id,
    boardId: boardForUser._id,
    jobUrl: job.url,
  }).lean();
  if (existing) {
    return {
      data: JSON.parse(JSON.stringify(existing)),
      alreadySaved: true,
    };
  }

  const result = await createJobApplication({
    company: job.company.trim(),
    position: job.title.trim(),
    location: job.location.trim() || "See listing",
    jobUrl: job.url,
    source: job.source,
    boardId: boardForUser._id.toString(),
    columnId: wishlist._id.toString(),
    description: job.description ?? undefined,
  });
  if ("error" in result) return result;

  return { data: result.data, alreadySaved: false };
}
