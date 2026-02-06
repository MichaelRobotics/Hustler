"use client";

import { hasValidFlow } from "@/lib/helpers/funnel-validation";
import { TRIGGER_OPTIONS } from "@/lib/components/funnelBuilder/TriggerBlock";
import type { TriggerType } from "@/lib/types/funnel";
import { Circle, ShoppingBag } from "lucide-react";
import { Button } from "frosted-ui";
import React, { useMemo, useRef, useLayoutEffect, useState } from "react";

const APP_TRIGGER_EDGE_TYPES: TriggerType[] = [
	"qualification_merchant_complete",
	"upsell_merchant_complete",
	"delete_merchant_conversation",
];

/** Triggers that have no incoming merchant connection (entry points for a merchant). */
const ENTRY_TRIGGER_TYPES: TriggerType[] = ["on_app_entry", "no_active_conversation"];

/** Membership trigger types (green label in graph). */
const MEMBERSHIP_TRIGGER_TYPES: TriggerType[] = [
	"any_membership_buy",
	"membership_buy",
	"any_cancel_membership",
	"cancel_membership",
];

export interface GraphFunnel {
	id: string;
	name: string;
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	resources?: Array<{ id: string; name?: string }>;
	flow?: any;
	merchantType?: "qualification" | "upsell";
	appTriggerType?: TriggerType;
	appTriggerConfig?: { funnelId?: string; profileId?: string; [key: string]: unknown };
	membershipTriggerType?: TriggerType;
	membershipTriggerConfig?: {
		resourceId?: string;
		filterResourceIdsRequired?: string[];
		filterResourceIdsExclude?: string[];
	};
}

interface Edge {
	sourceId: string;
	targetId: string;
	triggerType: TriggerType;
	triggerName: string;
	profileId?: string;
}

interface MerchantsGraphViewProps {
	funnels: GraphFunnel[];
	onFunnelClick: (funnel: GraphFunnel) => void;
	profiles?: Array<{ id: string; name: string }>;
	/** All resources (products) for resolving membership trigger product name by resourceId */
	allResources?: Array<{ id: string; name?: string }>;
}

function getTriggerDisplayName(triggerType: TriggerType): string {
	const option = TRIGGER_OPTIONS.find((o) => o.id === triggerType);
	return option?.name ?? triggerType;
}

function buildEdges(funnels: GraphFunnel[]): Edge[] {
	const edges: Edge[] = [];
	const funnelIds = new Set(funnels.map((f) => f.id));
	for (const funnel of funnels) {
		const triggerType = funnel.appTriggerType;
		if (!triggerType || !APP_TRIGGER_EDGE_TYPES.includes(triggerType)) continue;
		const sourceId = funnel.appTriggerConfig?.funnelId;
		if (!sourceId || !funnelIds.has(sourceId)) continue;
		edges.push({
			sourceId,
			targetId: funnel.id,
			triggerType,
			triggerName: getTriggerDisplayName(triggerType),
			profileId: funnel.appTriggerConfig?.profileId as string | undefined,
		});
	}
	return edges;
}

function computeConnectedComponents(funnels: GraphFunnel[], edges: Edge[]): Set<string>[] {
	const idToIndex = new Map<string, number>();
	funnels.forEach((f, i) => idToIndex.set(f.id, i));
	const n = funnels.length;
	const adj: number[][] = Array.from({ length: n }, () => []);
	for (const e of edges) {
		const u = idToIndex.get(e.sourceId);
		const v = idToIndex.get(e.targetId);
		if (u !== undefined && v !== undefined) {
			adj[u].push(v);
			adj[v].push(u);
		}
	}
	const visited = new Array(n).fill(false);
	const components: Set<string>[] = [];
	function dfs(i: number, comp: Set<string>) {
		visited[i] = true;
		comp.add(funnels[i].id);
		for (const j of adj[i]) {
			if (!visited[j]) dfs(j, comp);
		}
	}
	for (let i = 0; i < n; i++) {
		if (!visited[i]) {
			const comp = new Set<string>();
			dfs(i, comp);
			components.push(comp);
		}
	}
	return components;
}

/** BFS from roots (no incoming edge); return level per node and edges grouped by (sourceLevel -> targetLevel). */
function computeLevelsAndEdgeGroups(
	comp: Set<string>,
	compEdges: Edge[],
	funnelMap: Map<string, GraphFunnel>
): { levels: Map<string, number>; edgeGroupsByLevel: { level: number; groups: { sourceId: string; triggerType: TriggerType; triggerName: string; profileId?: string; targetIds: string[] }[] }[] } {
	const levels = new Map<string, number>();
	const incoming = new Map<string, number>();
	for (const id of comp) {
		incoming.set(id, 0);
	}
	for (const e of compEdges) {
		incoming.set(e.targetId, (incoming.get(e.targetId) ?? 0) + 1);
	}
	const roots = Array.from(comp).filter((id) => incoming.get(id) === 0);
	if (roots.length === 0 && comp.size > 0) {
		roots.push(Array.from(comp)[0]);
	}
	const queue: string[] = [...roots];
	roots.forEach((id) => levels.set(id, 0));
	while (queue.length > 0) {
		const u = queue.shift()!;
		const l = levels.get(u) ?? 0;
		for (const e of compEdges) {
			if (e.sourceId !== u) continue;
			const v = e.targetId;
			if (!levels.has(v)) {
				levels.set(v, l + 1);
				queue.push(v);
			}
		}
	}
	for (const id of comp) {
		if (!levels.has(id)) levels.set(id, 0);
	}
	const maxLevel = Math.max(0, ...Array.from(levels.values()));
	const edgeGroupsByLevel: { level: number; groups: { sourceId: string; triggerType: TriggerType; triggerName: string; profileId?: string; targetIds: string[] }[] }[] = [];
	for (let level = 0; level < maxLevel; level++) {
		const groups = new Map<string, { sourceId: string; triggerType: TriggerType; triggerName: string; profileId?: string; targetIds: string[] }>();
		for (const e of compEdges) {
			if (levels.get(e.sourceId) !== level || levels.get(e.targetId) !== level + 1) continue;
			const key = `${e.sourceId}-${e.triggerType}-${e.profileId ?? ""}`;
			if (!groups.has(key)) {
				groups.set(key, { sourceId: e.sourceId, triggerType: e.triggerType, triggerName: e.triggerName, profileId: e.profileId, targetIds: [] });
			}
			groups.get(key)!.targetIds.push(e.targetId);
		}
		const arr = Array.from(groups.values());
		if (arr.length > 0) edgeGroupsByLevel.push({ level, groups: arr });
	}
	return { levels, edgeGroupsByLevel };
}

/** Order nodes within each level to reduce edge crossings (barycentric heuristic). */
function orderLevelsToReduceCrossings(
	levelOrder: string[][],
	compEdges: Edge[],
	levels: Map<string, number>
): string[][] {
	if (levelOrder.length === 0) return levelOrder;
	const result: string[][] = [];
	for (let l = 0; l < levelOrder.length; l++) {
		const row = levelOrder[l];
		if (l === 0) {
			result.push([...row].sort((a, b) => a.localeCompare(b)));
			continue;
		}
		const prevRow = result[l - 1];
		const prevIndex = new Map<string, number>();
		prevRow.forEach((id, i) => prevIndex.set(id, i));
		const barycenter = (nodeId: string): number => {
			const predecessors = compEdges.filter((e) => e.targetId === nodeId && levels.get(e.sourceId) === l - 1).map((e) => e.sourceId);
			if (predecessors.length === 0) return prevRow.length / 2;
			const sum = predecessors.reduce((acc, src) => acc + (prevIndex.get(src) ?? prevRow.length / 2), 0);
			return sum / predecessors.length;
		};
		result.push([...row].sort((a, b) => {
			const ba = barycenter(a);
			const bb = barycenter(b);
			if (ba !== bb) return ba - bb;
			return a.localeCompare(b);
		}));
	}
	return result;
}

function MerchantCardCompact({
	funnel,
	onClick,
	cardRef,
}: {
	funnel: GraphFunnel;
	onClick: () => void;
	cardRef?: (el: HTMLDivElement | null) => void;
}) {
	const isValid = hasValidFlow(funnel);
	return (
		<div
			ref={cardRef as (el: HTMLDivElement | null) => void}
			data-node-id={funnel.id}
			className="group relative min-w-[160px] max-w-[200px] rounded-xl border-2 border-border dark:border-violet-500/40 overflow-hidden transition-all duration-300 shadow-lg backdrop-blur-sm bg-gradient-to-br from-white via-gray-50 to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-900/50"
		>
			<button
				type="button"
				onClick={onClick}
				className="w-full flex flex-col text-left cursor-pointer hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-500/80 dark:hover:border-violet-400/90 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
			>
				<div className="p-3 border-b border-border dark:border-violet-500/30 bg-gradient-to-r from-gray-50 via-gray-100 to-violet-100 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-800/60">
					<div className="flex items-center gap-2 flex-wrap">
						{funnel.isDeployed && isValid ? (
							<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/60 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-600">
								<Circle className="w-1.5 h-1.5 bg-red-600 dark:bg-red-400 rounded-full mr-1.5 fill-current" strokeWidth={0} />
								Live
							</span>
						) : (
							<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800/60 dark:to-gray-700/60 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
								<Circle className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full mr-1.5 fill-current" strokeWidth={0} />
								Draft
							</span>
						)}
						{funnel.merchantType && (
							<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/60 dark:to-purple-900/60 text-violet-800 dark:text-violet-200 border border-violet-300 dark:border-violet-600">
								{funnel.merchantType === "qualification" ? "Qualification" : "UpSell"}
							</span>
						)}
					</div>
				</div>
				<div className="p-3 bg-gradient-to-br from-gray-50/80 via-gray-100/60 to-violet-50/40 dark:from-gray-900/80 dark:via-gray-800/60 dark:to-indigo-900/30">
					<span className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{funnel.name}</span>
				</div>
			</button>
		</div>
	);
}

function getTriggerPillLabel(triggerName: string, triggerType: TriggerType, profileId: string | undefined, profiles: Array<{ id: string; name: string }> | undefined): string {
	if (triggerType === "qualification_merchant_complete" && profileId && profiles?.length) {
		const profile = profiles.find((p) => p.id === profileId);
		if (profile?.name) return `${triggerName} (${profile.name})`;
	}
	return triggerName;
}

function TriggerPill({ label, pillRef }: { label: string; pillRef?: (el: HTMLDivElement | null) => void }) {
	return (
		<div
			ref={pillRef}
			className="flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-600"
		>
			{label}
		</div>
	);
}

interface MembershipTriggerLabelProps {
	membershipTriggerType: TriggerType;
	membershipTriggerConfig?: { resourceId?: string };
	resources?: Array<{ id: string; name?: string }>;
	labelRef?: (el: HTMLDivElement | null) => void;
}

function MembershipTriggerLabel({
	membershipTriggerType,
	membershipTriggerConfig,
	resources,
	labelRef,
}: MembershipTriggerLabelProps) {
	const triggerName = getTriggerDisplayName(membershipTriggerType);
	const resourceId = membershipTriggerConfig?.resourceId;
	const productName =
		resourceId && resources?.length
			? (resources.find((r) => r.id === resourceId)?.name ?? undefined)
			: undefined;
	const mainLabel = productName ? `${triggerName} – ${productName}` : triggerName;

	return (
		<div
			ref={labelRef}
			className="flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-600"
		>
			{mainLabel}
		</div>
	);
}

interface ConnectorRowProps {
	groups: { sourceId: string; triggerType: TriggerType; triggerName: string; profileId?: string; targetIds: string[] }[];
	profiles: Array<{ id: string; name: string }> | undefined;
	registerPillRef: (key: string, el: HTMLDivElement | null) => void;
}

function ConnectorRow({
	groups,
	profiles,
	registerPillRef,
	useGrid,
	numCols,
	extraVerticalSpace,
}: ConnectorRowProps & { useGrid?: boolean; numCols?: number; extraVerticalSpace?: boolean }) {
	const singleTarget = groups.length === 1 && groups[0].targetIds.length === 1;
	const pyClass = extraVerticalSpace ? "py-8" : "py-6";
	if (useGrid && numCols != null && numCols > 0) {
		return (
			<div
				className={`grid gap-6 min-h-[3rem] items-center justify-items-center w-full ${pyClass}`}
				style={{ gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))` }}
			>
				{groups.map((g, j) => {
					const key = `${g.sourceId}-${g.triggerType}-${g.profileId ?? ""}`;
					const label = getTriggerPillLabel(g.triggerName, g.triggerType, g.profileId, profiles);
					return (
						<div key={key} className="flex justify-center">
							<TriggerPill label={label} pillRef={(el) => registerPillRef(key, el)} />
						</div>
					);
				})}
			</div>
		);
	}
	return (
		<div
			className={`flex flex-row flex-wrap gap-6 justify-center items-center min-h-[3rem] ${pyClass} ${singleTarget ? "w-full" : ""}`}
		>
			{groups.map((g) => {
				const key = `${g.sourceId}-${g.triggerType}-${g.profileId ?? ""}`;
				const label = getTriggerPillLabel(g.triggerName, g.triggerType, g.profileId, profiles);
				return (
					<TriggerPill
						key={key}
						label={label}
						pillRef={(el) => registerPillRef(key, el)}
					/>
				);
			})}
		</div>
	);
}

interface GraphSectionProps {
	comp: Set<string>;
	compEdges: Edge[];
	funnelMap: Map<string, GraphFunnel>;
	onFunnelClick: (funnel: GraphFunnel) => void;
	profiles: Array<{ id: string; name: string }> | undefined;
	showMembershipTrigger?: boolean;
	allResources?: Array<{ id: string; name?: string }>;
}

function GraphSection({ comp, compEdges, funnelMap, onFunnelClick, profiles, showMembershipTrigger = false, allResources }: GraphSectionProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const pillRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const membershipLabelRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const [paths, setPaths] = useState<{ key: string; d: string; hasArrow: boolean }[]>([]);

	const { levels, edgeGroupsByLevel } = useMemo(() => computeLevelsAndEdgeGroups(comp, compEdges, funnelMap), [comp, compEdges, funnelMap]);

	const levelOrder = useMemo(() => {
		const maxL = Math.max(0, ...Array.from(levels.values()));
		const byLevel: string[][] = [];
		for (let l = 0; l <= maxL; l++) {
			byLevel.push(Array.from(comp).filter((id) => levels.get(id) === l));
		}
		return orderLevelsToReduceCrossings(byLevel, compEdges, levels);
	}, [comp, levels, compEdges]);

	const registerNodeRef = (id: string) => (el: HTMLDivElement | null) => {
		if (el) nodeRefs.current.set(id, el);
		else nodeRefs.current.delete(id);
	};

	const registerPillRef = (key: string, el: HTMLDivElement | null) => {
		if (el) pillRefs.current.set(key, el);
		else pillRefs.current.delete(key);
	};

	const registerMembershipLabelRef = (id: string) => (el: HTMLDivElement | null) => {
		if (el) membershipLabelRefs.current.set(id, el);
		else membershipLabelRefs.current.delete(id);
	};

	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const containerRect = container.getBoundingClientRect();
		const newPaths: { key: string; d: string; hasArrow: boolean }[] = [];
		for (const { level, groups } of edgeGroupsByLevel) {
			for (const g of groups) {
				const sourceEl = nodeRefs.current.get(g.sourceId);
				const pillKey = `${g.sourceId}-${g.triggerType}-${g.profileId ?? ""}`;
				const pillEl = pillRefs.current.get(pillKey);
				if (!sourceEl || !pillEl) continue;
				const sr = sourceEl.getBoundingClientRect();
				const pr = pillEl.getBoundingClientRect();
				const sx = sr.left - containerRect.left + sr.width / 2;
				const sy = sr.bottom - containerRect.top;
				const px = pr.left - containerRect.left + pr.width / 2;
				const py = pr.top - containerRect.top;
				const pillBottom = pr.bottom - containerRect.top;
				const dy = py - sy;
				const cp = Math.min(Math.abs(dy) * 0.4, 24);
				const straightSourceToPill = Math.abs(sx - px) < 2;
				const d1 = straightSourceToPill
					? `M ${sx} ${sy} L ${px} ${py}`
					: `M ${sx} ${sy} C ${sx} ${sy + cp}, ${px} ${py - cp}, ${px} ${py}`;
				newPaths.push({ key: `${pillKey}-from`, d: d1, hasArrow: false });
				for (const targetId of g.targetIds) {
					const membershipLabelEl = showMembershipTrigger ? membershipLabelRefs.current.get(targetId) : null;
					const targetEl = membershipLabelEl ?? nodeRefs.current.get(targetId);
					if (!targetEl) continue;
					const tr = targetEl.getBoundingClientRect();
					const tx = tr.left - containerRect.left + tr.width / 2;
					const ty = membershipLabelEl ? tr.top - containerRect.top + tr.height / 2 : tr.top - containerRect.top;
					const dy2 = ty - pillBottom;
					const cp2 = Math.min(Math.abs(dy2) * 0.4, 24);
					const straightPillToTarget = Math.abs(px - tx) < 2;
					const d2 = straightPillToTarget
						? `M ${px} ${pillBottom} L ${tx} ${ty}`
						: `M ${px} ${pillBottom} C ${px} ${pillBottom + cp2}, ${tx} ${ty - cp2}, ${tx} ${ty}`;
					newPaths.push({ key: `${pillKey}-to-${targetId}`, d: d2, hasArrow: true });
				}
			}
		}
		setPaths(newPaths);
	}, [edgeGroupsByLevel, levelOrder, showMembershipTrigger]);

	if (compEdges.length === 0) {
		return (
			<div className="flex flex-row flex-wrap gap-8 justify-center">
				{Array.from(comp).map((id) => {
					const funnel = funnelMap.get(id);
					if (!funnel) return null;
					const isEntryTrigger = funnel.appTriggerType && ENTRY_TRIGGER_TYPES.includes(funnel.appTriggerType);
					const hasMembershipTrigger =
						showMembershipTrigger &&
						funnel.membershipTriggerType &&
						MEMBERSHIP_TRIGGER_TYPES.includes(funnel.membershipTriggerType);
					return (
						<div key={funnel.id} className="flex flex-col items-center gap-2">
							{isEntryTrigger && funnel.appTriggerType && (
								<TriggerPill label={getTriggerDisplayName(funnel.appTriggerType)} />
							)}
							{hasMembershipTrigger && funnel.membershipTriggerType && (
								<MembershipTriggerLabel
									membershipTriggerType={funnel.membershipTriggerType}
									membershipTriggerConfig={funnel.membershipTriggerConfig}
									resources={allResources ?? funnel.resources}
									labelRef={registerMembershipLabelRef(funnel.id)}
								/>
							)}
							<MerchantCardCompact funnel={funnel} onClick={() => onFunnelClick(funnel)} />
						</div>
					);
				})}
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={`relative flex flex-col items-center ${showMembershipTrigger ? "gap-10" : "gap-8"}`}
		>
			<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 5 }}>
				<defs>
					<marker id="merchant-graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
						<path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6" />
					</marker>
				</defs>
				{paths.map(({ key, d, hasArrow }) => (
					<path
						key={key}
						d={d}
						stroke="#8b5cf6"
						strokeWidth="2"
						strokeDasharray="6 4"
						fill="none"
						markerEnd={hasArrow ? "url(#merchant-graph-arrow)" : undefined}
						opacity="0.7"
					/>
				))}
			</svg>
			<div className={`flex flex-col items-center relative z-10 w-full ${showMembershipTrigger ? "gap-10" : "gap-8"}`}>
				{levelOrder.map((ids, idx) => {
					const edgeGroupsForLevel = edgeGroupsByLevel.find((eg) => eg.level === idx);
					const groups = edgeGroupsForLevel?.groups ?? [];
					const numCols = groups.length;

					// When there are outgoing triggers: align sources above their trigger(s).
					// One column per trigger; each source spans the columns of the triggers it feeds.
					const useTriggerGrid = numCols > 0;
					const sourceSpans = useTriggerGrid
						? (() => {
								const bySource = new Map<string, number[]>();
								groups.forEach((g, j) => {
									const list = bySource.get(g.sourceId) ?? [];
									list.push(j);
									bySource.set(g.sourceId, list);
								});
								return Array.from(bySource.entries()).map(([sourceId, cols]) => ({
									sourceId,
									colMin: Math.min(...cols),
									colMax: Math.max(...cols),
								}));
							})()
						: [];

					return (
						<React.Fragment key={idx}>
							{useTriggerGrid ? (
								<div
									className={`grid items-start w-full ${showMembershipTrigger ? "gap-10" : "gap-8"}`}
									style={{ gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))` }}
								>
									{sourceSpans.map(({ sourceId, colMin, colMax }) => {
										const funnel = funnelMap.get(sourceId);
										if (!funnel) return null;
										const isRootWithEntryTrigger =
											idx === 0 &&
											funnel.appTriggerType &&
											ENTRY_TRIGGER_TYPES.includes(funnel.appTriggerType);
										const hasMembershipTrigger =
											showMembershipTrigger &&
											funnel.membershipTriggerType &&
											MEMBERSHIP_TRIGGER_TYPES.includes(funnel.membershipTriggerType);
										return (
											<div
												key={funnel.id}
												className={`flex flex-col justify-center items-center ${showMembershipTrigger ? "gap-3" : "gap-2"}`}
												style={{
													gridColumn: `${colMin + 1} / ${colMax + 2}`,
												}}
											>
												{isRootWithEntryTrigger && funnel.appTriggerType && (
													<TriggerPill label={getTriggerDisplayName(funnel.appTriggerType)} />
												)}
												{hasMembershipTrigger && funnel.membershipTriggerType && (
													<MembershipTriggerLabel
														membershipTriggerType={funnel.membershipTriggerType}
														membershipTriggerConfig={funnel.membershipTriggerConfig}
														resources={allResources ?? funnel.resources}
														labelRef={registerMembershipLabelRef(funnel.id)}
													/>
												)}
												<MerchantCardCompact
													funnel={funnel}
													onClick={() => onFunnelClick(funnel)}
													cardRef={registerNodeRef(funnel.id)}
												/>
											</div>
										);
									})}
								</div>
							) : (
								<div
									className={`flex flex-row flex-wrap justify-center items-start ${ids.length === 1 ? "w-full" : ""} ${showMembershipTrigger ? "gap-10" : "gap-8"}`}
								>
									{ids.map((id) => {
										const funnel = funnelMap.get(id);
										if (!funnel) return null;
										const isRootWithEntryTrigger =
											idx === 0 &&
											funnel.appTriggerType &&
											ENTRY_TRIGGER_TYPES.includes(funnel.appTriggerType);
										const hasMembershipTrigger =
											showMembershipTrigger &&
											funnel.membershipTriggerType &&
											MEMBERSHIP_TRIGGER_TYPES.includes(funnel.membershipTriggerType);
										return (
											<div key={funnel.id} className={`flex flex-col items-center ${showMembershipTrigger ? "gap-3" : "gap-2"}`}>
												{isRootWithEntryTrigger && funnel.appTriggerType && (
													<TriggerPill label={getTriggerDisplayName(funnel.appTriggerType)} />
												)}
												{hasMembershipTrigger && funnel.membershipTriggerType && (
													<MembershipTriggerLabel
														membershipTriggerType={funnel.membershipTriggerType}
														membershipTriggerConfig={funnel.membershipTriggerConfig}
														resources={allResources ?? funnel.resources}
														labelRef={registerMembershipLabelRef(funnel.id)}
													/>
												)}
												<MerchantCardCompact
													funnel={funnel}
													onClick={() => onFunnelClick(funnel)}
													cardRef={registerNodeRef(funnel.id)}
												/>
											</div>
										);
									})}
								</div>
							)}
							{edgeGroupsForLevel && (
								<ConnectorRow
									groups={edgeGroupsForLevel.groups}
									profiles={profiles}
									registerPillRef={registerPillRef}
									useGrid={useTriggerGrid}
									numCols={numCols}
									extraVerticalSpace={showMembershipTrigger}
								/>
							)}
							{/* Target row (merchants below trigger) is the next level's first row */}
						</React.Fragment>
					);
				})}
			</div>
		</div>
	);
}

function GraphNetworkCard({
	comp,
	compEdges,
	funnelMap,
	onFunnelClick,
	profiles,
	allResources,
}: {
	comp: Set<string>;
	compEdges: Edge[];
	funnelMap: Map<string, GraphFunnel>;
	onFunnelClick: (funnel: GraphFunnel) => void;
	profiles: Array<{ id: string; name: string }> | undefined;
	allResources?: Array<{ id: string; name?: string }>;
}) {
	const [showMembershipTrigger, setShowMembershipTrigger] = useState(false);
	return (
		<div className="relative flex-shrink-0 rounded-xl border-2 border-border dark:border-violet-500/30 bg-white/50 dark:bg-gray-900/50 p-8 shadow-lg">
			<div className="absolute top-3 left-3 z-20 p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
				<Button
					size="2"
					color="gray"
					variant="soft"
					onClick={() => setShowMembershipTrigger((v) => !v)}
					title="Show membership triggers"
					aria-pressed={showMembershipTrigger}
					className={showMembershipTrigger ? "text-green-600 dark:text-green-400" : ""}
				>
					<ShoppingBag className="w-4 h-4" />
				</Button>
			</div>
			<div className="pt-12">
			<GraphSection
				comp={comp}
				compEdges={compEdges}
				funnelMap={funnelMap}
				onFunnelClick={onFunnelClick}
				profiles={profiles}
				showMembershipTrigger={showMembershipTrigger}
				allResources={allResources}
			/>
			</div>
		</div>
	);
}

export default function MerchantsGraphView({ funnels, onFunnelClick, profiles, allResources }: MerchantsGraphViewProps) {
	const { edges, components, funnelMap } = useMemo(() => {
		const filtered = funnels.filter((f) => f != null);
		const edges = buildEdges(filtered);
		const components = computeConnectedComponents(filtered, edges);
		const funnelMap = new Map<string, GraphFunnel>();
		filtered.forEach((f) => funnelMap.set(f.id, f));
		return { edges, components, funnelMap };
	}, [funnels]);

	if (funnels.length === 0) {
		return (
			<div className="flex items-center justify-center py-16 text-muted-foreground">
				<p>No merchants yet. Create a merchant to see the graph.</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap gap-8 items-start overflow-x-auto pb-4">
				{components.map((comp, compIndex) => {
					const compEdges = edges.filter((e) => comp.has(e.sourceId) && comp.has(e.targetId));
					return (
						<GraphNetworkCard
							key={compIndex}
							comp={comp}
							compEdges={compEdges}
							funnelMap={funnelMap}
							onFunnelClick={onFunnelClick}
							profiles={profiles}
							allResources={allResources}
						/>
					);
				})}
			</div>
		</div>
	);
}
