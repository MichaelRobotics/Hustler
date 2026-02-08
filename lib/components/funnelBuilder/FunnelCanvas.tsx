"use client";

import React from "react";
import TriggerBlock, { type TriggerType } from "./TriggerBlock";

interface FunnelCanvasProps {
	children: React.ReactNode;
	itemCanvasWidth: number;
	totalCanvasHeight: number;
	EXPLANATION_AREA_WIDTH: number;
	editingBlockId?: string | null;
	selectedTrigger?: TriggerType; // Trigger for the selected category (derived from parent)
	membershipTrigger?: TriggerType;
	appTrigger?: TriggerType;
	triggerConfig?: { resourceId?: string; funnelId?: string; cancelType?: "any" | "specific" }; // Config for selected category (derived from parent)
	membershipTriggerConfig?: { resourceId?: string; funnelId?: string; cancelType?: "any" | "specific" };
	appTriggerConfig?: { resourceId?: string; funnelId?: string; cancelType?: "any" | "specific" };
	delayMinutes?: number; // App trigger delay (backward compatibility)
	membershipDelayMinutes?: number; // Membership trigger delay
	experienceId?: string;
	resources?: Array<{ id: string; name: string }>;
	funnels?: Array<{ id: string; name: string }>;
	qualificationFunnels?: Array<{ id: string; name: string }>;
	upsellFunnels?: Array<{ id: string; name: string }>;
	loadingResources?: boolean;
	loadingFunnels?: boolean;
	onResourceChange?: (resourceId: string) => void;
	onFunnelChange?: (funnelId: string) => void;
	onMembershipFilterChange?: (updates: { filterResourceIdsRequired?: string[]; filterResourceIdsExclude?: string[] }) => void;
	onAppFilterChange?: (updates: { filterResourceIdsRequired?: string[]; filterResourceIdsExclude?: string[] }) => void;
	profiles?: Array<{ id: string; name: string }>;
	onQualificationProfileChange?: (profileId: string) => void;
	onTriggerClick?: () => void; // Backward compatibility
	onMembershipTriggerClick?: () => void;
	onAppTriggerClick?: () => void;
	onDelayChange?: (minutes: number) => void; // App trigger delay (backward compatibility)
	onMembershipDelayChange?: (minutes: number) => void; // Membership trigger delay
	onDelaySave?: (minutes: number) => void; // App trigger delay (backward compatibility)
	onMembershipDelaySave?: (minutes: number) => void; // Membership trigger delay
	hasUnsavedTriggerConfig?: boolean;
	onTriggerConfigSave?: () => void;
	hasUnsavedAppTriggerConfig?: boolean;
	hasUnsavedMembershipTriggerConfig?: boolean;
	onAppTriggerConfigSave?: () => void;
	onMembershipTriggerConfigSave?: () => void;
	startBlockId?: string;
	firstBlockY?: number;
	firstStageY?: number;
	firstStageHeight?: number;
	/** When true, trigger arrow ends at the Send DM message icon (first stage) instead of the separator */
	isFirstStageSendDm?: boolean;
}

// Base height of the trigger stage section
// Will be adjusted dynamically based on actual trigger block height
const BASE_TRIGGER_STAGE_HEIGHT = 120;
// Padding around canvas for centering
const CANVAS_PADDING = 200;
// Extra horizontal padding for panning when sidebar is open
const HORIZONTAL_EXTRA_PADDING = 1000;

const FunnelCanvas: React.FC<FunnelCanvasProps> = ({
	children,
	itemCanvasWidth,
	totalCanvasHeight,
	EXPLANATION_AREA_WIDTH,
	editingBlockId,
	selectedTrigger = "on_app_entry",
	membershipTrigger,
	appTrigger,
	triggerConfig = {},
	membershipTriggerConfig = {},
	appTriggerConfig = {},
	delayMinutes = 0, // App trigger delay (backward compatibility)
	membershipDelayMinutes = 0, // Membership trigger delay
	experienceId,
	resources = [],
	funnels = [],
	qualificationFunnels = [],
	upsellFunnels = [],
	loadingResources = false,
	loadingFunnels = false,
	onResourceChange,
	onFunnelChange,
	onMembershipFilterChange,
	onAppFilterChange,
	profiles = [],
	onQualificationProfileChange,
	onTriggerClick, // Backward compatibility
	onMembershipTriggerClick,
	onAppTriggerClick,
	onDelayChange, // App trigger delay (backward compatibility)
	onMembershipDelayChange, // Membership trigger delay
	onDelaySave, // App trigger delay (backward compatibility)
	onMembershipDelaySave, // Membership trigger delay
	hasUnsavedTriggerConfig,
	onTriggerConfigSave,
	hasUnsavedAppTriggerConfig,
	hasUnsavedMembershipTriggerConfig,
	onAppTriggerConfigSave,
	onMembershipTriggerConfigSave,
	startBlockId,
	firstBlockY = 80,
	firstStageY = 80,
	firstStageHeight = 150,
	isFirstStageSendDm = false,
}) => {
	const containerRef = React.useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = React.useState(false);
	const [dragStart, setDragStart] = React.useState({ x: 0, y: 0, scrollX: 0, scrollY: 0 });

	// Handle mouse/touch drag for 2D panning
	const handleMouseDown = (e: React.MouseEvent) => {
		// Disable scrolling when editing any block
		if (editingBlockId) return;
		
		// Only left mouse button
		if (e.button !== 0) return;
		
		// Don't start drag if clicking on interactive elements
		const target = e.target as HTMLElement;
		if (target.closest('button') || target.closest('input') || target.closest('[data-no-drag]')) {
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
		if (editingBlockId) return;
		
		const target = e.target as HTMLElement;
		if (target.closest('button') || target.closest('input') || target.closest('[data-no-drag]')) {
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

	// Gap between trigger stage and first stage
	const STAGE_GAP = 60;
	
	// Ref to measure actual trigger block height
	const triggerBlockRef = React.useRef<HTMLDivElement>(null);
	const [triggerBlockHeight, setTriggerBlockHeight] = React.useState(128); // Default fallback
	
	// Measure trigger block height when it changes (e.g., dropdown appears/disappears)
	React.useEffect(() => {
		if (triggerBlockRef.current) {
			const height = triggerBlockRef.current.offsetHeight;
			if (height > 0) {
				setTriggerBlockHeight(height);
			}
		}
	}, [selectedTrigger, membershipTrigger, appTrigger, triggerConfig, membershipTriggerConfig, appTriggerConfig, resources, funnels]);
	
	// Use ResizeObserver to detect size changes in real-time
	React.useEffect(() => {
		const element = triggerBlockRef.current;
		if (!element) return;
		
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const height = entry.contentRect.height;
				if (height > 0) {
					setTriggerBlockHeight(height);
				}
			}
		});
		
		resizeObserver.observe(element);
		
		return () => {
			resizeObserver.disconnect();
		};
	}, [selectedTrigger, membershipTrigger, appTrigger, triggerConfig, membershipTriggerConfig, appTriggerConfig, resources, funnels]);
	
	// Also measure on window resize as fallback
	React.useEffect(() => {
		const handleResize = () => {
			if (triggerBlockRef.current) {
				const height = triggerBlockRef.current.offsetHeight;
				if (height > 0) {
					setTriggerBlockHeight(height);
				}
			}
		};
		
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);
	
	// Calculate dynamic trigger stage height to accommodate the trigger block
	// Add padding (20px top + 20px bottom) to ensure the block fits comfortably
	const TRIGGER_STAGE_HEIGHT = Math.max(BASE_TRIGGER_STAGE_HEIGHT, triggerBlockHeight + 40);
	
	// Trigger stage is positioned at a fixed offset from the top of the canvas
	// This ensures consistent positioning regardless of first stage position
	const triggerStageY = 40; // Fixed position from canvas top
	
	// Trigger block positioned within the trigger stage area, centered horizontally
	// Use contentOffsetX to keep centered within wider canvas
	const triggerBlockX = EXPLANATION_AREA_WIDTH + (itemCanvasWidth / 2) + CANVAS_PADDING + (HORIZONTAL_EXTRA_PADDING / 2);
	const triggerBlockY = triggerStageY + (TRIGGER_STAGE_HEIGHT - triggerBlockHeight) / 2;
	
	// Separator line position (between trigger stage and first stage)
	const separatorY = triggerStageY + TRIGGER_STAGE_HEIGHT + (STAGE_GAP / 2);
	// When first stage is Send DM, arrow ends at the TOP of the icon/card (not center or bottom)
	const triggerSectionHeightForLine = TRIGGER_STAGE_HEIGHT + STAGE_GAP;
	const sendDmIconTopY = triggerSectionHeightForLine + 40 + firstStageY;
	
	// Line coordinates: from bottom of trigger block to separator or to Send DM icon
	const lineStartY = triggerBlockY + triggerBlockHeight;
	const lineEndY = isFirstStageSendDm ? sendDmIconTopY : separatorY;

	// Total canvas dimensions with padding for centering
	// Add extra horizontal padding so user can pan left/right when sidebar overlaps content
	const totalWidth = itemCanvasWidth + EXPLANATION_AREA_WIDTH + (CANVAS_PADDING * 2) + HORIZONTAL_EXTRA_PADDING;
	// Content offset to keep funnel centered within the wider canvas
	const contentOffsetX = CANVAS_PADDING + (HORIZONTAL_EXTRA_PADDING / 2);
	// Add extra space at top for trigger section (trigger stage + gap)
	const triggerSectionHeight = TRIGGER_STAGE_HEIGHT + STAGE_GAP;
	const totalHeight = totalCanvasHeight + CANVAS_PADDING + triggerSectionHeight + 50;

	return (
		<div 
			ref={containerRef}
			className="hidden md:flex h-full w-full overflow-auto relative items-start justify-center"
			style={{
				cursor: editingBlockId ? "default" : (isDragging ? "grabbing" : "grab"),
			}}
			onMouseDown={handleMouseDown}
			onTouchStart={handleTouchStart}
		>
			{/* Canvas content with padding for centering */}
			<div
				className="relative flex-shrink-0"
				style={{
					width: `${totalWidth}px`,
					height: `${totalHeight}px`,
				}}
			>
				{/* Trigger Block - Positioned in the trigger stage area */}
				{(onTriggerClick || onMembershipTriggerClick || onAppTriggerClick) && (
					<div
						ref={triggerBlockRef}
						className="absolute z-10"
						style={{
							left: `${triggerBlockX}px`,
							top: `${triggerBlockY}px`,
							transform: "translateX(-50%)",
						}}
						data-no-drag
					>
					<TriggerBlock
						selectedTrigger={selectedTrigger}
						membershipTrigger={membershipTrigger}
						appTrigger={appTrigger}
						triggerConfig={triggerConfig} // Backward compatibility
						membershipTriggerConfig={membershipTriggerConfig}
						appTriggerConfig={appTriggerConfig}
						delayMinutes={delayMinutes} // App trigger delay (backward compatibility)
						membershipDelayMinutes={membershipDelayMinutes} // Membership trigger delay
						experienceId={experienceId}
						resources={resources}
						funnels={funnels}
						qualificationFunnels={qualificationFunnels}
						upsellFunnels={upsellFunnels}
						loadingResources={loadingResources}
						loadingFunnels={loadingFunnels}
						onClick={onTriggerClick} // Backward compatibility
						onMembershipTriggerClick={onMembershipTriggerClick}
						onAppTriggerClick={onAppTriggerClick}
						onDelayChange={onDelayChange} // App trigger delay (backward compatibility)
						onMembershipDelayChange={onMembershipDelayChange} // Membership trigger delay
						onDelaySave={onDelaySave} // App trigger delay (backward compatibility)
						onMembershipDelaySave={onMembershipDelaySave} // Membership trigger delay
						hasUnsavedTriggerConfig={hasUnsavedTriggerConfig}
						onTriggerConfigSave={onTriggerConfigSave}
						hasUnsavedAppTriggerConfig={hasUnsavedAppTriggerConfig}
						hasUnsavedMembershipTriggerConfig={hasUnsavedMembershipTriggerConfig}
						onAppTriggerConfigSave={onAppTriggerConfigSave}
						onMembershipTriggerConfigSave={onMembershipTriggerConfigSave}
						onResourceChange={onResourceChange}
						onFunnelChange={onFunnelChange}
						onMembershipFilterChange={onMembershipFilterChange}
						onAppFilterChange={onAppFilterChange}
						profiles={profiles}
						onQualificationProfileChange={onQualificationProfileChange}
					/>
					</div>
				)}

				{/* Dashed separator line between trigger and first stage */}
				{(onTriggerClick || onMembershipTriggerClick || onAppTriggerClick) && (
					<div
						className="absolute border-t-2 border-dashed border-violet-300 dark:border-violet-600 opacity-40"
						style={{
							left: `${EXPLANATION_AREA_WIDTH + contentOffsetX}px`,
							top: `${separatorY}px`,
							width: `${itemCanvasWidth}px`,
							marginLeft: "20px",
							marginRight: "20px",
						}}
					/>
				)}

				{/* SVG Connection Line from Trigger to First Block */}
				{(onTriggerClick || onMembershipTriggerClick || onAppTriggerClick) && startBlockId && lineEndY > lineStartY && (() => {
					// Calculate adaptive control points based on actual distance
					const distance = lineEndY - lineStartY;
					const controlOffset = Math.min(distance * 0.4, 30); // Use 40% of distance, max 30px
					const cp1Y = lineStartY + controlOffset;
					const cp2Y = lineEndY - controlOffset;
					
					return (
						<svg
							className="absolute top-0 left-0 w-full h-full pointer-events-none"
							style={{ overflow: "visible", zIndex: 5 }}
						>
							<defs>
								<marker
									id="trigger-arrow"
									viewBox="0 0 10 10"
									refX="8"
									refY="5"
									markerWidth="6"
									markerHeight="6"
									orient="auto-start-reverse"
								>
									<path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6" />
								</marker>
							</defs>
							{/* Curved line from trigger block to separator - adaptive control points */}
							<path
								d={`M ${triggerBlockX} ${lineStartY} C ${triggerBlockX} ${cp1Y}, ${triggerBlockX} ${cp2Y}, ${triggerBlockX} ${lineEndY}`}
								stroke="#8b5cf6"
								strokeWidth="2"
								strokeDasharray="6 4"
								fill="none"
								markerEnd="url(#trigger-arrow)"
								opacity="0.7"
							/>
						</svg>
					);
				})()}

				{/* Main canvas content - offset to account for trigger section + padding */}
				<div
					style={{
						position: "absolute",
						left: `${contentOffsetX}px`,
						top: `${triggerSectionHeight + 40}px`, // Below trigger stage + gap
					}}
				>
					{children}
				</div>
			</div>
		</div>
	);
};

export default FunnelCanvas;
