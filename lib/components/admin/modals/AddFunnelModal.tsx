"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button, Heading, Text } from "frosted-ui";
import { Plus, X } from "lucide-react";
import React from "react";

interface AddFunnelModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	newFunnelName: string;
	onNewFunnelNameChange: (name: string) => void;
	onAddFunnel: () => void;
}

export default function AddFunnelModal({
	isOpen,
	onOpenChange,
	newFunnelName,
	onNewFunnelNameChange,
	onAddFunnel,
}: AddFunnelModalProps) {
	return (
		<Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-lg bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-2xl backdrop-blur-sm p-6 sm:p-8 animate-in zoom-in-95 duration-300 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 dark:border-gray-600 dark:shadow-2xl dark:shadow-black/60 z-50">
					<div className="flex justify-between items-center mb-6">
						<Dialog.Title asChild>
							<Heading size="4" weight="bold" className="text-foreground">
								Create New Funnel
							</Heading>
						</Dialog.Title>
						<Dialog.Close asChild>
							<Button
								size="1"
								variant="ghost"
								color="gray"
								className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-all duration-200 hover:scale-105"
							>
								<X size={16} strokeWidth={2.5} />
							</Button>
						</Dialog.Close>
					</div>

					<div className="space-y-5">
						<div>
							<Text
								as="label"
								size="2"
								weight="medium"
								className="block mb-3 text-foreground"
							>
								Funnel Name
							</Text>
							<input
								type="text"
								value={newFunnelName}
								onChange={(e) => onNewFunnelNameChange(e.target.value)}
								placeholder="Enter funnel name..."
								className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
							/>
						</div>

						<div className="flex gap-3 pt-6">
							<Button
								color="violet"
								onClick={onAddFunnel}
								disabled={!newFunnelName.trim()}
								className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold !py-3 !px-6 rounded-xl shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all duration-300 dark:bg-violet-500 dark:hover:bg-violet-600 dark:shadow-violet-500/40 dark:hover:shadow-violet-500/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
							>
								<Plus size={18} strokeWidth={2.5} className="mr-2" />
								Create
							</Button>
							<Dialog.Close asChild>
								<Button
									variant="soft"
									color="gray"
									className="!px-6 !py-3 hover:scale-105 transition-all duration-300"
								>
									Cancel
								</Button>
							</Dialog.Close>
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
