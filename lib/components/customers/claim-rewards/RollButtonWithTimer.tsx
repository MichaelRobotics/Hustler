"use client";

import React, { useState, useEffect } from "react";
import { Button, Text } from "frosted-ui";
import { Clock, RefreshCw } from "lucide-react";

type RollButtonWithTimerLayout = "full" | "buttonOrTimer" | "timerOnly";

interface RollButtonWithTimerProps {
	onRoll: () => void;
	cooldownSeconds: number;
	nextRollAt: number | null; // timestamp
	disabled?: boolean; // e.g. while spinning
	onTestProbability?: () => void;
	layout?: RollButtonWithTimerLayout; // buttonOrTimer = one slot above wheel: Roll or Timer (discount style); timerOnly = timer + Test Probability below wheel
}

function formatCountdown(ms: number): { hours: number; minutes: number; seconds: number } {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return { hours, minutes, seconds };
}

function formatCountdownString(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;
	return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export const RollButtonWithTimer: React.FC<RollButtonWithTimerProps> = ({
	onRoll,
	cooldownSeconds,
	nextRollAt,
	disabled = false,
	onTestProbability,
	layout = "full",
}) => {
	const [now, setNow] = useState(Date.now());
	const remaining = nextRollAt != null ? nextRollAt - now : 0;
	const canRoll = remaining <= 0 && !disabled;

	useEffect(() => {
		if (remaining <= 0) return;
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, [remaining]);

	// Above wheel: fixed-height slot so spinner doesn't resize. Shows: Roll button | Timer | Spinning placeholder
	if (layout === "buttonOrTimer") {
		const { hours, minutes, seconds } = formatCountdown(remaining);
		const formatUnit = (n: number) => String(n).padStart(2, "0");
		return (
			<div className="flex flex-col items-center justify-center w-full min-h-[72px]">
				{canRoll && (
					<button
						type="button"
						onClick={onRoll}
						aria-label="Roll the wheel"
						className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg text-amber-950 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-[0.98] bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:via-yellow-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] overflow-hidden"
					>
						<span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
						<RefreshCw size={24} strokeWidth={2.5} className="relative z-10" />
						<span className="relative z-10">Roll</span>
					</button>
				)}
				{remaining > 0 && (
					<div className="flex items-center justify-center w-full px-5 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-800 shadow-inner">
						<div className="flex items-center gap-2 sm:gap-3">
							<span className="min-w-[56px] text-center rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 px-3 py-2.5 text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100 shadow-sm">
								{formatUnit(hours)}
							</span>
							<span className="text-xl font-semibold text-gray-600 dark:text-gray-400">:</span>
							<span className="min-w-[56px] text-center rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 px-3 py-2.5 text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100 shadow-sm">
								{formatUnit(minutes)}
							</span>
							<span className="text-xl font-semibold text-gray-600 dark:text-gray-400">:</span>
							<span className="min-w-[56px] text-center rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 px-3 py-2.5 text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100 shadow-sm">
								{formatUnit(seconds)}
							</span>
						</div>
					</div>
				)}
				{!canRoll && remaining <= 0 && (
					<div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
						<RefreshCw size={22} className="animate-spin" strokeWidth={2.5} />
						<span className="text-sm font-medium">Spinning...</span>
					</div>
				)}
			</div>
		);
	}

	if (layout === "timerOnly") {
		return (
			<div className="space-y-4">
				{remaining > 0 && (
					<div className="flex justify-center">
						<Button size="2" variant="soft" color="red" className="!px-3 !py-1.5 !h-auto">
							<div className="flex items-center gap-1.5">
								<Clock className="w-3.5 h-3.5" />
								<Text size="2">
									Next roll in: {formatCountdownString(remaining)}
								</Text>
							</div>
						</Button>
					</div>
				)}
				{onTestProbability && (
					<Button
						size="2"
						variant="soft"
						color="gray"
						className="w-full rounded-xl"
						onClick={onTestProbability}
					>
						Test Probability
					</Button>
				)}
			</div>
		);
	}

	// full
	return (
		<div className="space-y-4">
			{canRoll ? (
				<Button
					size="3"
					className="w-full rounded-xl font-medium"
					onClick={onRoll}
					aria-label="Roll the wheel"
				>
					Roll
				</Button>
			) : remaining > 0 ? (
				<div className="flex justify-center">
					<Button size="2" variant="soft" color="red" className="!px-3 !py-1.5 !h-auto">
						<div className="flex items-center gap-1.5">
							<Clock className="w-3.5 h-3.5" />
							<Text size="2">Next roll in: {formatCountdownString(remaining)}</Text>
						</div>
					</Button>
				</div>
			) : null}
			{onTestProbability && (
				<Button
					size="2"
					variant="soft"
					color="gray"
					className="w-full rounded-xl"
					onClick={onTestProbability}
				>
					Test Probability
				</Button>
			)}
		</div>
	);
};
