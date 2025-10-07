"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button, Heading, Text } from "frosted-ui";
import {
	BarChart3,
	Crown,
	Library,
	MessageCircle,
	Sparkles,
	Users,
	X,
	Zap,
} from "lucide-react";
import React, { useState, useMemo, useCallback } from "react";

interface AdminSidebarProps {
	currentView:
		| "dashboard"
		| "analytics"
		| "resourceLibrary"
		| "funnelBuilder"
		| "preview"
		| "liveChat";
	onViewChange: (
		view:
			| "dashboard"
			| "analytics"
			| "resourceLibrary"
			| "funnelBuilder"
			| "preview"
			| "liveChat",
	) => void;
	className?: string;
	libraryContext?: "global" | "funnel";
	currentFunnelForLibrary?: { id: string; name: string } | null;
	isUserTyping?: boolean;
	disabled?: boolean;
}

/**
 * --- Admin Sidebar Component ---
 * This component provides navigation between different admin views:
 * - Automations (Default dashboard view)
 * - Library (Library without funnel context)
 * - Live Chat (Pro version upgrade prompt)
 *
 * Following Whop's design patterns for clean, organized navigation.
 */
const AdminSidebar: React.FC<AdminSidebarProps> = React.memo(
	({
		currentView,
		onViewChange,
		className = "",
		libraryContext = "global",
		currentFunnelForLibrary = null,
		isUserTyping = false,
		disabled = false,
	}) => {
		const [isProModalOpen, setIsProModalOpen] = useState(false);

		// Memoized view states for better performance
		const viewStates = useMemo(
			() => ({
				isDashboardView: currentView === "dashboard",
				isLibraryView: currentView === "resourceLibrary",
				isAnalyticsView: currentView === "analytics",
				isFunnelBuilderView: currentView === "funnelBuilder",
				isLiveChatView: currentView === "liveChat",
			}),
			[currentView],
		);

		const handleViewChange = useCallback(
			(
				view:
					| "dashboard"
					| "analytics"
					| "resourceLibrary"
					| "funnelBuilder"
					| "preview"
					| "liveChat",
			) => {
				if (disabled) return; // Prevent navigation when disabled
				onViewChange(view);
			},
			[onViewChange, disabled],
		);

		return (
			<>
				{/* Desktop Sidebar - Icons Only */}
				{!disabled && (
					<div
						className={`hidden lg:block w-16 bg-surface/95 dark:bg-surface/90 border-r border-border/50 dark:border-border/30 backdrop-blur-sm transition-all duration-300 ${className}`}
					>
						{/* Desktop Navigation - Icons Only */}
						<div className="pt-12 px-4 space-y-8">
							{/* Automations - Default Dashboard */}
							<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
								<Button
									variant="ghost"
									color={viewStates.isDashboardView ? "violet" : "gray"}
									onClick={() => handleViewChange("dashboard")}
									className={`w-full h-12 p-0 flex items-center justify-center transition-all duration-200 rounded-lg relative group ${
										viewStates.isDashboardView
											? "bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300"
											: "hover:bg-surface/80 dark:hover:bg-surface/60 text-foreground"
									}`}
									title="Automations - Manage funnels & analytics"
								>
									<div className="relative">
										<Zap size={20} strokeWidth={2} />
									</div>
									{viewStates.isDashboardView && (
										<div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full" />
									)}
								</Button>
							</div>

							{/* Library */}
							<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
								<Button
									variant="ghost"
									color={viewStates.isLibraryView ? "violet" : "gray"}
									onClick={() => handleViewChange("resourceLibrary")}
									className={`w-full h-12 p-0 flex items-center justify-center transition-all duration-200 rounded-lg relative group ${
										viewStates.isLibraryView
											? "bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300"
											: "hover:bg-surface/80 dark:hover:bg-surface/60 text-foreground"
									}`}
									title="Library - All available products"
								>
									<div className="relative">
										<Library size={20} strokeWidth={2} />
									</div>
									{viewStates.isLibraryView && (
										<div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full" />
									)}
								</Button>

								{/* Context Indicator */}
								{viewStates.isLibraryView &&
									libraryContext === "funnel" &&
									currentFunnelForLibrary && (
										<div className="mt-2 px-2 py-1 bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700/30 rounded-lg">
											<div className="text-xs text-violet-700 dark:text-violet-300 font-medium truncate">
												{currentFunnelForLibrary.name}
											</div>
											<div className="text-xs text-violet-600 dark:text-violet-400 opacity-80">
												Funnel Context
											</div>
										</div>
									)}
							</div>

							{/* Live Chat */}
							<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
								<Button
									variant="ghost"
									color={viewStates.isLiveChatView ? "violet" : "gray"}
									onClick={() => handleViewChange("liveChat")}
									className={`w-full h-12 p-0 flex items-center justify-center transition-all duration-200 rounded-lg relative group ${
										viewStates.isLiveChatView
											? "bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300"
											: "hover:bg-surface/80 dark:hover:bg-surface/60 text-foreground"
									}`}
									title="Live Chat - Monitor conversations"
								>
									<div className="relative">
										<MessageCircle size={20} strokeWidth={2} />
									</div>
									{viewStates.isLiveChatView && (
										<div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full" />
									)}
								</Button>
							</div>
						</div>
					</div>
				)}

				{/* Mobile Bottom Navigation */}
				{!disabled && (
					<div
						className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 dark:bg-surface/90 border-t border-border/50 dark:border-border/30 backdrop-blur-sm shadow-2xl transition-all duration-200 ${isUserTyping ? "hidden" : "block"}`}
					>
						<div className="flex items-center justify-around px-4 py-3">
							{/* Automations */}
							<Button
								variant="ghost"
								color={viewStates.isDashboardView ? "violet" : "gray"}
								onClick={() => handleViewChange("dashboard")}
								className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 min-h-[60px] ${
									viewStates.isDashboardView
										? "bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300"
										: "text-muted-foreground active:text-foreground active:bg-surface/80 dark:active:bg-surface/60"
								}`}
							>
								<div className="relative mb-1">
									<Zap size={20} strokeWidth={2} />
									{viewStates.isDashboardView && (
										<div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full" />
									)}
								</div>
								<Text size="1" weight="semi-bold" className="text-xs">
									Automations
								</Text>
							</Button>

							{/* Library */}
							<Button
								variant="ghost"
								color={viewStates.isLibraryView ? "violet" : "gray"}
								onClick={() => handleViewChange("resourceLibrary")}
								className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 min-h-[60px] ${
									viewStates.isLibraryView
										? "bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300"
										: "text-muted-foreground active:text-foreground active:bg-surface/80 dark:active:bg-surface/60"
								}`}
							>
								<div className="relative mb-1">
									<Library size={20} strokeWidth={2} />
									{viewStates.isLibraryView && (
										<div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full" />
									)}
								</div>
								<Text size="1" weight="semi-bold" className="text-xs">
									Library
								</Text>

								{/* Mobile Context Indicator */}
								{viewStates.isLibraryView &&
									libraryContext === "funnel" &&
									currentFunnelForLibrary && (
										<div className="mt-1 px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700/30 rounded-md">
											<div className="text-[10px] text-violet-700 dark:text-violet-300 font-medium truncate max-w-[60px]">
												{currentFunnelForLibrary.name}
											</div>
										</div>
									)}
							</Button>

							{/* Live Chat */}
							<Button
								variant="ghost"
								color={viewStates.isLiveChatView ? "violet" : "gray"}
								onClick={() => handleViewChange("liveChat")}
								className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 min-h-[60px] ${
									viewStates.isLiveChatView
										? "bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300"
										: "text-muted-foreground active:text-foreground active:bg-surface/80 dark:active:bg-surface/60"
								}`}
							>
								<div className="relative mb-1">
									<MessageCircle size={20} strokeWidth={2} />
									{viewStates.isLiveChatView && (
										<div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full" />
									)}
								</div>
								<Text size="1" weight="semi-bold" className="text-xs">
									Chat
								</Text>
							</Button>
						</div>
					</div>
				)}

				{/* Pro Version Upgrade Modal */}
				<Dialog.Root open={isProModalOpen} onOpenChange={setIsProModalOpen}>
					<Dialog.Portal>
						<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 z-[9999]" />
						<Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300 z-[9999]">
							{/* Header */}
							<div className="text-center mb-6">
								<div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg w-16 h-16 mx-auto mb-4 flex items-center justify-center">
									<Crown size={28} className="text-white" />
								</div>
								<Heading
									size="4"
									weight="bold"
									className="text-gray-900 dark:text-white mb-2"
								>
									Upgrade to Pro
								</Heading>
								<Text
									size="2"
									color="gray"
									className="text-gray-600 dark:text-gray-300"
								>
									Unlock Live Chat functionality
								</Text>
							</div>

							{/* Action Buttons */}
							<div className="flex gap-3">
								<Button
									color="violet"
									onClick={() => {
										// Handle upgrade action
										window.open("https://whop.com/pro", "_blank");
										setIsProModalOpen(false);
									}}
									className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold !py-3 !px-6 rounded-xl shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all duration-300 dark:bg-violet-500 dark:hover:bg-violet-600 dark:shadow-violet-500/40 dark:hover:shadow-violet-500/60"
								>
									<Sparkles size={18} strokeWidth={2.5} className="mr-2" />
									Upgrade
								</Button>
								<Dialog.Close asChild>
									<Button
										variant="soft"
										color="gray"
										className="!px-6 !py-3 hover:scale-105 transition-all duration-300"
									>
										Maybe Later
									</Button>
								</Dialog.Close>
							</div>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>
			</>
		);
	},
);

AdminSidebar.displayName = "AdminSidebar";

export default AdminSidebar;
