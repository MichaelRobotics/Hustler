/**
 * Resource Assignment Queue System
 * Prevents race conditions by queuing product assignments per user/experience
 */

interface QueuedAssignment {
	id: string;
	userId: string;
	experienceId: string;
	funnelId: string;
	resourceId: string;
	resolve: (result: any) => void;
	reject: (error: Error) => void;
	createdAt: number;
}

interface UserQueue {
	userId: string;
	experienceId: string;
	assignments: QueuedAssignment[];
	isProcessing: boolean;
}

class ResourceAssignmentQueue {
	private userQueues = new Map<string, UserQueue>();
	private readonly MAX_QUEUE_SIZE = 50;
	private readonly QUEUE_TIMEOUT = 30000; // 30 seconds
	private readonly PROCESSING_DELAY = 100; // 100ms between assignments

	/**
	 * Get queue key for user/experience combination
	 */
	private getQueueKey(userId: string, experienceId: string): string {
		return `${userId}:${experienceId}`;
	}

	/**
	 * Get or create user queue
	 */
	private getUserQueue(userId: string, experienceId: string): UserQueue {
		const key = this.getQueueKey(userId, experienceId);
		
		if (!this.userQueues.has(key)) {
			this.userQueues.set(key, {
				userId,
				experienceId,
				assignments: [],
				isProcessing: false,
			});
		}
		
		return this.userQueues.get(key)!;
	}

	/**
	 * Add assignment to queue
	 */
	async queueAssignment(
		userId: string,
		experienceId: string,
		funnelId: string,
		resourceId: string,
		assignmentFunction: (funnelId: string, resourceId: string) => Promise<any>
	): Promise<any> {
		const userQueue = this.getUserQueue(userId, experienceId);
		
		// Check queue size limit
		if (userQueue.assignments.length >= this.MAX_QUEUE_SIZE) {
			throw new Error("Assignment queue is full. Please try again later.");
		}

		// Create assignment promise
		return new Promise((resolve, reject) => {
			const assignment: QueuedAssignment = {
				id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				userId,
				experienceId,
				funnelId,
				resourceId,
				resolve,
				reject,
				createdAt: Date.now(),
			};

			// Add to queue
			userQueue.assignments.push(assignment);

			// Start processing if not already processing
			if (!userQueue.isProcessing) {
				this.processQueue(userQueue, assignmentFunction);
			}
		});
	}

	/**
	 * Process assignments in queue
	 */
	private async processQueue(
		userQueue: UserQueue,
		assignmentFunction: (funnelId: string, resourceId: string) => Promise<any>
	): Promise<void> {
		userQueue.isProcessing = true;

		try {
			while (userQueue.assignments.length > 0) {
				const assignment = userQueue.assignments.shift()!;
				
				// Check for timeout
				if (Date.now() - assignment.createdAt > this.QUEUE_TIMEOUT) {
					assignment.reject(new Error("Assignment request timed out"));
					continue;
				}

				try {
					// Execute the assignment
					const result = await assignmentFunction(assignment.funnelId, assignment.resourceId);
					assignment.resolve(result);
				} catch (error) {
					assignment.reject(error as Error);
				}

				// Small delay between assignments to prevent overwhelming the database
				if (userQueue.assignments.length > 0) {
					await new Promise(resolve => setTimeout(resolve, this.PROCESSING_DELAY));
				}
			}
		} finally {
			userQueue.isProcessing = false;
			
			// Clean up empty queue
			if (userQueue.assignments.length === 0) {
				const key = this.getQueueKey(userQueue.userId, userQueue.experienceId);
				this.userQueues.delete(key);
			}
		}
	}

	/**
	 * Get queue status for user
	 */
	getQueueStatus(userId: string, experienceId: string): {
		queueSize: number;
		isProcessing: boolean;
		oldestAssignment?: number;
	} {
		const userQueue = this.getUserQueue(userId, experienceId);
		
		return {
			queueSize: userQueue.assignments.length,
			isProcessing: userQueue.isProcessing,
			oldestAssignment: userQueue.assignments.length > 0 
				? userQueue.assignments[0].createdAt 
				: undefined,
		};
	}

	/**
	 * Clear queue for user (emergency cleanup)
	 */
	clearUserQueue(userId: string, experienceId: string): void {
		const key = this.getQueueKey(userId, experienceId);
		const userQueue = this.userQueues.get(key);
		
		if (userQueue) {
			// Reject all pending assignments
			userQueue.assignments.forEach(assignment => {
				assignment.reject(new Error("Queue cleared by system"));
			});
			
			// Remove queue
			this.userQueues.delete(key);
		}
	}

	/**
	 * Get all queue statistics
	 */
	getAllQueueStats(): {
		totalQueues: number;
		totalAssignments: number;
		processingQueues: number;
	} {
		let totalAssignments = 0;
		let processingQueues = 0;
		
		for (const queue of this.userQueues.values()) {
			totalAssignments += queue.assignments.length;
			if (queue.isProcessing) {
				processingQueues++;
			}
		}
		
		return {
			totalQueues: this.userQueues.size,
			totalAssignments,
			processingQueues,
		};
	}

	/**
	 * Cleanup expired assignments
	 */
	cleanupExpiredAssignments(): void {
		const now = Date.now();
		
		for (const [key, userQueue] of this.userQueues.entries()) {
			// Remove expired assignments
			const validAssignments = userQueue.assignments.filter(assignment => {
				if (now - assignment.createdAt > this.QUEUE_TIMEOUT) {
					assignment.reject(new Error("Assignment expired"));
					return false;
				}
				return true;
			});
			
			userQueue.assignments = validAssignments;
			
			// Remove empty queues
			if (userQueue.assignments.length === 0 && !userQueue.isProcessing) {
				this.userQueues.delete(key);
			}
		}
	}
}

// Export singleton instance
export const resourceAssignmentQueue = new ResourceAssignmentQueue();

// Cleanup expired assignments every 5 minutes
setInterval(() => {
	resourceAssignmentQueue.cleanupExpiredAssignments();
}, 5 * 60 * 1000);
