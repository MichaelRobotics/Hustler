"use client";

import { MessageSquare, Play, RotateCcw, Settings, ChevronDown, ChevronUp } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface AdminNavbarProps {
	conversationId: string | null;
	stageInfo: {
		currentStage: string;
		isDMFunnelActive: boolean;
		isTransitionStage: boolean;
		isExperienceQualificationStage: boolean;
	} | null;
	adminLoading: boolean;
	adminError: string | null;
	adminSuccess: string | null;
	onCheckStatus: () => void;
	onTriggerDM: () => void;
	onResetConversations: () => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
	conversationId,
	stageInfo,
	adminLoading,
	adminError,
	adminSuccess,
	onCheckStatus,
	onTriggerDM,
	onResetConversations,
}) => {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className="bg-black/80 backdrop-blur-sm border-b border-white/10">
			{/* Compact Header */}
			<div className="flex items-center justify-between px-4 py-2">
				<div className="flex items-center gap-2">
					<Settings size={16} className="text-white" />
					<span className="text-white text-sm font-medium">Admin</span>
					<div className={`w-2 h-2 rounded-full ${conversationId ? 'bg-green-400' : 'bg-gray-400'}`}></div>
					<span className="text-white/70 text-xs">
						{conversationId ? 'Active' : 'No Chat'}
					</span>
				</div>

				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="p-1 text-white/70 hover:text-white transition-colors"
				>
					{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</button>
			</div>

			{/* Compact Controls */}
			{isExpanded && (
				<div className="px-4 pb-2 space-y-2">
					{/* Status */}
					{stageInfo && (
						<div className="text-xs text-white/70">
							Stage: <span className="text-white">{stageInfo.currentStage}</span>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex gap-2">
						<button
							onClick={onCheckStatus}
							disabled={adminLoading}
							className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs rounded transition-colors"
						>
							<MessageSquare size={12} />
							Refresh
						</button>
						
						<button
							onClick={onTriggerDM}
							disabled={adminLoading || !!conversationId}
							className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 text-blue-300 text-xs rounded transition-colors"
						>
							<Play size={12} />
							DM
						</button>
						
						<button
							onClick={onResetConversations}
							disabled={adminLoading}
							className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-300 text-xs rounded transition-colors"
						>
							<RotateCcw size={12} />
							Reset
						</button>
					</div>

					{/* Messages */}
					{adminError && (
						<div className="text-xs text-red-300 bg-red-500/10 px-2 py-1 rounded">
							{adminError}
						</div>
					)}
					{adminSuccess && (
						<div className="text-xs text-green-300 bg-green-500/10 px-2 py-1 rounded">
							{adminSuccess}
						</div>
					)}
				</div>
			)}
		</div>
	);
};
