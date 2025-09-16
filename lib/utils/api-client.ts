/**
 * API Client utility for making authenticated requests with experience ID
 */

interface ApiRequestOptions extends RequestInit {
	experienceId?: string;
}

/**
 * Make an authenticated API request with experience ID
 */
export async function apiRequest(
	url: string,
	options: ApiRequestOptions = {}
): Promise<Response> {
	const { experienceId, ...fetchOptions } = options;
	
	// Add experience ID to headers if provided
	const headers = new Headers(fetchOptions.headers);
	if (experienceId) {
		headers.set('X-Experience-ID', experienceId);
		console.log("🔍 API Client - Setting X-Experience-ID header:", experienceId);
	} else {
		console.log("🔍 API Client - No experience ID provided");
	}
	
	// Add Content-Type if not already set and we have a body
	if (fetchOptions.body && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}
	
	return fetch(url, {
		...fetchOptions,
		headers,
	});
}

/**
 * Make a GET request with experience ID
 */
export async function apiGet(url: string, experienceId?: string, customHeaders?: Record<string, string>): Promise<Response> {
	const headers = customHeaders ? new Headers(customHeaders) : undefined;
	return apiRequest(url, {
		method: 'GET',
		experienceId,
		headers,
	});
}

/**
 * Make a POST request with experience ID
 */
export async function apiPost(
	url: string,
	body?: any,
	experienceId?: string
): Promise<Response> {
	console.log("🔍 API Client - Making POST request:", {
		url,
		body,
		experienceId
	});
	
	const response = await apiRequest(url, {
		method: 'POST',
		body: body ? JSON.stringify(body) : undefined,
		experienceId,
	});
	
	console.log("🔍 API Client - Response received:", {
		url,
		status: response.status,
		statusText: response.statusText,
		ok: response.ok
	});
	
	return response;
}

/**
 * Make a PUT request with experience ID
 */
export async function apiPut(
	url: string,
	body?: any,
	experienceId?: string
): Promise<Response> {
	return apiRequest(url, {
		method: 'PUT',
		body: body ? JSON.stringify(body) : undefined,
		experienceId,
	});
}

/**
 * Make a DELETE request with experience ID
 */
export async function apiDelete(url: string, experienceId?: string): Promise<Response> {
	return apiRequest(url, {
		method: 'DELETE',
		experienceId,
	});
}
