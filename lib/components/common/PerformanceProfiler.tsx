"use client";

import React, { Profiler, type ReactNode } from "react";

interface PerformanceProfilerProps {
	id: string;
	children: ReactNode;
	onRender?: (
		id: string,
		phase: "mount" | "update" | "nested-update",
		actualDuration: number,
		baseDuration: number,
		startTime: number,
		commitTime: number,
	) => void;
	enabled?: boolean;
}

const PerformanceProfiler: React.FC<PerformanceProfilerProps> = React.memo(
	({
		id,
		children,
		onRender,
		enabled = process.env.NODE_ENV === "development",
	}) => {
		const handleRender = (
			id: string,
			phase: "mount" | "update" | "nested-update",
			actualDuration: number,
			baseDuration: number,
			startTime: number,
			commitTime: number,
		) => {
			// Log performance data in development
			if (enabled) {
				console.log(`[Performance] ${id} - ${phase}:`, {
					actualDuration: `${actualDuration.toFixed(2)}ms`,
					baseDuration: `${baseDuration.toFixed(2)}ms`,
					startTime: `${startTime.toFixed(2)}ms`,
					commitTime: `${commitTime.toFixed(2)}ms`,
					efficiency:
						baseDuration > 0
							? `${(((baseDuration - actualDuration) / baseDuration) * 100).toFixed(1)}%`
							: "N/A",
				});

				// Call custom onRender callback if provided
				if (onRender) {
					onRender(
						id,
						phase,
						actualDuration,
						baseDuration,
						startTime,
						commitTime,
					);
				}

				// Warn about slow renders
				if (actualDuration > 16) {
					// 60fps threshold
					console.warn(
						`[Performance Warning] ${id} render took ${actualDuration.toFixed(2)}ms (target: <16ms for 60fps)`,
					);
				}
			}
		};

		if (!enabled) {
			return <>{children}</>;
		}

		return (
			<Profiler id={id} onRender={handleRender}>
				{children}
			</Profiler>
		);
	},
);

PerformanceProfiler.displayName = "PerformanceProfiler";

export default PerformanceProfiler;
