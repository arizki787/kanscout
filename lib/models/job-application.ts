import mongoose, { Schema, Document } from "mongoose";
import { JOB_SOURCES, type JobSource } from "../job-source";
import { JOB_STATUSES, type JobStatus } from "./models.types";

export interface IJobApplication extends Document {
    company: string;
    position: string;
    location?: string;
    status: JobStatus;
    userId: string;
    order: number;
    notes?: string;
    salary?: string;
    jobUrl?: string;
    source?: JobSource;
    appliedDate?: Date;
    tags?: string[];
    description?: string;
    columnEnteredAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const JobApplicationSchema = new Schema<IJobApplication>(
    {
        company: {
            type: String,
            required: true,
        },
        position: {
            type: String,
            required: true,
        },
        location: {
            type: String,
        },
        status: {
            type: String,
            enum: JOB_STATUSES,
            required: true,
            default: "wishlist",
            index: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        order: {
            type: Number,
            required: true,
            default: 0,
        },
        notes: {
            type: String,
        },
        salary: {
            type: String,
        },
        jobUrl: {
            type: String,
        },
        source: {
            type: String,
            enum: JOB_SOURCES,
        },
        appliedDate: {
            type: Date,
        },
        tags: [
            {
                type: String,
            },
        ],
        description: {
            type: String,
        },
        columnEnteredAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

JobApplicationSchema.index({ userId: 1, status: 1 });
JobApplicationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.JobApplication ||
    mongoose.model<IJobApplication>("JobApplication", JobApplicationSchema);
