export const SCOUT_SEARCH_RESULTS_PER_SOURCE_BATCH = 3;
export const SCOUT_MAX_SEARCH_PAGES = 4;

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
