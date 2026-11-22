import { getSession } from "@/lib/auth/auth";
import { searchScoutedJobs } from "@/lib/scout/jobs";
import { SCOUT_MAX_SEARCH_PAGES } from "@/lib/scout/pagination";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const location = searchParams.get("location")?.trim() ?? "";
  const rawPage = searchParams.get("page") ?? "0";
  const page = Number(rawPage);
  if (query.length > 120 || location.length > 80) {
    return Response.json(
      { error: "Search text or location is too long." },
      { status: 400 },
    );
  }
  if (
    !/^\d+$/.test(rawPage) ||
    !Number.isSafeInteger(page) ||
    page < 0 ||
    page >= SCOUT_MAX_SEARCH_PAGES
  ) {
    return Response.json(
      { error: "Invalid job search page." },
      { status: 400 },
    );
  }

  try {
    return Response.json(await searchScoutedJobs(query, location, page));
  } catch (error) {
    console.error("[Agent Jobs] Search request failed:", error);
    const message =
      error instanceof Error &&
      error.message === "BRAVE_SEARCH_API_KEY is not configured."
        ? "Job search is not configured. Check the server environment."
        : "Job search is temporarily unavailable. Please try again.";
    return Response.json({ error: message }, { status: 503 });
  }
}
