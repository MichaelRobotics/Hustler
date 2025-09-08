"use client";

import { X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

interface ToastProps {
	message: string;
	type?: "info" | "success" | "warning" | "error";
	duration?: number;
	onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
	message,
	type = "info",
	duration = 3000,
	onClose,
}) => {
	const [isVisible, setIsVisible] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsVisible(false);
			setTimeout(onClose, 300); // Wait for fade out animation
		}, duration);

		return () => clearTimeout(timer);
	}, [duration, onClose]);

	const getToastStyles = () => {
		switch (type) {
			case "error":
				return "bg-red-500 text-white border-red-600";
			case "warning":
				return "bg-amber-500 text-white border-amber-600";
			case "success":
				return "bg-green-500 text-white border-green-600";
			default:
				return "bg-violet-500 text-white border-violet-600";
		}
	};

	return (
		<div
			className={`fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 ${
				isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
			} ${getToastStyles()}`}
		>
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium">{message}</span>
				<button
					onClick={() => {
						setIsVisible(false);
						setTimeout(onClose, 300);
					}}
					className="ml-3 text-white/80 hover:text-white transition-colors"
				>
					<X size={16} />
				</button>
			</div>
		</div>
	);
};

export default Toast;
