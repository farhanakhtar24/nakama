export function initLeaderboard(
	nk: nkruntime.Nakama,
	logger: nkruntime.Logger,
): void {
	try {
		nk.leaderboardCreate(
			"tictactoe_wins", // leaderboard id
			false, // not authoritative (clients can submit)
			nkruntime.SortOrder.DESCENDING,
			nkruntime.Operator.INCREMENTAL,
			nkruntime.ResetSchedule.NEVER,
			null,
		);
		logger.info("Leaderboard created: tictactoe_wins");
	} catch (e) {
		// Already exists — ignore
	}
}

export function recordWin(
	nk: nkruntime.Nakama,
	logger: nkruntime.Logger,
	userId: string,
	username: string,
): void {
	try {
		nk.leaderboardRecordWrite(
			"tictactoe_wins",
			userId,
			username,
			1,
			0,
			null,
		);
	} catch (e) {
		logger.error("Failed to record win for %s: %s", userId, e);
	}
}
