/**
 * Pools of colors and shapes for cross-stage Upsell/Downsell connections.
 * Colors exclude teal and amber (used for next-stage Upsell/Downsell).
 * Selection is random from unused colors and shapes when creating a connection.
 */

export interface CrossStageColor {
	id: string;
	textClass: string; // e.g. "text-cyan-600 dark:text-cyan-400"
	borderClass: string; // e.g. "border-cyan-500/50 dark:border-cyan-400/50"
	bgClass: string; // e.g. "bg-cyan-500/15 dark:bg-cyan-500/20"
	hex?: string;
}

export interface CrossStageShape {
	id: string;
	name: string; // lucide-react icon name (PascalCase)
}

export interface CrossStageStyle {
	colorId: string;
	shapeId: string;
}

/** Color pool: 16 colors, excluding teal and amber (used for Upsell/Downsell buttons and arrows). */
export const CROSS_STAGE_COLOR_POOL: CrossStageColor[] = [
	{ id: "cyan", textClass: "text-cyan-600 dark:text-cyan-400", borderClass: "border-cyan-500/50 dark:border-cyan-400/50", bgClass: "bg-cyan-500/15 dark:bg-cyan-500/20", hex: "#06b6d4" },
	{ id: "fuchsia", textClass: "text-fuchsia-600 dark:text-fuchsia-400", borderClass: "border-fuchsia-500/50 dark:border-fuchsia-400/50", bgClass: "bg-fuchsia-500/15 dark:bg-fuchsia-500/20", hex: "#c026d3" },
	{ id: "sky", textClass: "text-sky-600 dark:text-sky-400", borderClass: "border-sky-500/50 dark:border-sky-400/50", bgClass: "bg-sky-500/15 dark:bg-sky-500/20", hex: "#0284c7" },
	{ id: "rose", textClass: "text-rose-600 dark:text-rose-400", borderClass: "border-rose-500/50 dark:border-rose-400/50", bgClass: "bg-rose-500/15 dark:bg-rose-500/20", hex: "#e11d48" },
	{ id: "emerald", textClass: "text-emerald-600 dark:text-emerald-400", borderClass: "border-emerald-500/50 dark:border-emerald-400/50", bgClass: "bg-emerald-500/15 dark:bg-emerald-500/20", hex: "#059669" },
	{ id: "lime", textClass: "text-lime-600 dark:text-lime-400", borderClass: "border-lime-500/50 dark:border-lime-400/50", bgClass: "bg-lime-500/15 dark:bg-lime-500/20", hex: "#65a30d" },
	{ id: "pink", textClass: "text-pink-600 dark:text-pink-400", borderClass: "border-pink-500/50 dark:border-pink-400/50", bgClass: "bg-pink-500/15 dark:bg-pink-500/20", hex: "#db2777" },
	{ id: "orange", textClass: "text-orange-600 dark:text-orange-400", borderClass: "border-orange-500/50 dark:border-orange-400/50", bgClass: "bg-orange-500/15 dark:bg-orange-500/20", hex: "#ea580c" },
	{ id: "slate", textClass: "text-slate-600 dark:text-slate-400", borderClass: "border-slate-500/50 dark:border-slate-400/50", bgClass: "bg-slate-500/15 dark:bg-slate-500/20", hex: "#475569" },
	{ id: "zinc", textClass: "text-zinc-600 dark:text-zinc-400", borderClass: "border-zinc-500/50 dark:border-zinc-400/50", bgClass: "bg-zinc-500/15 dark:bg-zinc-500/20", hex: "#52525b" },
	{ id: "indigo", textClass: "text-indigo-600 dark:text-indigo-400", borderClass: "border-indigo-500/50 dark:border-indigo-400/50", bgClass: "bg-indigo-500/15 dark:bg-indigo-500/20", hex: "#4f46e5" },
	{ id: "violet", textClass: "text-violet-600 dark:text-violet-400", borderClass: "border-violet-500/50 dark:border-violet-400/50", bgClass: "bg-violet-500/15 dark:bg-violet-500/20", hex: "#7c3aed" },
	{ id: "purple", textClass: "text-purple-600 dark:text-purple-400", borderClass: "border-purple-500/50 dark:border-purple-400/50", bgClass: "bg-purple-500/15 dark:bg-purple-500/20", hex: "#9333ea" },
	{ id: "red", textClass: "text-red-600 dark:text-red-400", borderClass: "border-red-500/50 dark:border-red-400/50", bgClass: "bg-red-500/15 dark:bg-red-500/20", hex: "#dc2626" },
	{ id: "yellow", textClass: "text-yellow-600 dark:text-yellow-400", borderClass: "border-yellow-500/50 dark:border-yellow-400/50", bgClass: "bg-yellow-500/15 dark:bg-yellow-500/20", hex: "#ca8a04" },
	{ id: "stone", textClass: "text-stone-600 dark:text-stone-400", borderClass: "border-stone-500/50 dark:border-stone-400/50", bgClass: "bg-stone-500/15 dark:bg-stone-500/20", hex: "#57534e" },
];

/** Shape pool: 16 shape icons from lucide-react (PascalCase names for dynamic import). */
export const CROSS_STAGE_SHAPE_POOL: CrossStageShape[] = [
	{ id: "hexagon", name: "Hexagon" },
	{ id: "diamond", name: "Diamond" },
	{ id: "circle-dot", name: "CircleDot" },
	{ id: "crosshair", name: "Crosshair" },
	{ id: "octagon", name: "Octagon" },
	{ id: "square", name: "Square" },
	{ id: "triangle", name: "Triangle" },
	{ id: "rectangle-horizontal", name: "RectangleHorizontal" },
	{ id: "circle", name: "Circle" },
	{ id: "pentagon", name: "Pentagon" },
	{ id: "square-dot", name: "SquareDot" },
	{ id: "octagon-alert", name: "OctagonAlert" },
	{ id: "circle-ellipsis", name: "CircleEllipsis" },
	{ id: "rectangle-vertical", name: "RectangleVertical" },
	{ id: "circle-dashed", name: "CircleDashed" },
	{ id: "vector-square", name: "VectorSquare" },
];

export function getUsedCrossStageStyles(flow: { blocks: Record<string, { upsellCrossStageStyle?: CrossStageStyle | null; downsellCrossStageStyle?: CrossStageStyle | null }> }): { usedColorIds: Set<string>; usedShapeIds: Set<string> } {
	const usedColorIds = new Set<string>();
	const usedShapeIds = new Set<string>();
	if (!flow?.blocks) return { usedColorIds, usedShapeIds };
	for (const block of Object.values(flow.blocks)) {
		if (block.upsellCrossStageStyle) {
			usedColorIds.add(block.upsellCrossStageStyle.colorId);
			usedShapeIds.add(block.upsellCrossStageStyle.shapeId);
		}
		if (block.downsellCrossStageStyle) {
			usedColorIds.add(block.downsellCrossStageStyle.colorId);
			usedShapeIds.add(block.downsellCrossStageStyle.shapeId);
		}
	}
	return { usedColorIds, usedShapeIds };
}

/**
 * Pick a random unused color and shape from the pools for a new cross-stage connection.
 * If a pool is exhausted, reuses from the full pool (fallback).
 */
export function pickRandomUnusedCrossStageStyle(flow: { blocks: Record<string, { upsellCrossStageStyle?: CrossStageStyle | null; downsellCrossStageStyle?: CrossStageStyle | null }> }): CrossStageStyle {
	const { usedColorIds, usedShapeIds } = getUsedCrossStageStyles(flow);
	const availableColors = CROSS_STAGE_COLOR_POOL.filter((c) => !usedColorIds.has(c.id));
	const availableShapes = CROSS_STAGE_SHAPE_POOL.filter((s) => !usedShapeIds.has(s.id));
	const color = availableColors.length > 0
		? availableColors[Math.floor(Math.random() * availableColors.length)]
		: CROSS_STAGE_COLOR_POOL[Math.floor(Math.random() * CROSS_STAGE_COLOR_POOL.length)];
	const shape = availableShapes.length > 0
		? availableShapes[Math.floor(Math.random() * availableShapes.length)]
		: CROSS_STAGE_SHAPE_POOL[Math.floor(Math.random() * CROSS_STAGE_SHAPE_POOL.length)];
	return { colorId: color.id, shapeId: shape.id };
}

export function getCrossStageColorById(colorId: string): CrossStageColor | undefined {
	return CROSS_STAGE_COLOR_POOL.find((c) => c.id === colorId);
}

export function getCrossStageShapeById(shapeId: string): CrossStageShape | undefined {
	return CROSS_STAGE_SHAPE_POOL.find((s) => s.id === shapeId);
}
