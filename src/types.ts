export interface GameState {
	board: string[]; // 9 elements: '' | 'X' | 'O'
	players: string[]; // [userId1, userId2] — order of join
	marks: { [userId: string]: string }; // userId → 'X' | 'O'
	turn: string; // userId of player whose turn it is
	winner: string | null; // mark ('X'/'O') or null
	isDraw: boolean;
	moveCount: number;
	turnDeadline: number; // unix ms — 0 if no timer
}

// Op codes for match data protocol
export const OpCode = {
	STATE_UPDATE: 1, // Server → Client: full GameState
	MAKE_MOVE: 2, // Client → Server: { position: number }
	GAME_OVER: 3, // Server → Client: { winner: string|null, isDraw: boolean }
	PLAYER_LEFT: 4, // Server → Client: { userId: string }
};
