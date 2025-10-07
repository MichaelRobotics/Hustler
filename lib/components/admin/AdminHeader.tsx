"use client";

import { Button, Heading } from "frosted-ui";
import { Plus } from "lucide-react";
import React from "react";
import { ThemeToggle } from "../common/ThemeToggle";

interface AdminHeaderProps {
	onAddFunnel: () => void;
	funnelCount: number;
	maxFunnels: number;
}

export default function AdminHeader({ onAddFunnel, funnelCount, maxFunnels }: AdminHeaderProps) {
	const isAtLimit = funnelCount >= maxFunnels;
	return (
		<div className="sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-border/30 dark:border-border/20 shadow-lg">
			<div className="flex items-center justify-between mb-6">
				<div>
					<Heading
						size="6"
						weight="bold"
						className="text-black dark:text-white"
					>
						My Funnels
					</Heading>
				</div>
			</div>

			<div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mb-4" />

			<div className="flex justify-between items-center gap-2 sm:gap-3">
				<div className="flex-shrink-0">
					<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
						<ThemeToggle />
					</div>
				</div>

				<div className="flex-shrink-0">
					{isAtLimit ? (
						<div className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
							<span className="text-gray-500 dark:text-gray-400 font-medium">
								Funnel Limit: {funnelCount}/{maxFunnels}
							</span>
							<span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
								MAX
							</span>
						</div>
					) : (
						<Button
							size="3"
							color="violet"
							onClick={onAddFunnel}
							className="px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group"
						>
							<Plus
								size={20}
								strokeWidth={2.5}
								className="group-hover:rotate-12 transition-transform duration-300"
							/>
							<span className="ml-1">Create New Funnel</span>
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
