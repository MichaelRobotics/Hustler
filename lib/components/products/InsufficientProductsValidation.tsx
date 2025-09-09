import { Heading, Text } from "frosted-ui";
import { AlertTriangle, DollarSign, Gift } from "lucide-react";
import type React from "react";

interface InsufficientProductsValidationProps {
	hasPaidProducts: boolean;
	hasFreeProducts: boolean;
}

export const InsufficientProductsValidation: React.FC<InsufficientProductsValidationProps> = ({
	hasPaidProducts,
	hasFreeProducts,
}) => {
	const getValidationMessage = () => {
		if (!hasPaidProducts && !hasFreeProducts) {
			return {
				title: "Add Products",
				message: "Add at least 1 PAID and 1 FREE product to generate your funnel.",
				icon: <AlertTriangle className="w-10 h-10 text-amber-500 dark:text-amber-400" strokeWidth={2.5} />,
				iconBg: "from-amber-100/80 to-orange-100/60 dark:from-amber-900/40 dark:to-orange-900/30",
				iconBorder: "border-amber-200/50 dark:border-amber-700/30"
			};
		} else if (!hasPaidProducts) {
			return {
				title: "Add PAID Products",
				message: "Add at least 1 PAID product to generate your funnel.",
				icon: <DollarSign className="w-10 h-10 text-orange-500 dark:text-orange-400" strokeWidth={2.5} />,
				iconBg: "from-orange-100/80 to-red-100/60 dark:from-orange-900/40 dark:to-red-900/30",
				iconBorder: "border-orange-200/50 dark:border-orange-700/30"
			};
		} else if (!hasFreeProducts) {
			return {
				title: "Add FREE Products",
				message: "Add at least 1 FREE product to generate your funnel.",
				icon: <Gift className="w-10 h-10 text-green-500 dark:text-green-400" strokeWidth={2.5} />,
				iconBg: "from-green-100/80 to-emerald-100/60 dark:from-green-900/40 dark:to-emerald-900/30",
				iconBorder: "border-green-200/50 dark:border-green-700/30"
			};
		}
		return null;
	};

	const validation = getValidationMessage();
	if (!validation) return null;

	return (
		<div className="text-center py-16 px-8 bg-gradient-to-br from-gray-50/50 via-gray-100/30 to-violet-50/20 dark:from-gray-800/50 dark:via-gray-700/30 dark:to-indigo-900/20 rounded-2xl border border-border/30 dark:border-border/20 shadow-lg backdrop-blur-sm">
			<div className="mb-8">
				<div className={`w-20 h-20 mx-auto mb-6 p-4 rounded-full bg-gradient-to-br ${validation.iconBg} border ${validation.iconBorder} flex items-center justify-center`}>
					{validation.icon}
				</div>
			</div>

			<div className="mb-8">
				<Heading size="5" weight="bold" className="mb-3 text-foreground">
					{validation.title}
				</Heading>
				<Text
					size="3"
					color="gray"
					className="text-muted-foreground max-w-md mx-auto leading-relaxed"
				>
					{validation.message}
				</Text>
			</div>
		</div>
	);
};
