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
export async function apiGet(url: string, experienceId?: string): Promise<Response> {
	return apiRequest(url, {
		method: 'GET',
		experienceId,
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
	return apiRequest(url, {
		method: 'POST',
		body: body ? JSON.stringify(body) : undefined,
		experienceId,
	});
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
