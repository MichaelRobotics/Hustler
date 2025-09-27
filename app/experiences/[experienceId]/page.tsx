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
}

export default function ExperiencePage({
	params,
}: {
	params: Promise<{ experienceId: string }>;
}) {
	const [experienceId, setExperienceId] = useState<string>("");
	const [selectedView, setSelectedView] = useState<"admin" | "customer" | null>(null);
	const [authContext, setAuthContext] = useState<AuthContext | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Get experienceId from params
	useEffect(() => {
		params.then(({ experienceId }) => {
			setExperienceId(experienceId);
		});
	}, [params]);

	// Fetch user context on component mount
	useEffect(() => {
		if (!experienceId) return;

		const fetchUserContext = async () => {
			try {
				setLoading(true);
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
			} catch (err) {
				console.error("Error fetching user context:", err);
				setError("Failed to load user context");
			} finally {
				setLoading(false);
			}
		};

		fetchUserContext();
	}, [experienceId]);

	// Show loading state - let Whop handle the native loading experience
	if (loading) {
		return null; // Return null to let Whop's native loading page show
	}

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

	// Use authenticated user data
	const currentUser = { 
		name: authContext.user.name, 
		accessLevel: authContext.user.accessLevel,
		whopUserId: authContext.user.whopUserId
	};
	const currentAccessLevel = authContext.user.accessLevel === "no_access" ? "customer" : authContext.user.accessLevel;

	const handleViewSelected = (view: "admin" | "customer") => {
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

	// Show view selection panel only for admins, customers go directly to CustomerView
	if (!selectedView) {
		// Customers go directly to CustomerView - no choice
		if (currentAccessLevel === "customer") {
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

		// Admins see view selection panel
		return (
			<ViewSelectionPanel
				userName={currentUser.name}
				accessLevel={currentAccessLevel as "admin"}
				onViewSelected={handleViewSelected}
			/>
		);
	}

	// Show admin view
	if (selectedView === "admin") {
		return <AdminPanel user={authContext?.user || null} />;
	}

	// Show customer view
	if (selectedView === "customer") {
		return (
			<CustomerView
				userName={currentUser.name}
				experienceId={experienceId}
				onMessageSent={handleCustomerMessage}
				userType="admin"
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
