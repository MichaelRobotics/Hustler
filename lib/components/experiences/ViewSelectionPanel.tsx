"use client";

import { Button } from "frosted-ui";
import { ArrowRight, Settings, User } from "lucide-react";
import type React from "react";
import { useState } from "react";

/**
 * --- View Selection Panel Component ---
 * This component provides a choice between admin and customer views
 * for users who have access to the experience.
 */

interface ViewSelectionPanelProps {
	userName: string;
	accessLevel: "admin"; // Only admins should see this panel
	onViewSelected: (view: "admin" | "customer") => void;
}

const ViewSelectionPanel: React.FC<ViewSelectionPanelProps> = ({
	userName,
	accessLevel,
	onViewSelected,
}) => {
	const [selectedView, setSelectedView] = useState<"admin" | "customer" | null>(
		null,
	);

	const handleViewSelect = (view: "admin" | "customer") => {
		setSelectedView(view);
		// Small delay for better UX
		setTimeout(() => {
			onViewSelected(view);
		}, 300);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
			<div className="max-w-2xl w-full">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-white mb-2">
						Welcome, {userName}! 👋
					</h1>
					<p className="text-gray-300 text-lg">
						Choose how you'd like to experience this funnel
					</p>
					<div className="mt-2 px-3 py-1 bg-violet-500/20 border border-violet-500/30 rounded-full inline-block">
						<span className="text-violet-300 text-sm font-medium">
							Developer Company - Admin Access
						</span>
					</div>
				</div>

				{/* View Selection Cards */}
				<div className="grid md:grid-cols-2 gap-6">
					{/* Admin View Card */}
					<div
						className={`relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer group ${
							selectedView === "admin"
								? "border-violet-500 bg-violet-500/10"
								: "border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800/70"
						}`}
						onClick={() => handleViewSelect("admin")}
					>
						<div className="flex items-center justify-between mb-4">
							<div className="p-3 rounded-xl bg-violet-500/20 border border-violet-500/30">
								<Settings size={24} className="text-violet-400" />
							</div>
							{selectedView === "admin" && (
								<div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
									<ArrowRight size={16} className="text-white" />
								</div>
							)}
						</div>

						<h3 className="text-xl font-semibold text-white mb-2">
							Admin View
						</h3>
						<p className="text-gray-300 mb-4">
							Access the full dashboard with analytics, funnel management, live
							chat, and all administrative features.
						</p>

						<div className="space-y-2">
							<div className="flex items-center gap-2 text-sm text-gray-400">
								<div className="w-2 h-2 bg-violet-500 rounded-full"></div>
								<span>Merchant Conversation Editor & Analytics</span>
							</div>
							<div className="flex items-center gap-2 text-sm text-gray-400">
								<div className="w-2 h-2 bg-violet-500 rounded-full"></div>
								<span>Live Chat Management</span>
							</div>
							<div className="flex items-center gap-2 text-sm text-gray-400">
								<div className="w-2 h-2 bg-violet-500 rounded-full"></div>
								<span>Resource Library</span>
							</div>
						</div>
					</div>

					{/* Customer View Card */}
					<div
						className={`relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer group ${
							selectedView === "customer"
								? "border-green-500 bg-green-500/10"
								: "border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800/70"
						}`}
						onClick={() => handleViewSelect("customer")}
					>
						<div className="flex items-center justify-between mb-4">
							<div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30">
								<User size={24} className="text-green-400" />
							</div>
							{selectedView === "customer" && (
								<div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
									<ArrowRight size={16} className="text-white" />
								</div>
							)}
						</div>

						<h3 className="text-xl font-semibold text-white mb-2">
							Customer View
						</h3>
						<p className="text-gray-300 mb-4">
							Experience the funnel as your customers would - clean chat
							interface with personalized conversations.
						</p>

						<div className="space-y-2">
							<div className="flex items-center gap-2 text-sm text-gray-400">
								<div className="w-2 h-2 bg-green-500 rounded-full"></div>
								<span>Interactive Chat Experience</span>
							</div>
							<div className="flex items-center gap-2 text-sm text-gray-400">
								<div className="w-2 h-2 bg-green-500 rounded-full"></div>
								<span>Personalized Conversations</span>
							</div>
							<div className="flex items-center gap-2 text-sm text-gray-400">
								<div className="w-2 h-2 bg-green-500 rounded-full"></div>
								<span>Clean, Focused Interface</span>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="text-center mt-8">
					<p className="text-gray-400 text-sm">
						You can switch between views anytime by refreshing the page
					</p>
				</div>
			</div>
		</div>
	);
};

export default ViewSelectionPanel;
