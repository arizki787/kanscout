"use client";

import { Label } from "./ui/label";
import {
  JOB_SOURCES,
  JOB_SOURCE_LABELS,
  isJobSource,
  type JobSource,
} from "@/lib/job-source";

interface JobSourceSelectProps {
  id: string;
  value: JobSource;
  onChange: (source: JobSource) => void;
}

export default function JobSourceSelect({
  id,
  value,
  onChange,
}: JobSourceSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Job Source</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          if (isJobSource(event.target.value)) onChange(event.target.value);
        }}
        className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
      >
        {JOB_SOURCES.map((source) => (
          <option key={source} value={source}>
            {JOB_SOURCE_LABELS[source]}
          </option>
        ))}
      </select>
    </div>
  );
}
