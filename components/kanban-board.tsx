"use client";

import { Board, Column } from "@/lib/models/models.types";
import {
  Award,
  Calendar,
  CheckCircle2,
  Ghost,
  Mic,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { CreateJobApplicatDialogNoButton } from "./create-job-dialog";
import JobApplicationCard from "./job-application-card";

interface KanbanBoardProps {
  board: Board;
  userId: string;
}

interface ColConfig {
  color: string;
  icon: React.ReactNode;
}

const COLUMN_CONFIG: Array<ColConfig> = [
  {
    color: "bg-cyan-500",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    color: "bg-purple-500",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    color: "bg-green-500",
    icon: <Mic className="h-4 w-4" />,
  },
  {
    color: "bg-yellow-500",
    icon: <Award className="h-4 w-4" />,
  },
  {
    color: "bg-red-500",
    icon: <XCircle className="h-4 w-4" />,
  },
  {
    color: "bg-gray-500",
    icon: <Ghost className="h-4 w-4" />,
  },
];

function KanbanColumn({
  column,
  config,
  boardId,
  sortedColumns,
}: {
  column: Column;
  config: ColConfig;
  boardId: string;
  sortedColumns: Column[];
}) {
  const sortedJobs = [...(column.jobApplications || [])].sort((a, b) => {
    const dateA = a.columnEnteredAt ?? a.createdAt ?? 0;
    const dateB = b.columnEnteredAt ?? b.createdAt ?? 0;

    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return (
    <Card className="w-80 shrink-0 shadow-md p-0 mt-1">
      <CardHeader className={`${config.color} text-white pb-3 pt-3`}>
        <div className="flex w-full items-center gap-2">
          <div className="flex items-center gap-2">
            {config.icon}
            <CardTitle className="text-white text-base font-semibold">
              {column.name}
            </CardTitle>
          </div>
          <div className="ml-auto">
            <CreateJobApplicatDialogNoButton
              columnId={column._id}
              boardId={boardId}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 py-4 bg-gray-50/50 px-4 max-h-[calc(100vh-250px)] overflow-y-auto rounded-b-lg">
        {sortedJobs.map((job) => (
          <JobApplicationCard
            key={job._id}
            job={{ ...job, columnId: job.columnId || column._id }}
            columns={sortedColumns}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export default function KanbanBoard({ board }: KanbanBoardProps) {
  const sortedColumns = board?.columns !== null ? board?.columns || [] : [];

  return (
    <div className="space-y-4">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedColumns.map((col, key) => {
          const config = COLUMN_CONFIG[key] || {
            color: "bg-gray-500",
            icon: <Calendar className="h-4 w-4" />,
          };
          return (
            <KanbanColumn
              key={col._id || key}
              column={col}
              config={config}
              boardId={board._id}
              sortedColumns={sortedColumns}
            />
          );
        })}
      </div>
    </div>
  );
}
