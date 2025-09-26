"use client";

import { MessageSquare, Play, RotateCcw, Settings, ChevronDown, ChevronUp, Package, TestTube } from "lucide-react";
import type React from "react";
import { useState, useEffect } from "react";
import { ProductSelectionModal } from "@/lib/components/admin/ProductSelectionModal";
import { WebhookTester } from "./WebhookTester";
import { CreditPackTester } from "./CreditPackTester";

interface DiscoveryProduct {
	id: string;           // accessPass.id
	title: string;        // Product name
	description?: string;
	price: number;
	currency: string;
	isFree: boolean;
	route: string;
	discoveryPageUrl?: string;
}

interface AdminNavbarProps {
	conversationId: string | null;
	stageInfo: {
		currentStage: string;
		isDMFunnelActive: boolean;
		isTransitionStage: boolean;
		isExperienceQualificationStage: boolean;
	} | null;
	adminLoading: boolean;
	adminError: string | null;
	adminSuccess: string | null;
	onCheckStatus: () => void;
	onTriggerDM: (productId?: string) => void;
	onResetConversations: () => void;
	experienceId?: string;
	funnelFlow?: any;
	user_id?: string;
	company_id?: string;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
	conversationId,
	stageInfo,
	adminLoading,
	adminError,
	adminSuccess,
	onCheckStatus,
	onTriggerDM,
	onResetConversations,
	experienceId,
	funnelFlow,
	user_id,
	company_id,
}) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isProductSelectionOpen, setIsProductSelectionOpen] = useState(false);
	const [discoveryProducts, setDiscoveryProducts] = useState<DiscoveryProduct[]>([]);
	const [productsLoading, setProductsLoading] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<DiscoveryProduct | null>(null);

	// Fetch discovery products
	const fetchDiscoveryProducts = async () => {
		if (!experienceId) return;
		setProductsLoading(true);
		try {
			const response = await fetch(`/api/products/discovery?experienceId=${experienceId}`);
			if (response.ok) {
				const data = await response.json();
				setDiscoveryProducts(data.data || []);
			}
		} catch (error) {
			console.error("Error fetching discovery products:", error);
		} finally {
			setProductsLoading(false);
		}
	};

	// Handle product selection
	const handleProductSelect = (product: DiscoveryProduct) => {
		setSelectedProduct(product);
		onTriggerDM(product.id);
	};

	// Handle DM trigger with product selection
	const handleTriggerDM = () => {
		if (discoveryProducts.length > 0) {
			setIsProductSelectionOpen(true);
			if (discoveryProducts.length === 0) {
				fetchDiscoveryProducts();
			}
		} else {
			// No products available, trigger DM without product
			onTriggerDM();
		}
	};

	// Load products on mount only when needed (not for regular UserChat)
	useEffect(() => {
		// Only fetch products when explicitly needed, not on every mount
		// This prevents unnecessary API calls when just viewing UserChat
	}, [experienceId]);

	return (
		<div className="bg-black/80 backdrop-blur-sm border-b border-white/10">
			{/* Compact Header */}
			<div className="flex items-center justify-between px-4 py-2">
				<div className="flex items-center gap-2">
					<Settings size={16} className="text-white" />
					<span className="text-white text-sm font-medium">Admin</span>
					<div className={`w-2 h-2 rounded-full ${conversationId ? 'bg-green-400' : 'bg-gray-400'}`}></div>
					<span className="text-white/70 text-xs">
						{conversationId ? 'Active' : 'No Chat'}
					</span>
				</div>

				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="p-1 text-white/70 hover:text-white transition-colors"
				>
					{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</button>
			</div>

			{/* Compact Controls */}
			{isExpanded && (
				<div className="px-4 pb-2 space-y-2">
					{/* Status */}
					{stageInfo && (
						<div className="text-xs text-white/70">
							Stage: <span className="text-white">{stageInfo.currentStage}</span>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex gap-2">
						<button
							onClick={onCheckStatus}
							disabled={adminLoading}
							className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs rounded transition-colors"
						>
							<MessageSquare size={12} />
							Refresh
						</button>
						
						<button
							onClick={handleTriggerDM}
							disabled={adminLoading || !!conversationId}
							className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 text-blue-300 text-xs rounded transition-colors"
						>
							<Package size={12} />
							DM
						</button>
						
						<button
							onClick={onResetConversations}
							disabled={adminLoading}
							className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-300 text-xs rounded transition-colors"
						>
							<RotateCcw size={12} />
							Reset
						</button>
					</div>

					{/* Webhook Tester */}
					{funnelFlow && (
						<div className="mt-2">
							<WebhookTester
								conversationId={conversationId || ''}
								experienceId={experienceId || ''}
								funnelFlow={funnelFlow}
								onTestComplete={(result) => {
									console.log('Webhook test completed:', result);
								}}
							/>
						</div>
					)}

					{/* Credit Pack Tester */}
					{user_id && company_id && experienceId && (
						<div className="mt-2">
							<CreditPackTester
								user_id={user_id}
								company_id={company_id}
								experienceId={experienceId}
								onTestComplete={(result: any) => {
									console.log('Credit pack test completed:', result);
								}}
							/>
						</div>
					)}

					{/* Selected Product */}
					{selectedProduct && (
						<div className="text-xs text-blue-300 bg-blue-500/10 px-2 py-1 rounded">
							Product: {selectedProduct.title}
						</div>
					)}

					{/* Messages */}
					{adminError && (
						<div className="text-xs text-red-300 bg-red-500/10 px-2 py-1 rounded">
							{adminError}
						</div>
					)}
					{adminSuccess && (
						<div className="text-xs text-green-300 bg-green-500/10 px-2 py-1 rounded">
							{adminSuccess}
						</div>
					)}
				</div>
			)}

			{/* Product Selection Modal */}
			<ProductSelectionModal
				isOpen={isProductSelectionOpen}
				products={discoveryProducts}
				onClose={() => setIsProductSelectionOpen(false)}
				onProductSelect={handleProductSelect}
				loading={productsLoading}
			/>
		</div>
	);
};
