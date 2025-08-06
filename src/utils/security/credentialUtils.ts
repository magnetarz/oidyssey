/**
 * Credential utility functions for SNMP operations
 * Implements security patterns for credential handling and redaction
 */

import { SnmpCredentials } from '../../types/SnmpTypes';

export class CredentialUtils {
    
    /**
     * Redacts sensitive information from any data structure for safe logging
     */
    public static redactSensitiveData(data: any): any {
        if (data === null || data === undefined) {
            return data;
        }

        if (typeof data === 'string') {
            return this.redactStringData(data);
        }

        if (typeof data === 'object') {
            return this.redactObjectData(data);
        }

        return data;
    }

    /**
     * Redacts sensitive information from strings
     */
    private static redactStringData(str: string): string {
        // Pattern to match community strings in various formats
        const patterns = [
            // JSON format: "community": "value"
            /("community"\s*:\s*")[^"]+(")/gi,
            // URL parameters: community=value
            /(community=)[^&\s]+/gi,
            // Simple key-value: community: value
            /(community:\s*)[^\s,}]+/gi,
            // Other credential patterns
            /("password"\s*:\s*")[^"]+(")/gi,
            /("secret"\s*:\s*")[^"]+(")/gi,
            /("token"\s*:\s*")[^"]+(")/gi,
            /("key"\s*:\s*")[^"]+(")/gi,
        ];

        let redacted = str;
        patterns.forEach(pattern => {
            redacted = redacted.replace(pattern, '$1[REDACTED]$2');
        });

        return redacted;
    }

    /**
     * Redacts sensitive information from objects
     */
    private static redactObjectData(obj: any): any {
        if (Array.isArray(obj)) {
            return obj.map(item => this.redactSensitiveData(item));
        }

        const redacted = { ...obj };
        const sensitiveFields = [
            'community',
            'password',
            'secret',
            'key',
            'token',
            'auth',
            'authKey',
            'privKey',
            'passphrase',
            'credentials'
        ];

        for (const field of sensitiveFields) {
            if (field in redacted) {
                redacted[field] = '[REDACTED]';
            }
        }

        // Recursively redact nested objects
        for (const key in redacted) {
            if (typeof redacted[key] === 'object' && redacted[key] !== null) {
                redacted[key] = this.redactSensitiveData(redacted[key]);
            }
        }

        return redacted;
    }

    /**
     * Validates community string format and security properties
     */
    public static validateCommunityString(community: string): {
        valid: boolean;
        errors: string[];
        warnings: string[];
        strength: 'weak' | 'moderate' | 'strong';
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!community || typeof community !== 'string') {
            errors.push('Community string must be a non-empty string');
            return { valid: false, errors, warnings, strength: 'weak' };
        }

        // Length validation
        if (community.length < 1) {
            errors.push('Community string cannot be empty');
        } else if (community.length > 32) {
            errors.push('Community string cannot exceed 32 characters');
        }

        // Character validation
        if (!/^[a-zA-Z0-9_-]+$/.test(community)) {
            errors.push('Community string can only contain alphanumeric characters, underscores, and hyphens');
        }

        // Security checks
        const commonDefaults = ['public', 'private', 'read', 'write', 'admin', 'snmp', 'community'];
        if (commonDefaults.includes(community.toLowerCase())) {
            warnings.push('Using common default community string is not recommended for security');
        }

        // Dictionary words check (basic)
        const commonWords = ['password', 'secret', '123', 'test', 'default', 'guest'];
        if (commonWords.some(word => community.toLowerCase().includes(word))) {
            warnings.push('Community string contains common words that may be easily guessed');
        }

        // Length-based strength assessment
        let strength: 'weak' | 'moderate' | 'strong' = 'weak';
        if (community.length >= 8) {
            const hasNumbers = /[0-9]/.test(community);
            const hasLetters = /[a-zA-Z]/.test(community);
            const hasSpecialChars = /[_-]/.test(community);
            
            if (hasNumbers && hasLetters && hasSpecialChars) {
                strength = 'strong';
            } else if ((hasNumbers && hasLetters) || hasSpecialChars) {
                strength = 'moderate';
            }
        } else if (community.length >= 4) {
            strength = 'moderate';
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            strength
        };
    }

    /**
     * Creates a safe error message for logging (removes credentials)
     */
    public static createSafeErrorMessage(error: Error | string, context?: any): string {
        const errorMessage = typeof error === 'string' ? error : error.message;
        const safeContext = context ? this.redactSensitiveData(context) : '';
        
        let safeMessage = this.redactStringData(errorMessage);
        
        if (safeContext) {
            safeMessage += ` Context: ${JSON.stringify(safeContext)}`;
        }
        
        return safeMessage;
    }

    /**
     * Checks if credentials are properly configured for security
     */
    public static validateCredentialSecurity(credentials: SnmpCredentials): {
        secure: boolean;
        issues: string[];
        recommendations: string[];
    } {
        const issues: string[] = [];
        const recommendations: string[] = [];

        // Community string validation (only for v1/v2c)
        if (credentials.version !== 'v3' && credentials.community) {
            const communityValidation = this.validateCommunityString(credentials.community);
            if (!communityValidation.valid) {
                issues.push(...communityValidation.errors);
            }

            if (communityValidation.warnings.length > 0) {
                recommendations.push(...communityValidation.warnings);
            }
        }

        // Version security check
        if (credentials.version === 'v1') {
            recommendations.push('SNMPv1 is less secure than v2c; consider upgrading');
        }

        // Security options check
        if (credentials.securityOptions) {
            if (credentials.securityOptions.readOnly === false) {
                recommendations.push('Using read-write community strings increases security risk');
            }
        } else {
            recommendations.push('Security options not specified; defaulting to read-only is recommended');
        }

        // Timeout and retry configuration
        if (credentials.timeout && credentials.timeout > 30000) {
            recommendations.push('Long timeout values may impact performance');
        }

        if (credentials.retries && credentials.retries > 5) {
            recommendations.push('High retry counts may cause device stress');
        }

        return {
            secure: issues.length === 0,
            issues,
            recommendations
        };
    }

    /**
     * Generates a secure community string (helper function)
     */
    public static generateSecureCommunityString(length = 12): string {
        const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        return result;
    }

    /**
     * Normalizes credentials for consistent usage
     */
    public static normalizeCredentials(credentials: Partial<SnmpCredentials>): SnmpCredentials {
        return {
            community: credentials.community || 'public',
            version: credentials.version || 'v2c',
            port: credentials.port || 161,
            timeout: credentials.timeout || 5000,
            retries: credentials.retries || 3,
            securityOptions: {
                readOnly: credentials.securityOptions?.readOnly ?? true,
                ...credentials.securityOptions
            }
        };
    }

    /**
     * Creates a safe credential object for logging (removes sensitive data)
     */
    public static createSafeCredentials(credentials: SnmpCredentials): Partial<SnmpCredentials> {
        return {
            version: credentials.version,
            port: credentials.port,
            timeout: credentials.timeout,
            retries: credentials.retries,
            securityOptions: credentials.securityOptions,
            // community is intentionally omitted
        };
    }

    /**
     * Validates that required credential fields are present
     */
    public static validateRequiredFields(credentials: any): { valid: boolean; missingFields: string[] } {
        const requiredFields = ['community', 'version'];
        const missingFields: string[] = [];

        for (const field of requiredFields) {
            if (!credentials[field]) {
                missingFields.push(field);
            }
        }

        return {
            valid: missingFields.length === 0,
            missingFields
        };
    }

    /**
     * Creates a hash of credentials for session key generation (without exposing sensitive data)
     */
    public static createCredentialHash(credentials: SnmpCredentials, host: string): string {
        // Create a hash that identifies unique credential combinations
        // without storing the actual sensitive values
        const hashInput = [
            host.toLowerCase(),
            credentials.version,
            credentials.port || 161,
            // We use length instead of actual community string
            credentials.community ? credentials.community.length : 0,
            // Include a simple checksum that doesn't reveal the community string
            credentials.community ? this.simpleChecksum(credentials.community) : 0
        ].join(':');

        return this.simpleHash(hashInput);
    }

    /**
     * Simple checksum for credential identification (not cryptographically secure)
     */
    private static simpleChecksum(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Simple hash function for non-cryptographic purposes
     */
    private static simpleHash(str: string): string {
        const hash = this.simpleChecksum(str);
        return hash.toString(36);
    }
}