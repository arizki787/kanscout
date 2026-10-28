"use server";

import { getSession } from "@/lib/auth/auth";
import connectDB from "@/lib/db";
import Profile from "@/lib/models/profile";
import { revalidatePath } from "next/cache";
import { deleteResumeFromStorage } from "@/lib/supabase/storage";
import type { IPersonalInfo, IWorkExperience, IEducation, IProjectEntry, ICertificationEntry, IResumeInfo } from "@/lib/models/profile";

export interface ProfileInput {
  personalInfo?: IPersonalInfo;
  professionalSummary?: string;
  skills?: string[];
  workExperience?: IWorkExperience[];
  education?: IEducation[];
  projects?: IProjectEntry[];
  certifications?: ICertificationEntry[];
  resume?: IResumeInfo;
}

/**
 * Fetches the current user's profile. Creates a default one if it doesn't exist.
 */
export async function getProfile() {
  await connectDB();
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const profile = await Profile.findOne({ userId: session.user.id }).lean();

  if (profile) {
    return { data: JSON.parse(JSON.stringify(profile)) };
  }

  // Return a default empty profile shape (not saved yet)
  return {
    data: {
      userId: session.user.id,
      personalInfo: {
        fullName: session.user.name ?? "",
        email: session.user.email ?? "",
        phone: "",
        location: "",
        links: { linkedin: "", github: "", portfolio: "", twitter: "" },
      },
      professionalSummary: "",
      skills: [],
      workExperience: [],
      education: [],
      projects: [],
      certifications: [],
      resume: null,
    },
  };
}

/**
 * Saves (upserts) the user's profile in MongoDB.
 */
export async function saveProfile(data: ProfileInput) {
  await connectDB();
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  await Profile.findOneAndUpdate(
    { userId: session.user.id },
    {
      $set: {
        ...data,
        userId: session.user.id,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  revalidatePath("/profile");
  return { success: true };
}

/**
 * Removes the user's uploaded resume from Supabase storage and clears it from the profile.
 */
export async function removeResume() {
  await connectDB();
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const profile = await Profile.findOne({ userId: session.user.id });
  if (profile?.resume?.storagePath) {
    await deleteResumeFromStorage(profile.resume.storagePath);
  }

  await Profile.findOneAndUpdate(
    { userId: session.user.id },
    { $unset: { resume: "" } },
    { upsert: false }
  );

  revalidatePath("/profile");
  return { success: true };
}
