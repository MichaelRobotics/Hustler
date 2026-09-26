export function merchantNodeIsConnected(
	nodeId: string,
	edges: Array<{ sourceId: string; targetId: string }>,
): boolean {
	return edges.some((edge) => edge.sourceId === nodeId || edge.targetId === nodeId);
}
