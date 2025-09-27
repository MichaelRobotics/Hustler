"use client";

import AdminPanel from "@/lib/components/admin/AdminPanel";
import { CustomerView } from "@/lib/components/userChat";
import type React from "react";
import { useState, useEffect } from "react";
import ViewSelectionPanel from "@/lib/components/experiences/ViewSelectionPanel";
import type { AuthenticatedUser } from "@/lib/types/user";
import { apiGet } from "@/lib/utils/api-client";

/**
 * --- Experience Page ---
 * This page handles authentication via API calls and view selection.
 */

interface AuthContext {
	user: AuthenticatedUser;
	isAuthenticated: boolean;
	hasAccess: boolean;
	userType?: string; // Backend-determined user type
	shouldShowViewSelection?: boolean;
	autoSelectedView?: string;
}

export default function ExperiencePage({
	params,
}: {
	params: Promise<{ experienceId: string }>;
}) {
	const [authContext, setAuthContext] = useState<AuthContext | null>(null);
	const [experienceId, setExperienceId] = useState<string>("");
	const [selectedView, setSelectedView] = useState<"admin" | "customer" | null>(null);

	// Single useEffect - get params and fetch context immediately
	useEffect(() => {
		const fetchUserContext = async () => {
			// Get experienceId from params
			const { experienceId: expId } = await params;
			setExperienceId(expId);
			
			const response = await apiGet(`/api/user/context?experienceId=${expId}`, expId);
			
			if (!response.ok) {
				// Let Whop handle all errors natively
				return;
			}

			const data = await response.json();
			setAuthContext(data);
			
			// Backend determines everything - no frontend state management
			console.log("🎯 Backend decision:", {
				autoSelectedView: data.autoSelectedView,
				shouldShowViewSelection: data.shouldShowViewSelection,
				userType: data.userType
			});
		};

		fetchUserContext();
	}, [params]);


	// Let Whop handle all authentication and access errors natively
	if (!authContext) {
		return null;
	}

	// Use authenticated user data (backend-determined)
	const currentUser = { 
		name: authContext.user.name, 
		accessLevel: authContext.user.accessLevel,
		whopUserId: authContext.user.whopUserId
	};
	// Use backend-determined access level (no frontend logic)
	const currentAccessLevel = authContext.user.accessLevel;

	const handleViewSelected = (view: "admin" | "customer") => {
		// User selected a view from ViewSelectionPanel
		console.log("User selected view:", view);
		setSelectedView(view);
	};

	const handleCustomerMessage = (message: string, conversationId?: string) => {
		// Handle customer messages - could send to analytics, backend, etc.
		console.log("Customer interaction:", {
			message,
			conversationId,
			userName: currentUser.name,
			experienceId,
			accessLevel: currentAccessLevel,
			timestamp: new Date().toISOString(),
		});
	};

	// Backend determines everything - no frontend logic
	if (authContext.shouldShowViewSelection && !selectedView) {
		// Backend determined: show ViewSelectionPanel (only if no view selected yet)
		return (
			<ViewSelectionPanel
				userName={currentUser.name}
				accessLevel={currentAccessLevel as "admin"}
				onViewSelected={handleViewSelected}
			/>
		);
	}

	// Handle user-selected view from ViewSelectionPanel
	if (selectedView === "admin") {
		return <AdminPanel user={authContext?.user || null} />;
	}

	if (selectedView === "customer") {
		return (
			<CustomerView
				userName={currentUser.name}
				experienceId={experienceId}
				onMessageSent={handleCustomerMessage}
				userType="admin" // Developer admin gets admin controls on customer view
				whopUserId={currentUser.whopUserId}
			/>
		);
	}

	// Handle backend auto-selected views
	if (authContext.autoSelectedView === "admin") {
		// Backend determined: show AdminPanel
		return <AdminPanel user={authContext?.user || null} />;
	}

	if (authContext.autoSelectedView === "customer") {
		// Backend determined: show CustomerView
		return (
			<CustomerView
				userName={currentUser.name}
				experienceId={experienceId}
				onMessageSent={handleCustomerMessage}
				userType="customer"
				whopUserId={currentUser.whopUserId}
			/>
		);
	}

	// Let Whop handle all loading and error states
}
