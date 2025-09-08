/**
 * State Performance Optimization
 *
 * Provides performance optimization, caching, and monitoring for the state management system.
 */

import { redisCache } from "../cache/redis-cache";
import { performanceMonitoring } from "../monitoring/performance";
import {
	BackendState,
	type ConversationData,
	FrontendState,
	type FunnelData,
	type MessageData,
	type ResourceData,
	type StateContext,
	type StateUpdate,
} from "./types";

export interface PerformanceConfig {
	enableCaching: boolean;
	cacheTTL: number;
	maxCacheSize: number;
	enableCompression: boolean;
	enableDeduplication: boolean;
	batchSize: number;
	throttleMs: number;
	enableMetrics: boolean;
}

export interface CacheEntry {
	key: string;
	data: any;
	timestamp: Date;
	ttl: number;
	hits: number;
	size: number;
}

export interface PerformanceMetrics {
	cacheHits: number;
	cacheMisses: number;
	cacheHitRate: number;
	averageResponseTime: number;
	memoryUsage: number;
	updateCount: number;
	batchCount: number;
	compressionRatio: number;
}

export interface OptimizationResult {
	success: boolean;
	improvements: string[];
	metrics: PerformanceMetrics;
	recommendations: string[];
}

class StatePerformanceOptimizer {
	private config: PerformanceConfig;
	private cache: Map<string, CacheEntry> = new Map();
	private metrics: PerformanceMetrics;
	private updateQueue: StateUpdate[] = [];
	private batchTimer: NodeJS.Timeout | null = null;
	private isProcessingBatch = false;

	constructor(config: Partial<PerformanceConfig> = {}) {
		this.config = {
			enableCaching: true,
			cacheTTL: 300000, // 5 minutes
			maxCacheSize: 1000,
			enableCompression: true,
			enableDeduplication: true,
			batchSize: 10,
			throttleMs: 100,
			enableMetrics: true,
			...config,
		};

		this.metrics = {
			cacheHits: 0,
			cacheMisses: 0,
			cacheHitRate: 0,
			averageResponseTime: 0,
			memoryUsage: 0,
			updateCount: 0,
			batchCount: 0,
			compressionRatio: 0,
		};

		this.startPerformanceMonitoring();
	}

	/**
	 * Optimize state access
	 */
	async optimizeStateAccess<T>(
		key: string,
		fetchFn: () => Promise<T>,
		options: { ttl?: number; tags?: string[] } = {},
	): Promise<T> {
		const startTime = Date.now();

		try {
			// Check cache first
			if (this.config.enableCaching) {
				const cached = await this.getFromCache<T>(key);
				if (cached !== null) {
					this.metrics.cacheHits++;
					this.updateCacheHitRate();
					return cached;
				}
			}

			// Fetch data
			const data = await fetchFn();

			// Cache the result
			if (this.config.enableCaching && data !== null) {
				await this.setCache(key, data, options);
			}

			this.metrics.cacheMisses++;
			this.updateCacheHitRate();
			this.updateAverageResponseTime(Date.now() - startTime);

			return data;
		} catch (error) {
			console.error("State access optimization failed:", error);
			throw error;
		}
	}

	/**
	 * Optimize state updates
	 */
	optimizeStateUpdate(update: StateUpdate): void {
		if (this.config.enableDeduplication) {
			this.deduplicateUpdate(update);
		}

		this.updateQueue.push(update);
		this.metrics.updateCount++;

		// Batch updates for performance
		this.scheduleBatchProcessing();
	}

	/**
	 * Optimize data compression
	 */
	compressData(data: any): string {
		if (!this.config.enableCompression) {
			return JSON.stringify(data);
		}

		try {
			const jsonString = JSON.stringify(data);
			const compressed = this.simpleCompress(jsonString);

			const originalSize = jsonString.length;
			const compressedSize = compressed.length;
			this.metrics.compressionRatio =
				originalSize > 0 ? compressedSize / originalSize : 0;

			return compressed;
		} catch (error) {
			console.error("Compression failed:", error);
			return JSON.stringify(data);
		}
	}

	/**
	 * Decompress data
	 */
	decompressData(compressedData: string): any {
		if (!this.config.enableCompression) {
			return JSON.parse(compressedData);
		}

		try {
			const decompressed = this.simpleDecompress(compressedData);
			return JSON.parse(decompressed);
		} catch (error) {
			console.error("Decompression failed:", error);
			return JSON.parse(compressedData);
		}
	}

	/**
	 * Get performance metrics
	 */
	getPerformanceMetrics(): PerformanceMetrics {
		this.updateMemoryUsage();
		return { ...this.metrics };
	}

	/**
	 * Optimize state structure
	 */
	optimizeStateStructure(state: StateContext): StateContext {
		const optimized = { ...state };

		// Optimize arrays
		if (optimized.backend.funnels) {
			optimized.backend.funnels = this.optimizeFunnelsArray(
				optimized.backend.funnels,
			);
		}

		if (optimized.backend.resources) {
			optimized.backend.resources = this.optimizeResourcesArray(
				optimized.backend.resources,
			);
		}

		if (optimized.backend.conversations) {
			optimized.backend.conversations = this.optimizeConversationsArray(
				optimized.backend.conversations,
			);
		}

		if (optimized.backend.messages) {
			optimized.backend.messages = this.optimizeMessagesArray(
				optimized.backend.messages,
			);
		}

		// Remove unused fields
		this.removeUnusedFields(optimized);

		return optimized;
	}

	/**
	 * Clear cache
	 */
	clearCache(): void {
		this.cache.clear();
		this.metrics.cacheHits = 0;
		this.metrics.cacheMisses = 0;
		this.metrics.cacheHitRate = 0;
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): {
		size: number;
		hitRate: number;
		memoryUsage: number;
		entries: Array<{ key: string; hits: number; size: number; age: number }>;
	} {
		const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
			key,
			hits: entry.hits,
			size: entry.size,
			age: Date.now() - entry.timestamp.getTime(),
		}));

		return {
			size: this.cache.size,
			hitRate: this.metrics.cacheHitRate,
			memoryUsage: this.metrics.memoryUsage,
			entries,
		};
	}

	/**
	 * Generate optimization recommendations
	 */
	generateOptimizationRecommendations(): string[] {
		const recommendations: string[] = [];

		if (this.metrics.cacheHitRate < 0.7) {
			recommendations.push(
				"Consider increasing cache TTL or improving cache keys",
			);
		}

		if (this.metrics.averageResponseTime > 1000) {
			recommendations.push(
				"Consider implementing data pagination or lazy loading",
			);
		}

		if (this.metrics.memoryUsage > 50 * 1024 * 1024) {
			// 50MB
			recommendations.push(
				"Consider reducing cache size or implementing cache eviction",
			);
		}

		if (this.metrics.compressionRatio > 0.8) {
			recommendations.push(
				"Consider using a more efficient compression algorithm",
			);
		}

		if (this.metrics.updateCount > 1000) {
			recommendations.push(
				"Consider implementing update batching or throttling",
			);
		}

		return recommendations;
	}

	// ===== PRIVATE METHODS =====

	/**
	 * Get from cache
	 */
	private async getFromCache<T>(key: string): Promise<T | null> {
		try {
			// Check local cache first
			const localEntry = this.cache.get(key);
			if (localEntry && this.isCacheEntryValid(localEntry)) {
				localEntry.hits++;
				return localEntry.data;
			}

			// Check Redis cache
			const redisData = await redisCache.get<T>(key);
			if (redisData !== null) {
				// Store in local cache
				this.setLocalCache(key, redisData, this.config.cacheTTL);
				return redisData;
			}

			return null;
		} catch (error) {
			console.error("Cache get error:", error);
			return null;
		}
	}

	/**
	 * Set cache
	 */
	private async setCache(
		key: string,
		data: any,
		options: { ttl?: number; tags?: string[] } = {},
	): Promise<void> {
		try {
			const ttl = options.ttl || this.config.cacheTTL;

			// Set in local cache
			this.setLocalCache(key, data, ttl);

			// Set in Redis cache
			await redisCache.set(key, data, { ttl, tags: options.tags });
		} catch (error) {
			console.error("Cache set error:", error);
		}
	}

	/**
	 * Set local cache
	 */
	private setLocalCache(key: string, data: any, ttl: number): void {
		// Check cache size limit
		if (this.cache.size >= this.config.maxCacheSize) {
			this.evictOldestEntry();
		}

		const entry: CacheEntry = {
			key,
			data,
			timestamp: new Date(),
			ttl,
			hits: 0,
			size: JSON.stringify(data).length,
		};

		this.cache.set(key, entry);
	}

	/**
	 * Check if cache entry is valid
	 */
	private isCacheEntryValid(entry: CacheEntry): boolean {
		const now = Date.now();
		const entryAge = now - entry.timestamp.getTime();
		return entryAge < entry.ttl;
	}

	/**
	 * Evict oldest cache entry
	 */
	private evictOldestEntry(): void {
		let oldestKey = "";
		let oldestTime = Date.now();

		for (const [key, entry] of this.cache.entries()) {
			if (entry.timestamp.getTime() < oldestTime) {
				oldestTime = entry.timestamp.getTime();
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}

	/**
	 * Update cache hit rate
	 */
	private updateCacheHitRate(): void {
		const total = this.metrics.cacheHits + this.metrics.cacheMisses;
		this.metrics.cacheHitRate = total > 0 ? this.metrics.cacheHits / total : 0;
	}

	/**
	 * Update average response time
	 */
	private updateAverageResponseTime(responseTime: number): void {
		const total = this.metrics.cacheHits + this.metrics.cacheMisses;
		this.metrics.averageResponseTime =
			(this.metrics.averageResponseTime * (total - 1) + responseTime) / total;
	}

	/**
	 * Update memory usage
	 */
	private updateMemoryUsage(): void {
		let totalSize = 0;
		for (const entry of this.cache.values()) {
			totalSize += entry.size;
		}
		this.metrics.memoryUsage = totalSize;
	}

	/**
	 * Deduplicate update
	 */
	private deduplicateUpdate(update: StateUpdate): void {
		// Remove existing updates for the same entity
		this.updateQueue = this.updateQueue.filter((existingUpdate) => {
			return !this.isSameEntity(existingUpdate, update);
		});
	}

	/**
	 * Check if updates are for the same entity
	 */
	private isSameEntity(update1: StateUpdate, update2: StateUpdate): boolean {
		// Simple comparison - in production, you'd want more sophisticated logic
		return (
			update1.type === update2.type &&
			JSON.stringify(update1.data) === JSON.stringify(update2.data)
		);
	}

	/**
	 * Schedule batch processing
	 */
	private scheduleBatchProcessing(): void {
		if (this.batchTimer || this.isProcessingBatch) {
			return;
		}

		this.batchTimer = setTimeout(() => {
			this.processBatch();
		}, this.config.throttleMs);
	}

	/**
	 * Process batch of updates
	 */
	private async processBatch(): Promise<void> {
		if (this.isProcessingBatch || this.updateQueue.length === 0) {
			return;
		}

		this.isProcessingBatch = true;
		this.batchTimer = null;

		try {
			const batch = this.updateQueue.splice(0, this.config.batchSize);
			this.metrics.batchCount++;

			// Process batch
			await this.processUpdateBatch(batch);
		} catch (error) {
			console.error("Batch processing failed:", error);
		} finally {
			this.isProcessingBatch = false;

			// Process remaining updates
			if (this.updateQueue.length > 0) {
				this.scheduleBatchProcessing();
			}
		}
	}

	/**
	 * Process update batch
	 */
	private async processUpdateBatch(batch: StateUpdate[]): Promise<void> {
		// This would integrate with your state manager
		// For now, we'll just log the batch
		console.log(`Processing batch of ${batch.length} updates`);
	}

	/**
	 * Simple compression (placeholder)
	 */
	private simpleCompress(data: string): string {
		// In production, you'd use a proper compression library like pako or lz-string
		return btoa(data);
	}

	/**
	 * Simple decompression (placeholder)
	 */
	private simpleDecompress(compressedData: string): string {
		// In production, you'd use a proper decompression library
		return atob(compressedData);
	}

	/**
	 * Optimize funnels array
	 */
	private optimizeFunnelsArray(funnels: FunnelData[]): FunnelData[] {
		return funnels
			.filter((funnel) => funnel.id && funnel.name) // Remove invalid funnels
			.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) // Sort by update time
			.slice(0, 100); // Limit to 100 most recent
	}

	/**
	 * Optimize resources array
	 */
	private optimizeResourcesArray(resources: ResourceData[]): ResourceData[] {
		return resources
			.filter((resource) => resource.id && resource.name && resource.link)
			.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
			.slice(0, 200); // Limit to 200 most recent
	}

	/**
	 * Optimize conversations array
	 */
	private optimizeConversationsArray(
		conversations: ConversationData[],
	): ConversationData[] {
		return conversations
			.filter((conversation) => conversation.id && conversation.funnelId)
			.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
			.slice(0, 50); // Limit to 50 most recent
	}

	/**
	 * Optimize messages array
	 */
	private optimizeMessagesArray(messages: MessageData[]): MessageData[] {
		return messages
			.filter(
				(message) => message.id && message.conversationId && message.content,
			)
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
			.slice(0, 1000); // Limit to 1000 most recent
	}

	/**
	 * Remove unused fields
	 */
	private removeUnusedFields(state: StateContext): void {
		// Remove empty arrays
		if (state.backend.funnels.length === 0) {
			(state.backend as any).funnels = undefined;
		}
		if (state.backend.resources.length === 0) {
			(state.backend as any).resources = undefined;
		}
		if (state.backend.conversations.length === 0) {
			(state.backend as any).conversations = undefined;
		}
		if (state.backend.messages.length === 0) {
			(state.backend as any).messages = undefined;
		}

		// Remove empty objects
		if (Object.keys(state.frontend.errors).length === 0) {
			(state.frontend as any).errors = undefined;
		}
		if (Object.keys(state.frontend.optimisticUpdates).length === 0) {
			(state.frontend as any).optimisticUpdates = undefined;
		}
	}

	/**
	 * Start performance monitoring
	 */
	private startPerformanceMonitoring(): void {
		if (!this.config.enableMetrics) {
			return;
		}

		setInterval(() => {
			this.updateMemoryUsage();
			this.cleanupExpiredCache();
		}, 60000); // Every minute
	}

	/**
	 * Cleanup expired cache entries
	 */
	private cleanupExpiredCache(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (!this.isCacheEntryValid(entry)) {
				this.cache.delete(key);
			}
		}
	}
}

// Export singleton instance
export const statePerformanceOptimizer = new StatePerformanceOptimizer();

// Export types
// Types are already exported above
