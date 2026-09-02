import connectDB from './db';
import { Board, Column } from './models';

// default data
const DEFAULT_COLUMNS = [
    { name: "Wish List", order: 0 },
    { name: "Applied", order: 1 },
    { name: "Interviewing", order: 2 },
    { name: "Offer", order: 3 },
    { name: "Rejected", order: 4 },
    { name: "Ghosted", order: 5 },
];

export async function initializeUserBoard(userId: string) {
    try {
        await connectDB();

        // check if board exists
        let board = await Board.findOne({ userId, name: 'Job Hunt' });

        if (!board) {
            // create board
            board = await Board.create({
                name: 'Job Hunt',
                userId,
                columns: [],
            });
        }

        // Check existing columns for this board to ensure none are missing
        const existingColumns = await Column.find({ boardId: board._id });
        const existingNames = new Set(
            existingColumns.map((col) => col.name.trim().toLowerCase())
        );

        const missingColumns = DEFAULT_COLUMNS.filter(
            (col) => !existingNames.has(col.name.trim().toLowerCase())
        );

        if (missingColumns.length > 0) {
            const newColumns = await Promise.all(
                missingColumns.map((col) =>
                    Column.create({
                        name: col.name,
                        order: col.order,
                        boardId: board._id,
                        jobApplications: [],
                    })
                )
            );

            // Append new column IDs to the board
            board.columns.push(...newColumns.map((col) => col._id));
            await board.save();
        }

        return board;
    } catch (err) {
        throw err;
    }
}