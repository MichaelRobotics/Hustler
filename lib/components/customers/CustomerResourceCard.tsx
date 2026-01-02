import { Text, Heading } from "frosted-ui";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Link2, FileText, Download, Settings } from "lucide-react";
import type React from "react";
import { useState, useRef, useEffect } from "react";
import type { CustomerResource } from "@/lib/types/resource";
import { WHOP_ICON_URL } from "@/lib/constants/whop-icon";

interface CustomerResourceCardProps {
	resource: CustomerResource;
	resourceType: "WHOP" | "LINK" | "FILE"; // Type determined from original resource
	onOpenProductReview?: (companySlug: string) => void;
	onOpenPlanReview?: (resourceId: string | undefined, planId: string) => void;
	experienceId?: string;
}

export const CustomerResourceCard: React.FC<CustomerResourceCardProps> = ({
	resource,
	resourceType,
	onOpenProductReview,
	onOpenPlanReview,
	experienceId,
}) => {
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const settingsRef = useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				settingsRef.current &&
				!settingsRef.current.contains(event.target as Node)
			) {
				setIsSettingsOpen(false);
			}
		};

		if (isSettingsOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isSettingsOpen]);

	const handleAction = (action: "cancel" | "delete") => {
		if (action === "cancel") {
			// TODO: Implement cancel membership logic
			console.log("Cancel membership:", resource.customer_resource_id);
		} else if (action === "delete") {
			// TODO: Implement delete file logic
			console.log("Delete file:", resource.customer_resource_id);
		}
		setIsSettingsOpen(false);
	};

	const generateFilename = (): string => {
		// Try to extract extension from storage_url if available
		if (resource.storage_url) {
			try {
				const urlPath = new URL(resource.storage_url).pathname;
				const extension = urlPath.split('.').pop() || 'bin';
				const sanitizedName = resource.product_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
				return `${sanitizedName}.${extension}`;
			} catch {
				// If URL parsing fails, try to extract extension from the string directly
				const match = resource.storage_url.match(/\.([a-z0-9]+)(?:\?|$)/i);
				const extension = match ? match[1] : 'bin';
				const sanitizedName = resource.product_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
				return `${sanitizedName}.${extension}`;
			}
		}
		// Fallback: use timestamp-based filename
		const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
		return `download-${timestamp}.bin`;
	};

	const handleDownload = async () => {
		// For FILE type with storage_url: download file first
		if (resourceType === "FILE" && resource.storage_url) {
			const filename = generateFilename();
			const downloadUrl = `/api/download?url=${encodeURIComponent(resource.storage_url)}&filename=${encodeURIComponent(filename)}`;
			
			// Create a temporary anchor element to trigger download
			const link = document.createElement('a');
			link.href = downloadUrl;
			link.download = filename;
			link.target = '_blank';
			link.style.display = 'none';
			document.body.appendChild(link);
			link.click();
			
			// Clean up the temporary element
			setTimeout(() => {
				document.body.removeChild(link);
			}, 100);
			
			// Wait longer to ensure download has started before opening modal
			// Use a longer delay to give the browser time to initiate the download
			setTimeout(() => {
				if (!resource.membership_product_id && resource.membership_plan_id && onOpenPlanReview) {
					// Note: We don't pass customer_resource_id here since the API uses plan's resourceId
					// The resourceId parameter is optional and will be ignored in favor of plan's resourceId
					onOpenPlanReview(undefined, resource.membership_plan_id);
				}
			}, 500); // Increased from 100ms to 500ms to ensure download starts
			return;
		}

		// For plan-only resources (no membership_product_id): open plan review modal
		if (!resource.membership_product_id && resource.membership_plan_id && onOpenPlanReview) {
			// Note: We don't pass customer_resource_id here since the API uses plan's resourceId
			// The resourceId parameter is optional and will be ignored in favor of plan's resourceId
			onOpenPlanReview(undefined, resource.membership_plan_id);
		}
	};

	const handleUpgrade = async () => {
		// For resources with whopProductId: open product review modal via proxy
		if (resource.membership_product_id && onOpenProductReview) {
			// Fetch company slug from API
			try {
				const response = await fetch(`/api/company/route?experienceId=${encodeURIComponent(experienceId || '')}`);
				if (response.ok) {
					const data = await response.json();
					if (data.route) {
						onOpenProductReview(data.route);
					} else {
						console.error('Company route not found');
					}
				} else {
					console.error('Failed to fetch company route');
				}
			} catch (error) {
				console.error('Error fetching company route:', error);
			}
		}
	};

	const getTypeIcon = (type: string) => {
		switch (type) {
			case "LINK":
				return (
					<Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
				);
			case "FILE":
				return (
					<FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" strokeWidth={2.5} />
				);
			case "WHOP":
				return (
					<img 
						src={WHOP_ICON_URL} 
						alt="Whop" 
						className="w-5 h-5 object-contain"
					/>
				);
			default:
				return null;
		}
	};

	return (
		<div 
			className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700"
			data-plan-id={resource.membership_plan_id}
		>
			{/* Settings Icon - Positioned in top left corner of entire card */}
			<div className="absolute top-3 left-3 z-10" ref={settingsRef}>
				<DropdownMenu.Root
					open={isSettingsOpen}
					onOpenChange={setIsSettingsOpen}
				>
					<DropdownMenu.Trigger asChild>
						<button
							type="button"
							className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 shadow-lg border border-gray-200 dark:border-gray-700"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
							}}
							aria-label="Settings"
						>
							<Settings className="w-4 h-4 text-gray-700 dark:text-gray-300" strokeWidth={2.5} />
						</button>
					</DropdownMenu.Trigger>

					<DropdownMenu.Portal>
						<DropdownMenu.Content
							className="min-w-[120px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
							align="start"
							sideOffset={5}
						>
							{resourceType === "WHOP" ? (
								<DropdownMenu.Item
									onSelect={() => handleAction("cancel")}
									className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
								>
									Cancel
								</DropdownMenu.Item>
							) : resourceType === "FILE" ? (
								<DropdownMenu.Item
									onSelect={() => handleAction("delete")}
									className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
								>
									Delete
								</DropdownMenu.Item>
							) : null}
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			</div>

			{/* Download/Upgrade Button - Positioned in top right corner of entire card */}
			{resourceType === "FILE" && resource.storage_url ? (
				<button
					onClick={handleDownload}
					className="absolute top-3 right-3 z-10 inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium shadow-lg"
				>
					<Download className="w-4 h-4" strokeWidth={2.5} />
					Download
				</button>
			) : resourceType === "FILE" && !resource.storage_url && resource.membership_plan_id && !resource.membership_product_id ? (
				// Plan-only FILE resource: show Download button that opens review modal
				<button
					onClick={handleDownload}
					className="absolute top-3 right-3 z-10 inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium shadow-lg"
				>
					<Download className="w-4 h-4" strokeWidth={2.5} />
					Download
				</button>
			) : resourceType === "WHOP" && resource.membership_product_id ? (
				// WHOP resource with productId: show Upgrade button that opens product review modal
				<button
					onClick={handleUpgrade}
					className="absolute top-3 right-3 z-10 inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium shadow-lg"
				>
					<Download className="w-4 h-4" strokeWidth={2.5} />
					Upgrade
				</button>
			) : resourceType === "WHOP" && !resource.membership_product_id && resource.membership_plan_id ? (
				// Plan-only WHOP resource: show Upgrade button that opens plan review modal
				<button
					onClick={handleDownload}
					className="absolute top-3 right-3 z-10 inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium shadow-lg"
				>
					<Download className="w-4 h-4" strokeWidth={2.5} />
					Upgrade
				</button>
			) : null}

			{/* Image Section */}
			{resource.image && (
				<div className="w-full h-48 overflow-hidden bg-gray-100 dark:bg-gray-900 -mt-1">
					<img
						src={resource.image}
						alt={resource.product_name}
						className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
						onError={(e) => {
							const target = e.target as HTMLImageElement;
							target.style.display = 'none';
						}}
					/>
				</div>
			)}

			{/* Content Section */}
			<div className="p-4">
				{/* Header with Type Icon and Name */}
				{(resource.product_name || resource.description) && (
					<div className="flex items-start gap-3 mb-2">
						<div className="flex-shrink-0 mt-1">
							{getTypeIcon(resourceType)}
						</div>
						<div className="flex-1 min-w-0">
							{resource.product_name ? (
								<Heading
									size="4"
									weight="bold"
									className="text-gray-900 dark:text-white line-clamp-2"
								>
									{resource.product_name}
								</Heading>
							) : resource.description ? (
								<Heading
									size="4"
									weight="bold"
									className="text-gray-900 dark:text-white line-clamp-2"
								>
									{resource.description}
								</Heading>
							) : null}
						</div>
					</div>
				)}

				{/* Description - Only show if product_name exists (to avoid duplication) */}
				{resource.description && resource.product_name && (
					<Text
						size="2"
						color="gray"
						className="text-muted-foreground line-clamp-2 mb-3"
					>
						{resource.description}
					</Text>
				)}
			</div>
		</div>
	);
};



