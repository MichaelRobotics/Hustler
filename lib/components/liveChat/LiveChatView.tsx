"use client";

import React from "react";
import type { LiveChatViewProps } from "../../types/liveChat";
import LiveChatUserInterface from "./LiveChatUserInterface";

const LiveChatView: React.FC<LiveChatViewProps> = React.memo(
	({ conversation, onSendMessage, onBack, isLoading = false }) => {
		return (
			<div className="h-full w-full">
				<LiveChatUserInterface
					conversation={conversation}
					onSendMessage={onSendMessage}
					onBack={onBack}
					isLoading={isLoading}
				/>
			</div>
		);
	},
);

LiveChatView.displayName = "LiveChatView";

export default LiveChatView;
