/**
 * Request Deduplication Utility
 * Prevents duplicate API requests from being made simultaneously
 * Improves performance by avoiding redundant network calls
 */

interface PendingRequest {
	promise: Promise<Response>;
	timestamp: number;
}

class RequestDeduplicator {
	private pendingRequests = new Map<string, PendingRequest>();
	private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

	/**
	 * Deduplicate a fetch request
	 * If the same request is already pending, return a cloned response
	 */
	async deduplicatedFetch(
		url: string,
		options?: RequestInit,
	): Promise<Response> {
		const requestKey = this.generateRequestKey(url, options);

		// Check if request is already pending
		const existingRequest = this.pendingRequests.get(requestKey);
		if (existingRequest) {
			// Check if request is not too old
			if (Date.now() - existingRequest.timestamp < this.REQUEST_TIMEOUT) {
				// Clone the response to avoid "body stream already read" error
				const response = await existingRequest.promise;
				return response.clone();
			} else {
				// Remove stale request
				this.pendingRequests.delete(requestKey);
			}
		}

		// Create new request
		const promise = fetch(url, options);

		// Store the request
		this.pendingRequests.set(requestKey, {
			promise,
			timestamp: Date.now(),
		});

		// Clean up when request completes
		promise.finally(() => {
			this.pendingRequests.delete(requestKey);
		});

		return promise;
	}

	/**
	 * Generate a unique key for the request
	 */
	private generateRequestKey(url: string, options?: RequestInit): string {
		const method = options?.method || "GET";
		const body = options?.body ? JSON.stringify(options.body) : "";
		const headers = options?.headers ? JSON.stringify(options.headers) : "";

		return `${method}:${url}:${body}:${headers}`;
	}

	/**
	 * Clear all pending requests
	 */
	clear(): void {
		this.pendingRequests.clear();
	}

	/**
	 * Get the number of pending requests
	 */
	getPendingCount(): number {
		return this.pendingRequests.size;
	}
}

// Create a singleton instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Deduplicated fetch function
 * Use this instead of the native fetch function
 */
export const deduplicatedFetch = (
	url: string,
	options?: RequestInit,
): Promise<Response> => {
	return requestDeduplicator.deduplicatedFetch(url, options);
};

/**
 * Hook for React components to use deduplicated requests
 */
export const useDeduplicatedFetch = () => {
	return {
		fetch: deduplicatedFetch,
		clearCache: () => requestDeduplicator.clear(),
		getPendingCount: () => requestDeduplicator.getPendingCount(),
	};
};
