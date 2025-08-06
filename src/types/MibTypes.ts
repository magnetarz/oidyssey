/**
 * TypeScript type definitions for MIB (Management Information Base) handling
 */

export interface MibEntry {
    oid: string;
    name: string;
    description: string;
    syntax: string;
    access: 'read-only' | 'read-write' | 'write-only' | 'not-accessible';
    status: 'current' | 'deprecated' | 'obsolete';
    vendor?: string;
    module?: string;
}

export interface MibModule {
    name: string;
    vendor: string;
    version: string;
    description: string;
    entries: MibEntry[];
}

export interface VendorMibs {
    cisco: CiscoMibs;
    juniper: JuniperMibs;
    arista: AristaMibs;
    hp: HpMibs;
    dell: DellMibs;
    netgear: NetgearMibs;
}

export interface CiscoMibs {
    cpu: {
        [key: string]: string;
    };
    memory: {
        [key: string]: string;
    };
    interfaces: {
        [key: string]: string;
    };
    environment: {
        [key: string]: string;
    };
}

export interface JuniperMibs {
    cpu: {
        [key: string]: string;
    };
    memory: {
        [key: string]: string;
    };
    temperature: {
        [key: string]: string;
    };
    routing: {
        [key: string]: string;
    };
}

export interface AristaMibs {
    system: {
        [key: string]: string;
    };
    interfaces: {
        [key: string]: string;
    };
    power: {
        [key: string]: string;
    };
}

export interface HpMibs {
    system: {
        [key: string]: string;
    };
    storage: {
        [key: string]: string;
    };
    network: {
        [key: string]: string;
    };
}

export interface DellMibs {
    openmanage: {
        [key: string]: string;
    };
    powerconnect: {
        [key: string]: string;
    };
}

export interface NetgearMibs {
    switching: {
        [key: string]: string;
    };
    wireless: {
        [key: string]: string;
    };
}

// Common MIB templates for quick access
export interface MibTemplate {
    name: string;
    description: string;
    category: MibCategory;
    vendor?: string;
    oids: MibTemplateOid[];
}

export interface MibTemplateOid {
    name: string;
    oid: string;
    description: string;
    dataType: string;
    unit?: string;
    critical?: boolean;
}

export type MibCategory = 
    | 'system'
    | 'interface'
    | 'cpu'
    | 'memory'
    | 'storage'
    | 'temperature'
    | 'power'
    | 'routing'
    | 'switching'
    | 'wireless'
    | 'security'
    | 'custom';

// Enterprise OID assignments
export const ENTERPRISE_OIDS = {
    CISCO: '1.3.6.1.4.1.9',
    JUNIPER: '1.3.6.1.4.1.2636',
    ARISTA: '1.3.6.1.4.1.30065',
    HP: '1.3.6.1.4.1.11',
    DELL: '1.3.6.1.4.1.674',
    NETGEAR: '1.3.6.1.4.1.4526',
    MICROSOFT: '1.3.6.1.4.1.311',
    IBM: '1.3.6.1.4.1.2',
    VMWARE: '1.3.6.1.4.1.6876',
    FORTINET: '1.3.6.1.4.1.12356'
} as const;

// Device type detection based on sysObjectID
export interface DeviceType {
    vendor: string;
    model: string;
    category: 'router' | 'switch' | 'firewall' | 'server' | 'wireless' | 'storage' | 'printer' | 'unknown';
    supportedMibs: string[];
    recommendedOids: string[];
}

export interface DeviceDetectionResult {
    sysObjectId: string;
    deviceType: DeviceType;
    confidence: number;
    recommendedTemplates: MibTemplate[];
}

// MIB walk result structure
export interface MibWalkResult {
    rootOid: string;
    totalEntries: number;
    entries: MibWalkEntry[];
    truncated: boolean;
    duration: number;
}

export interface MibWalkEntry {
    oid: string;
    name?: string;
    value: any;
    type: string;
    module?: string;
}

// Cache configuration for MIB data
export interface MibCacheConfig {
    staticDataTtl: number; // TTL for static data (sysDescr, sysName, etc.)
    dynamicDataTtl: number; // TTL for dynamic data (counters, stats, etc.)
    maxCacheSize: number;
    enableCompression: boolean;
}