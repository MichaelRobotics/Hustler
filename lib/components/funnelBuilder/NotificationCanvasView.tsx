"use client";

import React from "react";
import { Text, Heading } from "frosted-ui";
import { Bell, Plus, AlertTriangle, Clock, Trash2, ArrowRight, ChevronRight, CheckCircle, Edit, X } from "lucide-react";
import type { FunnelNotification, FunnelNotificationInput } from "@/lib/types/funnel";
import { formatStageName } from "../../utils/format-names";

const MAX_NOTIFICATIONS_PER_STAGE = 3;
const EXPLANATION_AREA_WIDTH = 250;
const BASE_STAGE_HEIGHT = 150;
const STAGE_GAP = 60;
const CARD_WIDTH = 320; // Max width of notification/reset card
const CARD_HEIGHT = 200; // Approximate height: card (~150px) + timer input (~50px) + gap
const CARD_GAP = 20; // Gap between cards
const ARROW_WIDTH = 40; // Width of arrow between cards
// Padding around canvas for centering
const CANVAS_PADDING = 200;
// Extra horizontal padding for panning when sidebar is open
const HORIZONTAL_EXTRA_PADDING = 1000;

interface Stage {
	id: string;
	name: string;
	explanation: string;
	blockIds: string[];
}

interface NotificationCanvasViewProps {
	funnelId: string;
	stages: Stage[];
	notifications: FunnelNotification[];
	selectedNotificationId?: string; // ID of notification being configured
	selectedNotificationSequence?: number; // Sequence for new notification being configured
	selectedNotificationStageId?: string; // Stage ID for new notification being configured
	selectedResetId?: string; // ID of reset being configured
	selectedResetStageId?: string; // Stage ID for reset being configured
	onNotificationClick: (notification: FunnelNotification | null, stageId: string, sequence: number) => void;
	onNotificationClose: () => void; // Close edit mode (deselect notification)
	onResetClick: (reset: FunnelNotification | null, stageId: string) => void;
	onNotificationDelete: (notificationId: string) => void;
	onNotificationChange: (notification: FunnelNotificationInput) => void; // Optimistic update
	onNotificationSave: (notification: FunnelNotificationInput) => void; // Save to backend
	onResetChange: (stageId: string, resetAction: "delete" | "complete", delayMinutes: number) => void; // Optimistic update
	onResetSave: (stageId: string, resetAction: "delete" | "complete", delayMinutes: number) => void; // Save to backend
	onBack?: () => void; // Optional - header handles navigation now
}

// Card Height Tracker Component - Uses ResizeObserver to track card heights
interface CardHeightTrackerProps {
	cardKey: string;
	onHeightChange: (height: number) => void;
	children: React.ReactNode;
}

const CardHeightTracker: React.FC<CardHeightTrackerProps> = ({ cardKey, onHeightChange, children }) => {
	const containerRef = React.useRef<HTMLDivElement>(null);
	const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

	React.useEffect(() => {
		const element = containerRef.current;
		if (!element) return;

		const resizeObserver = new ResizeObserver((entries) => {
			// Debounce updates to prevent flickering
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			
			timeoutRef.current = setTimeout(() => {
				for (const entry of entries) {
					const height = entry.contentRect.height;
					if (height > 0) {
						onHeightChange(height);
					}
				}
			}, 100); // 100ms debounce
		});

		resizeObserver.observe(element);

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			resizeObserver.disconnect();
		};
	}, [cardKey, onHeightChange]);

	return <div ref={containerRef}>{children}</div>;
};

/**
 * NotificationCanvasView Component
 * 
 * A canvas view for configuring reminder notifications per stage.
 * Matches Merchant view layout: level labels on left, notification cards on right.
 */
const NotificationCanvasView: React.FC<NotificationCanvasViewProps> = ({
	funnelId,
	stages,
	notifications,
	selectedNotificationId,
	selectedNotificationSequence,
	selectedNotificationStageId,
	selectedResetId,
	selectedResetStageId,
	onNotificationClick,
	onNotificationClose,
	onResetClick,
	onNotificationDelete,
	onNotificationChange,
	onNotificationSave,
	onResetChange,
	onResetSave,
	onBack,
}) => {
	// Get notifications for a specific stage
	const getStageNotifications = (stageId: string) => {
		return notifications
			.filter((n) => n.stageId === stageId && !n.isReset)
			.sort((a, b) => a.sequence - b.sequence);
	};

	// Check if stage has a reset card
	const getResetCard = (stageId: string) => {
		return notifications.find((n) => n.stageId === stageId && n.isReset);
	};

	// Get next sequence number
	const getNextSequence = (stageId: string) => {
		const stageNotifs = getStageNotifications(stageId);
		return stageNotifs.length + 1;
	};

	// Handle clicking notification card
	const handleNotificationClick = (notification: FunnelNotification | null, stageId: string, sequence: number) => {
		onNotificationClick(notification, stageId, sequence);
	};

	// Handle clicking reset card
	const handleResetClick = (reset: FunnelNotification | null, stageId: string) => {
		onResetClick(reset, stageId);
	};



	// Format time display
	const formatTime = (minutes: number) => {
		if (minutes < 60) return `${minutes} min`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
	};

	// Track actual card heights for dynamic recalculation
	const [cardHeights, setCardHeights] = React.useState<Record<string, number>>({});
	
	// Stable height change handler - uses functional update to avoid dependencies
	const handleHeightChange = React.useCallback((key: string, height: number) => {
		setCardHeights((prev) => {
			if (prev[key] === height) return prev; // Prevent unnecessary updates
			return { ...prev, [key]: height };
		});
	}, []);

	// Calculate total canvas height - use dynamic height based on cards
	const calculateStageHeight = (stageId: string) => {
		const stageNotifs = getStageNotifications(stageId);
		const hasReset = !!getResetCard(stageId);
		const totalCards = stageNotifs.length + (hasReset ? 1 : 0);
		
		if (totalCards === 0) {
			return BASE_STAGE_HEIGHT;
		}
		
		// Calculate max height from actual card measurements
		let maxCardHeight = CARD_HEIGHT; // Fallback to constant
		stageNotifs.forEach((notif) => {
			const cardKey = `notif-${notif.id}`;
			if (cardHeights[cardKey]) {
				maxCardHeight = Math.max(maxCardHeight, cardHeights[cardKey]);
			}
		});
		if (hasReset) {
			const resetKey = `reset-${stageId}`;
			if (cardHeights[resetKey]) {
				maxCardHeight = Math.max(maxCardHeight, cardHeights[resetKey]);
			}
		}
		
		// Use actual height + padding, or fallback to constant
		return Math.max(BASE_STAGE_HEIGHT, maxCardHeight + 40);
	};

	const totalHeight = stages.reduce((sum, stage) => {
		return sum + calculateStageHeight(stage.id) + STAGE_GAP;
	}, STAGE_GAP);

	// Drag functionality for 2D panning
	const containerRef = React.useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = React.useState(false);
	const [dragStart, setDragStart] = React.useState({ x: 0, y: 0, scrollX: 0, scrollY: 0 });

	// Handle mouse/touch drag for 2D panning
	const handleMouseDown = (e: React.MouseEvent) => {
		// Only left mouse button
		if (e.button !== 0) return;
		
		// Don't start drag if clicking on interactive elements
		const target = e.target as HTMLElement;
		if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('[data-no-drag]')) {
			return;
		}

		const container = containerRef.current;
		if (!container) return;

		setIsDragging(true);
		setDragStart({
			x: e.clientX,
			y: e.clientY,
			scrollX: container.scrollLeft,
			scrollY: container.scrollTop,
		});
		
		e.preventDefault();
	};

	const handleMouseMove = React.useCallback((e: MouseEvent) => {
		if (!isDragging) return;
		
		const container = containerRef.current;
		if (!container) return;

		const deltaX = e.clientX - dragStart.x;
		const deltaY = e.clientY - dragStart.y;
		
		container.scrollLeft = dragStart.scrollX - deltaX;
		container.scrollTop = dragStart.scrollY - deltaY;
	}, [isDragging, dragStart]);

	const handleMouseUp = React.useCallback(() => {
		setIsDragging(false);
	}, []);

	// Touch support
	const handleTouchStart = (e: React.TouchEvent) => {
		const target = e.target as HTMLElement;
		if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('[data-no-drag]')) {
			return;
		}

		const container = containerRef.current;
		if (!container) return;

		const touch = e.touches[0];
		setIsDragging(true);
		setDragStart({
			x: touch.clientX,
			y: touch.clientY,
			scrollX: container.scrollLeft,
			scrollY: container.scrollTop,
		});
	};

	const handleTouchMove = React.useCallback((e: TouchEvent) => {
		if (!isDragging) return;
		
		const container = containerRef.current;
		if (!container) return;

		const touch = e.touches[0];
		const deltaX = touch.clientX - dragStart.x;
		const deltaY = touch.clientY - dragStart.y;
		
		container.scrollLeft = dragStart.scrollX - deltaX;
		container.scrollTop = dragStart.scrollY - deltaY;
		
		e.preventDefault();
	}, [isDragging, dragStart]);

	const handleTouchEnd = React.useCallback(() => {
		setIsDragging(false);
	}, []);

	// Add/remove event listeners
	React.useEffect(() => {
		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
			document.addEventListener("touchmove", handleTouchMove, { passive: false });
			document.addEventListener("touchend", handleTouchEnd);
			
			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
				document.removeEventListener("touchmove", handleTouchMove);
				document.removeEventListener("touchend", handleTouchEnd);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

	// Total canvas dimensions with padding for centering
	// Add extra horizontal padding so user can pan left/right when sidebar overlaps content
	const itemCanvasWidth = 1200; // Available width for cards area
	
	// Calculate maximum possible cards width (3 notifications + 1 add button + 1 reset = 5 cards max)
	const maxCards = MAX_NOTIFICATIONS_PER_STAGE + 1 + 1; // 3 notifications + 1 add + 1 reset
	const maxCardsWidth = maxCards * CARD_WIDTH + (maxCards - 1) * (CARD_GAP + ARROW_WIDTH);
	
	// Calculate default cards width (1 notification + 1 reset = 2 cards) for consistent left margin
	const defaultCards = 2; // 1 notification + 1 reset
	const defaultCardsWidth = defaultCards * CARD_WIDTH + (CARD_GAP + ARROW_WIDTH);
	
	// Extra space needed for cards extending to the right
	const extraCardsWidth = maxCardsWidth - defaultCardsWidth;
	
	// Base content width (explanation area + cards area)
	const baseContentWidth = itemCanvasWidth + EXPLANATION_AREA_WIDTH;
	// Extended content width to accommodate cards extending to the right
	const contentWidth = baseContentWidth + extraCardsWidth;
	
	// Total canvas width - keep base width for proper centering, content can overflow to the right
	const totalWidth = baseContentWidth + (CANVAS_PADDING * 2) + HORIZONTAL_EXTRA_PADDING;
	
	// Content offset to keep content centered within the wider canvas
	const contentOffsetX = CANVAS_PADDING + (HORIZONTAL_EXTRA_PADDING / 2);
	// Match Merchant view: totalHeight + CANVAS_PADDING + 50 (no trigger section, so just add padding)
	const totalHeightWithPadding = totalHeight + CANVAS_PADDING + 50;

	return (
		<div className="h-full flex flex-col bg-gradient-to-br from-surface via-surface/95 to-surface/90">
			{/* Canvas Content */}
			<div 
				ref={containerRef}
				className="flex-1 overflow-auto relative items-start justify-center"
				style={{ 
					height: "100%",
					cursor: isDragging ? "grabbing" : "grab",
					display: "flex",
				}}
				onMouseDown={handleMouseDown}
				onTouchStart={handleTouchStart}
			>
				<div
					className="relative flex-shrink-0"
					style={{
						width: `${totalWidth}px`,
						height: `${totalHeightWithPadding}px`,
					}}
				>
					{/* Content container - offset to match Merchant view structure */}
					<div
						style={{
							position: "absolute",
							left: `${contentOffsetX}px`,
							top: `40px`, // Match Merchant view's content top offset
							width: `${contentWidth}px`,
						}}
					>
						{stages.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-16 text-center">
								<Bell className="w-12 h-12 text-gray-300 mb-4" />
								<Heading size="4" className="text-gray-500 mb-2">
									No stages available
								</Heading>
								<Text size="2" className="text-gray-400">
									Generate a funnel first to configure reminders
								</Text>
							</div>
						) : (
						stages.map((stage, index) => {
							const stageNotifs = getStageNotifications(stage.id);
							const resetCard = getResetCard(stage.id);
							const canAddNotification = stageNotifs.length < MAX_NOTIFICATIONS_PER_STAGE;
							
							// Calculate cumulative Y position for this stage
							// Start at 40px to match Merchant view's content top offset
							let stageY = 40;
							for (let i = 0; i < index; i++) {
								stageY += calculateStageHeight(stages[i].id) + STAGE_GAP;
							}
							
							// Calculate stage height for this stage
							const currentStageHeight = calculateStageHeight(stage.id);
							
							// Calculate total width needed for all cards
							// Always show at least 1 notification (default Standard), Add button if can add, and Reset
							const totalCards = Math.max(1, stageNotifs.length) + (canAddNotification ? 1 : 0) + (resetCard ? 1 : 0);
							const totalCardsWidth = totalCards * CARD_WIDTH + (totalCards > 1 ? (totalCards - 1) * (CARD_GAP + ARROW_WIDTH) : 0);
							
							// Keep fixed left margin from stage label - same as default state (1 notification + 1 reset)
							// Default: 2 cards (1 notification + 1 reset) with 1 gap/arrow
							const defaultCardsWidth = 2 * CARD_WIDTH + (CARD_GAP + ARROW_WIDTH);
							
							// Cards start at fixed position based on default state, extending to the right when there are more
							const cardsStartX = EXPLANATION_AREA_WIDTH + Math.max(0, (itemCanvasWidth - defaultCardsWidth) / 2);

							return (
								<React.Fragment key={stage.id}>
									{/* Stage Label - Left Side */}
									<div
										className="absolute text-left p-4"
										style={{
											left: `${extraCardsWidth / 8}px`, // Moderate offset to the right
											top: `${stageY}px`, // stageY already includes the 40px offset
											width: `${EXPLANATION_AREA_WIDTH}px`,
											height: `${currentStageHeight}px`,
											display: "flex",
											flexDirection: "column",
											justifyContent: "center",
										}}
									>
										<div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200/50 dark:border-violet-700/30 rounded-xl p-3">
											<h3 className="text-lg font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">
												{formatStageName(stage.name)}
											</h3>
											<p className="text-sm text-muted-foreground leading-relaxed">
												{stage.explanation}
											</p>
										</div>
									</div>

									{/* Notification Cards Row - Right Side - Centered vertically with stage label */}
									<div
										className="absolute flex items-center"
										style={{
											left: `${cardsStartX}px`,
											top: `${stageY + (currentStageHeight / 2)}px`, // Will be adjusted by flex items-center
											transform: "translateY(-50%)", // Center vertically
										}}
									>
										{/* Existing Notification Cards - Show first */}
										{stageNotifs.map((notif, notifIndex) => (
											<React.Fragment key={`${notif.id}-${notif.notificationType}-${notif.sequence}`}>
												<CardHeightTracker
													cardKey={`notif-${notif.id}`}
													onHeightChange={(height) => handleHeightChange(`notif-${notif.id}`, height)}
												>
													<NotificationCardInline
														notification={notif}
														formatTime={formatTime}
														isSelected={selectedNotificationId === notif.id}
														onClick={() => handleNotificationClick(notif, stage.id, notif.sequence)}
														onClose={onNotificationClose}
														onDelete={() => onNotificationDelete(notif.id)}
														onChange={onNotificationChange}
														onSave={onNotificationSave}
													/>
												</CardHeightTracker>
												{/* Arrow after each notification (except last) or before Add button */}
												{(notifIndex < stageNotifs.length - 1 || canAddNotification) && (
													<div className="flex-shrink-0 flex items-center justify-center px-2">
														<ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
													</div>
												)}
											</React.Fragment>
										))}

										{/* Add Notification Button - Shows AFTER first notification */}
										{canAddNotification && (() => {
											const nextSequence = getNextSequence(stage.id);
											const isSelected = !selectedNotificationId && 
												selectedNotificationSequence === nextSequence && 
												selectedNotificationStageId === stage.id;
											
											return (
												<>
													<button
														type="button"
														onClick={() => handleNotificationClick(null, stage.id, nextSequence)}
														className={`flex-shrink-0 w-10 h-10 border-2 rounded-lg flex items-center justify-center transition-colors shadow-lg ${
															isSelected
																? "border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-900/30 shadow-amber-500/50 dark:shadow-amber-500/40 ring-2 ring-amber-500/50 dark:ring-amber-400/50"
																: "border-amber-400 dark:border-amber-500 hover:border-amber-500 dark:hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 shadow-amber-500/30 dark:shadow-amber-500/20"
														}`}
														data-no-drag
													>
														<Plus className="w-5 h-5 text-amber-600 dark:text-amber-400 font-bold" />
													</button>
													{/* Arrow to Reset */}
													{resetCard && (
														<div className="flex-shrink-0 flex items-center justify-center px-2">
															<ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
														</div>
													)}
												</>
											);
										})()}

										{/* Arrow to Reset - if no Add button but there are notifications */}
										{!canAddNotification && stageNotifs.length > 0 && resetCard && (
											<div className="flex-shrink-0 flex items-center justify-center px-2">
												<ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
											</div>
										)}

										{/* Reset Card - Always shown */}
										<CardHeightTracker
											cardKey={`reset-${stage.id}`}
											onHeightChange={(height) => handleHeightChange(`reset-${stage.id}`, height)}
										>
											<ResetCardInline
												key={`reset-${stage.id}-${resetCard?.id || 'none'}-${resetCard?.resetAction || 'none'}`}
												resetCard={resetCard}
												isSelected={selectedResetId === resetCard?.id || (selectedResetId === null && selectedResetStageId === stage.id)}
												onClick={() => handleResetClick(resetCard || null, stage.id)}
												stageId={stage.id}
												onChange={onResetChange}
												onSave={onResetSave}
											/>
										</CardHeightTracker>
									</div>

									{/* Separator line between stages */}
									{index < stages.length - 1 && (
										<div
											className="absolute border-t-2 border-dashed border-violet-300 dark:border-violet-600 opacity-40"
											style={{
												left: `${EXPLANATION_AREA_WIDTH}px`,
												top: `${stageY + currentStageHeight + STAGE_GAP / 2}px`, // stageY already includes the 40px offset
												width: `${itemCanvasWidth}px`,
												marginLeft: "20px",
												marginRight: "20px",
											}}
										/>
									)}
								</React.Fragment>
							);
						})
					)}
					</div>
				</div>
			</div>
		</div>
	);
};

// Inline Notification Card Component - With inline editing
interface NotificationCardInlineProps {
	notification: FunnelNotification;
	formatTime: (minutes: number) => string;
	isSelected: boolean;
	onClick: () => void;
	onClose: () => void; // Close edit mode (deselect)
	onDelete: () => void;
	onChange: (input: FunnelNotificationInput) => void; // Optimistic update
	onSave: (input: FunnelNotificationInput) => void; // Save to backend
}

const NotificationCardInline: React.FC<NotificationCardInlineProps> = ({
	notification,
	formatTime,
	isSelected,
	onClick,
	onClose,
	onDelete,
	onChange,
	onSave,
}) => {
	const [localMessage, setLocalMessage] = React.useState(notification.message || "");
	const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
	const cardRef = React.useRef<HTMLDivElement>(null);
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const standardTextareaRef = React.useRef<HTMLTextAreaElement>(null);
	
	// Expose a callback to parent for height updates (we'll use a different approach)
	// Instead, we'll use ResizeObserver directly in the parent component

	const notificationType = notification.notificationType || "custom";
	const isCustom = notificationType === "custom";

	// Time unit type
	type TimeUnit = "minutes" | "hours" | "days";
	
	// Helper function to determine best unit for display
	const getBestUnit = (minutes: number): { value: number; unit: TimeUnit } => {
		if (minutes === 0) return { value: 0, unit: "minutes" };
		if (minutes % (24 * 60) === 0) {
			return { value: minutes / (24 * 60), unit: "days" };
		}
		if (minutes % 60 === 0) {
			return { value: minutes / 60, unit: "hours" };
		}
		return { value: minutes, unit: "minutes" };
	};

	// Helper function to convert to minutes
	const convertToMinutes = (value: number, unit: TimeUnit): number => {
		switch (unit) {
			case "days":
				return value * 24 * 60;
			case "hours":
				return value * 60;
			case "minutes":
			default:
				return value;
		}
	};

	// Initialize display value and unit
	const initialDisplay = getBestUnit(notification.inactivityMinutes || 30);
	const [localDisplayValue, setLocalDisplayValue] = React.useState(initialDisplay.value);
	const [localTimeUnit, setLocalTimeUnit] = React.useState<TimeUnit>(initialDisplay.unit);

	// Auto-resize textarea in edit mode - triggers ResizeObserver on card
	React.useEffect(() => {
		if (isSelected && isCustom && textareaRef.current) {
			const textarea = textareaRef.current;
			// Reset height to auto to get the correct scrollHeight
			textarea.style.height = "auto";
			// Set height to scrollHeight to fit all content
			textarea.style.height = `${textarea.scrollHeight}px`;
		}
	}, [localMessage, isSelected, isCustom]);

	// Auto-resize standard textarea when selected to show full message
	React.useEffect(() => {
		if (isSelected && !isCustom && standardTextareaRef.current) {
			const textarea = standardTextareaRef.current;
			// Reset height to auto to get the correct scrollHeight
			textarea.style.height = "auto";
			// Set height to scrollHeight to fit all content
			textarea.style.height = `${textarea.scrollHeight}px`;
		}
	}, [notification.message, isSelected, isCustom]);

	// Sync local state when notification changes
	React.useEffect(() => {
		setLocalMessage(notification.message || "");
		const display = getBestUnit(notification.inactivityMinutes || 30);
		setLocalDisplayValue(display.value);
		setLocalTimeUnit(display.unit);
		setHasUnsavedChanges(false);
	}, [notification.id, notification.message, notification.inactivityMinutes, notification.notificationType]);

	const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		if (!isCustom) return; // Only allow editing for custom type
		
		const newMessage = e.target.value;
		setLocalMessage(newMessage);
		setHasUnsavedChanges(true);
		
		// Auto-resize textarea immediately on change
		const textarea = e.target;
		textarea.style.height = "auto";
		textarea.style.height = `${textarea.scrollHeight}px`;
		
		// No auto-save - changes only saved when user clicks Save button
	};

	const handleTimerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseFloat(e.target.value);
		const newValue = isNaN(value) ? 0 : Math.max(0, value);
		setLocalDisplayValue(newValue);
		const minutesValue = convertToMinutes(newValue, localTimeUnit);
		setHasUnsavedChanges(minutesValue !== notification.inactivityMinutes);
		// No auto-save - changes only saved when user clicks Save button
	};

	const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newUnit = e.target.value as TimeUnit;
		// Convert current display value to minutes, then to new unit
		const currentMinutes = convertToMinutes(localDisplayValue, localTimeUnit);
		let newDisplayValue = localDisplayValue;
		if (newUnit === "days" && currentMinutes % (24 * 60) === 0) {
			newDisplayValue = currentMinutes / (24 * 60);
		} else if (newUnit === "hours" && currentMinutes % 60 === 0) {
			newDisplayValue = currentMinutes / 60;
		} else if (newUnit === "minutes") {
			newDisplayValue = currentMinutes;
		} else {
			// Convert to new unit (may have decimals)
			if (newUnit === "days") {
				newDisplayValue = currentMinutes / (24 * 60);
			} else if (newUnit === "hours") {
				newDisplayValue = currentMinutes / 60;
			}
		}
		setLocalDisplayValue(Math.round(newDisplayValue * 100) / 100); // Round to 2 decimals
		setLocalTimeUnit(newUnit);
		const minutesValue = convertToMinutes(newDisplayValue, newUnit);
		setHasUnsavedChanges(minutesValue !== notification.inactivityMinutes);
		// No auto-save - changes only saved when user clicks Save button
	};

	const handleSave = (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		const minutesValue = convertToMinutes(localDisplayValue, localTimeUnit);
		onSave({
			funnelId: notification.funnelId,
			stageId: notification.stageId,
			sequence: notification.sequence,
			inactivityMinutes: minutesValue,
			message: localMessage,
			notificationType: notificationType,
			isReset: false,
		});
		setHasUnsavedChanges(false);
		// Close edit mode after saving
		onClose();
	};
	
	const handleClose = (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		// Reset local state to original values
		setLocalMessage(notification.message || "");
		const display = getBestUnit(notification.inactivityMinutes || 30);
		setLocalDisplayValue(display.value);
		setLocalTimeUnit(display.unit);
		setHasUnsavedChanges(false);
		// Close edit mode
		onClose();
	};

	const colorClasses = {
		bg: "bg-amber-50 dark:bg-amber-900/20",
		border: "border-amber-200 dark:border-amber-700/50",
		iconBg: "bg-amber-100 dark:bg-amber-800/50",
		iconText: "text-amber-600 dark:text-amber-400",
		text: "text-amber-700 dark:text-amber-300",
	};

	return (
		<div ref={cardRef} className="flex flex-col gap-2 w-[320px] flex-shrink-0">
			{/* Card container matching TriggerBlock */}
			<div
				className={`
					group relative flex flex-col gap-3 px-4 py-3 rounded-xl
					${colorClasses.bg} ${colorClasses.border} border
					hover:shadow-md transition-all duration-200
					${isSelected ? "ring-2 ring-amber-500/50 dark:ring-amber-400/50" : ""}
				`}
			>
				{/* Clickable button for selection */}
				<button
					type="button"
					onClick={onClick}
					className="flex items-center gap-3 cursor-pointer w-full"
				>
					{/* Icon */}
					<div className={`
						flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
						${colorClasses.iconBg} ${colorClasses.iconText}
					`}>
						<Bell className="w-5 h-5" />
					</div>

					{/* Content */}
					<div className="flex flex-col items-start flex-1 min-w-0">
						<span className={`text-sm font-medium ${colorClasses.text}`}>
							Notification #{notification.sequence}
						</span>
					</div>
				</button>

				{/* Message - editable if custom and selected, full read-only if standard and selected, preview otherwise */}
				{isSelected && isCustom ? (
					// Custom notification in edit mode - editable and auto-resizing
					<div className="w-full" onClick={(e) => e.stopPropagation()} data-no-drag>
						<textarea
							ref={textareaRef}
							value={localMessage}
							onChange={handleMessageChange}
							placeholder="Enter notification message..."
							className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none overflow-hidden"
							rows={1}
							style={{ minHeight: "60px" }}
							data-no-drag
						/>
					</div>
				) : isSelected && !isCustom ? (
					// Standard notification selected - show full message, read-only, auto-resizing
					<div className="w-full" onClick={(e) => e.stopPropagation()} data-no-drag>
						<textarea
							ref={standardTextareaRef}
							value={notification.message || ""}
							disabled
							readOnly
							placeholder="Message will be copied from the last bot message in this stage"
							className="w-full px-2 py-1.5 text-sm bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md resize-none opacity-75 cursor-default overflow-hidden"
							rows={1}
							style={{ minHeight: "60px" }}
							data-no-drag
						/>
					</div>
				) : (
					// Not selected - show first 2 lines preview
					<div className="w-full" onClick={(e) => e.stopPropagation()} data-no-drag>
						<textarea
							value={notification.message || ""}
							disabled
							readOnly
							placeholder={notificationType === "standard" ? "Message will be copied from the last bot message in this stage" : "Enter notification message..."}
							className="w-full px-2 py-1.5 text-sm bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md resize-none opacity-75 cursor-default"
							rows={2}
							style={{ height: "60px", overflowY: "hidden", lineHeight: "1.5" }}
							data-no-drag
						/>
					</div>
				)}

				{/* Edit/Close Actions - Only show for Custom notifications */}
				{isCustom && (
					<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center gap-1">
						{isSelected ? (
							// Show Close icon when in edit mode
							<button
								type="button"
								onClick={handleClose}
								onMouseDown={(e) => e.stopPropagation()}
								className="p-1.5 bg-white dark:bg-gray-800 rounded shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
								title="Close"
							>
								<X className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
							</button>
						) : (
							// Show Edit icon when not in edit mode
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onClick(); // Trigger edit mode (select notification)
								}}
								onMouseDown={(e) => e.stopPropagation()}
								className="p-1.5 bg-white dark:bg-gray-800 rounded shadow-sm hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-gray-200 dark:border-gray-700"
								title="Edit"
							>
								<Edit className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
							</button>
						)}
					</div>
				)}

				{/* Delete Action - Show for notifications 2 and 3 (both Custom and Standard) */}
				{notification.sequence >= 2 && (
					<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center gap-1">
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onDelete();
							}}
							onMouseDown={(e) => e.stopPropagation()}
							className="p-1.5 bg-white dark:bg-gray-800 rounded shadow-sm hover:bg-red-100 dark:hover:bg-red-900/30 border border-gray-200 dark:border-gray-700"
							title="Delete"
						>
							<Trash2 className="w-3.5 h-3.5 text-red-500" />
						</button>
					</div>
				)}
			</div>

			{/* Timer Input - below card like TriggerBlock */}
			<div 
				className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
				onClick={(e) => e.stopPropagation()}
				data-no-drag
			>
				<Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
				<span className="text-xs text-gray-600 dark:text-gray-400">After</span>
				<input
					type="number"
					min="0"
					step={localTimeUnit === "minutes" ? "1" : "0.01"}
					value={localDisplayValue}
					onChange={handleTimerChange}
					onClick={(e) => e.stopPropagation()}
					className="w-16 px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/50"
					data-no-drag
				/>
				<select
					value={localTimeUnit}
					onChange={handleUnitChange}
					onClick={(e) => e.stopPropagation()}
					className="px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/50"
					data-no-drag
				>
					<option value="minutes">min</option>
					<option value="hours">hours</option>
					<option value="days">days</option>
				</select>
				{hasUnsavedChanges && (
					<button
						type="button"
						onClick={handleSave}
						onMouseDown={(e) => e.stopPropagation()}
						className="ml-auto px-3 py-1 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 rounded-md transition-colors"
						data-no-drag
					>
						Save
					</button>
				)}
			</div>
		</div>
	);
};

// Inline Reset Card Component - With inline editing
interface ResetCardInlineProps {
	resetCard?: FunnelNotification;
	isSelected: boolean;
	onClick: () => void;
	stageId: string;
	onChange: (stageId: string, resetAction: "delete" | "complete", delayMinutes: number) => void; // Optimistic update
	onSave: (stageId: string, resetAction: "delete" | "complete", delayMinutes: number) => void; // Save to backend
}

const ResetCardInline: React.FC<ResetCardInlineProps> = ({ 
	resetCard, 
	isSelected, 
	onClick,
	stageId,
	onChange,
	onSave,
}) => {
	// Time unit type
	type TimeUnit = "minutes" | "hours" | "days";
	
	// Helper function to determine best unit for display
	const getBestUnit = (minutes: number): { value: number; unit: TimeUnit } => {
		if (minutes === 0) return { value: 0, unit: "minutes" };
		if (minutes % (24 * 60) === 0) {
			return { value: minutes / (24 * 60), unit: "days" };
		}
		if (minutes % 60 === 0) {
			return { value: minutes / 60, unit: "hours" };
		}
		return { value: minutes, unit: "minutes" };
	};

	// Helper function to convert to minutes
	const convertToMinutes = (value: number, unit: TimeUnit): number => {
		switch (unit) {
			case "days":
				return value * 24 * 60;
			case "hours":
				return value * 60;
			case "minutes":
			default:
				return value;
		}
	};

	// Initialize display value and unit
	const initialDelay = resetCard?.delayMinutes || 60;
	const initialDisplay = getBestUnit(initialDelay);
	const [localDisplayValue, setLocalDisplayValue] = React.useState(initialDisplay.value);
	const [localTimeUnit, setLocalTimeUnit] = React.useState<TimeUnit>(initialDisplay.unit);
	const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

	// Sync local state when reset card changes
	React.useEffect(() => {
		const delay = resetCard?.delayMinutes || 60;
		const display = getBestUnit(delay);
		setLocalDisplayValue(display.value);
		setLocalTimeUnit(display.unit);
		setHasUnsavedChanges(false);
	}, [resetCard?.id, resetCard?.delayMinutes, resetCard?.resetAction]);

	const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseFloat(e.target.value);
		const newValue = isNaN(value) ? 0 : Math.max(0, value);
		setLocalDisplayValue(newValue);
		const minutesValue = convertToMinutes(newValue, localTimeUnit);
		setHasUnsavedChanges(minutesValue !== (resetCard?.delayMinutes || 60));
		// No auto-save - changes only saved when user clicks Save button
	};

	const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newUnit = e.target.value as TimeUnit;
		// Convert current display value to minutes, then to new unit
		const currentMinutes = convertToMinutes(localDisplayValue, localTimeUnit);
		let newDisplayValue = localDisplayValue;
		if (newUnit === "days" && currentMinutes % (24 * 60) === 0) {
			newDisplayValue = currentMinutes / (24 * 60);
		} else if (newUnit === "hours" && currentMinutes % 60 === 0) {
			newDisplayValue = currentMinutes / 60;
		} else if (newUnit === "minutes") {
			newDisplayValue = currentMinutes;
		} else {
			// Convert to new unit (may have decimals)
			if (newUnit === "days") {
				newDisplayValue = currentMinutes / (24 * 60);
			} else if (newUnit === "hours") {
				newDisplayValue = currentMinutes / 60;
			}
		}
		setLocalDisplayValue(Math.round(newDisplayValue * 100) / 100); // Round to 2 decimals
		setLocalTimeUnit(newUnit);
		const minutesValue = convertToMinutes(newDisplayValue, newUnit);
		setHasUnsavedChanges(minutesValue !== (resetCard?.delayMinutes || 60));
		// No auto-save - changes only saved when user clicks Save button
	};

	const handleSave = (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		if (resetCard) {
			const minutesValue = convertToMinutes(localDisplayValue, localTimeUnit);
			onSave(stageId, resetCard.resetAction || "delete", minutesValue);
			setHasUnsavedChanges(false);
		}
	};

	const colorClasses = {
		bg: "bg-red-50 dark:bg-red-900/20",
		border: "border-red-200 dark:border-red-700/50",
		iconBg: "bg-red-100 dark:bg-red-800/50",
		iconText: "text-red-600 dark:text-red-400",
		text: "text-red-700 dark:text-red-300",
	};

	// Get reset action text and icon - default to "delete" if no reset card
	const resetAction = resetCard?.resetAction || "delete";
	const resetActionText = resetAction === "complete"
		? "Mark as completed"
		: "Delete Merchant conversation"; // Default to "delete"
	const resetActionDescription = resetAction === "complete"
		? "Merchant conversations will be marked as completed after the delay period"
		: "Merchant conversations will be deleted after the delay period";
	const ResetIcon = resetAction === "complete" ? CheckCircle : Trash2;

	return (
		<div className="flex flex-col gap-2 w-[320px] flex-shrink-0">
			{/* Card container matching TriggerBlock */}
			<div
				className={`
					group relative flex flex-col gap-3 px-4 py-3 rounded-xl
					${colorClasses.bg} ${colorClasses.border} border
					hover:shadow-md transition-all duration-200
					${isSelected ? "ring-2 ring-red-500/50 dark:ring-red-400/50" : ""}
				`}
			>
				{/* Clickable button for selection */}
				<button
					type="button"
					onClick={onClick}
					className="flex items-center gap-3 cursor-pointer w-full"
					data-no-drag
				>
					{/* Icon */}
					<div className={`
						flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
						${colorClasses.iconBg} ${colorClasses.iconText}
					`}>
						<ResetIcon className="w-5 h-5" />
					</div>

					{/* Content */}
					<div className="flex flex-col items-start flex-1 min-w-0">
						<span className={`text-sm font-medium ${colorClasses.text}`}>
							{resetActionText}
						</span>
					</div>
				</button>

				{/* Description textarea - shows full description of current reset type */}
				<div className="w-full" onClick={(e) => e.stopPropagation()} data-no-drag>
					<textarea
						value={resetActionDescription}
						disabled
						readOnly
						className="w-full px-2 py-1.5 text-sm bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md resize-none opacity-75 cursor-default"
						rows={3}
						style={{ height: "60px", overflowY: "auto" }}
						data-no-drag
					/>
				</div>
			</div>

			{/* Delay Input - below card like TriggerBlock */}
			<div 
				className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
				onClick={(e) => e.stopPropagation()}
				data-no-drag
			>
				<Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
				<span className="text-xs text-gray-600 dark:text-gray-400">After</span>
				<input
					type="number"
					min="0"
					step={localTimeUnit === "minutes" ? "1" : "0.01"}
					value={localDisplayValue}
					onChange={handleDelayChange}
					onClick={(e) => e.stopPropagation()}
					disabled={!resetCard && !isSelected}
					className="w-16 px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
					title={!resetCard && !isSelected ? "Click the reset card first to create a reset" : ""}
					data-no-drag
				/>
				<select
					value={localTimeUnit}
					onChange={handleUnitChange}
					onClick={(e) => e.stopPropagation()}
					disabled={!resetCard && !isSelected}
					className="px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
					data-no-drag
				>
					<option value="minutes">min</option>
					<option value="hours">hours</option>
					<option value="days">days</option>
				</select>
				{hasUnsavedChanges && resetCard && (
					<button
						type="button"
						onClick={handleSave}
						onMouseDown={(e) => e.stopPropagation()}
						className="ml-auto px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-md transition-colors"
						data-no-drag
					>
						Save
					</button>
				)}
			</div>
		</div>
	);
};

export default NotificationCanvasView;
