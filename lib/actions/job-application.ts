"use server";

import { getSession } from "../auth/auth";
import connectDB from "../db";
import { JobApplication } from "../models";
import { revalidatePath, updateTag } from "next/cache";
import { inferJobSource, isJobSource, type JobSource } from "../job-source";
import { isJobStatus, type JobStatus } from "../models/models.types";

export interface CreateJobApplicationData {
  company: string;
  position: string;
  location?: string;
  notes?: string;
  salary?: string;
  jobUrl?: string;
  source?: JobSource;
  status?: JobStatus;
  tags?: string[];
  description?: string;
}

export async function createJobApplication(data: CreateJobApplicationData) {
  await connectDB();

  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const {
    company,
    position,
    location,
    notes,
    salary,
    jobUrl,
    source,
    status = "wishlist",
    tags,
    description,
  } = data;

  if (!company || !position) {
    return { error: "Missing required fields" };
  }

  if (source !== undefined && !isJobSource(source)) {
    return { error: "Invalid job source" };
  }

  if (!isJobStatus(status)) {
    return { error: "Invalid job status" };
  }

  const isApplied = status === "applied";

  const jobApplication = await JobApplication.create({
    company,
    position,
    location,
    notes,
    salary,
    jobUrl,
    source: isJobSource(source) ? source : inferJobSource(jobUrl),
    userId: session.user.id,
    tags: tags || [],
    description,
    status,
    appliedDate: isApplied ? new Date() : undefined,
    columnEnteredAt: new Date(),
    order: 0,
  });

  updateTag(`board-${session.user.id}`);
  revalidatePath("/dashboard");

  return { data: JSON.parse(JSON.stringify(jobApplication)) };
}

export interface UpdateJobApplicationData {
  company?: string;
  position?: string;
  location?: string;
  notes?: string;
  salary?: string;
  jobUrl?: string;
  source?: JobSource;
  status?: JobStatus;
  order?: number;
  tags?: string[];
  description?: string;
  appliedDate?: Date | string | null;
  columnEnteredAt?: Date | string | null;
}

export async function updateJobApplication(
  id: string,
  updates: UpdateJobApplicationData
) {
  await connectDB();

  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const jobApplication = await JobApplication.findById(id);

  if (!jobApplication) {
    return { error: "Job application not found" };
  }

  if (session.user.id !== jobApplication.userId) {
    return { error: "Unauthorized" };
  }

  if (
    "source" in updates &&
    updates.source !== undefined &&
    !isJobSource(updates.source)
  ) {
    return { error: "Invalid job source" };
  }

  if (
    "status" in updates &&
    updates.status !== undefined &&
    !isJobStatus(updates.status)
  ) {
    return { error: "Invalid job status" };
  }

  const updatesToApply: Record<string, unknown> = { ...updates };

  if ("source" in updates) {
    updatesToApply.source = isJobSource(updates.source)
      ? updates.source
      : inferJobSource(updates.jobUrl ?? jobApplication.jobUrl);
  } else if ("jobUrl" in updates) {
    updatesToApply.source = inferJobSource(updates.jobUrl);
  }

  // Handle status transitions
  if (updates.status && updates.status !== jobApplication.status) {
    updatesToApply.status = updates.status;
    updatesToApply.columnEnteredAt = new Date();

    // Set appliedDate if moved into "applied" status and not yet set
    if (
      updates.status === "applied" &&
      !jobApplication.appliedDate &&
      !updates.appliedDate
    ) {
      updatesToApply.appliedDate = new Date();
    }
  }

  const updated = await JobApplication.findByIdAndUpdate(id, updatesToApply, {
    returnDocument: "after",
  });

  updateTag(`board-${session.user.id}`);
  revalidatePath("/dashboard");
  return { data: JSON.parse(JSON.stringify(updated)) };
}

export async function deleteJobApplication(id: string) {
  await connectDB();

  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const jobApplication = await JobApplication.findById(id);

  if (!jobApplication) {
    return { error: "Job application not found" };
  }

  if (jobApplication.userId !== session.user.id) {
    return { error: "Unauthorized" };
  }

  await JobApplication.deleteOne({ _id: id });

  updateTag(`board-${session.user.id}`);
  revalidatePath("/dashboard");
  return { success: true };
}
