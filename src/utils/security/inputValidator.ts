/**
 * Input validation utilities for SNMP operations with security patterns
 * Implements SSRF protection and comprehensive input sanitization
 */

import { SnmpError } from '../../types/SnmpTypes';

export class InputValidator {
    private static readonly NUMERIC_OID_PATTERN = /^[0-9]+(\.[0-9]+)*$/;
    private static readonly IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;
    private static readonly IPV6_PATTERN = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    private static readonly HOSTNAME_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    // Valid root OIDs for SNMP queries (prevents malicious OIDs)
    private static readonly VALID_ROOT_OIDS = [
        '1.0', // ITU-T
        '1.1', // ISO/IEC
        '1.2', // joint-iso-itu-t
        '1.3', // org
        '2.1'  // ISO member-body
    ];

    // Private/reserved IP ranges for SSRF protection
    private static readonly PRIVATE_IP_PATTERNS = [
        /^127\./, // Loopback
        /^10\./, // Private Class A
        /^192\.168\./, // Private Class C
        /^172\.(1[6-9]|2\d|3[01])\./, // Private Class B
        /^169\.254\./, // Link-local
        /^224\./, // Multicast
        /^0\./, // This network
        /^255\./ // Broadcast
    ];

    /**
     * Validates an OID string format and security constraints
     */
    public static validateOid(oid: string): { valid: boolean; error?: string } {
        if (!oid || typeof oid !== 'string') {
            return { valid: false, error: 'OID must be a non-empty string' };
        }

        // Remove leading/trailing whitespace
        oid = oid.trim();

        // Check for basic format
        if (!this.NUMERIC_OID_PATTERN.test(oid)) {
            return { valid: false, error: 'OID must be in numeric format (e.g., 1.3.6.1.2.1.1.1.0)' };
        }

        // Validate OID structure
        const parts = oid.split('.');
        if (parts.length < 2) {
            return { valid: false, error: 'OID must have at least 2 components' };
        }

        // Check for valid root OID (security constraint)
        // const rootOid = `${parts[0]}.${parts[1]}`;
        const isValidRoot = this.VALID_ROOT_OIDS.some(validRoot => oid.startsWith(validRoot));
        
        if (!isValidRoot) {
            return { valid: false, error: `OID must start with a valid root (${this.VALID_ROOT_OIDS.join(', ')})` };
        }

        // Check for reasonable OID length (prevents DoS)
        if (oid.length > 255) {
            return { valid: false, error: 'OID too long (maximum 255 characters)' };
        }

        // Validate each component is a valid integer
        for (const part of parts) {
            const num = parseInt(part, 10);
            if (isNaN(num) || num < 0 || num > 4294967295) { // 2^32 - 1
                return { valid: false, error: `Invalid OID component: ${part}` };
            }
        }

        return { valid: true };
    }

    /**
     * Validates a list of OIDs for bulk operations
     */
    public static validateOids(oids: string[]): { valid: boolean; errors: string[] } {
        if (!Array.isArray(oids)) {
            return { valid: false, errors: ['OIDs must be provided as an array'] };
        }

        if (oids.length === 0) {
            return { valid: false, errors: ['At least one OID must be provided'] };
        }

        if (oids.length > 100) {
            return { valid: false, errors: ['Too many OIDs (maximum 100 per request)'] };
        }

        const errors: string[] = [];
        const uniqueOids = new Set<string>();

        for (let i = 0; i < oids.length; i++) {
            const oid = oids[i];
            
            // Check for duplicates
            if (uniqueOids.has(oid)) {
                errors.push(`Duplicate OID at index ${i}: ${oid}`);
                continue;
            }
            uniqueOids.add(oid);

            // Validate individual OID
            const validation = this.validateOid(oid);
            if (!validation.valid) {
                errors.push(`Invalid OID at index ${i}: ${validation.error}`);
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Validates hostname or IP address with SSRF protection
     */
    public static validateHost(host: string, allowPrivateIPs = true): { valid: boolean; error?: string } {
        if (!host || typeof host !== 'string') {
            return { valid: false, error: 'Host must be a non-empty string' };
        }

        // Remove leading/trailing whitespace
        host = host.trim().toLowerCase();

        // Check for reasonable length
        if (host.length > 253) {
            return { valid: false, error: 'Hostname too long (maximum 253 characters)' };
        }

        // Check for obviously malicious patterns
        const maliciousPatterns = [
            /file:\/\//i,
            /ftp:\/\//i,
            /data:/i,
            /javascript:/i,
            /vbscript:/i,
            /@/,
            /localhost/i,
            /127\.0\.0\.1/,
            /::1/
        ];

        for (const pattern of maliciousPatterns) {
            if (pattern.test(host)) {
                return { valid: false, error: 'Host contains potentially malicious pattern' };
            }
        }

        // Validate IPv4
        if (this.IPV4_PATTERN.test(host)) {
            const parts = host.split('.').map(Number);
            
            // Validate each octet
            if (!parts.every(part => part >= 0 && part <= 255)) {
                return { valid: false, error: 'Invalid IPv4 address format' };
            }

            // SSRF protection: check for private IPs
            if (!allowPrivateIPs) {
                const isPrivate = this.PRIVATE_IP_PATTERNS.some(pattern => pattern.test(host));
                if (isPrivate) {
                    return { valid: false, error: 'Private/reserved IP addresses not allowed' };
                }
            }

            return { valid: true };
        }

        // Validate IPv6 (basic check)
        if (host.includes(':')) {
            if (!this.IPV6_PATTERN.test(host)) {
                return { valid: false, error: 'Invalid IPv6 address format' };
            }
            
            // Block IPv6 localhost
            if (host === '::1') {
                return { valid: false, error: 'IPv6 localhost not allowed' };
            }
            
            return { valid: true };
        }

        // Validate hostname
        if (!this.HOSTNAME_PATTERN.test(host)) {
            return { valid: false, error: 'Invalid hostname format' };
        }

        return { valid: true };
    }

    /**
     * Validates community string format and security constraints
     */
    public static validateCommunityString(community: string): { valid: boolean; error?: string } {
        if (!community || typeof community !== 'string') {
            return { valid: false, error: 'Community string must be a non-empty string' };
        }

        // Check length constraints
        if (community.length < 1 || community.length > 32) {
            return { valid: false, error: 'Community string must be between 1 and 32 characters' };
        }

        // Check for valid characters (alphanumeric, underscore, hyphen)
        if (!/^[a-zA-Z0-9_-]+$/.test(community)) {
            return { valid: false, error: 'Community string contains invalid characters' };
        }

        // Security check: warn about common default communities
        const commonDefaults = ['public', 'private', 'read', 'write', 'admin'];
        if (commonDefaults.includes(community.toLowerCase())) {
            // Don't reject, but we could add a warning in logs
        }

        return { valid: true };
    }

    /**
     * Validates port number
     */
    public static validatePort(port: number | string): { valid: boolean; error?: string } {
        const portNum = typeof port === 'string' ? parseInt(port, 10) : port;

        if (isNaN(portNum)) {
            return { valid: false, error: 'Port must be a valid number' };
        }

        if (portNum < 1 || portNum > 65535) {
            return { valid: false, error: 'Port must be between 1 and 65535' };
        }

        // Common SNMP ports
        const commonPorts = [161, 162];
        if (!commonPorts.includes(portNum) && portNum < 1024) {
            // Warn about privileged ports but don't reject
        }

        return { valid: true };
    }

    /**
     * Validates timeout value
     */
    public static validateTimeout(timeout: number | string): { valid: boolean; error?: string } {
        const timeoutMs = typeof timeout === 'string' ? parseInt(timeout, 10) : timeout;

        if (isNaN(timeoutMs)) {
            return { valid: false, error: 'Timeout must be a valid number' };
        }

        if (timeoutMs < 1000 || timeoutMs > 60000) {
            return { valid: false, error: 'Timeout must be between 1000ms and 60000ms' };
        }

        return { valid: true };
    }

    /**
     * Validates retry count
     */
    public static validateRetries(retries: number | string): { valid: boolean; error?: string } {
        const retryCount = typeof retries === 'string' ? parseInt(retries, 10) : retries;

        if (isNaN(retryCount)) {
            return { valid: false, error: 'Retries must be a valid number' };
        }

        if (retryCount < 0 || retryCount > 10) {
            return { valid: false, error: 'Retries must be between 0 and 10' };
        }

        return { valid: true };
    }

    /**
     * Validates maximum varbinds for WALK operations (prevents memory exhaustion)
     */
    public static validateMaxVarbinds(maxVarbinds: number | string): { valid: boolean; error?: string } {
        const max = typeof maxVarbinds === 'string' ? parseInt(maxVarbinds, 10) : maxVarbinds;

        if (isNaN(max)) {
            return { valid: false, error: 'Max varbinds must be a valid number' };
        }

        if (max < 1 || max > 10000) {
            return { valid: false, error: 'Max varbinds must be between 1 and 10000' };
        }

        return { valid: true };
    }

    /**
     * Creates a sanitized error for logging (removes sensitive data)
     */
    public static createSafeError(message: string, details?: any): SnmpError {
        // Remove sensitive information from error details
        const sanitizedDetails = details ? this.sanitizeObject(details) : undefined;
        
        return {
            message: message,
            code: 'VALIDATION_ERROR',
            ...sanitizedDetails
        };
    }

    /**
     * Sanitizes an object by removing sensitive fields
     */
    private static sanitizeObject(obj: any): any {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }

        const sensitiveFields = ['community', 'password', 'secret', 'key', 'token', 'auth'];
        const sanitized = { ...obj };

        for (const field of sensitiveFields) {
            if (field in sanitized) {
                sanitized[field] = '[REDACTED]';
            }
        }

        return sanitized;
    }
}