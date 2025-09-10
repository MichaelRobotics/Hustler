"use client";

import { Heading, Text } from "frosted-ui";
import type React from "react";

interface DeploymentModalProps {
	isDeploying: boolean;
	deploymentLog: string[];
	action?: 'deploy' | 'undeploy';
}

export const DeploymentModal: React.FC<DeploymentModalProps> = ({
	isDeploying,
	deploymentLog,
	action = 'deploy',
}) => {
	if (!isDeploying) return null;

	return (
		<div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-2xl backdrop-blur-sm">
			<div className="p-6">
				<div className="text-center space-y-4">
					{/* Animated Loading Icon */}
					<div className="relative w-16 h-16 mx-auto">
						{action === 'deploy' ? (
							<>
								<div className="absolute inset-0 w-16 h-16 border-4 border-green-200 dark:border-green-800 rounded-full animate-pulse"></div>
								<div className="absolute inset-2 w-12 h-12 border-4 border-transparent border-t-green-500 rounded-full animate-spin"></div>
								<div className="absolute inset-4 w-8 h-8 bg-green-500 rounded-full animate-ping"></div>
								{/* Play Icon in Center */}
								<div className="absolute inset-0 flex items-center justify-center">
									<svg
										className="w-6 h-6 text-white animate-pulse"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path d="M8 5v14l11-7z" />
									</svg>
								</div>
							</>
						) : (
							<>
								<div className="absolute inset-0 w-16 h-16 border-4 border-red-200 dark:border-red-800 rounded-full animate-pulse"></div>
								<div className="absolute inset-2 w-12 h-12 border-4 border-transparent border-t-red-500 rounded-full animate-spin"></div>
								<div className="absolute inset-4 w-8 h-8 bg-red-500 rounded-full animate-ping"></div>
								{/* Stop Icon in Center */}
								<div className="absolute inset-0 flex items-center justify-center">
									<svg
										className="w-6 h-6 text-white animate-pulse"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<rect x="6" y="6" width="12" height="12" rx="2" />
									</svg>
								</div>
							</>
						)}
					</div>

					<Heading
						size="4"
						weight="bold"
						className="text-gray-900 dark:text-white"
					>
						{action === 'deploy' ? 'Going Live! 🚀' : 'Going Offline 🔴'}
					</Heading>

					<Text size="2" className="text-gray-600 dark:text-gray-300">
						{action === 'deploy' 
							? 'Setting up your funnel for customers...'
							: 'Taking your funnel offline...'
						}
					</Text>
				</div>
			</div>
		</div>
	);
};
