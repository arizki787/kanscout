import { getSession } from "@/lib/auth/auth";
import { searchScoutedJobs } from "@/lib/scout/jobs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const location = searchParams.get("location")?.trim() ?? "";
  if (query.length > 120 || location.length > 80) {
    return Response.json(
      { error: "Search text or location is too long." },
      { status: 400 },
    );
  }

  try {
    return Response.json(await searchScoutedJobs(query, location));
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
