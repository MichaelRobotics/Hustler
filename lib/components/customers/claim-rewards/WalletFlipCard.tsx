"use client";

import React, { useState } from "react";
import { Cpu, Zap, ShieldCheck, Fingerprint } from "lucide-react";

interface WalletFlipCardProps {
	credits: number;
	userName?: string;
	companyName?: string;
	companyLogo?: string | null;
}

export const WalletFlipCard: React.FC<WalletFlipCardProps> = ({
	credits,
	userName = "Member",
	companyName = "Internal Wallet",
	companyLogo,
}) => {
	const [isFlipped, setIsFlipped] = useState(false);
	const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
		const x = ((e.clientX - left) / width - 0.5) * 2;
		const y = ((e.clientY - top) / height - 0.5) * 2;
		setMousePos({ x, y });
	};

	const handleMouseLeave = () => setMousePos({ x: 0, y: 0 });

	return (
		<>
			<div
				className="perspective-2000 w-full max-w-[520px] aspect-[1.586/1] relative z-10 mx-auto"
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
			>
				<div
					className="relative w-full h-full transition-transform duration-[700ms] ease-out preserve-3d cursor-pointer"
					onClick={() => setIsFlipped(!isFlipped)}
					style={{
						transform: !isFlipped
							? `rotateY(${mousePos.x * 14}deg) rotateX(${mousePos.y * -14}deg)`
							: "rotateY(180deg)",
					}}
				>
					{/* FRONT */}
					<div className="absolute inset-0 backface-hidden rounded-[2.5rem] p-10 overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] border border-white/10 bg-[#0a0a0f]">
						<div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
						<div
							className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none transition-opacity duration-500"
							style={{
								background: `radial-gradient(circle at ${50 + mousePos.x * 50}% ${50 + mousePos.y * 50}%, rgba(99,102,241,0.4) 0%, transparent 70%)`,
							}}
						/>
						<div className="relative h-full flex flex-col justify-between pointer-events-none select-none">
							<div className="flex justify-between items-start">
								<div className="flex items-center gap-4">
									<div className="w-14 h-11 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 backdrop-blur-xl shadow-inner overflow-hidden">
										{companyLogo ? (
											<img src={companyLogo} alt={companyName} className="w-full h-full object-contain p-1" />
										) : (
											<Cpu size={26} className="text-indigo-400" />
										)}
									</div>
									<div className="flex flex-col">
										<span className="text-[11px] text-white font-bold tracking-[0.2em] uppercase leading-tight">
											{companyName}
										</span>
										<span className="text-[9px] text-indigo-400 font-medium tracking-[0.1em] uppercase">
											Internal Wallet
										</span>
									</div>
								</div>
								<div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-6 py-4 backdrop-blur-md min-w-[140px]">
									<div className="flex flex-col items-end">
										<span className="text-[10px] text-indigo-300/60 uppercase font-black tracking-widest">
											Expense Credits
										</span>
										<span className="text-2xl md:text-3xl font-mono font-bold text-white tracking-tight italic mt-1">
											${credits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
										</span>
									</div>
								</div>
							</div>
							<div className="space-y-6">
								<div className="space-y-2">
									<p className="text-xl md:text-2xl tracking-[0.15em] font-mono text-white/90 break-all leading-tight">
										0x8842...A19F
									</p>
									<div className="flex items-center gap-2">
										<ShieldCheck size={12} className="text-emerald-400" />
										<span className="text-[9px] text-white/40 font-bold uppercase tracking-[0.2em]">
											Verified Internal Node
										</span>
									</div>
								</div>
								<div className="flex justify-between items-end">
									<div className="space-y-1">
										<p className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-bold">
											Employee ID
										</p>
										<p className="text-base font-medium tracking-[0.1em] text-white/80 uppercase">
											{userName} <span className="text-indigo-500/50 ml-2">#8842</span>
										</p>
									</div>
									<div className="text-right">
										<div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-fuchsia-600 rounded-full opacity-80 blur-[2px] border border-white/20 flex items-center justify-center">
											<Zap size={20} className="text-white" fill="currentColor" />
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* BACK */}
					<div
						className="absolute inset-0 backface-hidden rounded-[2.5rem] p-10 overflow-hidden shadow-2xl border border-white/10 bg-[#050508]"
						style={{ transform: "rotateY(180deg)" }}
					>
						<div className="absolute inset-x-0 top-12 h-16 bg-[#000] flex items-center px-10 gap-1 overflow-hidden opacity-80">
							{[...Array(40)].map((_, i) => (
								<div
									key={i}
									className="w-[2px] bg-indigo-500/20"
									style={{ height: `${Math.random() * 100}%` }}
								/>
							))}
						</div>
						<div className="mt-28">
							<div className="flex justify-between items-end mb-4">
								<p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">
									Authorized Signature
								</p>
								<div className="flex items-center gap-2">
									<Fingerprint size={14} className="text-indigo-500/40" />
									<span className="text-[8px] text-white/20 font-mono tracking-widest uppercase">
										Biometric Match Required
									</span>
								</div>
							</div>
							<div className="flex items-center gap-6">
								<div className="h-14 flex-1 bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-2xl flex items-center justify-center px-8 overflow-hidden border border-white/20 shadow-inner">
									<span className="text-slate-900 font-serif italic text-xl tracking-[0.1em] opacity-30 select-none">
										Access Level 04
									</span>
								</div>
								<div className="w-24 h-14 bg-white/5 rounded-2xl flex items-center justify-center font-mono font-bold text-xl text-indigo-400 border border-white/10 backdrop-blur-md">
									SEC
								</div>
							</div>
						</div>
						<div className="mt-10 flex justify-between items-end">
							<div className="space-y-3 max-w-[75%]">
								<p className="text-[9px] text-white/20 leading-relaxed font-medium uppercase tracking-tighter">
									Property of {companyName}. This wallet is for internal resource allocation. Misuse is subject to employment bylaws.
								</p>
								<div className="flex gap-4">
									<div className="px-2 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-[8px] text-emerald-400 font-bold uppercase tracking-widest">
										Admin Clearance
									</div>
									<div className="px-2 py-1 bg-indigo-500/10 rounded-md border border-indigo-500/20 text-[8px] text-indigo-400 font-bold uppercase tracking-widest">
										Lvl 4 Access
									</div>
								</div>
							</div>
							<div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
								<div className="w-6 h-6 border-2 border-indigo-500/40 rounded-full animate-pulse" />
							</div>
						</div>
					</div>
				</div>
			</div>
			<style
				dangerouslySetInnerHTML={{
					__html: `
					.perspective-2000 { perspective: 2000px; }
					.preserve-3d { transform-style: preserve-3d; }
					.backface-hidden { backface-visibility: hidden; }
					`,
				}}
			/>
		</>
	);
};
