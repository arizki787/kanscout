import connectDB from './db';
import { Board, Column } from './models';
import board from './models/board';

// default data
const DEFAULT_COLUMNS = [
    { name: "Wish List", order: 0, },
    { name: "Applied", order: 1, },
    { name: "Interviewing", order: 2, },
    { name: "Offer", order: 3, },
    { name: "Rejected", order: 4, },

]
export async function initializeUserBoard(userId: string) {
    try {
        await connectDB();

        // check board if exist
        const boardData = await Board.findOne({ userId, user: 'Job Hunt' });

        if (boardData) {
            return boardData
        }

        // create board
        const board = await Board.create({
            name: 'Job Hunt',
            userId,
            columns: [],
        });

        // create default columns
        const columns = await Promise.all(
            DEFAULT_COLUMNS.map((col) => 
                Column.create({
                    name: col.name,
                    order: col.order,
                    boardId: board._id,
                    jobApplication: [],
                })
            )
        );
        
        // update board wit new column id
        board.columns = columns.map((col) => col._id);
        await board.save();
        return board;

    } catch (err) {
        throw err;
    }
}