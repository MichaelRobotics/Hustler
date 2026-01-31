"use client";

import { Bell, MessageSquare } from "lucide-react";

export interface NotificationTypeOption {
	id: "standard" | "custom";
	name: string;
	description: string;
	icon: typeof Bell;
}

export const NOTIFICATION_TYPE_OPTIONS: NotificationTypeOption[] = [
	{
		id: "standard",
		name: "Standard",
		description: "Copy text from last bot message in this stage",
		icon: Bell,
	},
	{
		id: "custom",
		name: "Custom",
		description: "Write a custom notification message",
		icon: MessageSquare,
	},
];
