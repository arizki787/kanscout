"use server";

import { generateJobMatchScores } from "@/lib/ai/match-jobs";
import connectDB from "@/lib/db";
import { getSession } from "@/lib/auth/auth";
import Profile from "@/lib/models/profile";
import { inferJobSource } from "@/lib/job-source";
import type { JobMatchProfile, JobMatchScore } from "@/lib/ai/match-jobs";
import type { IProfile } from "@/lib/models/profile";
import { fetchPostingDescription } from "@/lib/scout/jobs";

export interface JobMatchRequest {
  url: string;
}

export interface JobDescriptionResult {
  url: string;
  description: string | null;
}

export type JobMatchActionResult =
  | { scores: JobMatchScore[]; descriptions: JobDescriptionResult[] }
  | { error: string; descriptions: JobDescriptionResult[] };

function isScoutedJobUrl(value: string) {
  try {
    const url = new URL(value);
    const source = inferJobSource(url.href);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      ["greenhouse", "lever", "workable", "wellfound"].includes(source)
    );
  } catch {
    return false;
  }
}

function getProfileForMatching(profile: IProfile) {
  return {
    location: profile.personalInfo?.location,
    professionalSummary: profile.professionalSummary,
    skills: profile.skills ?? [],
    workExperience: (profile.workExperience ?? []).map((item) => ({
      company: item.company,
      role: item.role,
      description: item.description,
    })),
    education: (profile.education ?? []).map((item) => ({
      institution: item.institution,
      degree: item.degree,
      fieldOfStudy: item.fieldOfStudy,
    })),
    projects: (profile.projects ?? []).map((item) => ({
      title: item.title,
      description: item.description,
      technologies: item.technologies,
    })),
    certifications: (profile.certifications ?? []).map((item) => ({
      name: item.name,
      issuer: item.issuer,
    })),
  } satisfies JobMatchProfile;
}

export async function scoreJobsForCurrentUser(
  jobs: JobMatchRequest[],
): Promise<JobMatchActionResult> {
  const session = await getSession();
  if (!session?.user) return { error: "Unauthorized", descriptions: [] };

  if (
    !Array.isArray(jobs) ||
    jobs.length === 0 ||
    jobs.length > 10 ||
    jobs.some(
      (job) =>
        !job ||
        typeof job.url !== "string" ||
        !isScoutedJobUrl(job.url),
    )
  ) {
    return {
      error: "Invalid job descriptions for match scoring.",
      descriptions: [],
    };
  }

  const unavailableDescriptions = jobs.map(({ url }) => ({
    url,
    description: null,
  }));
  if (!process.env.GEMINI_API_KEY && !process.env.AGNES_API_KEY) {
    return {
      error: "GEMINI_API_KEY or AGNES_API_KEY is not configured.",
      descriptions: unavailableDescriptions,
    };
  }

  await connectDB();
  const profile = await Profile.findOne({ userId: session.user.id });
  if (!profile) {
    return {
      error: "Add profile details to get a match score.",
      descriptions: unavailableDescriptions,
    };
  }

  const profileForMatching = getProfileForMatching(profile);
  const hasProfileContent = Boolean(
    profileForMatching.professionalSummary?.trim() ||
      profileForMatching.skills.length ||
      profileForMatching.workExperience.length ||
      profileForMatching.education.length ||
      profileForMatching.projects.length ||
      profileForMatching.certifications.length,
  );
  if (!hasProfileContent) {
    return {
      error: "Add profile details to get a match score.",
      descriptions: unavailableDescriptions,
    };
  }

  const descriptions: JobDescriptionResult[] = await Promise.all(
    jobs.map(async ({ url }) => ({
      url,
      description: await fetchPostingDescription(url),
    })),
  );
  const jobsWithDescriptions = descriptions.filter(
    (job): job is JobDescriptionResult & { description: string } =>
      Boolean(job.description?.trim()),
  );
  if (jobsWithDescriptions.length === 0) {
    return {
      error: "Job descriptions are not available for match scoring.",
      descriptions,
    };
  }

  try {
    return {
      scores: await generateJobMatchScores(
        profileForMatching,
        jobsWithDescriptions.map(({ url, description }) => ({
          url,
          description,
        })),
      ),
      descriptions,
    };
  } catch (error) {
    console.error("[Agent Jobs] Match scoring failed:", error);
    return {
      error: "Match scoring is temporarily unavailable.",
      descriptions,
    };
  }
}
