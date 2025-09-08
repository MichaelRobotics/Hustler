"use client";

import type React from "react";

interface Line {
	id: string;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

interface FunnelConnectionsProps {
	lines: Line[];
}

const FunnelConnections: React.FC<FunnelConnectionsProps> = ({ lines }) => {
	const getPathD = (line: Line): string =>
		`M ${line.x1} ${line.y1} C ${line.x1} ${line.y1 + 60}, ${line.x2} ${line.y2 - 60}, ${line.x2} ${line.y2}`;

	return (
		<svg
			className="absolute top-0 left-0 w-full h-full"
			style={{ overflow: "visible" }}
		>
			<g style={{ transform: `translateX(50%)` }}>
				<defs>
					<marker
						id="arrow"
						viewBox="0 0 10 10"
						refX="8"
						refY="5"
						markerWidth="6"
						markerHeight="6"
						orient="auto-start-reverse"
					>
						<path d="M 0 0 L 10 5 L 0 10 z" fill="#4a5568" />
					</marker>
				</defs>
				{lines.map((line) => (
					<path
						key={line.id}
						d={getPathD(line)}
						stroke="#4a5568"
						strokeWidth="2"
						fill="none"
						markerEnd="url(#arrow)"
					/>
				))}
			</g>
		</svg>
	);
};

export default FunnelConnections;
