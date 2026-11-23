export function getSiteUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);

  if (envUrl && !envUrl.includes("localhost")) {
    return envUrl.replace(/\/$/, "");
  }

  // Default production fallback
  return "https://kanscout.com";
}

export const siteConfig = {
  name: "Kanscout",
  title: "Kanscout - Visual Kanban Board for Job Search & Application Tracking",
  description:
    "Kanscout is an intuitive visual Kanban board designed for looking for jobs, organizing your job search, and tracking every application from discovery to offer.",
  url: getSiteUrl(),
  keywords: [
    "Kanscout",
    "kanban job tracker",
    "job search tracker",
    "job application tracker",
    "job hunt tracker",
    "career organizer",
    "job pipeline",
  ],
};
