function pingRpc(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) {
	logger.info("Ping received");
	return JSON.stringify({ message: "pong", userId: ctx.userId });
}

function InitModule(
	ctx: nkruntime.Context,
	logger: nkruntime.Logger,
	nk: nkruntime.Nakama,
	initializer: nkruntime.Initializer,
): Error | void {
	initializer.registerRpc("ping", pingRpc);
	logger.info("Tic-Tac-Toe module initialized");
}
