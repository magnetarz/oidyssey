/**
 * SNMP data type conversion utilities
 * Handles all SNMP data types with proper conversion and error handling
 */

import { SnmpObjectType, ProcessedVarbind, TimeTicks, Counter32, Counter64 } from '../../types/SnmpTypes';

export class SnmpDataConverter {

    /**
     * Process SNMP varbinds array into standardized format
     */
    public static processVarbinds(varbinds: any[]): ProcessedVarbind[] {
        if (!Array.isArray(varbinds)) {
            return [];
        }

        const processedData: ProcessedVarbind[] = [];
        
        for (const varbind of varbinds) {
            try {
                const processed = this.processSingleVarbind(varbind);
                processedData.push(processed);
            } catch (error) {
                // Handle individual varbind processing errors
                processedData.push({
                    oid: varbind.oid || 'unknown',
                    type: 'error',
                    value: null,
                    raw: varbind,
                    error: error instanceof Error ? error.message : 'Processing error'
                });
            }
        }

        return processedData;
    }

    /**
     * Process a single SNMP varbind
     */
    private static processSingleVarbind(varbind: any): ProcessedVarbind {
        // Check for SNMP errors first
        if (this.isVarbindError(varbind)) {
            return {
                oid: varbind.oid || 'unknown',
                type: 'error',
                value: null,
                raw: varbind,
                error: this.getVarbindError(varbind)
            };
        }

        const processedVarbind: ProcessedVarbind = {
            oid: varbind.oid || 'unknown',
            type: this.getTypeName(varbind.type),
            value: this.convertValue(varbind.value, varbind.type),
            raw: varbind
        };

        return processedVarbind;
    }

    /**
     * Convert SNMP value based on its type
     */
    private static convertValue(value: any, type: number): any {
        switch (type) {
            case SnmpObjectType.Boolean:
                return this.convertBoolean(value);

            case SnmpObjectType.Integer:
                return this.convertInteger(value);

            case SnmpObjectType.OctetString:
                return this.convertOctetString(value);

            case SnmpObjectType.Null:
                return null;

            case SnmpObjectType.OID:
                return this.convertOid(value);

            case SnmpObjectType.IpAddress:
                return this.convertIpAddress(value);

            case SnmpObjectType.Counter:
            case SnmpObjectType.Counter32:
                return this.convertCounter32(value);

            case SnmpObjectType.Gauge:
            case SnmpObjectType.Gauge32:
                return this.convertGauge(value);

            case SnmpObjectType.TimeTicks:
                return this.convertTimeTicks(value);

            case SnmpObjectType.Opaque:
                return this.convertOpaque(value);

            case SnmpObjectType.Counter64:
                return this.convertCounter64(value);

            default:
                return {
                    rawValue: value,
                    type: 'unknown',
                    warning: `Unsupported SNMP type: ${type}`
                };
        }
    }

    /**
     * Convert boolean value
     */
    private static convertBoolean(value: any): boolean {
        if (typeof value === 'boolean') {
            return value;
        }
        
        if (typeof value === 'number') {
            return value !== 0;
        }
        
        if (typeof value === 'string') {
            return value.toLowerCase() === 'true' || value === '1';
        }
        
        return Boolean(value);
    }

    /**
     * Convert integer value
     */
    private static convertInteger(value: any): number {
        if (typeof value === 'number') {
            return Math.floor(value);
        }
        
        if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? 0 : parsed;
        }
        
        return 0;
    }

    /**
     * Convert SNMP OctetString (handles both text and binary data)
     */
    private static convertOctetString(value: any): string | { hex: string; binary: true } {
        if (Buffer.isBuffer(value)) {
            // Check if it's readable text
            if (this.isReadableString(value)) {
                return value.toString('utf8');
            } else {
                // Return as hex for binary data
                return {
                    hex: value.toString('hex').toUpperCase(),
                    binary: true
                };
            }
        }
        
        if (typeof value === 'string') {
            return value;
        }
        
        // Try to convert to buffer first
        try {
            const buffer = Buffer.from(value);
            return this.convertOctetString(buffer);
        } catch {
            return String(value);
        }
    }

    /**
     * Convert OID value
     */
    private static convertOid(value: any): string {
        if (typeof value === 'string') {
            return value;
        }
        
        if (Array.isArray(value)) {
            return value.join('.');
        }
        
        return String(value);
    }

    /**
     * Convert IP address value
     */
    private static convertIpAddress(value: any): string {
        if (Buffer.isBuffer(value) && value.length === 4) {
            return `${value[0]}.${value[1]}.${value[2]}.${value[3]}`;
        }
        
        if (typeof value === 'string') {
            return value;
        }
        
        if (Array.isArray(value) && value.length === 4) {
            return value.join('.');
        }
        
        return String(value);
    }

    /**
     * Convert Counter32 value with wraparound detection
     */
    private static convertCounter32(value: any): Counter32 {
        const numValue = this.convertInteger(value);
        const MAX_COUNTER32 = 4294967295; // 2^32 - 1
        
        return {
            value: numValue,
            wrapped: numValue === MAX_COUNTER32,
            previousValue: undefined // Would be set by calling code if tracking
        };
    }

    /**
     * Convert Gauge value
     */
    private static convertGauge(value: any): number {
        return this.convertInteger(value);
    }

    /**
     * Convert TimeTicks to multiple formats
     */
    private static convertTimeTicks(value: any): TimeTicks {
        const ticks = this.convertInteger(value);
        const milliseconds = ticks * 10; // TimeTicks are in hundredths of seconds
        
        return {
            ticks,
            milliseconds,
            humanReadable: this.formatTimeTicks(ticks)
        };
    }

    /**
     * Convert Opaque value
     */
    private static convertOpaque(value: any): { hex: string; opaque: true } {
        if (Buffer.isBuffer(value)) {
            return {
                hex: value.toString('hex').toUpperCase(),
                opaque: true
            };
        }
        
        return {
            hex: Buffer.from(String(value)).toString('hex').toUpperCase(),
            opaque: true
        };
    }

    /**
     * Convert Counter64 value
     */
    private static convertCounter64(value: any): Counter64 {
        let bigintValue: bigint;
        
        try {
            if (typeof value === 'bigint') {
                bigintValue = value;
            } else if (typeof value === 'number') {
                bigintValue = BigInt(Math.floor(value));
            } else if (typeof value === 'string') {
                bigintValue = BigInt(value);
            } else {
                bigintValue = BigInt(String(value));
            }
        } catch {
            bigintValue = BigInt(0);
        }
        
        const MAX_COUNTER64 = BigInt('18446744073709551615'); // 2^64 - 1
        
        return {
            value: bigintValue,
            wrapped: bigintValue === MAX_COUNTER64,
            previousValue: undefined // Would be set by calling code if tracking
        };
    }

    /**
     * Format TimeTicks into human-readable duration
     */
    private static formatTimeTicks(ticks: number): string {
        const totalSeconds = Math.floor(ticks / 100);
        
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        const parts: string[] = [];
        
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
        
        return parts.join(' ');
    }

    /**
     * Get human-readable type name
     */
    private static getTypeName(type: number): string {
        const typeNames: { [key: number]: string } = {
            [SnmpObjectType.Boolean]: 'Boolean',
            [SnmpObjectType.Integer]: 'Integer',
            [SnmpObjectType.OctetString]: 'OctetString',
            [SnmpObjectType.Null]: 'Null',
            [SnmpObjectType.OID]: 'OID',
            [SnmpObjectType.IpAddress]: 'IpAddress',
            [SnmpObjectType.Counter]: 'Counter',
            [SnmpObjectType.Gauge]: 'Gauge',
            [SnmpObjectType.TimeTicks]: 'TimeTicks',
            [SnmpObjectType.Opaque]: 'Opaque',
            [SnmpObjectType.Counter64]: 'Counter64',
            [SnmpObjectType.NoSuchObject]: 'NoSuchObject',
            [SnmpObjectType.NoSuchInstance]: 'NoSuchInstance',
            [SnmpObjectType.EndOfMibView]: 'EndOfMibView'
        };
        
        return typeNames[type] || `Unknown(${type})`;
    }

    /**
     * Check if buffer contains readable string
     */
    private static isReadableString(buffer: Buffer): boolean {
        // Check if buffer contains only printable ASCII characters
        for (let i = 0; i < buffer.length; i++) {
            const byte = buffer[i];
            // Allow printable ASCII (32-126) plus common whitespace (9, 10, 13)
            if (!((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13)) {
                return false;
            }
        }
        
        // Additional heuristic: if more than 80% of bytes are letters/digits/space, consider it text
        let textBytes = 0;
        for (let i = 0; i < buffer.length; i++) {
            const byte = buffer[i];
            if ((byte >= 65 && byte <= 90) || // A-Z
                (byte >= 97 && byte <= 122) || // a-z
                (byte >= 48 && byte <= 57) || // 0-9
                byte === 32) { // space
                textBytes++;
            }
        }
        
        return buffer.length > 0 && (textBytes / buffer.length) > 0.8;
    }

    /**
     * Check if varbind represents an SNMP error
     */
    private static isVarbindError(varbind: any): boolean {
        // Check for common error indicators
        if (varbind.error || varbind.errorStatus) {
            return true;
        }
        
        // Check for SNMP error types
        if (varbind.type === SnmpObjectType.NoSuchObject ||
            varbind.type === SnmpObjectType.NoSuchInstance ||
            varbind.type === SnmpObjectType.EndOfMibView) {
            return true;
        }
        
        return false;
    }

    /**
     * Get error message from error varbind
     */
    private static getVarbindError(varbind: any): string {
        if (varbind.error) {
            return String(varbind.error);
        }
        
        if (varbind.errorStatus) {
            return `SNMP Error Status: ${varbind.errorStatus}`;
        }
        
        switch (varbind.type) {
            case SnmpObjectType.NoSuchObject:
                return 'No such object';
            case SnmpObjectType.NoSuchInstance:
                return 'No such instance';
            case SnmpObjectType.EndOfMibView:
                return 'End of MIB view';
            default:
                return 'Unknown SNMP error';
        }
    }

    /**
     * Convert processed varbind back to summary format
     */
    public static createSummary(varbinds: ProcessedVarbind[]): {
        successful: number;
        errors: number;
        totalSize: number;
        types: { [key: string]: number };
    } {
        const summary = {
            successful: 0,
            errors: 0,
            totalSize: 0,
            types: {} as { [key: string]: number }
        };

        for (const varbind of varbinds) {
            if (varbind.error) {
                summary.errors++;
            } else {
                summary.successful++;
            }

            // Count types
            summary.types[varbind.type] = (summary.types[varbind.type] || 0) + 1;

            // Estimate size
            summary.totalSize += JSON.stringify(varbind).length;
        }

        return summary;
    }
}