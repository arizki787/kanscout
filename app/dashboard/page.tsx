import { getSession } from "@/lib/auth/auth";
import KanbanBoard from "@/components/kanban-board";
import { Suspense } from "react";
import { getBoard } from "@/lib/actions/board";

async function DashboardPage() {
  const session = await getSession();
  const board = await getBoard(session?.user?.id ?? "");

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black">{board?.name ?? "Job Board"}</h1>
            <p className="text-sm text-muted-foreground mt-1">Track and manage your job search pipeline</p>
          </div>
        </div>
        <KanbanBoard board={board} userId={session?.user?.id ?? ""} />
      </div>
    </div>
  );
}

export default async function Dashboard() {
  return (
    <Suspense fallback={<p className="p-6 text-muted-foreground">Loading dashboard...</p>}>
      <DashboardPage />
    </Suspense>
  );
}
