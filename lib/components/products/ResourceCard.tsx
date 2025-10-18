import { Button, Text } from "frosted-ui";
import {
	Check,
	PenLine,
	Plus,
	Sparkles,
	Target,
	Trash2,
	X,
	DollarSign,
	Gift,
	CheckCircle,
} from "lucide-react";
import type React from "react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { canAssignResource } from "../../helpers/product-limits";
import type { Funnel, Resource } from "../../types/resource";

interface ResourceCardProps {
	resource: Resource;
	funnel?: Funnel;
	context: "global" | "funnel";
	allResources: Resource[];
	isResourceInFunnel: (resourceId: string) => boolean;
	isResourceAssignedToAnyFunnel: (resourceId: string) => boolean;
	onAddToFunnel?: (resource: Resource) => void;
	onRemoveFromFunnel?: (resource: Resource) => void;
	onEdit: (resource: Resource) => void;
	onDelete: (resourceId: string, resourceName: string) => void;
	onUpdate?: (
		resourceId: string,
		updatedResource: Partial<Resource>,
	) => Promise<void>;
	isRemoving?: boolean;
	onEditingChange?: (isEditing: boolean) => void;
	hideAssignmentOptions?: boolean;
	isJustCreated?: boolean;
	isJustEdited?: boolean;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
	resource,
	funnel,
	context,
	allResources,
	isResourceInFunnel,
	isResourceAssignedToAnyFunnel,
	onAddToFunnel,
	onRemoveFromFunnel,
	onEdit,
	onDelete,
	onUpdate,
	isRemoving = false,
	onEditingChange,
	hideAssignmentOptions = false,
	isJustCreated = false,
	isJustEdited = false,
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isAdding, setIsAdding] = useState(false);
	const [isRemovingState, setIsRemovingState] = useState(false);
	const [isJustAdded, setIsJustAdded] = useState(false);
	const [isJustRemoved, setIsJustRemoved] = useState(false);
	const [showAddPopup, setShowAddPopup] = useState(false);
	const [showRemovePopup, setShowRemovePopup] = useState(false);
	const [editedResource, setEditedResource] =
		useState<Partial<Resource>>(resource);
	const getCategoryIcon = (category: string) => {
		switch (category) {
			case "PAID":
				return (
					<DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" strokeWidth={2.5} />
				);
			case "FREE_VALUE":
				return (
					<Gift className="w-6 h-6 text-green-600 dark:text-green-400" strokeWidth={2.5} />
				);
			default:
				return <Sparkles className="w-5 h-5" strokeWidth={2.5} />;
		}
	};

	const getTypeLabel = (type: string) => {
		switch (type) {
			case "AFFILIATE":
				return "Affiliate";
			case "MY_PRODUCTS":
				return "Owned";
			default:
				return "Product";
		}
	};

	const handleStartEdit = () => {
		setIsEditing(true);
		setEditedResource(resource);
		onEditingChange?.(true);
	};

	const handleSaveEdit = async () => {
		if (!editedResource.name?.trim() || !editedResource.link?.trim()) {
			return;
		}

		// Check if name is available (excluding current resource)
		const isNameValid = !allResources.some(
			(r) => {
				if (r.id === resource.id) return false; // Skip current resource
				// Normalize both names for comparison
				const normalizedInputName = editedResource.name?.trim().replace(/\s+/g, ' ').toLowerCase();
				const normalizedExistingName = r.name.trim().replace(/\s+/g, ' ').toLowerCase();
				return normalizedExistingName === normalizedInputName;
			}
		);

		if (!isNameValid) {
			// You could set an error state here or show a toast notification
			console.error("Product name already exists");
			return;
		}

		setIsSaving(true);
		try {
			if (onUpdate) {
				await onUpdate(resource.id, editedResource);
			}
			setIsEditing(false);
			onEditingChange?.(false);
		} catch (error) {
			console.error("Failed to update resource:", error);
		} finally {
			setIsSaving(false);
		}
	};

	const handleCancelEdit = () => {
		setIsEditing(false);
		setEditedResource(resource);
		onEditingChange?.(false);
	};

	const handleAssignToFunnel = () => {
		if (!onAddToFunnel || !funnel) return;

		// Check if we can assign this resource (not at limit)
		if (!canAssignResource(funnel, resource)) {
			return; // Silently return if limit reached
		}

		setIsAdding(true);
		try {
			onAddToFunnel(resource);
			
			// Show success animation and popup
			setIsJustAdded(true);
			setShowAddPopup(true);
			
			// Reset states after animations
			setTimeout(() => {
				setIsAdding(false);
				setIsJustAdded(false);
			}, 2000);
			
			// Hide popup after 3 seconds
			setTimeout(() => {
				setShowAddPopup(false);
			}, 3000);
		} catch (error) {
			// Silently handle errors - no user feedback
			setIsAdding(false);
		}
	};

	const handleUnassignFromFunnel = () => {
		if (!onRemoveFromFunnel || !funnel) return;

		setIsRemovingState(true);
		try {
			onRemoveFromFunnel(resource);
			
			// Show success animation and popup for removal
			setIsJustRemoved(true);
			setShowRemovePopup(true);
			
			// Reset states after animations
			setTimeout(() => {
				setIsRemovingState(false);
				setIsJustRemoved(false);
			}, 2000);
			
			// Hide popup after 3 seconds
			setTimeout(() => {
				setShowRemovePopup(false);
			}, 3000);
		} catch (error) {
			// Silently handle errors - no user feedback
			setIsRemovingState(false);
		}
	};

	if (isEditing) {
		return (
			<div className="group bg-gradient-to-br from-orange-50/80 via-orange-100/60 to-gray-200/40 dark:from-orange-900/80 dark:via-gray-800/60 dark:to-gray-900/30 p-4 rounded-xl border-2 border-orange-500/60 dark:border-orange-400/70 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
				<div className="flex items-start justify-between mb-3">
					<div className="flex items-center gap-2">
						<div className="w-5 h-5 bg-violet-400 rounded-full animate-pulse" />
						<span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300">
							{getTypeLabel(editedResource.type || "AFFILIATE")}
						</span>
						<span
							className={`px-2 py-1 rounded-full text-xs font-medium ${
								editedResource.category === "PAID"
									? "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300"
									: "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
							}`}
						>
							{editedResource.category === "PAID" ? "Paid" : "Gift"}
						</span>
					</div>
					<div className="flex items-center gap-1">
						<button
							onClick={handleSaveEdit}
							disabled={
								isSaving ||
								!editedResource.name?.trim() ||
								!editedResource.link?.trim() ||
								allResources.some((r) => {
									if (r.id === resource.id) return false;
									const normalizedInputName = editedResource.name?.trim().replace(/\s+/g, ' ').toLowerCase();
									const normalizedExistingName = r.name.trim().replace(/\s+/g, ' ').toLowerCase();
									return normalizedExistingName === normalizedInputName;
								})
							}
							className="px-3 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSaving ? "Saving..." : "Save"}
						</button>
						<button
							onClick={handleCancelEdit}
							disabled={isSaving}
							className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<X size={14} strokeWidth={2.5} />
						</button>
					</div>
				</div>

				<div className="space-y-3">
					{/* Type and Category Selectors */}
					<div className="flex gap-2">
						<select
							value={editedResource.type || "AFFILIATE"}
							onChange={(e) =>
								setEditedResource({
									...editedResource,
									type: e.target.value as "AFFILIATE" | "MY_PRODUCTS",
								})
							}
							disabled={isSaving}
							className="flex-1 px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<option value="AFFILIATE">Affiliate</option>
							<option value="MY_PRODUCTS">Owned</option>
						</select>
						<select
							value={editedResource.category || "FREE_VALUE"}
							onChange={(e) =>
								setEditedResource({
									...editedResource,
									category: e.target.value as "PAID" | "FREE_VALUE",
								})
							}
							disabled={isSaving}
							className="flex-1 px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<option value="FREE_VALUE">Gift</option>
							<option value="PAID">Paid</option>
						</select>
					</div>

					{/* Name Field */}
					<input
						type="text"
						value={editedResource.name || ""}
						onChange={(e) =>
							setEditedResource({ ...editedResource, name: e.target.value })
						}
						placeholder="Digital Asset name"
						disabled={isSaving}
						className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
							editedResource.name && 
							allResources.some((r) => {
								if (r.id === resource.id) return false;
								const normalizedInputName = editedResource.name?.trim().replace(/\s+/g, ' ').toLowerCase();
								const normalizedExistingName = r.name.trim().replace(/\s+/g, ' ').toLowerCase();
								return normalizedExistingName === normalizedInputName;
							})
								? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
								: "border-violet-300 dark:border-violet-600 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400"
						}`}
						autoFocus
					/>
					{editedResource.name && 
						allResources.some((r) => {
							if (r.id === resource.id) return false;
							const normalizedInputName = editedResource.name?.trim().replace(/\s+/g, ' ').toLowerCase();
							const normalizedExistingName = r.name.trim().replace(/\s+/g, ' ').toLowerCase();
							return normalizedExistingName === normalizedInputName;
						}) && (
						<div className="mt-1 text-xs text-red-600 dark:text-red-400">
							This name is already taken. Please choose a different one.
						</div>
					)}

					{/* URL Field */}
					<input
						type="url"
						value={editedResource.link || ""}
						onChange={(e) =>
							setEditedResource({ ...editedResource, link: e.target.value })
						}
						placeholder="Digital asset URL"
						disabled={isSaving}
						className="w-full px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					/>

					{/* Promo Code Field */}
					<input
						type="text"
						value={editedResource.promoCode || ""}
						onChange={(e) =>
							setEditedResource({
								...editedResource,
								promoCode: e.target.value,
							})
						}
						placeholder="Promo code (optional)..."
						disabled={isSaving}
						className="w-full px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					/>
				</div>
			</div>
		);
	}

	return (
		<div className={`group relative bg-gradient-to-br from-orange-50/80 via-orange-100/60 to-gray-200/40 dark:from-orange-900/80 dark:via-gray-800/60 dark:to-gray-900/30 p-4 rounded-xl border transition-all duration-300 ${
			isJustAdded 
				? "border-green-500/80 dark:border-green-400/80 shadow-lg shadow-green-500/20 dark:shadow-green-400/20 animate-pulse bg-gradient-to-br from-green-50/90 via-green-100/70 to-green-200/50 dark:from-green-900/90 dark:via-green-800/70 dark:to-green-900/40" 
				: isJustRemoved
				? "border-red-500/80 dark:border-red-400/80 shadow-lg shadow-red-500/20 dark:shadow-red-400/20 animate-pulse bg-gradient-to-br from-red-50/90 via-red-100/70 to-red-200/50 dark:from-red-900/90 dark:via-red-800/70 dark:to-red-900/40"
				: isJustCreated
				? "border-green-500/80 dark:border-green-400/80 shadow-lg shadow-green-500/20 dark:shadow-green-400/20 animate-pulse bg-gradient-to-br from-green-50/90 via-green-100/70 to-green-200/50 dark:from-green-900/90 dark:via-green-800/70 dark:to-green-900/40"
				: isJustEdited
				? "border-green-500/80 dark:border-green-400/80 shadow-lg shadow-green-500/20 dark:shadow-green-400/20 animate-pulse bg-gradient-to-br from-green-50/90 via-green-100/70 to-green-200/50 dark:from-green-900/90 dark:via-green-800/70 dark:to-green-900/40"
				: "border-border/50 dark:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10"
		}`}>
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-2">
					{getCategoryIcon(resource.category)}
					<span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300">
						{getTypeLabel(resource.type)}
					</span>
					<span
						className={`px-2 py-1 rounded-full text-xs font-medium ${
							resource.category === "PAID"
								? "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300"
								: "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
						}`}
					>
						{resource.category === "PAID" ? "Paid" : "Gift"}
					</span>
				</div>
				<div className="flex items-center gap-1">
					{isRemoving ? (
						<span className="inline-flex items-center px-3 py-2 rounded-full text-xs font-medium bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/60 text-red-800 dark:text-red-200 border-2 border-red-300 dark:border-red-600 shadow-sm">
							<div className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full mr-2 animate-pulse" />
							<span className="hidden sm:inline font-semibold">Removing</span>
							<span className="sm:hidden">●</span>
						</span>
					) : (
						<>
							{context === "funnel" && !hideAssignmentOptions &&
								(isResourceInFunnel(resource.id) ? (
									<Button
										size="1"
										color={isJustRemoved ? "red" : "red"}
										onClick={handleUnassignFromFunnel}
										disabled={isRemovingState}
										className={`px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ${
											isJustRemoved ? "animate-pulse shadow-lg shadow-red-500/30" : ""
										}`}
									>
										{isJustRemoved ? (
											<CheckCircle size={12} strokeWidth={2.5} className="mr-1 animate-bounce" />
										) : (
											<X size={12} strokeWidth={2.5} className="mr-1" />
										)}
										{isJustRemoved ? "Removed!" : (isRemovingState ? "Removing..." : "Remove")}
									</Button>
								) : funnel && !canAssignResource(funnel, resource) ? (
									<div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700">
										<span className="font-bold">MAX</span>
									</div>
								) : (
									<Button
										size="1"
										color={isJustAdded ? "green" : (resource.category === "PAID" ? "orange" : "green")}
										onClick={handleAssignToFunnel}
										disabled={isAdding}
										className={`px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ${
											isJustAdded ? "animate-pulse shadow-lg shadow-green-500/30" : ""
										}`}
									>
										{isJustAdded ? (
											<CheckCircle size={12} strokeWidth={2.5} className="mr-1 animate-bounce" />
										) : (
											<Plus size={12} strokeWidth={2.5} className="mr-1" />
										)}
										{isJustAdded ? "Added!" : (isAdding ? "Adding..." : "Add")}
									</Button>
								))}

							{context === "global" &&
								!isResourceAssignedToAnyFunnel(resource.id) &&
								(isSaving ? (
									<span className="inline-flex items-center px-3 py-2 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 text-blue-800 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-600 shadow-sm">
										<div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-2 animate-pulse" />
										<span className="hidden sm:inline font-semibold">
											Saving
										</span>
										<span className="sm:hidden">●</span>
									</span>
								) : (
									<Button
										size="1"
										color="violet"
										onClick={handleStartEdit}
										className="px-2 py-1 text-xs"
									>
										<PenLine size={12} strokeWidth={2.5} className="mr-1" />
										Edit
									</Button>
								))}

							{/* Delete Button - Only show when resource is not assigned to any funnel, not currently adding/removing, and not in funnel context */}
							{!isResourceAssignedToAnyFunnel(resource.id) && !isAdding && !isRemovingState && context === "global" && (
								<Button
									size="1"
									variant="ghost"
									color="red"
									onClick={() => onDelete(resource.id, resource.name)}
									className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors"
									aria-label="Delete product"
								>
									<Trash2 size={14} strokeWidth={2.5} />
								</Button>
							)}
						</>
					)}
				</div>
			</div>

			<div className="space-y-2">
				<Text
					size="3"
					weight="semi-bold"
					className="text-foreground line-clamp-2"
				>
					{resource.name}
				</Text>
				<Text
					size="2"
					color="gray"
					className="text-muted-foreground line-clamp-1"
				>
					{resource.link}
				</Text>
				{resource.promoCode && (
					<div className="flex items-center gap-2">
						<Text size="1" color="gray" className="text-muted-foreground">
							Promo:
						</Text>
						<span className="px-2 py-1 rounded text-xs font-mono bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
							{resource.promoCode}
						</span>
					</div>
				)}
			</div>

			{/* Success Notification Popup - Top Right Corner - Portal to Body */}
			{showAddPopup && createPortal(
				<div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right-4 fade-in duration-300" style={{ zIndex: 99999 }}>
					<div className="flex items-center gap-3 px-4 py-3 bg-green-500 text-white text-sm font-medium rounded-lg shadow-2xl border border-green-600 backdrop-blur-sm">
						<CheckCircle size={18} className="animate-bounce text-green-100" />
						<div className="flex flex-col">
							<span className="font-semibold">Added to Market Stall!</span>
							<span className="text-xs text-green-100">{resource.name}</span>
						</div>
						<div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
					</div>
				</div>,
				document.body
			)}

			{/* Remove Notification Popup - Top Right Corner - Portal to Body */}
			{showRemovePopup && createPortal(
				<div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right-4 fade-in duration-300" style={{ zIndex: 99999 }}>
					<div className="flex items-center gap-3 px-4 py-3 bg-red-500 text-white text-sm font-medium rounded-lg shadow-2xl border border-red-600 backdrop-blur-sm">
						<X size={18} className="animate-bounce text-red-100" />
						<div className="flex flex-col">
							<span className="font-semibold">Removed from Market Stall!</span>
							<span className="text-xs text-red-100">{resource.name}</span>
						</div>
						<div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
					</div>
				</div>,
				document.body
			)}
		</div>
	);
};
