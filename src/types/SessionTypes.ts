/**
 * TypeScript type definitions for SNMP session management and connection pooling
 */

export interface SnmpSession {
    id: string;
    host: string;
    community: string;
    version: string;
    port: number;
    createdAt: number;
    lastUsed: number;
    requestCount: number;
    active: boolean;
    session: any; // The actual net-snmp session object
}

export interface SessionPoolConfig {
    maxSessions: number;
    sessionTimeout: number; // milliseconds
    cleanupInterval: number; // milliseconds
    maxRequestsPerSession: number;
    enableMetrics: boolean;
}

export interface SessionKey {
    host: string;
    community: string;
    version: string;
    port: number;
}

export interface SessionMetrics {
    totalSessions: number;
    activeSessions: number;
    totalRequests: number;
    averageRequestTime: number;
    errorRate: number;
    cacheHitRate: number;
    poolUtilization: number;
}

export interface SessionPoolStatus {
    size: number;
    maxSize: number;
    activeConnections: number;
    metrics: SessionMetrics;
    sessions: SnmpSession[];
}

export interface RateLimitEntry {
    host: string;
    requests: number[];
    windowStart: number;
    blocked: boolean;
}

export interface RateLimitConfig {
    maxRequestsPerWindow: number;
    windowSizeMs: number;
    blockDurationMs: number;
    enableRateLimiting: boolean;
}

export interface SessionError {
    type: 'timeout' | 'auth' | 'network' | 'limit' | 'unknown';
    message: string;
    host: string;
    timestamp: number;
    recoverable: boolean;
}

export interface SessionHealthCheck {
    sessionId: string;
    host: string;
    healthy: boolean;
    lastCheck: number;
    responseTime: number;
    errorCount: number;
    consecutiveErrors: number;
}

export interface ConnectionPoolOptions {
    minConnections?: number;
    maxConnections?: number;
    acquireTimeoutMillis?: number;
    createTimeoutMillis?: number;
    destroyTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    reapIntervalMillis?: number;
    createRetryIntervalMillis?: number;
}

// Session lifecycle events
export type SessionEvent = 
    | 'created'
    | 'acquired'
    | 'released'
    | 'destroyed'
    | 'timeout'
    | 'error'
    | 'healthcheck';

export interface SessionEventData {
    sessionId: string;
    event: SessionEvent;
    timestamp: number;
    host: string;
    metadata?: Record<string, any>;
}

export interface SessionManager {
    getSession(key: SessionKey): Promise<SnmpSession>;
    releaseSession(sessionId: string): Promise<void>;
    closeSession(sessionId: string): Promise<void>;
    closeAllSessions(): Promise<void>;
    getStatus(): SessionPoolStatus;
    cleanup(): Promise<void>;
    healthCheck(): Promise<SessionHealthCheck[]>;
}