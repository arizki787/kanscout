import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

// Automatically load .env.local or .env if not loaded yet
if (!process.env.MONGODB_URI) {
  const envLocal = path.resolve(process.cwd(), ".env.local");
  const envDefault = path.resolve(process.cwd(), ".env");

  if (fs.existsSync(envLocal) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envLocal);
  } else if (fs.existsSync(envDefault) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envDefault);
  }
}

import connectDB from "../lib/db";
import { JOB_STATUSES, type JobStatus } from "../lib/models/models.types";

function normalizeStatus(rawName: string | undefined): JobStatus {
  if (!rawName) return "wishlist";
  const lower = rawName.toLowerCase().replace(/[^a-z]/g, "");
  if (lower.includes("wish")) return "wishlist";
  if (lower.includes("apply") || lower === "applied") return "applied";
  if (lower.includes("interview")) return "interviewing";
  if (lower.includes("offer")) return "offer";
  if (lower.includes("reject")) return "rejected";
  if (lower.includes("ghost")) return "ghosted";
  return "wishlist";
}

async function migrate() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ Connected to MongoDB.");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Failed to get native MongoDB database reference");
    }

    const collections = (await db.listCollections().toArray()).map((c) => c.name);

    // Build column map if columns collection exists
    const columnMap = new Map<string, JobStatus>();

    if (collections.includes("columns")) {
      const columns = await db.collection("columns").find({}).toArray();
      console.log(`📋 Found ${columns.length} columns in 'columns' collection`);
      for (const col of columns) {
        const status = normalizeStatus(col.name);
        columnMap.set(col._id.toString(), status);
      }
    }

    const jobApplicationsCollection = db.collection("jobapplications");
    const totalJobs = await jobApplicationsCollection.countDocuments();
    console.log(`💼 Found ${totalJobs} total job applications to review`);

    const cursor = jobApplicationsCollection.find({});
    let migratedCount = 0;

    while (await cursor.hasNext()) {
      const job = await cursor.next();
      if (!job) continue;

      let resolvedStatus: JobStatus;

      if (job.status && JOB_STATUSES.includes(job.status as JobStatus)) {
        resolvedStatus = job.status as JobStatus;
      } else if (job.columnId && columnMap.has(job.columnId.toString())) {
        resolvedStatus = columnMap.get(job.columnId.toString())!;
      } else if (typeof job.status === "string") {
        resolvedStatus = normalizeStatus(job.status);
      } else {
        resolvedStatus = "wishlist";
      }

      await jobApplicationsCollection.updateOne(
        { _id: job._id },
        {
          $set: {
            status: resolvedStatus,
            columnEnteredAt: job.columnEnteredAt || job.createdAt || new Date(),
          },
          $unset: {
            columnId: "",
            boardId: "",
          },
        }
      );

      migratedCount++;
    }

    console.log(`✅ Successfully updated ${migratedCount} job applications.`);

    // Archive / drop legacy collections if requested
    if (process.argv.includes("--drop-legacy")) {
      if (collections.includes("boards")) {
        await db.collection("boards").drop();
        console.log("🗑️ Dropped legacy 'boards' collection.");
      }
      if (collections.includes("columns")) {
        await db.collection("columns").drop();
        console.log("🗑️ Dropped legacy 'columns' collection.");
      }
    } else {
      console.log("ℹ️ Legacy collections ('boards', 'columns') were retained. Pass --drop-legacy to drop them.");
    }

    console.log("\n=================================");
    console.log("🎉 MIGRATION COMPLETED SUCCESSFULLY");
    console.log("=================================");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  }
}

migrate();
