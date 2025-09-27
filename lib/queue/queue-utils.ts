/**
 * Queue utility functions for resource assignments
 */

import { resourceAssignmentQueue } from "./ResourceAssignmentQueue";

/**
 * Get queue status for a specific user/experience
 */
export function getQueueStatus(userId: string, experienceId: string) {
	return resourceAssignmentQueue.getQueueStatus(userId, experienceId);
}

/**
 * Check if user has assignments in queue
 */
export function hasQueuedAssignments(userId: string, experienceId: string): boolean {
	const status = getQueueStatus(userId, experienceId);
	return status.queueSize > 0 || status.isProcessing;
}

/**
 * Get user-friendly queue message
 */
export function getQueueMessage(userId: string, experienceId: string): string | null {
	const status = getQueueStatus(userId, experienceId);
	
	if (status.queueSize === 0 && !status.isProcessing) {
		return null;
	}
	
	if (status.isProcessing) {
		return "Processing assignment...";
	}
	
	if (status.queueSize > 0) {
		const oldestAge = status.oldestAssignment 
			? Math.round((Date.now() - status.oldestAssignment) / 1000)
			: 0;
		
		return `${status.queueSize} assignment${status.queueSize > 1 ? 's' : ''} in queue${oldestAge > 0 ? ` (${oldestAge}s ago)` : ''}`;
	}
	
	return null;
}

/**
 * Clear user queue (emergency cleanup)
 */
export function clearUserQueue(userId: string, experienceId: string): void {
	resourceAssignmentQueue.clearUserQueue(userId, experienceId);
}

/**
 * Get all queue statistics (for admin/monitoring)
 */
export function getAllQueueStats() {
	return resourceAssignmentQueue.getAllQueueStats();
}
