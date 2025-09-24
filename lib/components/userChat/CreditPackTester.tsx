"use client";

import React, { useState } from "react";
import { TestTube, CreditCard, CheckCircle, XCircle, Loader } from "lucide-react";
import { apiPost } from "../../utils/api-client";

interface CreditPackTesterProps {
	user_id: string;
	company_id: string;
	experienceId: string;
	onTestComplete?: (result: any) => void;
}

interface TestResult {
	success: boolean;
	message: string;
	data?: any;
	error?: string;
}

const CREDIT_PACKS = [
	{ id: "starter", name: "Starter", credits: 5, color: "bg-green-500" },
	{ id: "popular", name: "Popular", credits: 15, color: "bg-blue-500" },
	{ id: "pro", name: "Pro", credits: 30, color: "bg-purple-500" }
];

export const CreditPackTester: React.FC<CreditPackTesterProps> = ({
	user_id,
	company_id,
	experienceId,
	onTestComplete
}) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const [testing, setTesting] = useState<string | null>(null);
	const [results, setResults] = useState<Record<string, TestResult>>({});

	const testCreditPack = async (packId: string, pack_name: string) => {
		setTesting(packId);
		setResults(prev => ({
			...prev,
			[packId]: { success: false, message: "Testing..." }
		}));

		try {
			const response = await apiPost('/api/admin/test-credit-packs', {
				packId
			}, experienceId);

			const result = await response.json();

			if (response.ok) {
				const testResult: TestResult = {
					success: true,
					message: `✅ ${pack_name} pack test successful! Added ${result.data.credits_added} credits`,
					data: result.data
				};
				setResults(prev => ({ ...prev, [packId]: testResult }));
				onTestComplete?.(result);
			} else {
				const testResult: TestResult = {
					success: false,
					message: `❌ ${pack_name} pack test failed: ${result.error}`,
					error: result.error
				};
				setResults(prev => ({ ...prev, [packId]: testResult }));
			}
		} catch (error) {
			const testResult: TestResult = {
				success: false,
				message: `❌ ${pack_name} pack test failed: Network error`,
				error: error instanceof Error ? error.message : "Unknown error"
			};
			setResults(prev => ({ ...prev, [packId]: testResult }));
		} finally {
			setTesting(null);
		}
	};

	const testAllPacks = async () => {
		for (const pack of CREDIT_PACKS) {
			await testCreditPack(pack.id, pack.name);
			// Small delay between tests
			await new Promise(resolve => setTimeout(resolve, 500));
		}
	};

	return (
		<div className="border-t border-white/10 pt-2 mt-2">
			{/* Header */}
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-1">
					<CreditCard size={12} className="text-yellow-400" />
					<span className="text-xs text-yellow-400 font-medium">Credit Pack Tester</span>
				</div>
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="p-1 text-white/70 hover:text-white transition-colors"
				>
					{isExpanded ? "−" : "+"}
				</button>
			</div>

			{/* Expanded Content */}
			{isExpanded && (
				<div className="space-y-2">
					{/* Test All Button */}
					<button
						onClick={testAllPacks}
						disabled={testing !== null}
						className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 disabled:opacity-50 text-yellow-300 text-xs rounded transition-colors"
					>
						{testing ? <Loader size={12} className="animate-spin" /> : <TestTube size={12} />}
						{testing ? "Testing..." : "Test All Packs"}
					</button>

					{/* Individual Pack Tests */}
					<div className="grid grid-cols-1 gap-1">
						{CREDIT_PACKS.map((pack) => {
							const result = results[pack.id];
							const isTesting = testing === pack.id;
							const isSuccess = result?.success;
							const isError = result?.success === false;

							return (
								<div key={pack.id} className="flex items-center gap-2">
									<button
										onClick={() => testCreditPack(pack.id, pack.name)}
										disabled={isTesting || testing !== null}
										className={`flex-1 flex items-center justify-between px-2 py-1 text-xs rounded transition-colors ${
											isSuccess 
												? 'bg-green-500/20 text-green-300' 
												: isError 
													? 'bg-red-500/20 text-red-300'
													: 'bg-white/10 hover:bg-white/20 text-white'
										} disabled:opacity-50`}
									>
										<div className="flex items-center gap-1">
											<div className={`w-2 h-2 rounded-full ${pack.color}`}></div>
											<span>{pack.name} ({pack.credits} credits)</span>
										</div>
										<div className="flex items-center gap-1">
											{isTesting && <Loader size={10} className="animate-spin" />}
											{isSuccess && <CheckCircle size={10} />}
											{isError && <XCircle size={10} />}
										</div>
									</button>
								</div>
							);
						})}
					</div>

					{/* Results */}
					{Object.keys(results).length > 0 && (
						<div className="space-y-1">
							{Object.entries(results).map(([plan_id, result]) => (
								<div key={plan_id} className="text-xs px-2 py-1 rounded bg-black/20">
									<div className={`${result.success ? 'text-green-300' : 'text-red-300'}`}>
										{result.message}
									</div>
									{result.data && (
										<div className="text-white/70 mt-1">
											Credits: {result.data.previous_credits} → {result.data.new_credits}
										</div>
									)}
								</div>
							))}
						</div>
					)}

					{/* User Info */}
					<div className="text-xs text-white/50 bg-black/20 px-2 py-1 rounded">
						<div>User: {user_id}</div>
						<div>Company: {company_id}</div>
					</div>
				</div>
			)}
		</div>
	);
};
