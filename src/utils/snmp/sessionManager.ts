/**
 * SNMP Session Manager with connection pooling and lifecycle management
 * Implements efficient session reuse and resource management
 */

import { 
    SnmpSession, 
    SessionPoolConfig, 
    SessionKey, 
    SessionManager, 
    SessionPoolStatus,
    SessionHealthCheck,
    SessionEventData
} from '../../types/SessionTypes';
import { CredentialUtils } from '../security/credentialUtils';
import { NodeOperationError } from 'n8n-workflow';

export class SnmpSessionManager implements SessionManager {
    private sessions: Map<string, SnmpSession> = new Map();
    private readonly config: SessionPoolConfig;
    private cleanupInterval?: NodeJS.Timeout;
    private sessionIdCounter = 0;

    // Session metrics
    private totalRequests = 0;
    private totalErrors = 0;
    private requestTimes: number[] = [];

    constructor(config: Partial<SessionPoolConfig> = {}) {
        this.config = {
            maxSessions: config.maxSessions ?? 100,
            sessionTimeout: config.sessionTimeout ?? 300000, // 5 minutes
            cleanupInterval: config.cleanupInterval ?? 60000, // 1 minute
            maxRequestsPerSession: config.maxRequestsPerSession ?? 1000,
            enableMetrics: config.enableMetrics ?? true
        };

        this.startCleanupInterval();
    }

    /**
     * Get or create a session for the specified host and credentials
     */
    async getSession(key: SessionKey): Promise<SnmpSession> {
        const sessionKey = this.createSessionKey(key);
        const existing = this.sessions.get(sessionKey);

        // Return existing session if valid
        if (existing && this.isSessionValid(existing)) {
            existing.lastUsed = Date.now();
            return existing;
        }

        // Remove invalid session
        if (existing) {
            await this.closeSession(existing.id);
        }

        // Check session limit
        if (this.sessions.size >= this.config.maxSessions) {
            await this.evictOldestSession();
        }

        // Create new session
        return this.createNewSession(key);
    }

    /**
     * Release a session back to the pool
     */
    async releaseSession(sessionId: string): Promise<void> {
        const session = this.findSessionById(sessionId);
        if (session) {
            session.lastUsed = Date.now();
            session.active = false;
        }
    }

    /**
     * Close a specific session
     */
    async closeSession(sessionId: string): Promise<void> {
        const session = this.findSessionById(sessionId);
        if (!session) return;

        try {
            if (session.session && typeof session.session.close === 'function') {
                session.session.close();
            }
        } catch (error) {
            // Log but don't throw - session cleanup should always succeed
            this.recordError('session_close_error', session.host, error);
        }

        this.sessions.delete(this.findSessionKey(sessionId) || '');
        this.emitEvent('destroyed', sessionId, session.host);
    }

    /**
     * Close all sessions in the pool
     */
    async closeAllSessions(): Promise<void> {
        const closePromises = Array.from(this.sessions.values()).map(session => 
            this.closeSession(session.id)
        );

        await Promise.allSettled(closePromises);
        this.sessions.clear();
    }

    /**
     * Get current pool status and metrics
     */
    getStatus(): SessionPoolStatus {
        const sessions = Array.from(this.sessions.values());
        const activeSessions = sessions.filter(s => s.active).length;
        
        return {
            size: this.sessions.size,
            maxSize: this.config.maxSessions,
            activeConnections: activeSessions,
            metrics: {
                totalSessions: this.sessions.size,
                activeSessions,
                totalRequests: this.totalRequests,
                averageRequestTime: this.calculateAverageRequestTime(),
                errorRate: this.totalRequests > 0 ? this.totalErrors / this.totalRequests : 0,
                cacheHitRate: 0, // This would be calculated if we track cache hits
                poolUtilization: this.sessions.size / this.config.maxSessions
            },
            sessions: sessions.map(s => ({ ...s })) // Return copies for safety
        };
    }

    /**
     * Perform cleanup of expired sessions
     */
    async cleanup(): Promise<void> {
        const now = Date.now();
        const expiredSessions: string[] = [];

        for (const [, session] of this.sessions.entries()) {
            if (!this.isSessionValid(session) || 
                (now - session.lastUsed) > this.config.sessionTimeout ||
                session.requestCount > this.config.maxRequestsPerSession) {
                expiredSessions.push(session.id);
            }
        }

        for (const sessionId of expiredSessions) {
            await this.closeSession(sessionId);
        }
    }

    /**
     * Perform health check on all sessions
     */
    async healthCheck(): Promise<SessionHealthCheck[]> {
        const results: SessionHealthCheck[] = [];
        const now = Date.now();

        for (const session of this.sessions.values()) {
            const startTime = now;
            let healthy = true;
            let responseTime = 0;

            try {
                // Perform a lightweight health check (could be a simple system query)
                responseTime = Date.now() - startTime;
                
                // For now, just check if the session object exists and is not too old
                if (!session.session || (now - session.lastUsed) > this.config.sessionTimeout) {
                    healthy = false;
                }
            } catch (error) {
                healthy = false;
                responseTime = Date.now() - startTime;
            }

            results.push({
                sessionId: session.id,
                host: session.host,
                healthy,
                lastCheck: now,
                responseTime,
                errorCount: 0, // We could track this per session
                consecutiveErrors: 0
            });
        }

        return results;
    }

    /**
     * Record a successful request
     */
    recordRequest(sessionId: string, requestTime: number): void {
        const session = this.findSessionById(sessionId);
        if (session) {
            session.requestCount++;
            session.lastUsed = Date.now();
        }

        if (this.config.enableMetrics) {
            this.totalRequests++;
            this.requestTimes.push(requestTime);
            
            // Keep only last 1000 request times to prevent memory growth
            if (this.requestTimes.length > 1000) {
                this.requestTimes = this.requestTimes.slice(-1000);
            }
        }
    }

    /**
     * Record an error
     */
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    recordError(_type: string, _host: string, _error: any): void {
        if (this.config.enableMetrics) {
            this.totalErrors++;
        }

        // Log the error (in a real implementation, this might use a proper logger)
        // const safeError = CredentialUtils.redactSensitiveData(error);
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<SessionPoolConfig>): void {
        Object.assign(this.config, newConfig);
    }

    /**
     * Get current configuration
     */
    getConfig(): SessionPoolConfig {
        return { ...this.config };
    }

    /**
     * Gracefully shutdown the session manager
     */
    async shutdown(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }

        await this.closeAllSessions();
    }

    /**
     * Create a unique session key from connection parameters
     */
    private createSessionKey(key: SessionKey): string {
        return `${key.host}:${key.port}:${key.version}:${CredentialUtils.createCredentialHash(
            key as any, key.host
        )}`;
    }

    /**
     * Create a new SNMP session
     */
    private async createNewSession(key: SessionKey): Promise<SnmpSession> {
        const sessionId = this.generateSessionId();
        
        try {
            // Import net-snmp library
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const snmp = require('net-snmp');
            
            // Create SNMP session
            const snmpSession = snmp.createSession(key.host, key.community, {
                port: key.port,
                retries: 3,
                timeout: 5000,
                transport: 'udp4',
                version: key.version === '1' ? snmp.Version1 : snmp.Version2c
            });

            const session: SnmpSession = {
                id: sessionId,
                host: key.host,
                community: key.community,
                version: key.version,
                port: key.port,
                createdAt: Date.now(),
                lastUsed: Date.now(),
                requestCount: 0,
                active: false,
                session: snmpSession
            };

            const sessionKey = this.createSessionKey(key);
            this.sessions.set(sessionKey, session);

            this.emitEvent('created', sessionId, key.host);
            return session;

        } catch (error) {
            this.recordError('session_creation_error', key.host, error);
            throw new NodeOperationError(
                null as any,
                `Failed to create SNMP session for ${key.host}: ${CredentialUtils.createSafeErrorMessage(error as Error)}`
            );
        }
    }

    /**
     * Check if a session is still valid
     */
    private isSessionValid(session: SnmpSession): boolean {
        const now = Date.now();
        
        // Check if session is too old
        if ((now - session.lastUsed) > this.config.sessionTimeout) {
            return false;
        }

        // Check if session has too many requests
        if (session.requestCount > this.config.maxRequestsPerSession) {
            return false;
        }

        // Check if underlying session object is still valid
        if (!session.session) {
            return false;
        }

        return true;
    }

    /**
     * Find session by ID
     */
    private findSessionById(sessionId: string): SnmpSession | undefined {
        for (const session of this.sessions.values()) {
            if (session.id === sessionId) {
                return session;
            }
        }
        return undefined;
    }

    /**
     * Find session key by session ID
     */
    private findSessionKey(sessionId: string): string | undefined {
        for (const [key, session] of this.sessions.entries()) {
            if (session.id === sessionId) {
                return key;
            }
        }
        return undefined;
    }

    /**
     * Evict the oldest unused session
     */
    private async evictOldestSession(): Promise<void> {
        let oldestSession: SnmpSession | undefined;
        let oldestTime = Date.now();

        for (const session of this.sessions.values()) {
            if (!session.active && session.lastUsed < oldestTime) {
                oldestTime = session.lastUsed;
                oldestSession = session;
            }
        }

        if (oldestSession) {
            await this.closeSession(oldestSession.id);
        } else {
            throw new NodeOperationError(
                null as any,
                'Cannot create new session: pool is full and all sessions are active'
            );
        }
    }

    /**
     * Generate a unique session ID
     */
    private generateSessionId(): string {
        return `session_${++this.sessionIdCounter}_${Date.now()}`;
    }

    /**
     * Start the cleanup interval
     */
    private startCleanupInterval(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        this.cleanupInterval = setInterval(() => {
            this.cleanup().catch(error => {
                this.recordError('cleanup_error', 'system', error);
            });
        }, this.config.cleanupInterval);
    }

    /**
     * Calculate average request time from recent requests
     */
    private calculateAverageRequestTime(): number {
        if (this.requestTimes.length === 0) return 0;
        
        const sum = this.requestTimes.reduce((a, b) => a + b, 0);
        return sum / this.requestTimes.length;
    }

    /**
     * Emit session events (for logging/monitoring)
     */
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    private emitEvent(_event: SessionEventData['event'], _sessionId: string, _host: string, _metadata?: any): void {
        // Event data for monitoring - could be sent to a logger
        // const eventData: SessionEventData = {
        //     sessionId,
        //     event,
        //     timestamp: Date.now(),
        //     host,
        //     metadata
        // };

        // In a real implementation, this might emit to an event system or logger
        // For now, we'll just track it internally
    }
}