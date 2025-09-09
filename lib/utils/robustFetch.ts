/**
 * Robust Fetch Utility
 * Provides timeout, retry logic, and proper error handling for API requests
 */

interface RetryOptions {
	maxRetries?: number;
	retryDelay?: number;
	timeout?: number;
	backoffMultiplier?: number;
}

interface RobustFetchOptions extends RequestInit, RetryOptions {}

class RobustFetch {
	private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
	private readonly DEFAULT_MAX_RETRIES = 3;
	private readonly DEFAULT_RETRY_DELAY = 1000; // 1 second
	private readonly DEFAULT_BACKOFF_MULTIPLIER = 2;

	/**
	 * Robust fetch with timeout and retry logic
	 */
	async robustFetch(
		url: string,
		options: RobustFetchOptions = {}
	): Promise<Response> {
		const {
			maxRetries = this.DEFAULT_MAX_RETRIES,
			retryDelay = this.DEFAULT_RETRY_DELAY,
			timeout = this.DEFAULT_TIMEOUT,
			backoffMultiplier = this.DEFAULT_BACKOFF_MULTIPLIER,
			...fetchOptions
		} = options;

		let lastError: Error | null = null;
		let currentDelay = retryDelay;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const response = await this.fetchWithTimeout(url, fetchOptions, timeout);
				
				// If response is ok, return it
				if (response.ok) {
					return response;
				}

				// If it's a client error (4xx), don't retry
				if (response.status >= 400 && response.status < 500) {
					const errorData = await this.safeParseJson(response);
					throw new Error(
						errorData?.message || `HTTP ${response.status}: ${response.statusText}`
					);
				}

				// For server errors (5xx) or network issues, retry
				lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
				
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				
				// If it's the last attempt, throw the error
				if (attempt === maxRetries) {
					break;
				}

				// Wait before retrying (exponential backoff)
				await this.delay(currentDelay);
				currentDelay *= backoffMultiplier;
			}
		}

		// If we get here, all retries failed
		throw new Error(
			`Request failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`
		);
	}

	/**
	 * Fetch with timeout using AbortController
	 */
	private async fetchWithTimeout(
		url: string,
		options: RequestInit,
		timeout: number
	): Promise<Response> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal,
			});
			clearTimeout(timeoutId);
			return response;
		} catch (error) {
			clearTimeout(timeoutId);
			
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error(`Request timeout after ${timeout}ms`);
			}
			
			throw error;
		}
	}

	/**
	 * Safely parse JSON response
	 */
	private async safeParseJson(response: Response): Promise<any> {
		try {
			return await response.json();
		} catch {
			return null;
		}
	}

	/**
	 * Delay utility for retry logic
	 */
	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

// Create singleton instance
export const robustFetch = new RobustFetch();

/**
 * Convenience function for robust fetch
 */
export const robustFetchRequest = (
	url: string,
	options: RobustFetchOptions = {}
): Promise<Response> => {
	return robustFetch.robustFetch(url, options);
};

/**
 * Specialized function for DELETE requests with appropriate settings
 */
export const robustDelete = (
	url: string,
	options: Omit<RobustFetchOptions, 'method'> = {}
): Promise<Response> => {
	return robustFetch.robustFetch(url, {
		...options,
		method: 'DELETE',
		timeout: 15000, // Longer timeout for delete operations
		maxRetries: 2, // Fewer retries for delete operations
	});
};
