"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Text, Heading } from "frosted-ui";
import { X, Gift, MessageSquare, Search } from "lucide-react";
import type { FunnelProductFaq, FunnelProductFaqInput } from "@/lib/types/funnel";

interface Resource {
	id: string;
	name: string;
}

type CategoryFilter = "Handout" | "AI Chat";

interface ChatConfigPanelProps {
	isOpen: boolean;
	funnelId: string;
	handoutKeyword?: string;
	handoutAdminNotification?: string;
	handoutUserMessage?: string;
	productFaqs?: FunnelProductFaq[];
	resources?: Resource[];
	experienceId?: string;
	onHandoutChange: (keyword: string, adminNotification?: string, userMessage?: string) => void;
	onProductFaqChange: (faq: FunnelProductFaqInput) => void;
	onClose: () => void;
}

/**
 * ChatConfigPanel Component
 * 
 * Right-side panel for configuring handout and product AI chat settings in PreviewChat.
 * Matches ConfigPanel design with category tabs and list-style interface.
 */
const ChatConfigPanel: React.FC<ChatConfigPanelProps> = ({
	isOpen,
	funnelId,
	handoutKeyword = "handout",
	handoutAdminNotification = "",
	handoutUserMessage = "",
	productFaqs = [],
	resources = [],
	experienceId,
	onHandoutChange,
	onProductFaqChange,
	onClose,
}) => {
	const [localHandoutKeyword, setLocalHandoutKeyword] = useState(handoutKeyword);
	const [localHandoutAdminNotification, setLocalHandoutAdminNotification] = useState(handoutAdminNotification);
	const [localHandoutUserMessage, setLocalHandoutUserMessage] = useState(handoutUserMessage);
	const [selectedResourceId, setSelectedResourceId] = useState<string>("");
	const [localProductFaqs, setLocalProductFaqs] = useState<FunnelProductFaq[]>(productFaqs);
	const [hasUnsavedHandout, setHasUnsavedHandout] = useState(false);
	const [funnelResources, setFunnelResources] = useState<Resource[]>(resources);
	const [loadingResources, setLoadingResources] = useState(false);
	const [activeCategory, setActiveCategory] = useState<CategoryFilter>("Handout");
	const [searchQuery, setSearchQuery] = useState("");

	// Sync local state when props change
	useEffect(() => {
		setLocalHandoutKeyword(handoutKeyword);
		setLocalHandoutAdminNotification(handoutAdminNotification || "");
		setLocalHandoutUserMessage(handoutUserMessage || "");
		setLocalProductFaqs(productFaqs);
		setHasUnsavedHandout(false);
		setFunnelResources(resources);
	}, [handoutKeyword, handoutAdminNotification, handoutUserMessage, productFaqs, resources]);

	// Fetch product FAQs when panel opens
	useEffect(() => {
		if (isOpen && funnelId && experienceId) {
			fetch(`/api/funnels/${funnelId}/product-faqs`)
				.then((res) => res.json())
				.then((data) => {
					if (data.success && data.data) {
						setLocalProductFaqs(data.data);
					}
				})
				.catch((err) => console.error("Error fetching product FAQs:", err));
		}
	}, [isOpen, funnelId, experienceId]);

	const handleHandoutKeywordChange = (value: string) => {
		setLocalHandoutKeyword(value);
		setHasUnsavedHandout(
			value !== handoutKeyword ||
			localHandoutAdminNotification !== (handoutAdminNotification || "") ||
			localHandoutUserMessage !== (handoutUserMessage || "")
		);
	};

	const handleHandoutAdminChange = (value: string) => {
		setLocalHandoutAdminNotification(value);
		setHasUnsavedHandout(
			localHandoutKeyword !== handoutKeyword ||
			value !== (handoutAdminNotification || "") ||
			localHandoutUserMessage !== (handoutUserMessage || "")
		);
	};

	const handleHandoutUserChange = (value: string) => {
		setLocalHandoutUserMessage(value);
		setHasUnsavedHandout(
			localHandoutKeyword !== handoutKeyword ||
			localHandoutAdminNotification !== (handoutAdminNotification || "") ||
			value !== (handoutUserMessage || "")
		);
	};

	const handleSaveHandout = () => {
		onHandoutChange(
			localHandoutKeyword,
			localHandoutAdminNotification || undefined,
			localHandoutUserMessage || undefined
		);
		setHasUnsavedHandout(false);
	};

	// Update local product FAQs when save happens
	const handleProductFaqSave = (resourceId: string, faqContent?: string, objectionHandling?: string) => {
		onProductFaqChange({
			funnelId,
			resourceId,
			faqContent,
			objectionHandling,
		});
		// Update local state optimistically
		const existingIndex = localProductFaqs.findIndex((f) => f.resourceId === resourceId);
		if (existingIndex >= 0) {
			setLocalProductFaqs(
				localProductFaqs.map((f, i) =>
					i === existingIndex
						? {
								...f,
								faqContent,
								objectionHandling,
								updatedAt: new Date(),
						  }
						: f
				)
			);
		} else {
			setLocalProductFaqs([
				...localProductFaqs,
				{
					id: `temp-${Date.now()}`,
					funnelId,
					resourceId,
					faqContent,
					objectionHandling,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);
		}
	};

	// Filter resources by search query
	const filteredResources = useMemo(() => {
		if (activeCategory !== "AI Chat") return [];
		if (!searchQuery) return funnelResources;
		return funnelResources.filter((resource) =>
			resource.name.toLowerCase().includes(searchQuery.toLowerCase())
		);
	}, [funnelResources, searchQuery, activeCategory]);

	if (!isOpen) return null;

	return (
		<div 
			className="fixed right-0 top-0 h-screen w-[400px] bg-white dark:bg-gray-900 border-l border-gray-300 dark:border-gray-600 flex flex-col overflow-hidden z-30"
		>
			{/* Header */}
			<div className="flex flex-col px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center justify-between mb-1">
					<Heading size="3" weight="medium" className="text-[15px]">
						Configuration
					</Heading>
					<div className="flex items-center gap-2">
						{hasUnsavedHandout && (
							<button
								onClick={handleSaveHandout}
								className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
							>
								Save
							</button>
						)}
						<button
							onClick={onClose}
							className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						>
							<X className="w-4 h-4 text-gray-500" />
						</button>
					</div>
				</div>
				<Text size="2" className="text-gray-500 dark:text-gray-400 mb-4">
					Configure handout and AI chat settings
				</Text>

				{/* Search Input - Only show in AI Chat tab */}
				{activeCategory === "AI Chat" && (
					<div className="relative">
						<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
							<Search className="w-4 h-4" />
						</div>
						<input
							type="text"
							placeholder="Search products..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-gray-400"
						/>
					</div>
				)}
			</div>

			{/* Category Tabs */}
			<div className="flex items-center overflow-x-auto border-b border-gray-200 dark:border-gray-700 px-4 gap-4 hide-scrollbars">
				{(["Handout", "AI Chat"] as CategoryFilter[]).map((category) => (
					<button
						key={category}
						onClick={() => setActiveCategory(category)}
						className="flex flex-col pt-3 gap-[9.5px] cursor-pointer"
						type="button"
					>
						<Text
							size="2"
							weight="medium"
							className={`text-center ${
								activeCategory === category
									? "text-blue-600 dark:text-blue-400"
									: "text-gray-500 dark:text-gray-400"
							}`}
						>
							{category}
						</Text>
						<div
							className={`h-[2.5px] rounded-t-full ${
								activeCategory === category
									? "bg-blue-600 dark:bg-blue-400"
									: "bg-transparent"
							}`}
							style={{ width: "100%" }}
						/>
					</button>
				))}
			</div>

			{/* Content */}
			<div className="flex flex-col flex-1 pt-2.5 overflow-y-auto">
				{activeCategory === "Handout" && (
					<div className="px-4 py-4">
						<div className="space-y-3">
							<div>
								<Text size="1" className="text-gray-600 dark:text-gray-400 mb-1 block">
									Keyword
								</Text>
								<input
									type="text"
									value={localHandoutKeyword}
									onChange={(e) => handleHandoutKeywordChange(e.target.value)}
									className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
									placeholder="handout"
								/>
							</div>

							<div>
								<Text size="1" className="text-gray-600 dark:text-gray-400 mb-1 block">
									Admin Notification
								</Text>
								<textarea
									value={localHandoutAdminNotification}
									onChange={(e) => handleHandoutAdminChange(e.target.value)}
									rows={3}
									className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
									placeholder="Message admin receives when handout is triggered"
								/>
							</div>

							<div>
								<Text size="1" className="text-gray-600 dark:text-gray-400 mb-1 block">
									User Message
								</Text>
								<textarea
									value={localHandoutUserMessage}
									onChange={(e) => handleHandoutUserChange(e.target.value)}
									rows={3}
									className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
									placeholder="AI message sent to user when handout occurs"
								/>
							</div>

							{hasUnsavedHandout && (
								<button
									onClick={handleSaveHandout}
									className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
								>
									Save Handout
								</button>
							)}
						</div>
					</div>
				)}

				{activeCategory === "AI Chat" && (
					<>
						{funnelResources.length === 0 ? (
							<div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
								<Text size="2">No products assigned to this funnel</Text>
							</div>
						) : (
							filteredResources.map((resource) => (
								<ResourceItem
									key={resource.id}
									resource={resource}
									isSelected={selectedResourceId === resource.id}
									onSelect={() => setSelectedResourceId(resource.id)}
									faq={localProductFaqs.find((f) => f.resourceId === resource.id)}
									onSave={(faqContent, objectionHandling) =>
										handleProductFaqSave(resource.id, faqContent, objectionHandling)
									}
								/>
							))
						)}
						{filteredResources.length === 0 && searchQuery && (
							<div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
								<Text size="2">No products found</Text>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
};

interface ResourceItemProps {
	resource: Resource;
	isSelected: boolean;
	onSelect: () => void;
	faq?: FunnelProductFaq;
	onSave: (faqContent?: string, objectionHandling?: string) => void;
}

const ResourceItem: React.FC<ResourceItemProps> = ({
	resource,
	isSelected,
	onSelect,
	faq,
	onSave,
}) => {
	return (
		<div className={`${isSelected ? "bg-gray-100 dark:bg-gray-800" : ""}`}>
			{/* Main resource row */}
			<button
				type="button"
				onClick={onSelect}
				className={`
					hover:bg-gray-100 dark:hover:bg-gray-800 text-start cursor-pointer 
					flex items-center gap-3 py-2.5 px-4 transition-colors w-full
				`}
			>
				{/* Icon Container */}
				<div
					className={`
						w-[39px] h-[39px] border rounded-[10px] flex p-[1px] flex-shrink-0
						border-blue-200 dark:border-blue-700/50
					`}
				>
					<div
						className={`
							w-full h-full rounded-[8px] flex items-center justify-center
							bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-400
						`}
					>
						<MessageSquare className="w-5 h-5" />
					</div>
				</div>

				{/* Content */}
				<div className="flex flex-col min-w-0 mr-auto">
					<Text size="2" weight="medium" className="text-gray-900 dark:text-white">
						{resource.name}
					</Text>
					<Text size="2" className="text-gray-500 dark:text-gray-400 truncate text-[13px]">
						Configure AI chat
					</Text>
				</div>
			</button>

			{/* FAQ Editor when selected */}
			{isSelected && (
				<div className="px-4 pb-3 pt-1" onClick={(e) => e.stopPropagation()}>
					<ProductFaqEditor
						resourceName={resource.name}
						faq={faq}
						onSave={onSave}
					/>
				</div>
			)}
		</div>
	);
};

interface ProductFaqEditorProps {
	resourceName: string;
	faq?: FunnelProductFaq;
	onSave: (faqContent?: string, objectionHandling?: string) => void;
}

const ProductFaqEditor: React.FC<ProductFaqEditorProps> = ({ resourceName, faq, onSave }) => {
	const [localFaqContent, setLocalFaqContent] = useState(faq?.faqContent || "");
	const [localObjectionHandling, setLocalObjectionHandling] = useState(faq?.objectionHandling || "");
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	useEffect(() => {
		setLocalFaqContent(faq?.faqContent || "");
		setLocalObjectionHandling(faq?.objectionHandling || "");
		setHasUnsavedChanges(false);
	}, [faq]);

	const handleFaqContentChange = (value: string) => {
		setLocalFaqContent(value);
		setHasUnsavedChanges(
			value !== (faq?.faqContent || "") ||
			localObjectionHandling !== (faq?.objectionHandling || "")
		);
	};

	const handleObjectionHandlingChange = (value: string) => {
		setLocalObjectionHandling(value);
		setHasUnsavedChanges(
			localFaqContent !== (faq?.faqContent || "") ||
			value !== (faq?.objectionHandling || "")
		);
	};

	const handleSave = () => {
		onSave(localFaqContent || undefined, localObjectionHandling || undefined);
		setHasUnsavedChanges(false);
	};

	return (
		<div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-3">
			<div>
				<Text size="1" className="text-gray-600 dark:text-gray-400 mb-2 block">
					FAQ Content
				</Text>
				<textarea
					value={localFaqContent}
					onChange={(e) => handleFaqContentChange(e.target.value)}
					rows={4}
					className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
					placeholder="FAQ text or document content"
				/>
			</div>

			<div>
				<Text size="1" className="text-gray-600 dark:text-gray-400 mb-2 block">
					Objection Handling
				</Text>
				<textarea
					value={localObjectionHandling}
					onChange={(e) => handleObjectionHandlingChange(e.target.value)}
					rows={4}
					className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
					placeholder="Objection handling guidelines"
				/>
			</div>

			{hasUnsavedChanges && (
				<button
					onClick={handleSave}
					className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
				>
					Save Product Config
				</button>
			)}
		</div>
	);
};

export default ChatConfigPanel;
