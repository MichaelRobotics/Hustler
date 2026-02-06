"use client";

import React, { useState, useMemo } from "react";
import { getHighResAvatarUrl } from "../../utils/avatar-utils";

/**
 * Square avatar: non-square images are cropped equally on top and bottom
 * (or left and right) so the visible area is a centered square.
 *
 * Uses flex centering + min-width/min-height so the image fills the square
 * and overflows equally on all sides (no reliance on object-position).
 */
export function AvatarSquare({
	src,
	alt,
	sizeClass,
	className = "",
	borderClass = "",
	fallback,
}: {
	src: string | null | undefined;
	alt: string;
	sizeClass: string;
	className?: string;
	borderClass?: string;
	fallback: React.ReactNode;
}) {
	const [error, setError] = useState(false);
	const displayUrl = useMemo(
		() => getHighResAvatarUrl(src) ?? src ?? undefined,
		[src]
	);
	const showImage = displayUrl && !error;

	return (
		<div
			className={`${sizeClass} overflow-hidden rounded-full flex-shrink-0 bg-muted ${borderClass} ${className}`.trim()}
			style={{ minWidth: 0, minHeight: 0 }}
		>
			{!showImage ? (
				<div className="w-full h-full flex items-center justify-center">{fallback}</div>
			) : (
				<div className="w-full h-full flex items-center justify-center">
					<img
						src={displayUrl}
						alt={alt}
						className="min-w-full min-h-full flex-shrink-0"
						style={{ imageRendering: "auto" }}
						onError={() => setError(true)}
					/>
				</div>
			)}
		</div>
	);
}
