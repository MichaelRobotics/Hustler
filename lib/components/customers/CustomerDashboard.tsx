"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Heading, Text, Button, Card, Separator } from "frosted-ui";
import { User, Link2, FileText, ArrowLeft, Loader2 } from "lucide-react";
import { CustomerResourceCard } from "./CustomerResourceCard";
import { UserSelectionDropdown } from "./UserSelectionDropdown";
import { ProductReviewModal } from "./ProductReviewModal";
import { PlanReviewModal } from "./PlanReviewModal";
import { apiGet, apiPost } from "@/lib/utils/api-client";
import type { AuthenticatedUser } from "@/lib/types/user";
import type { CustomerResource } from "@/lib/types/resource";
import { useTheme } from "../common/ThemeProvider";
import { ThemeToggle } from "../common/ThemeToggle";

interface CustomerDashboardProps {
	user: AuthenticatedUser;
	onBack?: () => void;
	onUserSelect?: (userId: string | null) => void;
	selectedUserId?: string | null;
	scrollToPlanId?: string | null; // Plan ID to scroll to after resources load
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
	user,
	onBack,
	onUserSelect,
	selectedUserId: selectedUserIdProp,
	scrollToPlanId,
}) => {
	const { appearance } = useTheme();
	const [customerResources, setCustomerResources] = useState<CustomerResource[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSyncing, setIsSyncing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [users, setUsers] = useState<Array<{ id: string; name: string; avatar?: string; whopUserId: string }>>([]);
	const [selectedCustomerUser, setSelectedCustomerUser] = useState<string | null>(selectedUserIdProp ?? user.id);
	
	// Review modal state
	const [productReviewModal, setProductReviewModal] = useState<{ isOpen: boolean; companySlug: string | null }>({
		isOpen: false,
		companySlug: null,
	});
	const [planReviewModal, setPlanReviewModal] = useState<{ isOpen: boolean; resourceId?: string | null; planId: string | null; resourceName?: string; companyLogo?: string }>({
		isOpen: false,
		resourceId: null,
		planId: null,
		resourceName: undefined,
		companyLogo: undefined,
	});
	const [companyLogo, setCompanyLogo] = useState<string | null>(null);

	const isAdmin = user.accessLevel === 'admin';
	const currentViewUserId = isAdmin ? selectedCustomerUser : user.id;
	const isViewingOwnProfile = currentViewUserId === user.id;

	// Store experienceId in a ref to avoid recreating callbacks
	const experienceIdRef = React.useRef(user.experience.whopExperienceId);
	React.useEffect(() => {
		experienceIdRef.current = user.experience.whopExperienceId;
	}, [user.experience.whopExperienceId]);

	const fetchCustomerResources = useCallback(async (targetUserId: string) => {
		setIsLoading(true);
		setError(null);
		try {
			const experienceId = experienceIdRef.current;
			const response = await apiGet(
				`/api/customers-resources?experienceId=${experienceId}&userId=${targetUserId}`,
				experienceId
			);
			if (response.ok) {
				const data = await response.json();
				setCustomerResources(data.data || []);
			} else {
				const errorData = await response.json();
				setError(errorData.error || 'Failed to fetch customer resources');
			}
		} catch (err) {
			console.error('Error fetching customer resources:', err);
			setError('Failed to fetch customer resources due to a network error.');
		} finally {
			setIsLoading(false);
		}
	}, []); // Empty deps - using ref for experienceId

	const fetchUsersForAdmin = useCallback(async () => {
		if (!isAdmin) return;
		try {
			const experienceId = experienceIdRef.current;
			const response = await apiGet(
				`/api/customers/users?experienceId=${experienceId}`,
				experienceId
			);
			if (response.ok) {
				const data = await response.json();
				setUsers(data.data || []);
			} else {
				const errorData = await response.json();
				setError(errorData.error || 'Failed to fetch users');
			}
		} catch (err) {
			console.error('Error fetching users for admin:', err);
			setError('Failed to fetch users due to a network error.');
		}
	}, [isAdmin]);

	// Auto-scroll to purchased product after resources load
	// Use ref to track if we've already scrolled to avoid multiple scrolls
	const hasScrolledRef = React.useRef<string | null>(null);
	
	useEffect(() => {
		if (!scrollToPlanId || isLoading || customerResources.length === 0) {
			return;
		}

		// Don't scroll if we've already scrolled to this planId
		if (hasScrolledRef.current === scrollToPlanId) {
			return;
		}

		// Wait a bit for DOM to render
		const timeoutId = setTimeout(() => {
			// Find resource card with matching plan_id
			const targetElement = document.querySelector(
				`[data-plan-id="${scrollToPlanId}"]`
			);

			if (targetElement) {
				console.log('📜 [CustomerDashboard] Scrolling to purchased product with planId:', scrollToPlanId);
				hasScrolledRef.current = scrollToPlanId;
				targetElement.scrollIntoView({
					behavior: 'smooth',
					block: 'center',
				});
			} else {
				console.warn('📜 [CustomerDashboard] Could not find resource with planId:', scrollToPlanId, 'Resources may still be syncing...');
				// Retry after a short delay in case resources are still syncing
				const retryTimeout = setTimeout(() => {
					const retryElement = document.querySelector(
						`[data-plan-id="${scrollToPlanId}"]`
					);
					if (retryElement) {
						console.log('📜 [CustomerDashboard] Found resource on retry, scrolling...');
						hasScrolledRef.current = scrollToPlanId;
						retryElement.scrollIntoView({
							behavior: 'smooth',
							block: 'center',
						});
					} else {
						console.warn('📜 [CustomerDashboard] Resource still not found after retry. It may need to be synced.');
					}
				}, 2000); // Retry after 2 seconds
				return () => clearTimeout(retryTimeout);
			}
		}, 300); // Small delay to ensure DOM is ready

		return () => clearTimeout(timeoutId);
	}, [scrollToPlanId, isLoading, customerResources.length]);

	// Reset scroll tracking when scrollToPlanId changes
	useEffect(() => {
		if (scrollToPlanId) {
			hasScrolledRef.current = null;
		}
	}, [scrollToPlanId]); // Only depend on isAdmin

	// Fetch company logo
	useEffect(() => {
		const fetchCompanyLogo = async () => {
			try {
				const experienceId = experienceIdRef.current;
				const response = await apiGet('/api/company/route', experienceId);
				if (response.ok) {
					const data = await response.json();
					setCompanyLogo(data.logo || null);
				}
			} catch (err) {
				console.error('Error fetching company logo:', err);
			}
		};
		fetchCompanyLogo();
	}, []);

	const triggerSync = useCallback(async () => {
		setIsSyncing(true);
		try {
			const experienceId = experienceIdRef.current;
			// Sync memberships for the currently viewed user
			// For customers: currentViewUserId is user.id (their own ID)
			// For admins: currentViewUserId is selectedCustomerUser (could be themselves or another user)
			const syncUrl = currentViewUserId
				? `/api/customers-resources/sync?experienceId=${experienceId}&userId=${currentViewUserId}`
				: `/api/customers-resources/sync?experienceId=${experienceId}`;
			console.log('🔄 [CustomerDashboard] Triggering membership sync for user:', currentViewUserId);
			const response = await apiPost(
				syncUrl,
				{},
				experienceId
			);
			if (response.ok) {
				const data = await response.json();
				console.log('✅ [CustomerDashboard] Sync completed:', data);
				// After sync, refetch resources for the current user
				if (currentViewUserId) {
					await fetchCustomerResources(currentViewUserId);
				}
			} else {
				const errorData = await response.json();
				console.error('❌ [CustomerDashboard] Sync failed:', errorData);
				// Don't set error state for sync failures - just log it
			}
		} catch (err) {
			console.error('❌ [CustomerDashboard] Error triggering sync:', err);
			// Don't set error state for sync failures - just log it
		} finally {
			setIsSyncing(false);
		}
	}, [currentViewUserId, fetchCustomerResources]);

	// Trigger sync on mount for both admins and customers (only once per user)
	const hasSyncedRef = React.useRef<Set<string>>(new Set());
	useEffect(() => {
		if (currentViewUserId && !hasSyncedRef.current.has(currentViewUserId)) {
			hasSyncedRef.current.add(currentViewUserId);
			triggerSync();
		}
	}, [currentViewUserId, triggerSync]);

	useEffect(() => {
		if (currentViewUserId) {
			fetchCustomerResources(currentViewUserId);
		}
		if (isAdmin) {
			fetchUsersForAdmin();
		}
	}, [currentViewUserId, isAdmin, fetchCustomerResources, fetchUsersForAdmin]);

	const handleUserSelectionChange = useCallback(async (userId: string) => {
		setSelectedCustomerUser(userId);
		if (onUserSelect) {
			onUserSelect(userId);
		}
		
		// Trigger sync for the newly selected user (admin only - customers can't select other users)
		if (isAdmin && !hasSyncedRef.current.has(userId)) {
			hasSyncedRef.current.add(userId);
			setIsSyncing(true);
			try {
				const experienceId = experienceIdRef.current;
				const syncUrl = `/api/customers-resources/sync?experienceId=${experienceId}&userId=${userId}`;
				console.log('🔄 [CustomerDashboard] Triggering membership sync for newly selected user:', userId);
				const response = await apiPost(
					syncUrl,
					{},
					experienceId
				);
				if (response.ok) {
					const data = await response.json();
					console.log('✅ [CustomerDashboard] Sync completed for user:', data);
					// After sync, refetch resources for the selected user
					await fetchCustomerResources(userId);
				} else {
					const errorData = await response.json();
					console.error('❌ [CustomerDashboard] Sync failed for user:', errorData);
				}
			} catch (err) {
				console.error('❌ [CustomerDashboard] Error triggering sync for user:', err);
			} finally {
				setIsSyncing(false);
			}
		}
	}, [isAdmin, onUserSelect, fetchCustomerResources]);

	// Categorize resources
	const memberships = customerResources.filter(r => r.resourceType === 'WHOP' || r.resourceType === 'LINK');
	const files = customerResources.filter(r => r.resourceType === 'FILE');

	return (
		<div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
			{/* Enhanced Background Pattern */}
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />

			<div className="relative p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
				<div className="max-w-7xl mx-auto">
					{/* Header - Matching Market Stall Design */}
					<div className="sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-border/30 dark:border-border/20 shadow-lg">
				{/* Top Section: Back Button + Title */}
				<div className="flex items-center justify-between gap-4 mb-6">
					<div className="flex items-center gap-4">
						{onBack && (
							<Button
								size="2"
								variant="ghost"
								color="gray"
								onClick={onBack}
								className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-colors duration-200 dark:hover:bg-surface/60"
								aria-label="Back"
							>
								<ArrowLeft size={20} strokeWidth={2.5} />
							</Button>
						)}

						<div>
							<Heading
								size="6"
								weight="bold"
								className="text-black dark:text-white"
							>
								Customer Dashboard
							</Heading>
						</div>
					</div>
					{isAdmin ? (
						<UserSelectionDropdown
							users={users.map(u => ({ id: u.id, name: u.name, avatar: u.avatar, whopUserId: u.whopUserId }))}
							selectedUserId={selectedCustomerUser}
							onUserSelect={handleUserSelectionChange}
							currentUserId={user.id}
						/>
					) : (
						<div className="flex items-center gap-2">
							{user.avatar && (
								<img 
									src={user.avatar} 
									alt={user.name} 
									className="w-8 h-8 rounded-full object-cover"
								/>
							)}
							<Text size="3" weight="medium" className="text-black dark:text-white">
								{user.name}
							</Text>
						</div>
					)}
				</div>

				{/* Subtle Separator Line */}
				<div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mb-4" />

				{/* Bottom Section: Theme Toggle */}
				<div className="flex justify-start items-center gap-2 sm:gap-3">
					<div className="flex-shrink-0">
						<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
							<ThemeToggle />
						</div>
					</div>
				</div>
					</div>

					{/* Content */}
					<div className="mt-8">
				{/* Sync Loading Indicator */}
				{isSyncing && (
					<div className="mb-6 p-4 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg flex items-center gap-3">
						<Loader2 size={20} className="animate-spin text-violet-500" />
						<Text size="3" className="text-violet-700 dark:text-violet-300">
							Syncing memberships...
						</Text>
					</div>
				)}

				{isLoading && !isSyncing && (
					<div className="text-center py-8">
						<Loader2 size={32} className="animate-spin text-violet-500 mx-auto" />
						<Text size="3" className="mt-4 text-gray-600 dark:text-gray-300">Loading customer resources...</Text>
					</div>
				)}

				{error && !isSyncing && (
					<div className="text-center py-8 text-red-500">
						<Text size="3">{error}</Text>
					</div>
				)}

				{!isLoading && !isSyncing && !error && customerResources.length === 0 && (
					<div className="text-center py-8">
						<Text size="4" weight="bold" className="text-gray-700 dark:text-gray-200">No resources found for this customer.</Text>
						<Text size="2" className="mt-2 text-gray-500 dark:text-gray-400">Memberships and files will appear here once synced.</Text>
					</div>
				)}

				{!isLoading && !isSyncing && !error && customerResources.length > 0 && (
					<div className="space-y-8">
						{/* Memberships Section */}
						{memberships.length > 0 && (
							<div className="mb-8">
								{/* Section Header */}
								<div className="flex items-center gap-4 mb-6">
									<h3 className="text-xl font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/50 border px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
										<Link2 className="w-5 h-5" strokeWidth={2.5} />
										Memberships ({memberships.length})
									</h3>
									<div className="flex-1 h-px bg-gradient-to-r from-blue-400/80 via-blue-500/60 to-transparent"></div>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
									{memberships.map(resource => (
										<CustomerResourceCard
											key={resource.customer_resource_id}
											resource={resource}
											resourceType={resource.resourceType || 'WHOP'}
											onOpenProductReview={(companySlug) => setProductReviewModal({ isOpen: true, companySlug })}
											onOpenPlanReview={(resourceId, planId) => setPlanReviewModal({ isOpen: true, resourceId, planId, resourceName: resource.product_name, companyLogo: companyLogo || undefined })}
											experienceId={user.experience.whopExperienceId}
										/>
									))}
								</div>
							</div>
						)}

						{/* Files Section */}
						{files.length > 0 && (
							<div className="mb-8">
								{/* Section Header */}
								<div className="flex items-center gap-4 mb-6">
									<h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700/50 border px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
										<FileText className="w-5 h-5" strokeWidth={2.5} />
										Files ({files.length})
									</h3>
									<div className="flex-1 h-px bg-gradient-to-r from-indigo-400/80 via-indigo-500/60 to-transparent"></div>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
									{files.map(resource => (
										<CustomerResourceCard
											key={resource.customer_resource_id}
											resource={resource}
											resourceType={resource.resourceType || 'FILE'}
											onOpenProductReview={(companySlug) => setProductReviewModal({ isOpen: true, companySlug })}
											onOpenPlanReview={(resourceId, planId) => setPlanReviewModal({ isOpen: true, resourceId, planId, resourceName: resource.product_name, companyLogo: companyLogo || undefined })}
											experienceId={user.experience.whopExperienceId}
										/>
									))}
								</div>
							</div>
						)}
					</div>
				)}
					</div>
				</div>
			</div>

			{/* Review Modals */}
			<ProductReviewModal
				isOpen={productReviewModal.isOpen}
				onClose={() => setProductReviewModal({ isOpen: false, companySlug: null })}
				companySlug={productReviewModal.companySlug}
				experienceId={user.experience.whopExperienceId}
			/>
			<PlanReviewModal
				isOpen={planReviewModal.isOpen}
				onClose={() => setPlanReviewModal({ isOpen: false, resourceId: null, planId: null })}
				resourceId={planReviewModal.resourceId || undefined}
				planId={planReviewModal.planId || ''}
				resourceName={planReviewModal.resourceName}
				experienceId={user.experience.whopExperienceId}
				companyName={user.experience.name}
				companyLogo={planReviewModal.companyLogo}
			/>
		</div>
	);
};

