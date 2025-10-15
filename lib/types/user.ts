/**
 * User-related types for client-side components
 * This file contains only types and interfaces, no server-side imports
 */

export interface AuthenticatedUser {
	id: string;
	whopUserId: string;
	experienceId: string;
	email: string;
	name: string;
	avatar?: string;
	credits: number;
	accessLevel: "admin" | "customer" | "no_access";
	productsSynced: boolean;
	experience: {
		id: string;
		whopExperienceId: string;
		whopCompanyId: string;
		name: string;
		description?: string;
		logo?: string;
		link?: string;
	};
}

export interface UserContext {
	user: AuthenticatedUser;
	isAuthenticated: boolean;
	lastSync: Date;
	cacheExpiry: Date;
}

export interface ConversationWithMessages {
	id: string;
	funnelId: string;
	status: "active" | "closed" | "abandoned";
	currentBlockId?: string;
	userPath?: any;
	metadata?: any;
	createdAt: Date;
	updatedAt: Date;
	messages: Array<{
		id: string;
		type: "user" | "bot" | "system";
		content: string;
		metadata?: any;
		createdAt: Date;
	}>;
	interactions: Array<{
		id: string;
		blockId: string;
		optionText: string;
		nextBlockId?: string;
		createdAt: Date;
	}>;
	funnel: {
		id: string;
		name: string;
		isDeployed: boolean;
	};
}
