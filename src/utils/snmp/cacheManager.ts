/**
 * Intelligent SNMP response cache manager with OID-specific TTL
 * Implements performance optimization for SNMP queries with smart caching strategies
 */

import { MibCacheConfig } from '../../types/MibTypes';

export interface CacheEntry {
    value: any;
    timestamp: number;
    ttl: number;
    oid: string;
    host: string;
    hitCount: number;
    lastAccess: number;
}

export interface CacheStatistics {
    totalEntries: number;
    hitRate: number;
    missRate: number;
    totalHits: number;
    totalMisses: number;
    memoryUsage: number;
    oldestEntry?: number;
    newestEntry?: number;
}

export class SnmpCacheManager {
    private cache: Map<string, CacheEntry> = new Map();
    private readonly config: MibCacheConfig;
    private totalHits = 0;
    private totalMisses = 0;
    private cleanupInterval?: NodeJS.Timeout;

    // OID-specific TTL patterns
    private static readonly TTL_PATTERNS = {
        // Static system information (cache for 24 hours)
        STATIC_SYSTEM: {
            patterns: [
                /^1\.3\.6\.1\.2\.1\.1\.1\.0$/, // sysDescr
                /^1\.3\.6\.1\.2\.1\.1\.2\.0$/, // sysObjectID
                /^1\.3\.6\.1\.2\.1\.1\.4\.0$/, // sysContact
                /^1\.3\.6\.1\.2\.1\.1\.5\.0$/, // sysName
                /^1\.3\.6\.1\.2\.1\.1\.6\.0$/, // sysLocation
            ],
            ttl: 24 * 60 * 60 * 1000 // 24 hours
        },

        // Semi-static interface information (cache for 1 hour)
        INTERFACE_CONFIG: {
            patterns: [
                /^1\.3\.6\.1\.2\.1\.2\.2\.1\.2\./, // ifDescr
                /^1\.3\.6\.1\.2\.1\.2\.2\.1\.3\./, // ifType
                /^1\.3\.6\.1\.2\.1\.2\.2\.1\.4\./, // ifMtu
                /^1\.3\.6\.1\.2\.1\.2\.2\.1\.5\./, // ifSpeed
                /^1\.3\.6\.1\.2\.1\.2\.2\.1\.6\./, // ifPhysAddress
            ],
            ttl: 60 * 60 * 1000 // 1 hour
        },

        // Dynamic counters (cache for 5 minutes)
        COUNTERS: {
            patterns: [
                /^1\.3\.6\.1\.2\.1\.2\.2\.1\.10\./, // ifInOctets
                /^1\.3\.6\.1\.2\.1\.2\.2\.1\.11\./, // ifInUcastPkts
                /^1\.3\.6\.1\.2\.1\.2\.2\.1\.16\./, // ifOutOctets
                /^1\.3\.6\.1\.2\.1\.2\.2\.1\.17\./, // ifOutUcastPkts
            ],
            ttl: 5 * 60 * 1000 // 5 minutes
        },

        // Very dynamic status (cache for 30 seconds)
        STATUS: {
            patterns: [
                /^1\.3\.6\.1\.2\.1\.1\.3\.0$/, // sysUpTime
                /^1\.3\.6\.1\.2\.1\.2\.2\.1\.7\./, // ifAdminStatus
                /^1\.3\.6\.1\.2\.1\.2\.2\.1\.8\./, // ifOperStatus
            ],
            ttl: 30 * 1000 // 30 seconds
        },

        // Enterprise/vendor-specific OIDs (cache for 10 minutes by default)
        ENTERPRISE: {
            patterns: [
                /^1\.3\.6\.1\.4\.1\./, // Enterprise OIDs
            ],
            ttl: 10 * 60 * 1000 // 10 minutes
        }
    };

    constructor(config: Partial<MibCacheConfig> = {}) {
        this.config = {
            staticDataTtl: config.staticDataTtl ?? 24 * 60 * 60 * 1000, // 24 hours
            dynamicDataTtl: config.dynamicDataTtl ?? 5 * 60 * 1000, // 5 minutes
            maxCacheSize: config.maxCacheSize ?? 10000,
            enableCompression: config.enableCompression ?? false
        };

        this.startCleanupInterval();
    }

    /**
     * Get cached value for host and OID
     */
    getCachedValue(host: string, oid: string): any | null {
        const key = this.createCacheKey(host, oid);
        const entry = this.cache.get(key);

        if (!entry) {
            this.totalMisses++;
            return null;
        }

        // Check if entry has expired
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.totalMisses++;
            return null;
        }

        // Update access statistics
        entry.hitCount++;
        entry.lastAccess = Date.now();
        this.totalHits++;

        return this.config.enableCompression ? this.decompress(entry.value) : entry.value;
    }

    /**
     * Set cached value with intelligent TTL
     */
    setCachedValue(host: string, oid: string, value: any, customTtl?: number): void {
        const key = this.createCacheKey(host, oid);
        const ttl = customTtl ?? this.determineTtl(oid);
        // const now = Date.now();

        // Evict old entries if cache is full
        if (this.cache.size >= this.config.maxCacheSize) {
            this.evictOldEntries();
        }

        const entry: CacheEntry = {
            value: this.config.enableCompression ? this.compress(value) : value,
            timestamp: Date.now(),
            ttl,
            oid,
            host,
            hitCount: 0,
            lastAccess: Date.now()
        };

        this.cache.set(key, entry);
    }

    /**
     * Remove cached value
     */
    removeCachedValue(host: string, oid: string): boolean {
        const key = this.createCacheKey(host, oid);
        return this.cache.delete(key);
    }

    /**
     * Remove all cached values for a host
     */
    removeHostCache(host: string): number {
        let removed = 0;
        const hostPrefix = `${host}:`;
        
        for (const [key] of this.cache.entries()) {
            if (key.startsWith(hostPrefix)) {
                this.cache.delete(key);
                removed++;
            }
        }
        
        return removed;
    }

    /**
     * Clear entire cache
     */
    clearCache(): void {
        this.cache.clear();
        this.totalHits = 0;
        this.totalMisses = 0;
    }

    /**
     * Get cache statistics
     */
    getStatistics(): CacheStatistics {
        const entries = Array.from(this.cache.values());
        // const now = Date.now();
        
        let memoryUsage = 0;
        let oldestEntry: number | undefined;
        let newestEntry: number | undefined;

        for (const entry of entries) {
            // Rough memory usage calculation
            memoryUsage += this.estimateEntrySize(entry);
            
            if (!oldestEntry || entry.timestamp < oldestEntry) {
                oldestEntry = entry.timestamp;
            }
            
            if (!newestEntry || entry.timestamp > newestEntry) {
                newestEntry = entry.timestamp;
            }
        }

        const totalRequests = this.totalHits + this.totalMisses;

        return {
            totalEntries: this.cache.size,
            hitRate: totalRequests > 0 ? this.totalHits / totalRequests : 0,
            missRate: totalRequests > 0 ? this.totalMisses / totalRequests : 0,
            totalHits: this.totalHits,
            totalMisses: this.totalMisses,
            memoryUsage,
            oldestEntry,
            newestEntry
        };
    }

    /**
     * Get cache entries for a specific host
     */
    getHostEntries(host: string): Array<{
        oid: string;
        age: number;
        hitCount: number;
        ttl: number;
        expired: boolean;
    }> {
        const hostPrefix = `${host}:`;
        // const now = Date.now();
        const entries: Array<{
            oid: string;
            age: number;
            hitCount: number;
            ttl: number;
            expired: boolean;
        }> = [];

        for (const [key, entry] of this.cache.entries()) {
            if (key.startsWith(hostPrefix)) {
                entries.push({
                    oid: entry.oid,
                    age: Date.now() - entry.timestamp,
                    hitCount: entry.hitCount,
                    ttl: entry.ttl,
                    expired: this.isExpired(entry)
                });
            }
        }

        return entries.sort((a, b) => a.oid.localeCompare(b.oid));
    }

    /**
     * Cleanup expired entries
     */
    cleanup(): number {
        let removed = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                this.cache.delete(key);
                removed++;
            }
        }
        
        return removed;
    }

    /**
     * Update cache configuration
     */
    updateConfig(newConfig: Partial<MibCacheConfig>): void {
        Object.assign(this.config, newConfig);
    }

    /**
     * Get current configuration
     */
    getConfig(): MibCacheConfig {
        return { ...this.config };
    }

    /**
     * Preload cache with common OIDs for a host
     */
    async preloadCommonOids(host: string, oids: string[], valueProvider: (oid: string) => Promise<any>): Promise<void> {
        const promises = oids.map(async (oid) => {
            try {
                const value = await valueProvider(oid);
                this.setCachedValue(host, oid, value);
            } catch (error) {
                // Ignore errors during preload
            }
        });

        await Promise.allSettled(promises);
    }

    /**
     * Export cache data for persistence
     */
    exportCache(): {
        entries: Array<{
            host: string;
            oid: string;
            value: any;
            timestamp: number;
            ttl: number;
        }>;
        statistics: CacheStatistics;
        exportTime: number;
    } {
        const entries = Array.from(this.cache.values()).map(entry => ({
            host: entry.host,
            oid: entry.oid,
            value: this.config.enableCompression ? this.decompress(entry.value) : entry.value,
            timestamp: entry.timestamp,
            ttl: entry.ttl
        }));

        return {
            entries,
            statistics: this.getStatistics(),
            exportTime: Date.now()
        };
    }

    /**
     * Import cache data from external source
     */
    importCache(data: {
        entries: Array<{
            host: string;
            oid: string;
            value: any;
            timestamp: number;
            ttl: number;
        }>;
    }): number {
        let imported = 0;
        const now = Date.now();

        for (const entry of data.entries) {
            // Only import entries that haven't expired
            if ((now - entry.timestamp) < entry.ttl) {
                this.setCachedValue(entry.host, entry.oid, entry.value, entry.ttl);
                imported++;
            }
        }

        return imported;
    }

    /**
     * Shutdown the cache manager
     */
    shutdown(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        this.clearCache();
    }

    /**
     * Create cache key from host and OID
     */
    private createCacheKey(host: string, oid: string): string {
        return `${host.toLowerCase()}:${oid}`;
    }

    /**
     * Determine appropriate TTL for an OID based on patterns
     */
    private determineTtl(oid: string): number {
        for (const category of Object.values(SnmpCacheManager.TTL_PATTERNS)) {
            for (const pattern of category.patterns) {
                if (pattern.test(oid)) {
                    return category.ttl;
                }
            }
        }

        // Default TTL for unknown OIDs
        return this.config.dynamicDataTtl;
    }

    /**
     * Check if cache entry has expired
     */
    private isExpired(entry: CacheEntry): boolean {
        return (Date.now() - entry.timestamp) > entry.ttl;
    }

    /**
     * Evict old entries when cache is full
     */
    private evictOldEntries(): void {
        // First, remove expired entries
        this.cleanup();
        
        if (this.cache.size < this.config.maxCacheSize) {
            return; // Cleanup was sufficient
        }

        // If still too full, evict least recently used entries
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => {
            // Sort by last access time (LRU) and then by hit count
            const accessDiff = a[1].lastAccess - b[1].lastAccess;
            if (accessDiff !== 0) return accessDiff;
            
            return a[1].hitCount - b[1].hitCount;
        });

        // Remove oldest 20% of entries
        const removeCount = Math.floor(entries.length * 0.2);
        for (let i = 0; i < removeCount; i++) {
            this.cache.delete(entries[i][0]);
        }
    }

    /**
     * Start cleanup interval
     */
    private startCleanupInterval(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        // Run cleanup every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
        // Prevent this interval from keeping the Node process alive in tests
        const timer = this.cleanupInterval as NodeJS.Timeout & { unref?: () => void };
        if (typeof timer.unref === 'function') {
            timer.unref();
        }
    }

    /**
     * Estimate memory usage of a cache entry
     */
    private estimateEntrySize(entry: CacheEntry): number {
        // Rough estimation of memory usage
        let size = 0;
        
        // Fixed overhead for the entry object
        size += 200; // Approximate overhead for object properties
        
        // Variable size based on content
        size += entry.oid.length * 2; // String characters (UTF-16)
        size += entry.host.length * 2;
        
        // Value size estimation
        if (typeof entry.value === 'string') {
            size += entry.value.length * 2;
        } else if (typeof entry.value === 'object') {
            size += JSON.stringify(entry.value).length * 2;
        } else {
            size += 8; // Approximate for numbers, booleans, etc.
        }
        
        return size;
    }

    /**
     * Compress value for storage (placeholder implementation)
     */
    private compress(value: any): any {
        // In a real implementation, this could use actual compression
        // For now, just return the value as-is
        return value;
    }

    /**
     * Decompress value from storage (placeholder implementation)
     */
    private decompress(value: any): any {
        // In a real implementation, this would decompress the value
        // For now, just return the value as-is
        return value;
    }
}