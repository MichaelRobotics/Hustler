"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PaymentSuccessPage() {
	const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
	const router = useRouter();

	useEffect(() => {
		// Check URL parameters for payment status
		const urlParams = new URLSearchParams(window.location.search);
		const paymentStatus = urlParams.get("status");
		
		if (paymentStatus === "success") {
			setStatus("success");
			// Redirect back to the app after a short delay
			setTimeout(() => {
				router.push("/");
			}, 3000);
		} else {
			setStatus("error");
		}
	}, [router]);

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
			<div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
				{status === "loading" && (
					<>
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
						<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
							Processing Payment...
						</h2>
						<p className="text-gray-600 dark:text-gray-400">
							Please wait while we process your payment.
						</p>
					</>
				)}

				{status === "success" && (
					<>
						<div className="text-green-500 text-6xl mb-4">✅</div>
						<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
							Payment Successful!
						</h2>
						<p className="text-gray-600 dark:text-gray-400 mb-4">
							Your credits have been added to your account.
						</p>
						<p className="text-sm text-gray-500 dark:text-gray-500">
							Redirecting you back to the app...
						</p>
					</>
				)}

				{status === "error" && (
					<>
						<div className="text-red-500 text-6xl mb-4">❌</div>
						<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
							Payment Failed
						</h2>
						<p className="text-gray-600 dark:text-gray-400 mb-4">
							There was an issue processing your payment.
						</p>
						<button
							onClick={() => router.push("/")}
							className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
						>
							Return to App
						</button>
					</>
				)}
			</div>
		</div>
	);
}
