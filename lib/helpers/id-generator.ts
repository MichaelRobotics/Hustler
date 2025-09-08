/**
 * ID Generator Utilities
 *
 * Provides utility functions for generating unique identifiers
 * following Whop's ID patterns and best practices.
 */

/**
 * Generates a unique ID with a custom prefix
 * @param prefix - The prefix to use for the ID (e.g., 'temp_', 'session_')
 * @param length - The length of the random part (default: 16)
 * @returns A unique ID string
 */
export function generateId(prefix = "", length = 16): string {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = prefix;

	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	return result;
}
