"use client";

import { Button, Text } from "frosted-ui";
import { AlertTriangle, RefreshCw } from "lucide-react";
import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
	resetKeys?: Array<string | number>;
	resetOnPropsChange?: boolean;
}

interface State {
	hasError: boolean;
	error?: Error;
	errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
	private resetTimeoutId: number | null = null;

	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return {
			hasError: true,
			error,
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);

		this.setState({
			error,
			errorInfo,
		});

		// Call the onError callback if provided
		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}
	}

	componentDidUpdate(prevProps: Props) {
		const { resetKeys, resetOnPropsChange } = this.props;
		const { hasError } = this.state;

		// Reset error boundary when resetKeys change
		if (hasError && prevProps.resetKeys !== resetKeys) {
			if (resetKeys && resetKeys.length > 0) {
				this.resetErrorBoundary();
			}
		}

		// Reset error boundary when props change (if enabled)
		if (
			hasError &&
			resetOnPropsChange &&
			prevProps.children !== this.props.children
		) {
			this.resetErrorBoundary();
		}
	}

	componentWillUnmount() {
		if (this.resetTimeoutId) {
			clearTimeout(this.resetTimeoutId);
		}
	}

	resetErrorBoundary = () => {
		if (this.resetTimeoutId) {
			clearTimeout(this.resetTimeoutId);
		}

		this.resetTimeoutId = window.setTimeout(() => {
			this.setState({
				hasError: false,
				error: undefined,
				errorInfo: undefined,
			});
		}, 0);
	};

	render() {
		if (this.state.hasError) {
			// Custom fallback UI
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default error UI
			return (
				<div className="min-h-[200px] flex items-center justify-center p-6">
					<div className="text-center max-w-md mx-auto">
						<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
							<AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
						</div>

						<Text size="3" weight="semi-bold" className="text-foreground mb-2">
							Something went wrong
						</Text>

						<Text size="2" color="gray" className="text-muted-foreground mb-6">
							We encountered an unexpected error. Please try refreshing the page
							or contact support if the problem persists.
						</Text>

						{process.env.NODE_ENV === "development" && this.state.error && (
							<details className="mb-6 text-left">
								<summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
									Error Details (Development)
								</summary>
								<pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-32">
									{this.state.error.toString()}
									{this.state.errorInfo?.componentStack}
								</pre>
							</details>
						)}

						<div className="flex gap-3 justify-center">
							<Button
								onClick={this.resetErrorBoundary}
								variant="soft"
								size="2"
								className="flex items-center gap-2"
							>
								<RefreshCw className="w-4 h-4" />
								Try Again
							</Button>

							<Button
								onClick={() => window.location.reload()}
								size="2"
								className="flex items-center gap-2"
							>
								<RefreshCw className="w-4 h-4" />
								Refresh Page
							</Button>
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
