import { Button, Heading, Text } from "frosted-ui";
import { Trash2, X } from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import type { DeleteConfirmation } from "../../../types/resource";

interface LibraryResourceDeleteModalProps {
	confirmation: DeleteConfirmation;
	onConfirm: () => void;
	onCancel: () => void;
}

export const LibraryResourceDeleteModal: React.FC<
	LibraryResourceDeleteModalProps
> = ({ confirmation, onConfirm, onCancel }) => {
	// Handle Escape key to close delete confirmation
	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape" && confirmation.show) {
				onCancel();
			}
		};

		if (confirmation.show) {
			document.addEventListener("keydown", handleEscape);
			return () => document.removeEventListener("keydown", handleEscape);
		}
	}, [confirmation.show, onCancel]);

	if (!confirmation.show) return null;

	return (
		<div
			className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
			onClick={onCancel}
		>
			<div
				className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 dark:from-gray-800 dark:to-gray-900 dark:border-gray-600 rounded-2xl shadow-2xl backdrop-blur-sm dark:shadow-black/60 max-w-md w-full p-6 sm:p-8 animate-in zoom-in-95 duration-300"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between mb-6">
					<Heading
						size="4"
						weight="bold"
						className="text-red-600 dark:text-red-400"
					>
						Remove Library Resource
					</Heading>
					<Button
						size="1"
						variant="ghost"
						color="gray"
						onClick={onCancel}
						className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-all duration-200 hover:scale-105"
					>
						<X size={16} strokeWidth={2.5} />
					</Button>
				</div>

				<div className="mb-6">
					<Text size="3" className="text-foreground mb-3">
						Are you sure you want to remove this resource from your library?
					</Text>
					<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 rounded-lg p-3">
						<Text
							size="2"
							weight="semi-bold"
							className="text-red-700 dark:text-red-300"
						>
							"{confirmation.resourceName}"
						</Text>
					</div>
					<Text size="2" color="gray" className="text-muted-foreground mt-2">
						This action cannot be undone. The resource will be permanently
						removed from your library.
					</Text>
				</div>

				<div className="flex gap-3">
					<Button
						color="red"
						onClick={onConfirm}
						className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl shadow-xl shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 transition-all duration-300 dark:bg-red-500 dark:hover:bg-red-600 dark:shadow-red-500/40 dark:hover:shadow-red-500/60"
					>
						<Trash2 size={18} strokeWidth={2.5} className="mr-2" />
						Remove Resource
					</Button>
					<Button
						variant="soft"
						color="gray"
						onClick={onCancel}
						className="px-6 py-3 hover:scale-105 transition-all duration-300"
					>
						Cancel
					</Button>
				</div>
			</div>
		</div>
	);
};
