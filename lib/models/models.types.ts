import type { JobSource } from "../job-source";

export const JOB_STATUSES = [
    "wishlist",
    "applied",
    "interviewing",
    "offer",
    "rejected",
    "ghosted",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_LABELS: Record<JobStatus, string> = {
    wishlist: "Wish List",
    applied: "Applied",
    interviewing: "Interviewing",
    offer: "Offer",
    rejected: "Rejected",
    ghosted: "Ghosted",
};

export const PIPELINE_COLUMNS: Array<{ status: JobStatus; name: string }> = [
    { status: "wishlist", name: "Wish List" },
    { status: "applied", name: "Applied" },
    { status: "interviewing", name: "Interviewing" },
    { status: "offer", name: "Offer" },
    { status: "rejected", name: "Rejected" },
    { status: "ghosted", name: "Ghosted" },
];

export function isJobStatus(value: unknown): value is JobStatus {
    return typeof value === "string" && JOB_STATUSES.includes(value as JobStatus);
}

export interface JobApplication {
    _id: string;
    userId: string;
    company: string;
    position: string;
    location?: string;
    status: JobStatus;
    notes?: string;
    salary?: string;
    jobUrl?: string;
    source?: JobSource;
    order?: number;
    tags?: string[];
    description?: string;
    appliedDate?: string | Date;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    columnEnteredAt: Date;
}

export interface Column {
    _id: string; // Typically the status key (e.g. "wishlist")
    status: JobStatus;
    name: string;
    order: number;
    jobApplications: JobApplication[];
}

export interface Board {
    _id: string;
    name: string;
    columns: Column[];
}
