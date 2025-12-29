import { Button, Text, Switch } from "frosted-ui";
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
	Link2,
	FileText,
} from "lucide-react";
import type React from "react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { canAssignResource } from "../../helpers/product-limits";
import type { Funnel, Resource } from "../../types/resource";
import { WHOP_ICON_URL } from "../../constants/whop-icon";

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
	isHighlighted?: boolean;
	isBeingEdited?: boolean;
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
	isHighlighted = false,
	isBeingEdited = false,
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


	const handleStartEdit = () => {
		// For both global and funnel contexts, use the edit form above the grid (same as Market Stall)
		if (onEdit) {
			onEdit(resource);
			return;
		}
		
		// Fallback to inline editing if onEdit is not provided
		setIsEditing(true);
		// Infer type from fields if not present
		const inferredType = resource.storageUrl && !resource.link ? "FILE" : "LINK";
		setEditedResource({ ...resource, type: resource.type || inferredType });
		onEditingChange?.(true);
	};

	const handleSaveEdit = async () => {
		// Validate required fields based on type and category
		if (!editedResource.name?.trim()) {
			return;
		}
		
		// Image is now required for all products
		if (!editedResource.image?.trim()) {
			return;
		}
		
		// Price is required only for paid products
		if (editedResource.category === "PAID" && !editedResource.price?.trim()) {
			return;
		}
		
		// Validate price range for paid products
		// For resources with whopProductId, skip $5 minimum (price comes from Whop plans)
		if (editedResource.category === "PAID" && editedResource.price) {
			const price = parseFloat(editedResource.price);
			const minPrice = editedResource.whopProductId ? 0 : 5;
			if (price < minPrice || price > 50000) {
				return;
			}
		}
		
		// For LINK type, link is required
		if (editedResource.type === "LINK" && !editedResource.link?.trim()) {
			return;
		}
		
		// For FILE type (not Whop products), storageUrl is required
		if (editedResource.type === "FILE" && !editedResource.whopProductId && !editedResource.storageUrl?.trim()) {
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
								// Only require link for LINK type (not for WHOP or FILE)
								(editedResource.type === "LINK" && !editedResource.link?.trim()) ||
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
							value={editedResource.type || "LINK"}
							onChange={(e) => {
								const newType = e.target.value as "LINK" | "FILE" | "WHOP";
								setEditedResource({
									...editedResource,
									type: newType,
									// Clear opposite field when switching types
									...(newType === "LINK" ? { storageUrl: "" } : { link: "" }),
								});
							}}
							disabled={isSaving || editedResource.type === "WHOP"}
							className="flex-1 px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<option value="LINK">Link</option>
							<option value="FILE">File</option>
							{editedResource.type !== "WHOP" && <option value="WHOP">Whop</option>}
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

					{/* URL Field - Show for LINK type only (not for WHOP type) */}
					{editedResource.type === "LINK" && (
						<input
							type="url"
							value={editedResource.link || ""}
							onChange={(e) =>
								setEditedResource({ ...editedResource, link: e.target.value })
							}
							placeholder={editedResource.link && (editedResource.link.includes('app=') || editedResource.link.includes('ref=')) ? "Affiliate URL" : "Product link"}
							disabled={isSaving}
							className="w-full px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						/>
					)}

					{/* Price Field - Only for Paid products */}
					{editedResource.category === "PAID" && (
						<div className="space-y-1">
							<input
								type="text"
								value={editedResource.price || ""}
								onChange={(e) =>
									setEditedResource({ ...editedResource, price: e.target.value })
								}
								placeholder="$0.00"
								disabled={isSaving}
								className="w-full px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
							/>
							{(() => {
								const price = parseFloat(editedResource.price || "0");
								// For resources with whopProductId, skip $5 minimum (price comes from Whop plans)
								const minPrice = editedResource.whopProductId ? 0 : 5;
								const isValidPrice = price >= minPrice && price <= 50000;
								const hasPrice = editedResource.price && editedResource.price.trim() !== "";
								
								if (hasPrice && !isValidPrice) {
									return (
										<p className="text-xs text-red-600 dark:text-red-400">
											{editedResource.whopProductId 
												? "Price must be between $0 and $50,000"
												: "Price must be between $5 and $50,000"}
										</p>
									);
								}
								
								return (
									<p className="text-xs text-gray-500 dark:text-gray-400">
										*Only whop fees will be deducted
									</p>
								);
							})()}
						</div>
					)}

					{/* Description Field */}
					<textarea
						value={editedResource.description || ""}
						onChange={(e) =>
							setEditedResource({ ...editedResource, description: e.target.value })
						}
						placeholder="Product description (optional)..."
						disabled={isSaving}
						rows={3}
						className="w-full px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
					/>

					{/* Image Upload Field */}
					<div className="space-y-2">
						<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Product Image
						</label>
						<div className="border-2 border-dashed border-violet-300 dark:border-violet-600 rounded-lg p-4 text-center">
							<div className="space-y-2">
								<img
									src={editedResource.image || 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp'}
									alt="Product preview"
									className="w-20 h-20 object-cover rounded-lg mx-auto"
								/>
								{editedResource.image && (
									<button
										onClick={() => setEditedResource({ ...editedResource, image: undefined })}
										className="text-xs text-red-600 hover:text-red-800"
									>
										Remove Image
									</button>
								)}
							</div>
						</div>
					</div>

					{/* Digital Asset Upload Field - Show for FILE type (not Whop products) */}
					{editedResource.type === "FILE" && !editedResource.whopProductId && (
						<div className="space-y-2">
							<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
								Digital Asset
							</label>
							<div className="border-2 border-dashed border-violet-300 dark:border-violet-600 rounded-lg p-4 text-center">
								{editedResource.storageUrl ? (
									<div className="space-y-2">
										<CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
										<span className="text-sm text-green-600 dark:text-green-400">
											{editedResource.storageUrl.split('/').pop() || 'File uploaded'}
										</span>
										<button
											onClick={() => setEditedResource({ ...editedResource, storageUrl: undefined })}
											className="text-xs text-red-600 hover:text-red-800"
										>
											Remove Asset
										</button>
									</div>
								) : (
									<div className="text-sm text-gray-500 dark:text-gray-400">
										<span className="font-medium">No digital asset uploaded</span>
										<br />
										<span className="text-xs">Upload a file to continue</span>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Promo Code Field - Only for Paid products */}
					{editedResource.category === "PAID" && (
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
					)}
				</div>
			</div>
		);
	}

	return (
		<div 
			onClick={handleStartEdit}
			className={`group relative bg-gradient-to-br from-orange-50/80 via-orange-100/60 to-gray-200/40 dark:from-orange-900/80 dark:via-gray-800/60 dark:to-gray-900/30 rounded-xl border transition-all duration-300 overflow-hidden cursor-pointer ${
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
			{/* Top Half: Image with Overlay Icons */}
			<div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
				{/* Background Image */}
				<div 
					className="absolute inset-0 bg-cover bg-center bg-no-repeat"
					style={{
						backgroundImage: `url(${resource.image || 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp'})`,
					}}
				/>
				
					{/* Overlay with Icons and Badges */}
				<div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
				<div className="absolute top-2 left-2 flex items-center gap-1">
					{getCategoryIcon(resource.category)}
					{resource.type && getTypeIcon(resource.type)}
				</div>
				
				{/* Action Button in Top Right */}
				<div className="absolute top-2 right-2 flex items-center gap-1">
					{isRemoving ? (
						<span className="inline-flex items-center px-3 py-2 rounded-full text-xs font-medium bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/60 text-red-800 dark:text-red-200 border-2 border-red-300 dark:border-red-600 shadow-sm backdrop-blur-sm">
							<div className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full mr-2 animate-pulse" />
							<span className="hidden sm:inline font-semibold">Removing</span>
							<span className="sm:hidden">●</span>
						</span>
					) : (
						<>
							{/* Funnel context Switch - Replace Add/Remove buttons */}
							{context === "funnel" && !hideAssignmentOptions && !isBeingEdited && (
								<div
									onClick={(e) => e.stopPropagation()}
									className="cursor-pointer"
								>
									<Switch
										color="violet"
										checked={isResourceInFunnel(resource.id)}
										size="2"
										onCheckedChange={(checked) => {
											if (checked) {
												handleAssignToFunnel();
											} else {
												handleUnassignFromFunnel();
											}
										}}
										disabled={isAdding || isRemovingState || (funnel && !canAssignResource(funnel, resource) && !isResourceInFunnel(resource.id))}
									/>
								</div>
							)}

							{/* Delete Button - Show for both global and funnel contexts when not being edited and not WHOP type */}
							{!isBeingEdited && resource.type !== "WHOP" && (
								<Button
									size="1"
									variant="ghost"
									color="red"
									onClick={(e) => {
										e.stopPropagation();
										onDelete(resource.id, resource.name);
									}}
									className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors backdrop-blur-sm"
									aria-label="Delete product"
								>
									<Trash2 size={14} strokeWidth={2.5} />
								</Button>
							)}
						</>
					)}
				</div>
			</div>
			
			{/* Bottom Half: Name and Description */}
			<div className="p-4 space-y-2">
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
					className="text-muted-foreground line-clamp-2"
				>
					{resource.type === "WHOP" 
						? (resource.description || "no description")
						: (resource.description || resource.link)
					}
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
					<div className="flex items-center gap-3 px-4 py-3 bg-green-500 text-white text-sm font-medium rounded-lg shadow-2xl border border-green-600 backdrop-blur-sm">
						<X size={18} className="animate-bounce text-green-100" />
						<div className="flex flex-col">
							<span className="font-semibold">Removed from Market Stall!</span>
							<span className="text-xs text-green-100">{resource.name}</span>
						</div>
						<div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
					</div>
				</div>,
				document.body
			)}
		</div>
	);
};
