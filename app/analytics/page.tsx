import getBoard from "@/lib/data/board";
import { getSession } from "@/lib/auth/auth";
import { Board as BoardType } from "@/lib/models/models.types";
import {
  Briefcase,
  Users,
  Trophy,
  Star,
  Send,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { Suspense } from "react";
import AnalyticsPieChart from "@/components/analytics-pie-chart";

const STATUS_COLORS = {
  wishlist: "#6366f1",
  applied: "#3b82f6",
  interviewing: "#f59e0b",
  offered: "#10b981",
  rejected: "#ef4444",
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
    0
  );

  const chartData = [
    { name: "Wish List", value: jobData.wishlist, color: STATUS_COLORS.wishlist },
    { name: "Applied", value: jobData.applied, color: STATUS_COLORS.applied },
    { name: "Interviewing", value: jobData.interviewing, color: STATUS_COLORS.interviewing },
    { name: "Offered", value: jobData.offered, color: STATUS_COLORS.offered },
    { name: "Rejected", value: jobData.rejected, color: STATUS_COLORS.rejected },
  ];

  const interviewRate = totalApplied > 0 
    ? ((jobData.interviewing / totalApplied) * 100).toFixed(1) 
    : "0";

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Analytics</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Take a look on your job status distribution and pipeline metrics.
        </p>
      </div>

      {/* Top Stat Cards Grid: 2 cols on mobile, 3 on tablet, 6 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              Total
            </p>
            <p className="text-xl sm:text-2xl font-bold text-black leading-tight">
              {totalApplied}
            </p>
          </div>
        </div>

        {/* Wish List */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 shrink-0">
            <Star className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              Wish List
            </p>
            <p className="text-xl sm:text-2xl font-bold text-black leading-tight">
              {jobData.wishlist}
            </p>
          </div>
        </div>

        {/* Applied */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              Applied
            </p>
            <p className="text-xl sm:text-2xl font-bold text-black leading-tight">
              {jobData.applied}
            </p>
          </div>
        </div>

        {/* Interviews */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              Interviews
            </p>
            <p className="text-xl sm:text-2xl font-bold text-black leading-tight">
              {jobData.interviewing}
            </p>
          </div>
        </div>

        {/* Offers */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              Offers
            </p>
            <p className="text-xl sm:text-2xl font-bold text-black leading-tight">
              {jobData.offered}
            </p>
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
            <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              Rejected
            </p>
            <p className="text-xl sm:text-2xl font-bold text-black leading-tight">
              {jobData.rejected}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Column: Overview */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200/80 p-4 sm:p-6 shadow-xs flex flex-col justify-between h-full">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Pipeline Overview
            </h2>
            <p className="text-xs text-muted-foreground">
              Conversion trajectory across stages.
            </p>
          </div>

          <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-lg bg-gray-50 border border-gray-100 flex items-center gap-3.5">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-lg shrink-0">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Interview Rate</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{interviewRate}%</p>
              </div>
            </div>
            
            <div className="p-3.5 sm:p-4 rounded-lg bg-gray-50 border border-gray-100 flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-lg shrink-0">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Offer Conversion</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {jobData.interviewing > 0 
                    ? ((jobData.offered / jobData.interviewing) * 100).toFixed(0) 
                    : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-lg bg-blue-50/50 border border-blue-100 text-xs text-blue-800 space-y-1">
            <p><strong>Interview Rate:</strong> % of all applications that advanced to interview stage.</p>
            <p><strong>Offer Conversion:</strong> % of interviews that resulted in an offer.</p>
          </div>
        </div>

        {/* Right Column: Distribution Card */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 sm:p-6 shadow-xs flex flex-col justify-between h-full">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            Distribution
          </h2>
          <div className="flex-1 flex flex-col justify-between">
            <AnalyticsPieChart data={chartData} totalApplied={totalApplied} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function Analytics() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto p-4 sm:p-6 text-muted-foreground text-sm">
          Loading dashboard...
        </div>
      }
    >
      <AnalyticsPage />
    </Suspense>
  );
}