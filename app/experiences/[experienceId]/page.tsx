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
	const [error, setError] = useState<string | null>(null);

	// Single useEffect - get params and fetch context immediately
	useEffect(() => {
		const fetchUserContext = async () => {
			try {
				// Get experienceId from params
				const { experienceId } = await params;
				
				const response = await apiGet(`/api/user/context?experienceId=${experienceId}`, experienceId);
				
				if (!response.ok) {
					if (response.status === 403) {
						setError("Access denied");
					} else if (response.status === 401) {
						setError("Authentication required");
					} else {
						setError("Failed to load user context");
					}
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
			} catch (err) {
				console.error("Error fetching user context:", err);
				setError("Failed to load user context");
			}
		};

		fetchUserContext();
	}, [params]);


	// Show error state - let Whop handle authentication errors natively
	if (error || !authContext?.isAuthenticated) {
		return null; // Return null to let Whop handle authentication errors
	}

	// Show access denied if user doesn't have access
	if (!authContext.hasAccess) {
		return (
			<div className="flex justify-center items-center h-screen px-8 bg-gray-900">
				<div className="text-center max-w-2xl">
					<h1 className="text-2xl font-bold text-white mb-6">Access Denied</h1>
					<p className="text-gray-300 mb-6">
						Hi <strong>{authContext.user.name}</strong>, you need access to view
						this dashboard.
					</p>
					<div className="bg-gray-800 rounded-lg p-6 text-left">
						<h2 className="text-lg font-semibold text-white mb-4">
							User Information
						</h2>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-400">Name:</span>
								<span className="text-white">{authContext.user.name}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Access Level:</span>
								<span className="text-red-400">{authContext.user.accessLevel}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
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
		// For ViewSelectionPanel - when user makes a choice
		// This will be handled by the ViewSelectionPanel component itself
		console.log("User selected view:", view);
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
	if (authContext.shouldShowViewSelection) {
		// Backend determined: show ViewSelectionPanel
		return (
			<ViewSelectionPanel
				userName={currentUser.name}
				accessLevel={currentAccessLevel as "admin"}
				onViewSelected={handleViewSelected}
			/>
		);
	}

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

	// Fallback (should not reach here)
	return (
		<div className="flex justify-center items-center h-screen px-8 bg-gray-900">
			<div className="text-center">
				<h1 className="text-2xl font-bold text-white mb-4">Loading...</h1>
				<p className="text-gray-300">
					Please wait while we prepare your experience.
				</p>
			</div>
		</div>
	);
}
