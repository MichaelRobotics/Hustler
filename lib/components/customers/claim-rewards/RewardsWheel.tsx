"use client";

import React from "react";

const DEFAULT_SEGMENTS = [
	{ label: "10% OFF" },
	{ label: "TRY AGAIN" },
	{ label: "20% OFF" },
	{ label: "NO LUCK" },
	{ label: "50% OFF" },
	{ label: "OOPS" },
	{ label: "JACKPOT" },
	{ label: "ALMOST" },
];

interface RewardsWheelProps {
	segments?: { label: string }[];
	rotation: number; // degrees, controlled by parent
	isSpinning?: boolean;
	size?: number;
}

export const RewardsWheel: React.FC<RewardsWheelProps> = ({
	segments = DEFAULT_SEGMENTS,
	rotation,
	isSpinning = false,
	size = 340,
}) => {
	const segmentCount = segments.length;
	const segmentAngle = 360 / segmentCount;

	// Conic gradient: alternate #3b82f6 and #001c90 every 12.5% (45deg for 8 segments)
	const conicStops = segments
		.flatMap((_, i) => {
			const start = (i / segmentCount) * 100;
			const end = ((i + 1) / segmentCount) * 100;
			const color = i % 2 === 0 ? "#3b82f6" : "#001c90";
			return `${color} ${start}% ${end}%`;
		})
		.join(", ");

	return (
		<div
			className="relative flex items-center justify-center origin-top drop-shadow-xl transform scale-[0.85] sm:scale-100"
			style={{ width: size, height: size }}
		>
			{/* Triangle pointer at top */}
			<div
				className="absolute top-[-1px] left-1/2 -translate-x-1/2 z-30 pointer-events-none"
				style={{
					width: 0,
					height: 0,
					borderLeft: "20px solid transparent",
					borderRight: "20px solid transparent",
					borderTop: "36px solid white",
					filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.3))",
				}}
			/>
			{/* Wheel */}
			<div
				className="relative w-full h-full rounded-full overflow-hidden"
				style={{
					background: `conic-gradient(${conicStops})`,
					border: "12px solid #1a1a1a",
					boxSizing: "border-box",
					boxShadow: "0 0 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0,0,0,0.5)",
					transform: `rotate(${rotation}deg)`,
					transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
				}}
			>
				<div
					className="absolute inset-0 pointer-events-none rounded-full"
					style={{
						background: "radial-gradient(closest-side, rgba(0,0,0,0.2) 40%, transparent 80%)",
					}}
				/>
				{segments.map((seg, i) => {
					const angle = 22.5 + i * 45; // First segment centered at 22.5deg (half of 45)
					return (
						<div
							key={i}
							className="absolute top-0 left-1/2 h-1/2 w-[2px] origin-bottom flex justify-start items-center pointer-events-none"
							style={{
								transform: `translateX(-50%) rotate(${angle}deg)`,
							}}
						>
							<span
								className="font-bold text-[14px] whitespace-nowrap truncate flex-shrink-0 relative z-10"
								style={{
									position: "absolute",
									top: "42%",
									left: "50%",
									color: "#FFFFFF",
									transform: "translate(-50%, -50%) rotate(-90deg)",
									transformOrigin: "center",
									width: 136,
									textAlign: "center",
									textShadow: "0 1px 2px rgba(0,0,0,0.5)",
									fontSize: "12px",
									letterSpacing: "0.05em",
								}}
							>
								{seg.label}
							</span>
						</div>
					);
				})}
			</div>
			{/* Center black circle */}
			<div
				className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black"
				style={{
					width: size * 0.22,
					height: size * 0.22,
					boxShadow: "0 0 20px rgba(0, 0, 0, 0.5)",
				}}
			/>
		</div>
	);
};
