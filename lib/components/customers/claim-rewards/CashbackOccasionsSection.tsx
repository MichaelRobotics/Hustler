"use client";

import React from "react";
import { Text, Heading } from "frosted-ui";
import { Download } from "lucide-react";
import { WHOP_ICON_URL } from "@/lib/constants/whop-icon";

export interface CashbackProduct {
	id: string;
	name: string;
	image?: string;
	description?: string;
	cashbackPrice: number;
}

interface CashbackProductCardProps {
	product: CashbackProduct;
}

function CashbackProductCard({ product }: CashbackProductCardProps) {
	return (
		<div
			className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700"
			data-plan-id={product.id}
		>
			<button
				type="button"
				className="absolute top-3 right-3 z-10 inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium shadow-lg"
			>
				<Download className="w-4 h-4" strokeWidth={2.5} />
				Redeem
			</button>

			{/* Image section - always present like product cards (placeholder when no image) */}
			<div className="w-full h-48 overflow-hidden bg-gray-100 dark:bg-gray-900 -mt-1">
				{product.image ? (
					<img
						src={product.image}
						alt={product.name}
						className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
						onError={(e) => {
							const target = e.target as HTMLImageElement;
							target.style.display = "none";
						}}
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center">
						<Text size="2" className="text-gray-500 dark:text-gray-400">
							No image
						</Text>
					</div>
				)}
			</div>

			{/* Content section - same structure as CustomerResourceCard (icon + name, then description) */}
			<div className="p-4">
				<div className="flex items-start gap-3 mb-2">
					<div className="flex-shrink-0 mt-1">
						<img alt="Whop" className="w-5 h-5 object-contain" src={WHOP_ICON_URL} />
					</div>
					<div className="flex-1 min-w-0">
						<Heading size="4" weight="bold" className="text-gray-900 dark:text-white line-clamp-2">
							{product.name}
						</Heading>
					</div>
				</div>
				{/* Description - only show if name exists (match product card); show description or price */}
				{(product.description || product.name) && (
					<Text size="2" color="gray" className="text-muted-foreground line-clamp-2 mb-3">
						{product.description ?? `${product.cashbackPrice} CB`}
					</Text>
				)}
			</div>
		</div>
	);
}

const PLACEHOLDER_PRODUCTS: CashbackProduct[] = [
	{ id: "1", name: "Premium Course Access", cashbackPrice: 150, description: "Unlock full access to premium courses and materials. Redeem with cashback points." },
	{ id: "2", name: "Exclusive E-Book Bundle", cashbackPrice: 80, description: "Get our curated e-book bundle. Perfect for learning on the go." },
	{ id: "3", name: "1-on-1 Session", cashbackPrice: 300, description: "Book a private session with an expert. Use your cashback to get personalized guidance." },
	{ id: "4", name: "Merch Pack", cashbackPrice: 200, description: "Official merch pack including limited edition items. Redeem with CB." },
	{ id: "5", name: "Bonus Content Unlock", cashbackPrice: 50, description: "Unlock bonus content and exclusive resources." },
	{ id: "6", name: "VIP Badge", cashbackPrice: 100, description: "Show off your VIP status with an exclusive badge." },
];

interface CashbackOccasionsSectionProps {
	experienceId: string;
	products?: CashbackProduct[];
}

export const CashbackOccasionsSection: React.FC<CashbackOccasionsSectionProps> = ({
	experienceId,
	products = PLACEHOLDER_PRODUCTS,
}) => {
	return (
		<section className="mt-10 w-full">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				{products.map((product) => (
					<CashbackProductCard key={product.id} product={product} />
				))}
			</div>
		</section>
	);
};
