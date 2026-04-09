import { recordWin } from "./leaderboard";
import { GameState, OpCode } from "./types";

const WIN_LINES = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8],
	[0, 4, 8],
	[2, 4, 6],
];

function checkWinner(board: string[]): string | null {
	for (var i = 0; i < WIN_LINES.length; i++) {
		var a = WIN_LINES[i][0],
			b = WIN_LINES[i][1],
			c = WIN_LINES[i][2];
		if (board[a] !== "" && board[a] === board[b] && board[a] === board[c]) {
			return board[a];
		}
	}
	return null;
}

function updateLeaderboard(
	nk: nkruntime.Nakama,
	logger: nkruntime.Logger,
	state: GameState,
) {
	if (state.winner) {
		const winnerId = state.players.find(
			(id) => state.marks[id] === state.winner,
		);
		if (winnerId) {
			// We need the username, which we can get from account info or presences.
			// For simplicity, we'll try to get it from the account.
			const account = nk.accountGetId(winnerId);
			recordWin(
				nk,
				logger,
				winnerId,
				account.user.username || "Anonymous",
			);
		}
	}
}

export const matchInit: nkruntime.MatchInitFunction<GameState> = (
	ctx,
	logger,
	nk,
	params,
) => {
	const state: GameState = {
		board: ["", "", "", "", "", "", "", "", ""],
		players: [],
		marks: {},
		turn: "",
		winner: null,
		isDraw: false,
		moveCount: 0,
		turnDeadline: 0,
	};
	return {
		state,
		tickRate: 1, // 1 tick/sec is enough for turn-based
		label: JSON.stringify({ open: true }), // visible in match listing
	};
};

export const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<GameState> = (
	ctx,
	logger,
	nk,
	dispatcher,
	tick,
	state,
	presence,
	metadata,
) => {
	// Reject if match is full (2 players already playing)
	if (state.players.length >= 2 && !state.marks[presence.userId]) {
		return { state, accept: false, rejectMessage: "Match is full" };
	}
	return { state, accept: true };
};

export const matchJoin: nkruntime.MatchJoinFunction<GameState> = (
	ctx,
	logger,
	nk,
	dispatcher,
	tick,
	state,
	presences,
) => {
	for (const p of presences) {
		if (state.players.indexOf(p.userId) === -1) {
			state.players.push(p.userId);
			state.marks[p.userId] = state.players.length === 1 ? "X" : "O";
		}
	}

	if (state.players.length === 2) {
		// Game starts! X goes first
		state.turn = state.players[0]; // X player
		// Update label to show match is no longer open
		dispatcher.matchLabelUpdate(JSON.stringify({ open: false }));
		// Broadcast initial state to both players
		dispatcher.broadcastMessage(
			OpCode.STATE_UPDATE,
			JSON.stringify(state),
			null,
			null,
		);
		logger.info(
			"Match started: %s vs %s",
			state.players[0],
			state.players[1],
		);
	}

	return { state };
};

export const matchLoop: nkruntime.MatchLoopFunction<GameState> = (
	ctx,
	logger,
	nk,
	dispatcher,
	tick,
	state,
	messages,
) => {
	// Process all incoming messages this tick
	for (const msg of messages) {
		if (msg.opCode !== OpCode.MAKE_MOVE) continue;

		const data = JSON.parse(nk.binaryToString(msg.data));
		const position: number = data.position;

		// Validate: correct player's turn
		if (msg.sender.userId !== state.turn) {
			logger.warn(
				"Move rejected: not player's turn. sender=%s, turn=%s",
				msg.sender.userId,
				state.turn,
			);
			continue;
		}

		// Validate: position in range
		if (position < 0 || position > 8) {
			logger.warn("Move rejected: invalid position %d", position);
			continue;
		}

		// Validate: cell not already taken
		if (state.board[position] !== "") {
			logger.warn("Move rejected: cell %d already occupied", position);
			continue;
		}

		// Apply move
		const mark = state.marks[msg.sender.userId];
		state.board[position] = mark;
		state.moveCount++;

		// Check win
		const winningMark = checkWinner(state.board);
		if (winningMark) {
			state.winner = winningMark;
			dispatcher.broadcastMessage(
				OpCode.STATE_UPDATE,
				JSON.stringify(state),
				null,
				null,
			);
			dispatcher.broadcastMessage(
				OpCode.GAME_OVER,
				JSON.stringify({
					winner: state.winner,
					isDraw: false,
					winnerUserId: msg.sender.userId,
				}),
				null,
				null,
			);
			updateLeaderboard(nk, logger, state);
			return null; // End match
		}

		// Check draw
		if (state.moveCount === 9) {
			state.isDraw = true;
			dispatcher.broadcastMessage(
				OpCode.STATE_UPDATE,
				JSON.stringify(state),
				null,
				null,
			);
			dispatcher.broadcastMessage(
				OpCode.GAME_OVER,
				JSON.stringify({
					winner: null,
					isDraw: true,
					winnerUserId: null,
				}),
				null,
				null,
			);
			return null; // End match
		}

		// Switch turns
		state.turn = state.players.find(function (id) {
			return id !== msg.sender.userId;
		})!;
		dispatcher.broadcastMessage(
			OpCode.STATE_UPDATE,
			JSON.stringify(state),
			null,
			null,
		);
	}

	return { state };
};

export const matchLeave: nkruntime.MatchLeaveFunction<GameState> = (
	ctx,
	logger,
	nk,
	dispatcher,
	tick,
	state,
	presences,
) => {
	for (const p of presences) {
		logger.info("Player left: %s", p.userId);
		// Notify remaining players
		dispatcher.broadcastMessage(
			OpCode.PLAYER_LEFT,
			JSON.stringify({
				userId: p.userId,
				username: p.username,
			}),
			null,
			null,
		);
	}
	// If a game was in progress and someone left, forfeit
	if (state.players.length === 2 && !state.winner && !state.isDraw) {
		const leaver = presences[0];
		const winner = state.players.find(function (id) {
			return id !== leaver.userId;
		});
		if (winner) {
			state.winner = state.marks[winner];
			dispatcher.broadcastMessage(
				OpCode.GAME_OVER,
				JSON.stringify({
					winner: state.winner,
					isDraw: false,
					winnerUserId: winner,
					forfeit: true,
				}),
				null,
				null,
			);
			return null; // End match
		}
	}
	return { state };
};

export const matchTerminate: nkruntime.MatchTerminateFunction<GameState> = (
	ctx,
	logger,
	nk,
	dispatcher,
	tick,
	state,
	graceSeconds,
) => {
	logger.info("Match terminating, grace=%d", graceSeconds);
	dispatcher.broadcastMessage(
		OpCode.PLAYER_LEFT,
		JSON.stringify({ reason: "Server shutting down" }),
		null,
		null,
	);
	return { state };
};
