"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button, Heading, Text } from "frosted-ui";
import { Trash2 } from "lucide-react";
import React from "react";
import { hasValidFlow } from "@/lib/helpers/funnel-validation";

interface Funnel {
	id: string;
	name: string;
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	resources?: any[];
	sends?: number;
	flow?: any;
	generationStatus?: "idle" | "generating" | "completed" | "failed";
	generationError?: string;
	lastGeneratedAt?: number;
}

interface DeleteFunnelModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	funnelToDelete: Funnel | null;
	onConfirmDelete: () => void;
}

export default function DeleteFunnelModal({
	isOpen,
	onOpenChange,
	funnelToDelete,
	onConfirmDelete,
}: DeleteFunnelModalProps) {
	// Check if funnel is live and cannot be deleted
	const isLiveFunnel = funnelToDelete?.isDeployed && hasValidFlow(funnelToDelete);
	
	return (
		<AlertDialog.Root open={isOpen} onOpenChange={onOpenChange}>
			<AlertDialog.Portal>
				<AlertDialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 z-50" />
				<AlertDialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-lg bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-2xl backdrop-blur-sm p-6 sm:p-8 animate-in zoom-in-95 duration-300 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 dark:border-gray-600 dark:shadow-2xl dark:shadow-black/60 z-50">
					<div className="flex justify-between items-center mb-6">
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
								<Trash2
									className="w-5 h-5 text-red-600 dark:text-red-400"
									strokeWidth={2}
								/>
							</div>
							<AlertDialog.Title asChild>
								<Heading size="4" weight="bold" className="text-foreground">
									Delete Funnel
								</Heading>
							</AlertDialog.Title>
						</div>
					</div>

					<div className="space-y-5">
						<AlertDialog.Description asChild>
							<Text color="gray" className="text-gray-600 dark:text-gray-300">
								Are you sure you want to delete "{funnelToDelete?.name}"? This
								action cannot be undone.
							</Text>
						</AlertDialog.Description>

						<div className="flex gap-3 pt-6">
							<AlertDialog.Cancel asChild>
								<Button
									variant="soft"
									color="gray"
									className="flex-1 !px-6 !py-3 hover:scale-105 transition-all duration-300"
								>
									Cancel
								</Button>
							</AlertDialog.Cancel>
							<AlertDialog.Action asChild>
								<Button
									color="red"
									onClick={onConfirmDelete}
									disabled={isLiveFunnel}
									className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold !py-3 !px-6 rounded-xl shadow-xl shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 transition-all duration-300 dark:bg-red-500 dark:hover:bg-red-600 dark:shadow-red-500/40 dark:hover:shadow-red-500/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-red-600"
								>
									<Trash2 size={18} strokeWidth={2.5} className="mr-2" />
									Delete
								</Button>
							</AlertDialog.Action>
						</div>
					</div>
				</AlertDialog.Content>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}