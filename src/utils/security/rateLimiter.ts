/**
 * Rate limiting implementation for SNMP operations to prevent device overload
 * Implements per-device rate limiting with configurable windows and thresholds
 */

import { RateLimitConfig, RateLimitEntry } from '../../types/SessionTypes';

export class SnmpRateLimiter {
    private deviceLimits: Map<string, RateLimitEntry> = new Map();
    private readonly config: RateLimitConfig;
    private cleanupTimer?: NodeJS.Timeout;

    constructor(config: Partial<RateLimitConfig> = {}) {
        this.config = {
            maxRequestsPerWindow: config.maxRequestsPerWindow ?? 60, // 60 requests per minute
            windowSizeMs: config.windowSizeMs ?? 60000, // 1 minute window
            blockDurationMs: config.blockDurationMs ?? 300000, // 5 minutes block
            enableRateLimiting: config.enableRateLimiting ?? true
        };

        // Cleanup old entries periodically
        this.cleanupTimer = setInterval(() => this.cleanup(), this.config.windowSizeMs);
        const timer = this.cleanupTimer as NodeJS.Timeout & { unref?: () => void };
        if (typeof timer.unref === 'function') {
            timer.unref();
        }
    }

    /**
     * Check if a request to the specified host is allowed under rate limiting rules
     */
    public checkRateLimit(host: string): { allowed: boolean; reason?: string; retryAfter?: number } {
        if (!this.config.enableRateLimiting) {
            return { allowed: true };
        }

        const now = Date.now();
        const key = this.normalizeHost(host);
        
        let entry = this.deviceLimits.get(key);
        if (!entry) {
            entry = {
                host: key,
                requests: [],
                windowStart: now,
                blocked: false
            };
            this.deviceLimits.set(key, entry);
        }

        // Check if currently blocked
        if (entry.blocked && (now - entry.windowStart) < this.config.blockDurationMs) {
            const remainingBlockTime = this.config.blockDurationMs - (now - entry.windowStart);
            return {
                allowed: false,
                reason: `Rate limit exceeded for host ${host}. Blocked for ${Math.ceil(remainingBlockTime / 1000)} more seconds.`,
                retryAfter: Math.ceil(remainingBlockTime / 1000)
            };
        }

        // Reset block status if block period expired
        if (entry.blocked && (now - entry.windowStart) >= this.config.blockDurationMs) {
            entry.blocked = false;
            entry.requests = [];
            entry.windowStart = now;
        }

        // Remove old requests outside the current window
        const windowStart = now - this.config.windowSizeMs;
        entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);

        // Check if rate limit would be exceeded
        if (entry.requests.length >= this.config.maxRequestsPerWindow) {
            entry.blocked = true;
            entry.windowStart = now;
            
            return {
                allowed: false,
                reason: `Rate limit exceeded: ${entry.requests.length} requests in the last ${this.config.windowSizeMs / 1000} seconds (max: ${this.config.maxRequestsPerWindow})`,
                retryAfter: Math.ceil(this.config.blockDurationMs / 1000)
            };
        }

        // Allow the request and record it
        entry.requests.push(now);
        return { allowed: true };
    }

    /**
     * Get current rate limit status for a host
     */
    public getRateLimitStatus(host: string): {
        currentRequests: number;
        maxRequests: number;
        windowSize: number;
        blocked: boolean;
        resetTime?: number;
    } {
        const key = this.normalizeHost(host);
        const entry = this.deviceLimits.get(key);
        const now = Date.now();

        if (!entry) {
            return {
                currentRequests: 0,
                maxRequests: this.config.maxRequestsPerWindow,
                windowSize: this.config.windowSizeMs,
                blocked: false
            };
        }

        // Clean old requests
        const windowStart = now - this.config.windowSizeMs;
        const currentRequests = entry.requests.filter(timestamp => timestamp > windowStart);

        return {
            currentRequests: currentRequests.length,
            maxRequests: this.config.maxRequestsPerWindow,
            windowSize: this.config.windowSizeMs,
            blocked: entry.blocked,
            resetTime: entry.blocked ? entry.windowStart + this.config.blockDurationMs : undefined
        };
    }

    /**
     * Reset rate limit for a specific host (admin function)
     */
    public resetRateLimit(host: string): void {
        const key = this.normalizeHost(host);
        this.deviceLimits.delete(key);
    }

    /**
     * Reset all rate limits (admin function)
     */
    public resetAllRateLimits(): void {
        this.deviceLimits.clear();
    }

    /**
     * Get rate limit statistics for all hosts
     */
    public getStatistics(): {
        totalHosts: number;
        blockedHosts: number;
        totalRequests: number;
        averageRequestsPerHost: number;
        hostStats: Array<{
            host: string;
            requests: number;
            blocked: boolean;
            lastRequest?: number;
        }>;
    } {
        const now = Date.now();
        const windowStart = now - this.config.windowSizeMs;
        let totalRequests = 0;
        let blockedHosts = 0;

        const hostStats = Array.from(this.deviceLimits.entries()).map(([host, entry]) => {
            const recentRequests = entry.requests.filter(timestamp => timestamp > windowStart);
            totalRequests += recentRequests.length;
            
            if (entry.blocked) {
                blockedHosts++;
            }

            return {
                host,
                requests: recentRequests.length,
                blocked: entry.blocked,
                lastRequest: recentRequests.length > 0 ? Math.max(...recentRequests) : undefined
            };
        });

        return {
            totalHosts: this.deviceLimits.size,
            blockedHosts,
            totalRequests,
            averageRequestsPerHost: this.deviceLimits.size > 0 ? totalRequests / this.deviceLimits.size : 0,
            hostStats
        };
    }

    /**
     * Update rate limiting configuration
     */
    public updateConfig(newConfig: Partial<RateLimitConfig>): void {
        Object.assign(this.config, newConfig);
    }

    /**
     * Get current configuration
     */
    public getConfig(): RateLimitConfig {
        return { ...this.config };
    }

    /**
     * Normalize host for consistent key usage
     */
    private normalizeHost(host: string): string {
        return host.toLowerCase().trim();
    }

    /**
     * Clean up old entries to prevent memory leaks
     */
    private cleanup(): void {
        const now = Date.now();
        const cutoff = now - (this.config.windowSizeMs * 2); // Keep data for 2 windows

        for (const [host, entry] of this.deviceLimits.entries()) {
            // Remove entries that haven't been used recently and aren't blocked
            if (!entry.blocked && entry.requests.length === 0) {
                this.deviceLimits.delete(host);
                continue;
            }

            // Clean old requests from active entries
            entry.requests = entry.requests.filter(timestamp => timestamp > cutoff);
            
            // Remove entries with no recent requests and not currently blocked
            if (!entry.blocked && entry.requests.length === 0) {
                this.deviceLimits.delete(host);
            }
        }
    }

    /**
     * Check if rate limiting is enabled
     */
    public isEnabled(): boolean {
        return this.config.enableRateLimiting;
    }

    /**
     * Enable or disable rate limiting
     */
    public setEnabled(enabled: boolean): void {
        this.config.enableRateLimiting = enabled;
        if (!enabled) {
            this.shutdown();
        } else if (!this.cleanupTimer) {
            this.cleanupTimer = setInterval(() => this.cleanup(), this.config.windowSizeMs);
            const timer = this.cleanupTimer as NodeJS.Timeout & { unref?: () => void };
            if (typeof timer.unref === 'function') {
                timer.unref();
            }
        }
    }

    /**
     * Export rate limiting data for persistence/analysis
     */
    public exportData(): {
        config: RateLimitConfig;
        entries: Array<{
            host: string;
            requestCount: number;
            blocked: boolean;
            lastActivity: number;
        }>;
        exportTime: number;
    } {
        const now = Date.now();
        const entries = Array.from(this.deviceLimits.entries()).map(([host, entry]) => ({
            host,
            requestCount: entry.requests.length,
            blocked: entry.blocked,
            lastActivity: entry.requests.length > 0 ? Math.max(...entry.requests) : entry.windowStart
        }));

        return {
            config: this.config,
            entries,
            exportTime: now
        };
    }

    /**
     * Gracefully shutdown the rate limiter by clearing timers and state
     */
    public shutdown(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.resetAllRateLimits();
    }
}