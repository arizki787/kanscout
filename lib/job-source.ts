export const JOB_SOURCES = [
  "linkedin",
  "jobstreet",
  "indeed",
  "glints",
  "dealls",
  "greenhouse",
  "lever",
  "workable",
  "wellfound",
  "other",
] as const;

export type JobSource = (typeof JOB_SOURCES)[number];

export const JOB_SOURCE_LABELS: Record<JobSource, string> = {
  linkedin: "LinkedIn",
  jobstreet: "JobStreet",
  indeed: "Indeed",
  glints: "Glints",
  dealls: "Dealls",
  greenhouse: "Greenhouse",
  lever: "Lever",
  workable: "Workable",
  wellfound: "Wellfound",
  other: "Other",
};

export const JOB_SOURCE_COLORS: Record<JobSource, string> = {
  linkedin: "#0a66c2",
  jobstreet: "#e11d48",
  indeed: "#4f46e5",
  glints: "#10b981",
  dealls: "#06b6d4",
  greenhouse: "#20a879",
  lever: "#3b82f6",
  workable: "#2563eb",
  wellfound: "#f97316",
  other: "#64748b",
};

export function isJobSource(value: unknown): value is JobSource {
  return (
    typeof value === "string" &&
    JOB_SOURCES.some((source) => source === value)
  );
}

function matchesDomain(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function inferJobSource(jobUrl?: string | null): JobSource {
  const value = jobUrl?.trim();
  if (!value) return "other";

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
  } catch {
    return "other";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return "other";

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");

  if (
    matchesDomain(hostname, "linkedin.com") ||
    matchesDomain(hostname, "linkedin.cn")
  ) {
    return "linkedin";
  }

  if (
    /(?:^|\.)jobstreet\.(?:com(?:\.[a-z]{2})?|co\.[a-z]{2})$/.test(hostname)
  ) {
    return "jobstreet";
  }

  if (
    /(?:^|\.)indeed\.(?:com(?:\.[a-z]{2})?|co\.[a-z]{2}|[a-z]{2,3})$/.test(
      hostname,
    )
  ) {
    return "indeed";
  }

  if (matchesDomain(hostname, "glints.com")) return "glints";

  if (
    matchesDomain(hostname, "dealls.com") ||
    matchesDomain(hostname, "usedeall.com") ||
    matchesDomain(hostname, "dealls.id")
  ) {
    return "dealls";
  }

  if (
    matchesDomain(hostname, "boards.greenhouse.io") ||
    matchesDomain(hostname, "job-boards.greenhouse.io")
  ) {
    return "greenhouse";
  }

  if (matchesDomain(hostname, "jobs.lever.co")) return "lever";

  if (
    matchesDomain(hostname, "apply.workable.com") ||
    matchesDomain(hostname, "jobs.workable.com")
  ) {
    return "workable";
  }

  if (matchesDomain(hostname, "wellfound.com")) return "wellfound";

  return "other";
}
