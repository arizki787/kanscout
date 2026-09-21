import getBoard from "@/lib/data/board";
import { getSession } from "@/lib/auth/auth";
import { Board as BoardType } from "@/lib/models/models.types";
import {
  Briefcase,
  Users,
  Trophy,
  Percent,
  Star,
  Send,
  XCircle,
} from "lucide-react";
import { Suspense } from "react";
import AnalyticsPieChart from "@/components/analytics-pie-chart";

const STATUS_COLORS = {
  wishlist: "#6366f1", // indigo
  applied: "#3b82f6", // blue
  interviewing: "#f59e0b", // amber
  offered: "#10b981", // emerald
  rejected: "#ef4444", // rose/red
};

function getStatistics(board: BoardType) {
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

async function AnalyticsPage() {
  const session = await getSession();
  const board = await getBoard(session?.user?.id ?? "", "");
  const jobData = getStatistics(board);
  const totalApplied = Object.values(jobData).reduce(
    (sum, value) => sum + value,
    0,
  );
  const rejectionRate =
    totalApplied > 0
      ? ((jobData.rejected / totalApplied) * 100).toFixed(0)
      : "0";

  const chartData = [
    { name: "Wish List", value: jobData.wishlist, color: STATUS_COLORS.wishlist },
    { name: "Applied", value: jobData.applied, color: STATUS_COLORS.applied },
    {
      name: "Interviewing",
      value: jobData.interviewing,
      color: STATUS_COLORS.interviewing,
    },
    { name: "Offered", value: jobData.offered, color: STATUS_COLORS.offered },
    { name: "Rejected", value: jobData.rejected, color: STATUS_COLORS.rejected },
  ];

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Take a look on your job status Distribution</p>
      </div>
      <div className="flex justify-center items-center container mx-auto my-auto p-6">
        <div className="flex flex-row gap-6 items-start">
          <div className="bg-white rounded-xl border border-gray-200/80 p-6 shadow-xs lg:w-85">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Distribution
            </h2>
            <AnalyticsPieChart data={chartData} totalApplied={totalApplied} />
          </div>
          {/* Stat Cards — left column */}
          <div className="flex flex-col">
            {/* Total Applications */}
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-primary/40 transition-colors">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total
                </p>
                <p className="text-2xl font-bold text-black leading-tight">
                  {totalApplied}
                </p>
              </div>
            </div>

            {/* Wish List */}
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-indigo-500/40 transition-colors">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 shrink-0">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Wish List
                </p>
                <p className="text-2xl font-bold text-black leading-tight">
                  {jobData.wishlist}
                </p>
              </div>
            </div>

            {/* Applied */}
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-blue-500/40 transition-colors">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Applied
                </p>
                <p className="text-2xl font-bold text-black leading-tight">
                  {jobData.applied}
                </p>
              </div>
            </div>

            {/* Interviews */}
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-amber-500/40 transition-colors">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Interviews
                </p>
                <p className="text-2xl font-bold text-black leading-tight">
                  {jobData.interviewing}
                </p>
              </div>
            </div>

            {/* Offers */}
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-emerald-500/40 transition-colors">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Offers
                </p>
                <p className="text-2xl font-bold text-black leading-tight">
                  {jobData.offered}
                </p>
              </div>
            </div>

            {/* Rejected */}
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-rose-500/40 transition-colors">
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Rejected
                </p>
                <p className="text-2xl font-bold text-black leading-tight">
                  {jobData.rejected}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default async function Analytics() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-muted-foreground">Loading dashboard...</p>
      }
    >
      <AnalyticsPage />
    </Suspense>
  );
}
