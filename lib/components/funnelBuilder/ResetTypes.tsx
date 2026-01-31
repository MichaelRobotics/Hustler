"use client";

import { AlertTriangle, Trash2, CheckCircle } from "lucide-react";

export interface ResetTypeOption {
	id: "delete" | "complete";
	name: string;
	description: string;
	icon: typeof AlertTriangle;
}

export const RESET_TYPE_OPTIONS: ResetTypeOption[] = [
	{
		id: "delete",
		name: "Delete Merchant conversation",
		description: "Delete Merchant conversations after delay",
		icon: Trash2,
	},
	{
		id: "complete",
		name: "Mark as Completed",
		description: "Mark conversations as completed after delay",
		icon: CheckCircle,
	},
];
