"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button, Heading, Text } from "frosted-ui";
import { CheckCircle, Rocket, XCircle } from "lucide-react";
import React from "react";

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

interface DeploymentModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	funnel: Funnel | null;
	onConfirmDeploy: (funnelId: string) => void;
}

export default function DeploymentModal({
	isOpen,
	onOpenChange,
	funnel,
	onConfirmDeploy,
}: DeploymentModalProps) {
	if (!funnel) return null;

	const isDeployed = funnel.isDeployed;
	const actionText = isDeployed ? "Undeploy" : "Deploy";
	const actionColor = isDeployed ? "red" : "green";
	const actionIcon = isDeployed ? XCircle : Rocket;

	return (
		<Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-lg bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-2xl backdrop-blur-sm p-6 sm:p-8 animate-in zoom-in-95 duration-300 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 dark:border-gray-600 dark:shadow-2xl dark:shadow-black/60 z-50">
					<div className="flex justify-between items-center mb-6">
						<div className="flex items-center gap-3">
							<div
								className={`p-2 rounded-lg ${isDeployed ? "bg-red-100 dark:bg-red-900/20" : "bg-green-100 dark:bg-green-900/20"}`}
							>
								{React.createElement(actionIcon, {
									className: `w-5 h-5 ${isDeployed ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`,
									strokeWidth: 2,
								})}
							</div>
							<Dialog.Title asChild>
								<Heading size="4" weight="bold" className="text-foreground">
									{actionText} Merchant
								</Heading>
							</Dialog.Title>
						</div>
					</div>

					<div className="space-y-5">
						<Dialog.Description asChild>
							<Text color="gray" className="text-gray-600 dark:text-gray-300">
								{isDeployed
									? `Are you sure you want to take "${funnel.name}" offline? This will make your Merchant unavailable for new customers.`
									: `Are you sure you want to go live with "${funnel.name}"? This will make your Merchant available to customers.`}
							</Text>
						</Dialog.Description>

						<div className="flex gap-3 pt-6">
							<Dialog.Close asChild>
								<Button
									variant="soft"
									color="gray"
									className="flex-1 !px-6 !py-3 hover:scale-105 transition-all duration-300"
								>
									Cancel
								</Button>
							</Dialog.Close>
							<Button
								color={actionColor as any}
								onClick={() => onConfirmDeploy(funnel.id)}
								className={`flex-1 bg-${actionColor}-600 hover:bg-${actionColor}-700 text-white font-semibold !py-3 !px-6 rounded-xl shadow-xl shadow-${actionColor}-500/30 hover:shadow-${actionColor}-500/50 hover:scale-105 transition-all duration-300 dark:bg-${actionColor}-500 dark:hover:bg-${actionColor}-600 dark:shadow-${actionColor}-500/40 dark:hover:shadow-${actionColor}-500/60`}
							>
								{React.createElement(actionIcon, {
									size: 18,
									strokeWidth: 2.5,
									className: "mr-2",
								})}
								{actionText}
							</Button>
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
