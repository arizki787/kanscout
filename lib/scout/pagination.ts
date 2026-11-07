export const SCOUT_JOBS_PER_PAGE = 10;

export function getScoutedJobPage<T>(jobs: readonly T[], page: number): T[] {
  const safePage = Math.max(1, Math.floor(page));
  const start = (safePage - 1) * SCOUT_JOBS_PER_PAGE;
  return jobs.slice(start, start + SCOUT_JOBS_PER_PAGE);
}

export function formatJobPostedAt(
  postedAt: string | null,
  now = new Date(),
): string | null {
  if (!postedAt) return null;

  const timestamp = Date.parse(postedAt);
  if (!Number.isFinite(timestamp)) return postedAt;

  const elapsedDays = Math.floor((now.getTime() - timestamp) / 86_400_000);
  if (elapsedDays < 0) return "Today";
  if (elapsedDays === 0) return "Today";
  if (elapsedDays < 30) {
    return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
  }

  if (elapsedDays === 30) return "1 month ago";
  return "More than 1 month ago";
}
