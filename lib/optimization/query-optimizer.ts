/**
 * Query Optimizer
 *
 * Provides query optimization utilities for database operations,
 * including query batching, connection pooling, and performance monitoring.
 */

import { redisCache } from "../cache/redis-cache";
import { performanceMonitoring } from "../monitoring/performance";
import { db } from "../supabase/db";

export interface QueryBatch {
	queries: Array<{
		id: string;
		query: () => Promise<any>;
		priority: "high" | "medium" | "low";
	}>;
	maxConcurrency?: number;
	timeout?: number;
}

export interface OptimizedQueryResult<T> {
	data: T;
	executionTime: number;
	cached: boolean;
	queryId: string;
}

class QueryOptimizer {
	private queryQueue: Map<string, Promise<any>> = new Map();
	private batchQueue: QueryBatch[] = [];
	private isProcessingBatch = false;

	/**
	 * Execute a single optimized query with caching and monitoring
	 */
	async executeQuery<T>(
		queryId: string,
		queryFn: () => Promise<T>,
		cacheKey?: string,
		cacheOptions?: { ttl?: number; tags?: string[] },
	): Promise<OptimizedQueryResult<T>> {
		const startTime = Date.now();

		try {
			// Check cache first
			if (cacheKey) {
				const cached = await redisCache.get<T>(cacheKey);
				if (cached) {
					return {
						data: cached,
						executionTime: Date.now() - startTime,
						cached: true,
						queryId,
					};
				}
			}

			// Check if query is already running
			if (this.queryQueue.has(queryId)) {
				const result = await this.queryQueue.get(queryId);
				return {
					data: result,
					executionTime: Date.now() - startTime,
					cached: false,
					queryId,
				};
			}

			// Execute query with monitoring
			const queryPromise = this.executeWithMonitoring(queryId, queryFn);
			this.queryQueue.set(queryId, queryPromise);

			try {
				const data = await queryPromise;

				// Cache the result
				if (cacheKey && data) {
					await redisCache.set(cacheKey, data, cacheOptions);
				}

				return {
					data,
					executionTime: Date.now() - startTime,
					cached: false,
					queryId,
				};
			} finally {
				this.queryQueue.delete(queryId);
			}
		} catch (error) {
			console.error(`Query ${queryId} failed:`, error);
			throw error;
		}
	}

	/**
	 * Execute query with performance monitoring
	 */
	private async executeWithMonitoring<T>(
		queryId: string,
		queryFn: () => Promise<T>,
	): Promise<T> {
		const monitoring = performanceMonitoring.startDatabaseMonitoring(queryId);

		try {
			const result = await queryFn();
			monitoring.end(true);
			return result;
		} catch (error) {
			monitoring.end(
				false,
				error instanceof Error ? error.message : "Unknown error",
			);
			throw error;
		}
	}

	/**
	 * Execute multiple queries in parallel with controlled concurrency
	 */
	async executeBatch<T>(batch: QueryBatch): Promise<Map<string, T>> {
		const results = new Map<string, T>();
		const maxConcurrency = batch.maxConcurrency || 5;
		const timeout = batch.timeout || 30000; // 30 seconds

		// Sort queries by priority
		const sortedQueries = batch.queries.sort((a, b) => {
			const priorityOrder = { high: 3, medium: 2, low: 1 };
			return priorityOrder[b.priority] - priorityOrder[a.priority];
		});

		// Execute queries in batches with controlled concurrency
		for (let i = 0; i < sortedQueries.length; i += maxConcurrency) {
			const batchChunk = sortedQueries.slice(i, i + maxConcurrency);

			const promises = batchChunk.map(async (query) => {
				try {
					const result = await Promise.race([
						query.query(),
						new Promise((_, reject) =>
							setTimeout(() => reject(new Error("Query timeout")), timeout),
						),
					]);
					return { id: query.id, result, error: null };
				} catch (error) {
					return {
						id: query.id,
						result: null,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			});

			const chunkResults = await Promise.all(promises);

			chunkResults.forEach(({ id, result, error }) => {
				if (error) {
					console.error(`Batch query ${id} failed:`, error);
				} else {
					results.set(id, result);
				}
			});
		}

		return results;
	}

	/**
	 * Optimize database connection usage
	 */
	async withConnection<T>(operation: () => Promise<T>): Promise<T> {
		// In a real implementation, you'd manage connection pooling here
		// For now, we'll just execute the operation
		return await operation();
	}

	/**
	 * Preload frequently accessed data
	 */
	async preloadData(keys: string[]): Promise<void> {
		const preloadPromises = keys.map(async (key) => {
			try {
				// Check if data is already cached
				const cached = await redisCache.get(key);
				if (!cached) {
					// In a real implementation, you'd load the data here
					console.log(`Preloading data for key: ${key}`);
				}
			} catch (error) {
				console.error(`Failed to preload data for key ${key}:`, error);
			}
		});

		await Promise.allSettled(preloadPromises);
	}

	/**
	 * Warm up cache with frequently accessed queries
	 */
	async warmupCache(
		queries: Array<{
			key: string;
			query: () => Promise<any>;
			ttl?: number;
			tags?: string[];
		}>,
	): Promise<void> {
		const warmupPromises = queries.map(async ({ key, query, ttl, tags }) => {
			try {
				const data = await query();
				await redisCache.set(key, data, { ttl, tags });
				console.log(`Cache warmed up for key: ${key}`);
			} catch (error) {
				console.error(`Failed to warm up cache for key ${key}:`, error);
			}
		});

		await Promise.allSettled(warmupPromises);
	}

	/**
	 * Get query performance statistics
	 */
	getPerformanceStats(): {
		activeQueries: number;
		queuedBatches: number;
		cacheStats: any;
	} {
		return {
			activeQueries: this.queryQueue.size,
			queuedBatches: this.batchQueue.length,
			cacheStats: redisCache.getStats(),
		};
	}

	/**
	 * Clear query cache
	 */
	async clearCache(tags?: string[]): Promise<void> {
		if (tags) {
			await redisCache.deleteByTags(tags);
		} else {
			await redisCache.clear();
		}
	}

	/**
	 * Optimize query based on common patterns
	 */
	optimizeQuery(query: string): string {
		// Basic query optimization
		let optimized = query;

		// Remove unnecessary whitespace
		optimized = optimized.replace(/\s+/g, " ").trim();

		// Add query hints for common patterns
		if (optimized.includes("ORDER BY") && !optimized.includes("LIMIT")) {
			optimized += " LIMIT 1000"; // Prevent large result sets
		}

		return optimized;
	}

	/**
	 * Schedule batch processing
	 */
	scheduleBatch(batch: QueryBatch): void {
		this.batchQueue.push(batch);
		this.processBatchQueue();
	}

	/**
	 * Process queued batches
	 */
	private async processBatchQueue(): Promise<void> {
		if (this.isProcessingBatch || this.batchQueue.length === 0) {
			return;
		}

		this.isProcessingBatch = true;

		try {
			while (this.batchQueue.length > 0) {
				const batch = this.batchQueue.shift();
				if (batch) {
					await this.executeBatch(batch);
				}
			}
		} finally {
			this.isProcessingBatch = false;
		}
	}
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizer();

// Export types
// Types are already exported above
