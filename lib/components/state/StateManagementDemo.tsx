/**
 * State Management Demo Component
 *
 * Demonstrates the complete state management system with real-time updates,
 * optimistic updates, conflict resolution, and offline support.
 */

"use client";

import { Badge, Button, Card, Heading, Progress, Text } from "frosted-ui";
import {
	Activity,
	AlertTriangle,
	CheckCircle,
	Clock,
	Database,
	RefreshCw,
	Shield,
	Wifi,
	WifiOff,
	Zap,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import {
	useConflictStateContext,
	useOfflineStateContext,
	useOptimisticStateContext,
	useRealtimeStateContext,
	useStateContext,
	useSyncStateContext,
} from "../../context/state-context";

export function StateManagementDemo() {
	const [selectedTab, setSelectedTab] = useState<
		"overview" | "realtime" | "offline" | "conflicts" | "sync" | "optimistic"
	>("overview");

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center justify-between">
				<Heading size="4">State Management System</Heading>
				<Badge variant="solid">Phase 6 Complete</Badge>
			</div>

			{/* Tab Navigation */}
			<div className="flex space-x-2 border-b">
				{[
					{ id: "overview", label: "Overview", icon: Activity },
					{ id: "realtime", label: "Real-time", icon: Zap },
					{ id: "offline", label: "Offline", icon: Wifi },
					{ id: "conflicts", label: "Conflicts", icon: AlertTriangle },
					{ id: "sync", label: "RefreshCw", icon: RefreshCw },
					{ id: "optimistic", label: "Optimistic", icon: Clock },
				].map(({ id, label, icon: Icon }) => (
					<button
						key={id}
						onClick={() => setSelectedTab(id as any)}
						className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${
							selectedTab === id
								? "border-blue-500 text-blue-600"
								: "border-transparent text-gray-500 hover:text-gray-700"
						}`}
					>
						<Icon size={16} />
						<span>{label}</span>
					</button>
				))}
			</div>

			{/* Tab Content */}
			{selectedTab === "overview" && <OverviewTab />}
			{selectedTab === "realtime" && <RealtimeTab />}
			{selectedTab === "offline" && <OfflineTab />}
			{selectedTab === "conflicts" && <ConflictsTab />}
			{selectedTab === "sync" && <RefreshCwTab />}
			{selectedTab === "optimistic" && <OptimisticTab />}
		</div>
	);
}

function OverviewTab() {
	const { state, getStateStats, isLoading, error } = useStateContext();
	const [stats, setStats] = useState<any>(null);

	useEffect(() => {
		const updateStats = () => {
			setStats(getStateStats());
		};

		updateStats();
		const interval = setInterval(updateStats, 5000);

		return () => clearInterval(interval);
	}, [getStateStats]);

	if (isLoading) {
		return <LoadingState />;
	}

	if (error) {
		return <ErrorState error={error} />;
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{/* System Status */}
			<Card className="p-6">
				<div className="flex items-center space-x-2 mb-4">
					<Database className="text-blue-500" size={20} />
					<Heading size="3">System Status</Heading>
				</div>
				<div className="space-y-3">
					<div className="flex justify-between">
						<Text>Real-time Connected</Text>
						<Badge variant={state.realtime.isConnected ? "solid" : "soft"}>
							{state.realtime.isConnected ? "Connected" : "Disconnected"}
						</Badge>
					</div>
					<div className="flex justify-between">
						<Text>Online Status</Text>
						<Badge variant={state.sync.isOnline ? "solid" : "soft"}>
							{state.sync.isOnline ? "Online" : "Offline"}
						</Badge>
					</div>
					<div className="flex justify-between">
						<Text>Pending Updates</Text>
						<Text className="font-mono">{state.realtime.pendingUpdates}</Text>
					</div>
				</div>
			</Card>

			{/* State Statistics */}
			<Card className="p-6">
				<div className="flex items-center space-x-2 mb-4">
					<Activity className="text-green-500" size={20} />
					<Heading size="3">State Statistics</Heading>
				</div>
				{stats && (
					<div className="space-y-3">
						<div className="flex justify-between">
							<Text>Frontend State Size</Text>
							<Text className="font-mono">
								{(stats.frontendStateSize / 1024).toFixed(1)} KB
							</Text>
						</div>
						<div className="flex justify-between">
							<Text>Backend State Size</Text>
							<Text className="font-mono">
								{(stats.backendStateSize / 1024).toFixed(1)} KB
							</Text>
						</div>
						<div className="flex justify-between">
							<Text>RefreshCw Operations</Text>
							<Text className="font-mono">{stats.syncOperations}</Text>
						</div>
						<div className="flex justify-between">
							<Text>Conflicts</Text>
							<Text className="font-mono">{stats.conflicts}</Text>
						</div>
					</div>
				)}
			</Card>

			{/* Performance Metrics */}
			<Card className="p-6">
				<div className="flex items-center space-x-2 mb-4">
					<Zap className="text-yellow-500" size={20} />
					<Heading size="3">Performance</Heading>
				</div>
				{stats && (
					<div className="space-y-3">
						<div className="flex justify-between">
							<Text>Cache Hit Rate</Text>
							<Text className="font-mono">
								{(stats.cacheHitRate * 100).toFixed(1)}%
							</Text>
						</div>
						<div className="flex justify-between">
							<Text>Memory Usage</Text>
							<Text className="font-mono">
								{(stats.memoryUsage / 1024 / 1024).toFixed(1)} MB
							</Text>
						</div>
						<div className="flex justify-between">
							<Text>Last RefreshCw</Text>
							<Text className="font-mono">
								{stats.lastRefreshCw
									? new Date(stats.lastRefreshCw).toLocaleTimeString()
									: "Never"}
							</Text>
						</div>
					</div>
				)}
			</Card>

			{/* Quick Actions */}
			<Card className="p-6 md:col-span-2 lg:col-span-3">
				<div className="flex items-center space-x-2 mb-4">
					<Shield className="text-purple-500" size={20} />
					<Heading size="3">Quick Actions</Heading>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button variant="solid" size="2">
						<RefreshCw size={16} className="mr-2" />
						Force Sync
					</Button>
					<Button variant="soft" size="2">
						<Database size={16} className="mr-2" />
						Export State
					</Button>
					<Button variant="soft" size="2">
						<AlertTriangle size={16} className="mr-2" />
						Clear Conflicts
					</Button>
					<Button variant="soft" size="2">
						<Activity size={16} className="mr-2" />
						Reset State
					</Button>
				</div>
			</Card>
		</div>
	);
}

function RealtimeTab() {
	const { isConnected, status, pendingUpdates, sync } =
		useRealtimeStateContext();

	return (
		<div className="space-y-6">
			<Card className="p-6">
				<div className="flex items-center space-x-2 mb-4">
					<Zap className="text-blue-500" size={20} />
					<Heading size="3">Real-time Connection</Heading>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="text-center">
						<div className="text-2xl font-bold text-blue-600">
							{pendingUpdates}
						</div>
						<Text className="text-sm text-gray-600">Pending Updates</Text>
					</div>
					<div className="text-center">
						<Badge
							variant={isConnected ? "solid" : "soft"}
							className="text-lg px-4 py-2"
						>
							{status}
						</Badge>
						<Text className="text-sm text-gray-600 mt-2">
							Connection Status
						</Text>
					</div>
					<div className="text-center">
						<Button onClick={sync} variant="solid" size="2">
							<RefreshCw size={16} className="mr-2" />
							Sync Now
						</Button>
						<Text className="text-sm text-gray-600 mt-2">Manual RefreshCw</Text>
					</div>
				</div>
			</Card>

			<Card className="p-6">
				<Heading size="3" className="mb-4">
					Real-time Features
				</Heading>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<div className="flex items-center space-x-2">
							<CheckCircle className="text-green-500" size={16} />
							<Text>Live Chat Messages</Text>
						</div>
						<div className="flex items-center space-x-2">
							<CheckCircle className="text-green-500" size={16} />
							<Text>Funnel Updates</Text>
						</div>
						<div className="flex items-center space-x-2">
							<CheckCircle className="text-green-500" size={16} />
							<Text>Resource RefreshCw</Text>
						</div>
					</div>
					<div className="space-y-2">
						<div className="flex items-center space-x-2">
							<CheckCircle className="text-green-500" size={16} />
							<Text>System Notifications</Text>
						</div>
						<div className="flex items-center space-x-2">
							<CheckCircle className="text-green-500" size={16} />
							<Text>Analytics Updates</Text>
						</div>
						<div className="flex items-center space-x-2">
							<CheckCircle className="text-green-500" size={16} />
							<Text>Credit Updates</Text>
						</div>
					</div>
				</div>
			</Card>
		</div>
	);
}

function OfflineTab() {
	const {
		isOnline,
		enableOfflineMode,
		disableOfflineMode,
		syncPendingOperations,
	} = useOfflineStateContext();

	return (
		<div className="space-y-6">
			<Card className="p-6">
				<div className="flex items-center space-x-2 mb-4">
					{isOnline ? (
						<Wifi className="text-green-500" size={20} />
					) : (
						<WifiOff className="text-red-500" size={20} />
					)}
					<Heading size="3">Offline Support</Heading>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<Text className="font-semibold mb-2">Current Status</Text>
						<Badge
							variant={isOnline ? "solid" : "soft"}
							className="text-lg px-4 py-2"
						>
							{isOnline ? "Online" : "Offline"}
						</Badge>
					</div>
					<div>
						<Text className="font-semibold mb-2">Actions</Text>
						<div className="space-x-2">
							<Button
								onClick={isOnline ? enableOfflineMode : disableOfflineMode}
								variant={isOnline ? "soft" : "solid"}
								size="2"
							>
								{isOnline ? "Go Offline" : "Go Online"}
							</Button>
							<Button onClick={syncPendingOperations} variant="soft" size="2">
								<RefreshCw size={16} className="mr-2" />
								RefreshCw Pending
							</Button>
						</div>
					</div>
				</div>
			</Card>

			<Card className="p-6">
				<Heading size="3" className="mb-4">
					Offline Features
				</Heading>
				<div className="space-y-3">
					<div className="flex items-center space-x-2">
						<CheckCircle className="text-green-500" size={16} />
						<Text>Automatic offline detection</Text>
					</div>
					<div className="flex items-center space-x-2">
						<CheckCircle className="text-green-500" size={16} />
						<Text>Queue operations for sync</Text>
					</div>
					<div className="flex items-center space-x-2">
						<CheckCircle className="text-green-500" size={16} />
						<Text>Automatic sync on reconnect</Text>
					</div>
					<div className="flex items-center space-x-2">
						<CheckCircle className="text-green-500" size={16} />
						<Text>Local state persistence</Text>
					</div>
				</div>
			</Card>
		</div>
	);
}

function ConflictsTab() {
	const { conflicts, resolveConflict, hasConflicts } =
		useConflictStateContext();

	return (
		<div className="space-y-6">
			<Card className="p-6">
				<div className="flex items-center space-x-2 mb-4">
					<AlertTriangle className="text-orange-500" size={20} />
					<Heading size="3">Conflict Resolution</Heading>
				</div>
				<div className="text-center py-8">
					{hasConflicts ? (
						<div className="space-y-4">
							<Text className="text-lg font-semibold text-orange-600">
								{conflicts.length} Conflict(s) Found
							</Text>
							<div className="space-y-3">
								{conflicts.map((conflict, index) => (
									<div
										key={index}
										className="p-4 border border-orange-200 rounded-lg bg-orange-50"
									>
										<Text className="font-semibold">
											Entity: {conflict.entityType}
										</Text>
										<Text className="text-sm text-gray-600">
											ID: {conflict.entityId}
										</Text>
										<div className="mt-3 space-x-2">
											<Button size="2" variant="solid">
												Use Local
											</Button>
											<Button size="2" variant="soft">
												Use Remote
											</Button>
											<Button size="2" variant="soft">
												Merge
											</Button>
										</div>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="space-y-2">
							<CheckCircle className="text-green-500 mx-auto" size={48} />
							<Text className="text-lg font-semibold text-green-600">
								No Conflicts
							</Text>
							<Text className="text-gray-600">All data is synchronized</Text>
						</div>
					)}
				</div>
			</Card>
		</div>
	);
}

function RefreshCwTab() {
	const {
		operations,
		pendingOperations,
		failedOperations,
		hasPendingOperations,
		hasFailedOperations,
		syncWithBackend,
		forceSync,
	} = useSyncStateContext();

	return (
		<div className="space-y-6">
			<Card className="p-6">
				<div className="flex items-center space-x-2 mb-4">
					<RefreshCw className="text-blue-500" size={20} />
					<Heading size="3">RefreshCw Operations</Heading>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
					<div className="text-center">
						<div className="text-2xl font-bold text-blue-600">
							{operations.length}
						</div>
						<Text className="text-sm text-gray-600">Total Operations</Text>
					</div>
					<div className="text-center">
						<div className="text-2xl font-bold text-orange-600">
							{pendingOperations.length}
						</div>
						<Text className="text-sm text-gray-600">Pending</Text>
					</div>
					<div className="text-center">
						<div className="text-2xl font-bold text-red-600">
							{failedOperations.length}
						</div>
						<Text className="text-sm text-gray-600">Failed</Text>
					</div>
				</div>
				<div className="space-x-2">
					<Button onClick={syncWithBackend} variant="solid" size="2">
						<RefreshCw size={16} className="mr-2" />
						Sync Now
					</Button>
					<Button onClick={forceSync} variant="soft" size="2">
						<RefreshCw size={16} className="mr-2" />
						Force Sync
					</Button>
				</div>
			</Card>

			{operations.length > 0 && (
				<Card className="p-6">
					<Heading size="3" className="mb-4">
						Recent Operations
					</Heading>
					<div className="space-y-2">
						{operations.slice(0, 10).map((operation, index) => (
							<div
								key={index}
								className="flex items-center justify-between p-3 border rounded-lg"
							>
								<div>
									<Text className="font-semibold">
										{operation.type} {operation.entity}
									</Text>
									<Text className="text-sm text-gray-600">
										ID: {operation.entityId}
									</Text>
								</div>
								<Badge
									variant={
										operation.status === "completed"
											? "solid"
											: operation.status === "failed"
												? "soft"
												: operation.status === "syncing"
													? "soft"
													: "soft"
									}
								>
									{operation.status}
								</Badge>
							</div>
						))}
					</div>
				</Card>
			)}
		</div>
	);
}

function OptimisticTab() {
	const { optimisticUpdates, hasOptimisticUpdates } =
		useOptimisticStateContext();

	return (
		<div className="space-y-6">
			<Card className="p-6">
				<div className="flex items-center space-x-2 mb-4">
					<Clock className="text-purple-500" size={20} />
					<Heading size="3">Optimistic Updates</Heading>
				</div>
				<div className="text-center py-8">
					{hasOptimisticUpdates ? (
						<div className="space-y-4">
							<Text className="text-lg font-semibold text-purple-600">
								{optimisticUpdates.length} Optimistic Update(s)
							</Text>
							<div className="space-y-3">
								{optimisticUpdates.map((update, index) => (
									<div
										key={index}
										className="p-4 border border-purple-200 rounded-lg bg-purple-50"
									>
										<Text className="font-semibold">
											{update.type} Operation
										</Text>
										<Text className="text-sm text-gray-600">
											{new Date(update.timestamp).toLocaleTimeString()}
										</Text>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="space-y-2">
							<CheckCircle className="text-green-500 mx-auto" size={48} />
							<Text className="text-lg font-semibold text-green-600">
								No Pending Updates
							</Text>
							<Text className="text-gray-600">
								All operations are synchronized
							</Text>
						</div>
					)}
				</div>
			</Card>
		</div>
	);
}

function LoadingState() {
	return (
		<div className="flex items-center justify-center py-12">
			<div className="text-center space-y-4">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
				<Text className="text-gray-600">
					Loading state management system...
				</Text>
			</div>
		</div>
	);
}

function ErrorState({ error }: { error: string }) {
	return (
		<div className="flex items-center justify-center py-12">
			<div className="text-center space-y-4">
				<AlertTriangle className="text-red-500 mx-auto" size={48} />
				<Text className="text-lg font-semibold text-red-600">
					Error Loading State
				</Text>
				<Text className="text-gray-600">{error}</Text>
			</div>
		</div>
	);
}

export default StateManagementDemo;
