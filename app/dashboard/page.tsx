import { getSession } from "@/lib/auth/auth";
import connectDB from "@/lib/db";
import { redirect } from "next/navigation";
import { Board } from "@/lib/models";
import KanbanBoard from "@/components/kanban-board";
import { Suspense } from "react";

async function getBoard(userId: string) {
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
      },
    })
    .lean();

  if (!boardDoc) return null;

  const board = JSON.parse(JSON.stringify(boardDoc));

  return board;
}

async function DashboardPage() {
  const session = await getSession();
  // console.log(session)
  if (!session?.user) {
    redirect("/sign-in");
  }
  const board = await getBoard(session?.user.id ?? "");

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">{board.name}</h1>
          <p className="text-muted-foreground">Track your job applications</p>
        </div>
        <KanbanBoard board={board} userId={session.user.id} />
      </div>
    </div>
  );
}

export default async function Dashboard() {

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <DashboardPage/>
    </Suspense>
    
  );
}
