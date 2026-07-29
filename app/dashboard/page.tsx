import { getSession } from "@/lib/auth/auth";
import connectDB from "@/lib/db";
import { Board } from "@/lib/models";
import KanbanBoard from "@/components/kanban-board";
import { Suspense } from "react";
import { Board as BoardType } from "@/lib/models/models.types";
import { Briefcase, Users, Trophy, Percent } from "lucide-react";

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

async function getStatistics(board: BoardType) {
  const jobCount = {
    wishlist: 0,
    applied: 0,
    interviewing: 0,
    offered: 0,
    rejected: 0,
  };

  const columns = board?.columns || [];

  columns.forEach((col) => {
    const count = col?.jobApplications?.length || 0;
    if (col?.name === "Wish List") {
      jobCount.wishlist = count;
    } else if (col?.name === "Applied") {
      jobCount.applied = count;
    } else if (col?.name === "Rejected") {
      jobCount.rejected = count;
    } else if (col?.name === "Offer") {
      jobCount.offered = count;
    } else if (col?.name === "Interviewing") {
      jobCount.interviewing = count;
    }
  });

  return jobCount;
}

async function DashboardPage() {
  const session = await getSession();
  const board = await getBoard(session?.user?.id ?? "");
  const jobData = await getStatistics(board);
  const totalApplied = Object.values(jobData).reduce((sum, value) => sum + value, 0);
  const rejectionRate = totalApplied > 0 ? (jobData.rejected / totalApplied * 100).toFixed(0) : "0";

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black">{board?.name ?? "Job Board"}</h1>
            <p className="text-sm text-muted-foreground mt-1">Track and manage your job search pipeline</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-primary/40 transition-colors">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Apps</p>
                <p className="text-2xl font-bold text-black leading-tight">{totalApplied}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-amber-500/40 transition-colors">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interviews</p>
                <p className="text-2xl font-bold text-black leading-tight">{jobData.interviewing}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-emerald-500/40 transition-colors">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Offers</p>
                <p className="text-2xl font-bold text-black leading-tight">{jobData.offered}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-rose-500/40 transition-colors">
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rejection</p>
                <p className="text-2xl font-bold text-black leading-tight">{rejectionRate}%</p>
              </div>
            </div>
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
