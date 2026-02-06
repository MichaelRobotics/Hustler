import { Text } from "frosted-ui";
import { ChevronDown, User } from "lucide-react";
import type React from "react";
import { useState, useRef, useEffect } from "react";
import { AvatarSquare } from "../common/AvatarSquare";

interface User {
	id: string;
	name: string;
	avatar?: string | null;
	whopUserId: string;
}

interface UserSelectionDropdownProps {
	users: User[];
	selectedUserId: string | null;
	onUserSelect: (userId: string) => void;
	currentUserId: string; // To determine if selected user is admin's own profile
}

export const UserSelectionDropdown: React.FC<UserSelectionDropdownProps> = ({
	users,
	selectedUserId,
	onUserSelect,
	currentUserId,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];
	const isEditMode = selectedUser?.id === currentUserId;

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	return (
		<div className="relative" ref={dropdownRef}>
			{/* Dropdown Button */}
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 shadow-sm"
			>
				<AvatarSquare
					src={selectedUser?.avatar}
					alt={selectedUser?.name ?? "User"}
					sizeClass="w-8 h-8"
					fallback={
						<div className="w-full h-full bg-violet-500 flex items-center justify-center">
							<User className="w-4 h-4 text-white" strokeWidth={2.5} />
						</div>
					}
				/>
				<Text size="3" weight="medium" className="text-gray-900 dark:text-white">
					{selectedUser?.id === currentUserId ? "Admin - You" : (selectedUser?.name || users[0]?.name || "No users")}
				</Text>
				<ChevronDown
					className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
						isOpen ? "rotate-180" : ""
					}`}
					strokeWidth={2.5}
				/>
			</button>

			{/* Dropdown Menu */}
			{isOpen && (
				<div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
					{users.map((user) => {
						const isSelected = user.id === selectedUserId;
						const isCurrentUser = user.id === currentUserId;

						return (
							<button
								key={user.id}
								type="button"
								onClick={() => {
									onUserSelect(user.id);
									setIsOpen(false);
								}}
								className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${
									isSelected
										? "bg-violet-50 dark:bg-violet-900/20 border-l-4 border-violet-500"
										: ""
								}`}
							>
								<AvatarSquare
									src={user.avatar}
									alt={user.name}
									sizeClass="w-10 h-10"
									fallback={
										<div className="w-full h-full bg-violet-500 flex items-center justify-center">
											<span className="text-white text-sm font-semibold">
												{user.name.charAt(0).toUpperCase()}
											</span>
										</div>
									}
								/>
								<div className="flex-1 text-left">
									<Text
										size="3"
										weight={isSelected ? "bold" : "medium"}
										className="text-gray-900 dark:text-white"
									>
										{isCurrentUser ? "Admin - You" : user.name}
									</Text>
								</div>
								{isSelected && (
									<div className="w-2 h-2 bg-violet-500 rounded-full" />
								)}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};



