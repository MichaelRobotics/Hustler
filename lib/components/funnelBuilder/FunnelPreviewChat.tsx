"use client";

import React from "react";
import { useFunnelPreviewChat } from "../../hooks/useFunnelPreviewChat";
import type { FunnelPreviewChatProps } from "../../types/funnel";
import PerformanceProfiler from "../common/PerformanceProfiler";
import {
	ChatHeader,
	ChatInput,
	ChatMessage,
	ChatOptions,
	ChatRestartButton,
} from "./components";

/**
 * --- Funnel Preview Chat Component ---
 * This component simulates a user conversation with the generated chatbot flow.
 * It allows the user to:
 * - Click through the provided options
 * - Type custom responses to test the funnel's handling of invalid inputs
 * - See how the AI responds to off-script user behavior
 * - Test the escalation logic when users don't follow the expected path
 *
 * Features:
 * - Option clicking for normal flow testing
 * - Custom text input for edge case testing
 * - Invalid input handling with friendly reminders
 * - Escalation to creator after multiple invalid inputs
 * - Auto-scrolling and responsive design
 *
 * @param {FunnelPreviewChatProps} props - The props passed to the component.
 * @param {FunnelFlow | null} props.funnelFlow - The generated funnel flow object containing stages and blocks.
 * @returns {JSX.Element} The rendered FunnelPreviewChat component.
 */
const FunnelPreviewChat: React.FC<FunnelPreviewChatProps> = React.memo(
	({ funnelFlow, selectedOffer, onOfferClick }) => {
		const {
			history,
			currentBlockId,
			chatEndRef,
			chatContainerRef,
			optionsLeadingToOffer,
			startConversation,
			handleOptionClick,
			handleCustomInput,
			options,
		} = useFunnelPreviewChat(funnelFlow, selectedOffer);

		return (
			<PerformanceProfiler id="FunnelPreviewChat">
				<div className="h-full flex flex-col">
					{/* Chat Header */}
					<PerformanceProfiler id="FunnelPreviewChat-Header">
						<ChatHeader />
					</PerformanceProfiler>

					{/* Chat Messages Area */}
					<div
						ref={chatContainerRef}
						className="flex-grow overflow-y-auto p-0 space-y-4 pt-6"
					>
						<PerformanceProfiler id="FunnelPreviewChat-Messages">
							{history.map((msg, index) => (
								<div
									key={`${msg.type}-${index}-${msg.text.length}`}
									className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
								>
									<ChatMessage message={msg} />
								</div>
							))}
						</PerformanceProfiler>
						<div ref={chatEndRef} />
					</div>

					{/* Response Options */}
					<PerformanceProfiler id="FunnelPreviewChat-Options">
						<ChatOptions
							options={options}
							optionsLeadingToOffer={optionsLeadingToOffer}
							selectedOffer={selectedOffer}
							onOptionClick={handleOptionClick}
						/>
					</PerformanceProfiler>

					{/* Chat Input - Only show when there are options available */}
					{options.length > 0 && currentBlockId && (
						<PerformanceProfiler id="FunnelPreviewChat-Input">
							<ChatInput
								onSendMessage={handleCustomInput}
								placeholder="Type or choose response"
							/>
						</PerformanceProfiler>
					)}

					{/* Conversation End State - Show Start Over when no options or conversation ended */}
					{(() => {
						// Don't show Start Conversation button if we're in a TRANSITION stage
						const isTransitionBlock = currentBlockId && funnelFlow?.stages.some(
							stage => stage.name === "TRANSITION" && stage.blockIds.includes(currentBlockId)
						);
						
						// Show button only when conversation is truly ended (no current block) or no options available (but not in TRANSITION)
						const shouldShowStartButton = (!currentBlockId || (options.length === 0 && !isTransitionBlock));
						
						return shouldShowStartButton && (
							<PerformanceProfiler id="FunnelPreviewChat-Restart">
								<ChatRestartButton onRestart={startConversation} />
							</PerformanceProfiler>
						);
					})()}
				</div>
			</PerformanceProfiler>
		);
	},
);

FunnelPreviewChat.displayName = "FunnelPreviewChat";

export default FunnelPreviewChat;
