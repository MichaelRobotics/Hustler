"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Text, Button } from "frosted-ui";
import { Settings } from "lucide-react";
import type { AuthenticatedUser } from "@/lib/types/user";
import { CashbackStatCard } from "./CashbackStatCard";
import { LevelStatCard } from "./LevelStatCard";
import { RewardsWheel } from "./RewardsWheel";
import { RollButtonWithTimer } from "./RollButtonWithTimer";
import { WalletFlipCard } from "./WalletFlipCard";
import { CashbackOccasionsSection } from "./CashbackOccasionsSection";

const WHEEL_SEGMENTS = [
	{ label: "10% OFF" },
	{ label: "TRY AGAIN" },
	{ label: "20% OFF" },
	{ label: "NO LUCK" },
	{ label: "50% OFF" },
	{ label: "OOPS" },
	{ label: "JACKPOT" },
	{ label: "ALMOST" },
];

const SPIN_DURATION_MS = 4000;
const COOLDOWN_SECONDS = 3600; // Testing only: no persistence; reset on refresh

interface ClaimRewardsViewProps {
	user: AuthenticatedUser;
	experienceId: string;
}

export const ClaimRewardsView: React.FC<ClaimRewardsViewProps> = ({
	user,
	experienceId,
}) => {
	// Placeholder data until API exists
	const cashbackPerMonth = 12.5;
	const levelName = "Silver";
	const levelProgress = 60;
	const cashSpent = "$0"; // Amount of Cash spent for level card

	const [nextRollAt, setNextRollAt] = useState<number | null>(null); // No persistence for testing
	const [wheelRotation, setWheelRotation] = useState(0);
	const [isSpinning, setIsSpinning] = useState(false);
	const rotationRef = useRef(0);
	const spinEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const setNextRollAtTimestamp = useCallback((timestamp: number) => {
		setNextRollAt(timestamp);
	}, []);

	const handleRoll = useCallback(() => {
		if (isSpinning || (nextRollAt != null && nextRollAt > Date.now())) return;
		const segmentIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
		// Segment i has center at 22.5 + i*45. To bring it to top (0deg): add (360 - segmentCenterAngle) + full turns.
		const fullTurns = 5;
		const segmentCenterAngle = 22.5 + segmentIndex * 45;
		const deltaRotation = fullTurns * 360 + (360 - segmentCenterAngle);
		setWheelRotation((prev) => {
			rotationRef.current = prev + deltaRotation;
			return prev + deltaRotation;
		});
		setIsSpinning(true);

		spinEndTimeoutRef.current = setTimeout(() => {
			setIsSpinning(false);
			setNextRollAtTimestamp(Date.now() + COOLDOWN_SECONDS * 1000);
			spinEndTimeoutRef.current = null;
		}, SPIN_DURATION_MS);
	}, [isSpinning, nextRollAt, setNextRollAtTimestamp]);

	useEffect(() => {
		return () => {
			if (spinEndTimeoutRef.current) clearTimeout(spinEndTimeoutRef.current);
		};
	}, []);

	return (
		<div className="space-y-8">
			{/* Row 1: Wheel (left) + Stats above Card (right) */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
				{/* Left: Spin to Win card, then wheel block */}
				<div className="lg:sticky lg:top-4 space-y-6">
					<RollButtonWithTimer
						layout="buttonOrTimer"
						onRoll={handleRoll}
						cooldownSeconds={COOLDOWN_SECONDS}
						nextRollAt={nextRollAt}
						disabled={isSpinning}
					/>
					<div className="rounded-2xl border border-border bg-surface p-6 transition-colors relative">
						<div className="rounded-2xl border border-border bg-surface-muted p-8 shadow-inner relative overflow-hidden">
							<Button
								size="1"
								variant="ghost"
								color="gray"
								className="absolute top-5 right-5 p-2 z-20"
								onClick={() => {}}
								aria-label="Settings"
							>
								<Settings size={18} strokeWidth={2.5} />
							</Button>
							<div className="relative flex flex-col items-center z-10 gap-8">
								<RewardsWheel
									segments={WHEEL_SEGMENTS}
									rotation={wheelRotation}
									isSpinning={isSpinning}
									size={340}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Right: Stats cards above Wallet card */}
				<div className="flex flex-col gap-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<CashbackStatCard value={cashbackPerMonth} />
						<LevelStatCard levelName={levelName} progress={levelProgress} cashSpent={cashSpent} />
					</div>
					<div className="flex justify-center lg:justify-start mt-10">
						<WalletFlipCard
							credits={user.credits}
							userName={user.name}
							companyName={user.experience?.name ?? "Internal Wallet"}
							companyLogo={user.experience?.logo}
						/>
					</div>
				</div>
			</div>

			{/* Separator between card/spinner and products - same style as Warehouse / Market stall */}
			<div className="flex items-center gap-4 my-6">
				<div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent" />
				<Button
					size="2"
					variant="soft"
					color="gray"
					className="gap-2 shrink-0"
					onClick={() => {}}
					aria-label="Add Cashback"
				>
					Add Cashback
				</Button>
				<Button
					size="2"
					variant="ghost"
					color="gray"
					className="p-2 shrink-0"
					onClick={() => {}}
					aria-label="Settings"
				>
					<Settings size={20} strokeWidth={2.5} />
				</Button>
			</div>

			{/* Row 2: Cashback Occasions - no title, cards only */}
			<CashbackOccasionsSection experienceId={experienceId} />
		</div>
	);
};
