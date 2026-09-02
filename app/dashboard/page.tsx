import { getSession } from "@/lib/auth/auth";
import connectDB from "@/lib/db";
import { Board } from "@/lib/models";
import KanbanBoard from "@/components/kanban-board";
import { Suspense } from "react";
import Search from "@/components/search";

async function getBoard(userId: string, query: string) {
  "use cache";

  await connectDB();

  const boardDoc = await Board.findOne({
    userId: userId,
    name: "Job Hunt",
  })
    .populate({
      path: "columns",
      populate: {
        path: "jobApplications",
        // Only apply a match filter if a search term actually exists
        match: query?.trim()
          ? {
              $or: [
                { position: { $regex: query.trim(), $options: "i" } },
                { company: { $regex: query.trim(), $options: "i" } },
              ],
            }
          : {},
      },
    })
    .lean();

  if (!boardDoc) return null;

  const board = JSON.parse(JSON.stringify(boardDoc));

  return board;
}

interface DashboardProps {
  searchParams?: Promise<{
    query?: string;
  }>;
}

async function DashboardPage(props: DashboardProps) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || '';
  const session = await getSession();
  const board = await getBoard(session?.user?.id ?? "", query);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black">{board?.name ?? "Job Board"}</h1>
            <p className="text-sm text-muted-foreground mt-1">Track and manage your job search pipeline</p>
          </div>
          <Search placeholder="Search job application..."/>
        </div>
        <KanbanBoard board={board} userId={session?.user?.id ?? ""} />
      </div>
    </div>
  );
}

export default async function Dashboard(props: DashboardProps) {
  return (
    <Suspense fallback={<p className="p-6 text-muted-foreground">Loading dashboard...</p>}>
      <DashboardPage searchParams={props.searchParams} />
    </Suspense>
  );
}
