import connectDB from "../lib/db";
import "@/lib/models";
import { Board, Column } from "@/lib/models";

async function migrate() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ Connected to MongoDB.");

    // Find all Job Hunt boards in the database
    const boards = await Board.find({ name: "Job Hunt" });
    console.log(`📋 Found ${boards.length} board(s) in the database.`);

    let updatedCount = 0;

    for (const board of boards) {
      // Find all existing columns belonging to this board
      const columns = await Column.find({ boardId: board._id });
      const hasGhosted = columns.some(
        (col) => col.name.trim().toLowerCase() === "ghosted"
      );

      if (!hasGhosted) {
        console.log(`➕ Adding 'Ghosted' column to board ${board._id} (User: ${board.userId})...`);

        // Compute the highest order among existing columns or default to 5
        const maxOrder = columns.reduce(
          (max, col) => Math.max(max, col.order ?? 0),
          -1
        );
        const order = maxOrder >= 0 ? maxOrder + 1 : 5;

        // Create the new Ghosted column document
        const newCol = await Column.create({
          name: "Ghosted",
          order: order,
          boardId: board._id,
          jobApplications: [],
        });

        // Push new column ID to the board's columns array and save
        board.columns.push(newCol._id);
        await board.save();

        updatedCount++;
      } else {
        // In case the column exists in Column collection but is not in board.columns array
        const ghostedCol = columns.find(
          (col) => col.name.trim().toLowerCase() === "ghosted"
        );
        if (ghostedCol && !board.columns.some((id: any) => id.toString() === ghostedCol._id.toString())) {
          board.columns.push(ghostedCol._id);
          await board.save();
          console.log(`🔗 Linked existing 'Ghosted' column to board ${board._id}`);
          updatedCount++;
        }
      }
    }

    console.log(`\n🎉 Done! Successfully updated ${updatedCount} board(s).`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

migrate();
