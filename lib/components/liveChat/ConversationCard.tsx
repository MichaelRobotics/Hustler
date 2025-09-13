"use client";

import { Text } from "frosted-ui";
import { MessageSquare, Archive, AlertCircle, CheckCircle } from "lucide-react";
import React from "react";
import type { ConversationCardProps } from "../../types/liveChat";

const ConversationCard: React.FC<ConversationCardProps> = React.memo(
	({ conversation, isSelected, onClick }) => {
		// Defensive check for conversation
		if (!conversation || !conversation.user) {
			return null;
		}


		const getStatusColor = (status: string) => {
			switch (status) {
				case "open":
					return "border-l-green-500";
				case "closed":
					return "border-l-gray-500";
				default:
					return "border-l-gray-500";
			}
		};

		const getStatusIcon = (status: string) => {
			switch (status) {
				case "open":
					return null; // No indicator for open status
				case "closed":
					return <CheckCircle size={12} className="text-gray-500" />;
				default:
					return <AlertCircle size={12} className="text-gray-500" />;
			}
		};

		const getPriorityIndicator = (conversation: any) => {
			// Check if conversation has high priority metadata
			if (conversation.metadata?.priority === "high") {
				return <AlertCircle size={12} className="text-red-500" />;
			}
			if (conversation.metadata?.priority === "urgent") {
				return <AlertCircle size={12} className="text-red-600 fill-current" />;
			}
			return null;
		};

		const getFunnelProgress = (conversation: any) => {
			// Calculate funnel progress based on interactions
			const totalSteps = 10; // Assuming 10 steps max
			const completedSteps = conversation.metadata?.completedSteps || 0;
			const progress = Math.min(100, (completedSteps / totalSteps) * 100);
			return progress;
		};

		const handleClick = () => {
			onClick();
		};

		return (
			<div
				onClick={handleClick}
				className={`group relative bg-gradient-to-br from-white via-gray-50 to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-900/50 border-2 border-border dark:border-violet-500/40 rounded-xl flex flex-col justify-between transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-500/80 dark:hover:border-violet-400/90 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 shadow-lg backdrop-blur-sm dark:hover:shadow-2xl dark:hover:shadow-violet-500/20 dark:shadow-black/20 overflow-hidden ${
					isSelected
						? "ring-2 ring-violet-500/50 shadow-xl shadow-violet-500/20"
						: ""
				}`}
			>
				{/* Card Header with Status */}
				<div className="p-4 border-b-2 border-border dark:border-violet-500/30 bg-gradient-to-r from-gray-50 via-gray-100 to-violet-100 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-800/60">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-3 flex-1 min-w-0">
							<div className="flex-shrink-0">
								{conversation.user.avatar ? (
									<img
										src={conversation.user.avatar}
										alt={conversation.user.name}
										className="w-10 h-10 rounded-lg object-cover border-2 border-violet-200 dark:border-violet-400"
									/>
								) : (
									<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
										<Text size="2" weight="bold" className="text-white">
											{conversation.user.name.charAt(0).toUpperCase()}
										</Text>
									</div>
								)}
							</div>

							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<Text
										size="2"
										weight="semi-bold"
										className="text-black dark:text-white truncate"
									>
										{conversation.user.name}
									</Text>
									{getStatusIcon(conversation.status)}
									{getPriorityIndicator(conversation)}
								</div>
								<div className="flex items-center gap-2 mt-1">
									<Text size="1" color="gray" className="text-muted-foreground">
										{conversation.funnelName}
									</Text>
									{conversation.isArchived && (
										<Archive size={10} className="text-gray-400" />
									)}
								</div>
							</div>
						</div>

						{/* Message count */}
						<div className="flex-shrink-0 flex items-center gap-1">
							<MessageSquare size={10} className="text-gray-400" />
							<Text size="1" color="gray" className="text-muted-foreground">
								{conversation.messageCount}
							</Text>
						</div>
					</div>
				</div>

				{/* Card Content */}
				<div className="p-4 flex-1">
					<Text
						size="1"
						color="gray"
						className="text-muted-foreground line-clamp-1 mb-2"
					>
						{conversation.lastMessage}
					</Text>
					
					{/* Funnel Progress Bar */}
					{conversation.metadata?.completedSteps && (
						<div className="mb-2">
							<div className="flex items-center justify-between mb-1">
								<Text size="1" color="gray" className="text-muted-foreground">
									Funnel Progress
								</Text>
								<Text size="1" color="gray" className="text-muted-foreground">
									{Math.round(getFunnelProgress(conversation))}%
								</Text>
							</div>
							<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
								<div
									className="bg-gradient-to-r from-violet-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
									style={{ width: `${getFunnelProgress(conversation)}%` }}
								></div>
							</div>
						</div>
					)}

					{/* Additional Metadata */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							{/* Reserved for future metadata */}
						</div>
					</div>
				</div>
			</div>
		);
	},
);

ConversationCard.displayName = "ConversationCard";

export default ConversationCard;
