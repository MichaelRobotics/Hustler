"use client";

import React from "react";
import AutoResizeTextarea from "../common/AutoResizeTextarea";

interface FunnelBlock {
	id: string;
	message: string;
	options: { text: string; nextBlockId: string | null }[];
}

interface SendDmBlockEditorProps {
	block: FunnelBlock;
	experienceId: string;
	onSave: (block: FunnelBlock) => void;
	onCancel: () => void;
}

/**
 * Editor for the Send DM block: editable message text + locked experience app link.
 * The DM is sent to Whop native chat only; this content is never shown in-app.
 */
const SendDmBlockEditor: React.FC<SendDmBlockEditorProps> = ({
	block,
	experienceId,
	onSave,
	onCancel,
}) => {
	const [message, setMessage] = React.useState(block.message);
	const [appLink, setAppLink] = React.useState<string | null>(null);
	const [linkLoading, setLinkLoading] = React.useState(true);

	React.useEffect(() => {
		if (!experienceId) {
			setLinkLoading(false);
			return;
		}
		let cancelled = false;
		setLinkLoading(true);
		fetch(`/api/experience/${experienceId}/app-link`)
			.then((r) => r.json())
			.then((data) => {
				if (!cancelled && data?.link) setAppLink(data.link);
			})
			.catch(() => {
				if (!cancelled) setAppLink("https://whop.com/apps/");
			})
			.finally(() => {
				if (!cancelled) setLinkLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [experienceId]);

	const handleSave = () => {
		onSave({ ...block, message: message.trim() || block.message });
	};

	return (
		<div className="p-4 space-y-3" data-no-drag>
			{/* Header row: label + Cancel/Save — same layout as BlockEditor */}
			<div className="flex justify-between items-center">
				<label className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
					Send DM
				</label>
				<div className="flex gap-2">
					<button
						onClick={onCancel}
						className="px-3 py-1.5 text-xs rounded-lg bg-surface/50 dark:bg-surface/30 border border-border/50 dark:border-border/30 text-muted-foreground hover:text-foreground hover:bg-surface/60 dark:hover:bg-surface/40 transition-all duration-200 font-medium"
					>
						Cancel
					</button>
					<button
						onClick={handleSave}
						className="px-3 py-1.5 text-xs rounded-lg bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center gap-1.5"
					>
						<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
						</svg>
						Save
					</button>
				</div>
			</div>
			{/* Message textarea + link */}
			<div>
				<AutoResizeTextarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder="Write DM there..."
					className="w-full min-h-[60px] rounded-xl border border-border/50 dark:border-border/30 bg-surface/50 dark:bg-surface/30 text-foreground p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 transition-all duration-200"
				/>
				<div className="mt-1 text-xs text-blue-500 dark:text-blue-400 px-1">
					{linkLoading ? (
						<span className="text-muted-foreground animate-pulse">Loading link…</span>
					) : (
						<span className="select-all break-all" title="This link is always appended to the DM">
							{appLink ?? "https://whop.com/apps/"}
						</span>
					)}
				</div>
			</div>
		</div>
	);
};

export default SendDmBlockEditor;
