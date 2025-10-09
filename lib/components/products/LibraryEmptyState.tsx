import { Heading, Text } from "frosted-ui";
import { BookOpen, Library, Sparkles } from "lucide-react";
import type React from "react";

interface LibraryEmptyStateProps {
	selectedCategory: string;
}

export const LibraryEmptyState: React.FC<LibraryEmptyStateProps> = ({
	selectedCategory,
}) => {
	const getEmptyStateContent = () => {
		if (selectedCategory === "all") {
			return {
				icon: (
					<Library
						className="w-10 h-10 text-violet-500 dark:text-violet-400"
						strokeWidth={2.5}
					/>
				),
				title: "Your Library is Empty",
			};
		} else if (selectedCategory === "PAID") {
			return {
				icon: (
					<Sparkles
						className="w-10 h-10 text-orange-500 dark:text-orange-400"
						strokeWidth={2.5}
					/>
				),
				title: "No Paid Products Yet",
			};
		} else {
			return {
				icon: (
					<BookOpen
						className="w-10 h-10 text-green-500 dark:text-green-400"
						strokeWidth={2.5}
					/>
				),
				title: "No Gift Products",
			};
		}
	};

	const content = getEmptyStateContent();

	return (
		<div className="text-center py-16 px-8 bg-gradient-to-br from-orange-50/50 via-orange-100/30 to-gray-200/20 dark:from-orange-900/50 dark:via-gray-800/30 dark:to-gray-700/20 rounded-2xl border border-border/30 dark:border-border/20 shadow-lg backdrop-blur-sm">
			<div className="mb-8">
				<div className="w-20 h-20 mx-auto mb-6 p-4 rounded-full bg-gradient-to-br from-orange-100/80 to-gray-200/60 dark:from-orange-900/40 dark:to-gray-800/30 border border-orange-200/50 dark:border-orange-700/30 flex items-center justify-center">
					{content.icon}
				</div>
			</div>

			<div className="mb-8">
				<Heading size="5" weight="bold" className="mb-3 text-foreground">
					{content.title}
				</Heading>
			</div>
		</div>
	);
};
