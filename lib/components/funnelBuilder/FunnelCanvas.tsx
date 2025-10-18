"use client";

import type React from "react";

interface FunnelCanvasProps {
	children: React.ReactNode;
	itemCanvasWidth: number;
	totalCanvasHeight: number;
	EXPLANATION_AREA_WIDTH: number;
	editingBlockId?: string | null;
}

const FunnelCanvas: React.FC<FunnelCanvasProps> = ({
	children,
	itemCanvasWidth,
	totalCanvasHeight,
	EXPLANATION_AREA_WIDTH,
	editingBlockId,
}) => {
	return (
		<div className="hidden md:flex items-start justify-center p-6 md:p-8 h-full overflow-auto relative">
			<div
				className="relative transition-all duration-200"
				style={{
					width: `${itemCanvasWidth + EXPLANATION_AREA_WIDTH}px`,
					height: `${totalCanvasHeight}px`,
					minWidth: "fit-content",
					minHeight: "fit-content",
					cursor: editingBlockId ? "default" : "grab",
				}}
				onMouseDown={(e) => {
					// Disable horizontal scrolling when editing any block
					if (editingBlockId) {
						return;
					}
					
					if (e.button === 0 && e.currentTarget) {
						// Left mouse button only
						const target = e.currentTarget;
						const parent = target.parentElement;

						if (!parent) return;

						target.style.cursor = "grabbing";
						const startX = e.clientX;
						const startScrollLeft = parent.scrollLeft || 0;

						const handleMouseMove = (moveEvent: MouseEvent) => {
							try {
								const deltaX = moveEvent.clientX - startX;
								if (parent && parent.scrollLeft !== undefined) {
									parent.scrollLeft = startScrollLeft - deltaX;
								}
							} catch (error) {
								// Silently handle mouse move errors
							}
						};

						const handleMouseUp = () => {
							if (target) {
								target.style.cursor = "grab";
							}
							document.removeEventListener("mousemove", handleMouseMove);
							document.removeEventListener("mouseup", handleMouseUp);
						};

						document.addEventListener("mousemove", handleMouseMove);
						document.addEventListener("mouseup", handleMouseUp);
					}
				}}
				onMouseLeave={(e) => {
					if (e.currentTarget) {
						e.currentTarget.style.cursor = "grab";
					}
				}}
			>
				{children}
			</div>
		</div>
	);
};

export default FunnelCanvas;
