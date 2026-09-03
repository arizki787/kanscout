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
import "@/lib/models";
import { Board, Column, JobApplication } from "@/lib/models";

// Can be passed via CLI: `npx tsx scripts/cleanup-user.ts <userId or email>`
const TARGET_INPUT = process.argv[2] || "6a68eb17415c158bd3baaf7f";

async function cleanup() {
  if (!TARGET_INPUT) {
    console.error("❌ User ID or Email is required.");
    console.log("Usage: npx tsx --env-file=.env.local scripts/cleanup-user.ts <userId or email>");
    process.exit(1);
  }

  try {
    console.log("🗑️ Starting cleanup...");
    console.log(`👤 Target: ${TARGET_INPUT}`);

    await connectDB();
    console.log("✅ Connected to database");

    const db = mongoose.connection.db;
    let userId = TARGET_INPUT;

    // If input looks like an email, find user by email
    if (TARGET_INPUT.includes("@") && db) {
      const foundUser = await db.collection("user").findOne({
        email: TARGET_INPUT.toLowerCase().trim(),
      });
      if (foundUser) {
        userId = foundUser._id ? foundUser._id.toString() : foundUser.id;
        console.log(`🔍 Found user with email ${TARGET_INPUT}: ID = ${userId}`);
      } else {
        console.warn(`⚠️ No user found in 'user' collection with email: ${TARGET_INPUT}`);
      }
    }

    // ============================================================
    // 1. Find user's board
    // ============================================================
    const board = await Board.findOne({ userId });

    if (board) {
      console.log(`✅ Board found: ${board.name} (${board._id})`);

      // 2. Delete all columns belonging to the board
      const columnsResult = await Column.deleteMany({ boardId: board._id });
      console.log(`📁 Deleted ${columnsResult.deletedCount} columns`);

      // 3. Delete board
      const deletedBoard = await Board.deleteOne({ _id: board._id });
      console.log(`📋 Deleted ${deletedBoard.deletedCount} board(s)`);
    } else {
      console.log("ℹ️ No board found for this user ID");
    }

    // ============================================================
    // 4. Delete job applications belonging to this user
    // ============================================================
    const jobsResult = await JobApplication.deleteMany({ userId });
    console.log(`💼 Deleted ${jobsResult.deletedCount} job applications`);

    // ============================================================
    // 5. Delete Better Auth user, account, and session records
    // ============================================================
    if (db) {
      const userDeleteQueries = [
        { id: userId },
        ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: new mongoose.Types.ObjectId(userId) }] : []),
        ...(TARGET_INPUT.includes("@") ? [{ email: TARGET_INPUT.toLowerCase().trim() }] : []),
      ];

      const deletedUser = await db.collection("user").deleteMany({ $or: userDeleteQueries });
      const deletedAccounts = await db.collection("account").deleteMany({ userId });
      const deletedSessions = await db.collection("session").deleteMany({ userId });

      console.log(`👤 Deleted ${deletedUser.deletedCount} user record(s)`);
      console.log(`🔐 Deleted ${deletedAccounts.deletedCount} account record(s)`);
      console.log(`🎟️ Deleted ${deletedSessions.deletedCount} session record(s)`);
    }

    console.log("\n================================");
    console.log("🎉 CLEANUP COMPLETED");
    console.log("================================");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error cleaning database:", error);
    process.exit(1);
  }
}

cleanup();