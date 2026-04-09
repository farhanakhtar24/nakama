import {
	matchInit,
	matchJoinAttempt,
	matchJoin,
	matchLoop,
	matchLeave,
	matchTerminate,
} from "./match_handler";
import { createMatchRpc, listMatchesRpc } from "./matchmaker";
import { initLeaderboard } from "./leaderboard";
import { GameState } from "./types";

export {
	matchInit,
	matchJoinAttempt,
	matchJoin,
	matchLoop,
	matchLeave,
	matchTerminate,
	createMatchRpc,
	listMatchesRpc,
};

export function matchSignal(
	ctx: nkruntime.Context,
	logger: nkruntime.Logger,
	nk: nkruntime.Nakama,
	dispatcher: nkruntime.MatchDispatcher,
	tick: number,
	state: GameState,
	data: string,
) {
	return { state };
}

export function InitModule(
	ctx: nkruntime.Context,
	logger: nkruntime.Logger,
	nk: nkruntime.Nakama,
	initializer: nkruntime.Initializer,
): Error | void {
	initializer.registerMatch("tictactoe", {
		matchInit,
		matchJoinAttempt,
		matchJoin,
		matchLoop,
		matchLeave,
		matchTerminate,
		matchSignal,
	});

	initializer.registerRpc("create_match", createMatchRpc);
	initializer.registerRpc("list_open_matches", listMatchesRpc);

	initLeaderboard(nk, logger);

	logger.info("✓ Tic-Tac-Toe module loaded");
}
