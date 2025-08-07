/**
 * TypeScript type definitions for SNMP operations in n8n
 * Based on node-net-snmp library and SNMP protocol specifications
 */

export interface SnmpCredentials {
    community?: string;
    version: 'v1' | 'v2c' | 'v3';
    port?: number;
    timeout?: number;
    retries?: number;
    // v3 specific
    username?: string;
    authProtocol?: 'md5' | 'sha' | 'sha256' | 'sha384' | 'sha512';
    authKey?: string;
    privProtocol?: 'des' | 'aes' | 'aes256';
    privKey?: string;
    securityOptions?: {
        readOnly?: boolean;
    };
}

export interface SnmpSessionOptions {
    host: string;
    port: number;
    retries: number;
    timeout: number;
    transport: 'udp4' | 'udp6';
    version: SnmpVersion;
    community: string;
}

export enum SnmpVersion {
    v1 = 0,
    v2c = 1,
    v3 = 3
}

export enum SnmpObjectType {
    Boolean = 1,
    Integer = 2,
    OctetString = 4,
    Null = 5,
    OID = 6,
    IpAddress = 64,
    Counter = 65,
    Gauge = 66,
    TimeTicks = 67,
    Opaque = 68,
    Counter32 = 65,
    Gauge32 = 66,
    Counter64 = 70,
    NoSuchObject = 128,
    NoSuchInstance = 129,
    EndOfMibView = 130
}

export interface SnmpVarbind {
    oid: string;
    type: SnmpObjectType;
    value: any;
}

export interface ProcessedVarbind {
    oid: string;
    type: string;
    value: any;
    raw: any;
    error?: string;
}

export interface SnmpResponse {
    host: string;
    timestamp: number;
    operation: SnmpOperation;
    varbinds: ProcessedVarbind[];
    cached?: boolean;
    sessionId?: string;
}

export type SnmpOperation = 'get' | 'walk' | 'bulkGet' | 'set' | 'trapListen';

export type TrapType = 'v1' | 'v2c' | 'v3' | 'inform';

export interface SnmpGetOptions {
    host: string;
    oid: string;
    credentials: SnmpCredentials;
    useCache?: boolean;
    maxRetries?: number;
}

export interface SnmpWalkOptions {
    host: string;
    rootOid: string;
    credentials: SnmpCredentials;
    maxVarbinds?: number;
    useCache?: boolean;
}

export interface SnmpBulkGetOptions {
    host: string;
    oids: string[];
    credentials: SnmpCredentials;
    maxRepetitions?: number;
    useCache?: boolean;
}

export interface SnmpSetOptions {
    host: string;
    varbinds: SnmpVarbind[];
    credentials: SnmpCredentials;
}

export interface SnmpTrapListenerOptions {
    port?: number;
    allowedSources?: string[];
    timeout?: number;
    credentials?: SnmpCredentials;
    bindAddress?: string;
}

export interface SnmpTrapData {
    source: {
        address: string;
        port: number;
    };
    pdu: {
        type: string;
        version: number;
        community?: string;
        enterprise?: string;
        agentAddr?: string;
        genericTrap?: number;
        specificTrap?: number;
        timestamp?: number;
        uptime?: number;
        varbinds: ProcessedVarbind[];
    };
    receivedAt: number;
    trapId: string;
}

export interface TrapListener {
    port: number;
    server: any;
    isListening: boolean;
    allowedSources: string[];
    createdAt: number;
    trapCount: number;
}

export interface SnmpError {
    message: string;
    code: string;
    oid?: string;
    host?: string;
    operation?: SnmpOperation;
}

export interface SnmpNodeParameters {
    resource: 'deviceQuery' | 'bulkOperations' | 'trapReceiver';
    operation: SnmpOperation;
    host?: string;
    port?: number;
    oid?: string;
    oids?: string[];
    rootOid?: string;
    timeout?: number;
    retries?: number;
    maxVarbinds?: number;
    maxRepetitions?: number;
    useCache?: boolean;
    cacheTimeout?: number;
}

// TimeTicks conversion utility type
export interface TimeTicks {
    ticks: number;
    milliseconds: number;
    humanReadable: string;
}

// Counter wraparound handling
export interface Counter32 {
    value: number;
    wrapped: boolean;
    previousValue?: number;
}

export interface Counter64 {
    value: bigint;
    wrapped: boolean;
    previousValue?: bigint;
}

// MIB template definitions
export interface MibTemplate {
    name: string;
    description: string;
    oids: string[];
    vendor?: string;
    category: 'system' | 'interface' | 'performance' | 'storage' | 'custom';
}

// Standard MIB-II OIDs
export const STANDARD_OIDS = {
    SYSTEM: {
        DESCR: '1.3.6.1.2.1.1.1.0',
        OBJECT_ID: '1.3.6.1.2.1.1.2.0',
        UPTIME: '1.3.6.1.2.1.1.3.0',
        CONTACT: '1.3.6.1.2.1.1.4.0',
        NAME: '1.3.6.1.2.1.1.5.0',
        LOCATION: '1.3.6.1.2.1.1.6.0'
    },
    INTERFACE: {
        COUNT: '1.3.6.1.2.1.2.1.0',
        TABLE: '1.3.6.1.2.1.2.2.1',
        INDEX: '1.3.6.1.2.1.2.2.1.1',
        DESCR: '1.3.6.1.2.1.2.2.1.2',
        TYPE: '1.3.6.1.2.1.2.2.1.3',
        MTU: '1.3.6.1.2.1.2.2.1.4',
        SPEED: '1.3.6.1.2.1.2.2.1.5',
        ADMIN_STATUS: '1.3.6.1.2.1.2.2.1.7',
        OPER_STATUS: '1.3.6.1.2.1.2.2.1.8',
        IN_OCTETS: '1.3.6.1.2.1.2.2.1.10',
        OUT_OCTETS: '1.3.6.1.2.1.2.2.1.16'
    }
} as const;

export type StandardOid = typeof STANDARD_OIDS[keyof typeof STANDARD_OIDS][keyof typeof STANDARD_OIDS[keyof typeof STANDARD_OIDS]];