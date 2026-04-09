export const createMatchRpc: nkruntime.RpcFunction = (
	ctx,
	logger,
	nk,
	payload,
) => {
	const matchId = nk.matchCreate("tictactoe", {});
	logger.info("Match created: %s by user: %s", matchId, ctx.userId);
	return JSON.stringify({ matchId });
};

export const listMatchesRpc: nkruntime.RpcFunction = (
	ctx,
	logger,
	nk,
	payload,
) => {
	const matches = nk.matchList(
		10, // limit
		true, // authoritative only
		null, // label query
		2, // min size (waiting for players)
		2, // max size
		'{"open":true}', // label filter
	);
	return JSON.stringify({ matches });
};
