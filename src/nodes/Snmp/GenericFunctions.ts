/**
 * Generic functions for SNMP operations in n8n
 * Provides core SNMP functionality with session management, caching, and error handling
 */

import {
    IExecuteFunctions,
    NodeOperationError,
} from 'n8n-workflow';

import * as snmp from 'net-snmp';
import * as dgram from 'dgram';

import {
    SnmpGetOptions,
    SnmpWalkOptions, 
    SnmpBulkGetOptions,
    SnmpTrapListenerOptions,
    SnmpTrapData,
    TrapListener,
    SnmpResponse,
    ProcessedVarbind,
    SnmpObjectType,
    SnmpCredentials
} from '../../types/SnmpTypes';

import { InputValidator } from '../../utils/security/inputValidator';

/**
 * Map net-snmp ObjectType to our SnmpObjectType enum
 */
function mapObjectType(type: number): SnmpObjectType {
    const typeMap: { [key: number]: SnmpObjectType } = {
        1: SnmpObjectType.Boolean,
        2: SnmpObjectType.Integer,
        4: SnmpObjectType.OctetString,
        5: SnmpObjectType.Null,
        6: SnmpObjectType.OID,
        64: SnmpObjectType.IpAddress,
        65: SnmpObjectType.Counter,
        66: SnmpObjectType.Gauge,
        67: SnmpObjectType.TimeTicks,
        68: SnmpObjectType.Opaque,
        70: SnmpObjectType.Counter64,
        128: SnmpObjectType.NoSuchObject,
        129: SnmpObjectType.NoSuchInstance,
        130: SnmpObjectType.EndOfMibView
    };
    return typeMap[type] || SnmpObjectType.Integer;
}

/**
 * Create SNMP session based on credentials
 */
function createSession(
    host: string,
    credentials: SnmpCredentials,
    timeout?: number,
    retries?: number
): snmp.Session {
    const options: snmp.SessionOptions = {
        port: credentials.port || 161,
        retries: retries || 3,
        timeout: timeout || 5000,
        version: (credentials.version === 'v3' ? snmp.Version3 : 
                 credentials.version === 'v2c' ? snmp.Version2c : 
                 snmp.Version1) as snmp.Version,
        idBitsSize: 32
    };

    // For v1/v2c, use community string
    if (credentials.version !== 'v3' && credentials.community) {
        return snmp.createSession(host, credentials.community, options);
    }

    // For v3, add user and authentication
    if (credentials.version === 'v3') {
        const v3Options = {
            ...options,
            user: credentials.username || '',
            authProtocol: credentials.authProtocol as snmp.AuthProtocol || snmp.AuthProtocols.sha,
            authKey: credentials.authKey || '',
            privProtocol: credentials.privProtocol as snmp.PrivProtocol || snmp.PrivProtocols.aes,
            privKey: credentials.privKey || ''
        };
        return snmp.createV3Session(host, v3Options);
    }

    // Default to v2c with 'public' community
    return snmp.createSession(host, 'public', options);
}

/**
 * Perform SNMP GET operation
 */
export async function snmpGet(
    this: IExecuteFunctions,
    options: SnmpGetOptions
): Promise<SnmpResponse> {
    return new Promise((resolve, reject) => {
        try {
            // Validate inputs
            const hostValidation = InputValidator.validateHost(options.host);
            if (!hostValidation.valid) {
                throw new NodeOperationError(
                    this.getNode(),
                    `Invalid host: ${hostValidation.error}`
                );
            }

            const oidValidation = InputValidator.validateOid(options.oid);
            if (!oidValidation.valid) {
                throw new NodeOperationError(
                    this.getNode(),
                    `Invalid OID: ${oidValidation.error}`
                );
            }

            // Get credentials with defaults
            const credentials = options.credentials || {
                version: 'v2c',
                community: 'public',
                port: 161,
                timeout: 5000,
                retries: 3
            } as SnmpCredentials;

            // Create SNMP session
            const session = createSession(
                options.host,
                credentials,
                credentials.timeout,
                credentials.retries
            );

            // Perform SNMP GET
            session.get([options.oid], (error: Error | null, varbinds: snmp.Varbind[]) => {
                // Always close session
                session.close();

                if (error) {
                    reject(new NodeOperationError(
                        this.getNode(),
                        `SNMP GET failed: ${error.message}`,
                        { description: `Failed to get OID ${options.oid} from ${options.host}` }
                    ));
                    return;
                }

                if (!varbinds || varbinds.length === 0) {
                    reject(new NodeOperationError(
                        this.getNode(),
                        'No response received from SNMP GET'
                    ));
                    return;
                }

                // Process varbinds
                const processedVarbinds: ProcessedVarbind[] = varbinds.map(vb => {
                    // Check for SNMP errors
                    if (snmp.isVarbindError(vb)) {
                        const errorStatus = snmp.varbindError(vb);
                        return {
                            oid: vb.oid,
                            type: 'Error',
                            value: errorStatus,
                            error: errorStatus,
                            raw: vb
                        };
                    }

                    return {
                        oid: vb.oid,
                        type: SnmpObjectType[mapObjectType(vb.type)],
                        value: vb.value,
                        raw: {
                            oid: vb.oid,
                            type: vb.type,
                            value: vb.value
                        }
                    };
                });

                resolve({
                    host: options.host,
                    operation: 'get',
                    timestamp: Date.now(),
                    sessionId: `session-${Date.now()}`,
                    varbinds: processedVarbinds,
                    cached: false
                });
            });

        } catch (error) {
            reject(new NodeOperationError(
                this.getNode(),
                `SNMP GET failed: ${String(error)}`
            ));
        }
    });
}

/**
 * Perform SNMP WALK operation
 */
export async function snmpWalk(
    this: IExecuteFunctions,
    options: SnmpWalkOptions
): Promise<SnmpResponse> {
    return new Promise((resolve, reject) => {
        try {
            // Validate inputs
            const hostValidation = InputValidator.validateHost(options.host);
            if (!hostValidation.valid) {
                throw new NodeOperationError(
                    this.getNode(),
                    `Invalid host: ${hostValidation.error}`
                );
            }

            const oidValidation = InputValidator.validateOid(options.rootOid);
            if (!oidValidation.valid) {
                throw new NodeOperationError(
                    this.getNode(),
                    `Invalid root OID: ${oidValidation.error}`
                );
            }

            // Get credentials with defaults
            const credentials = options.credentials || {
                version: 'v2c',
                community: 'public',
                port: 161,
                timeout: 5000,
                retries: 3
            } as SnmpCredentials;

            // Create SNMP session
            const session = createSession(
                options.host,
                credentials,
                credentials.timeout,
                credentials.retries
            );

            const varbinds: snmp.Varbind[] = [];
            const maxOids = options.maxVarbinds || 100;

            // Perform SNMP WALK
            const feedCb = (varbind: snmp.Varbind) => {
                varbinds.push(varbind);
                
                // Limit number of OIDs
                if (varbinds.length >= maxOids) {
                    return true; // Stop walking
                }
            };

            const doneCb = (error?: Error) => {
                // Always close session
                session.close();

                if (error) {
                    reject(new NodeOperationError(
                        this.getNode(),
                        `SNMP WALK failed: ${error.message}`,
                        { description: `Failed to walk OID ${options.rootOid} on ${options.host}` }
                    ));
                    return;
                }

                // Process varbinds
                const processedVarbinds: ProcessedVarbind[] = varbinds.map(vb => {
                    // Check for SNMP errors
                    if (snmp.isVarbindError(vb)) {
                        const errorStatus = snmp.varbindError(vb);
                        return {
                            oid: vb.oid,
                            type: 'Error',
                            value: errorStatus,
                            error: errorStatus,
                            raw: vb
                        };
                    }

                    return {
                        oid: vb.oid,
                        type: SnmpObjectType[mapObjectType(vb.type)],
                        value: vb.value,
                        raw: {
                            oid: vb.oid,
                            type: vb.type,
                            value: vb.value
                        }
                    };
                });

                resolve({
                    host: options.host,
                    operation: 'walk',
                    timestamp: Date.now(),
                    sessionId: `session-${Date.now()}`,
                    varbinds: processedVarbinds,
                    cached: false
                });
            };

            if (credentials.version === 'v1') {
                // Use walk for v1
                session.walk(options.rootOid, maxOids, feedCb, doneCb);
            } else {
                // Use subtree for v2c/v3
                session.subtree(options.rootOid, maxOids, feedCb, doneCb);
            }

        } catch (error) {
            reject(new NodeOperationError(
                this.getNode(),
                `SNMP WALK failed: ${String(error)}`
            ));
        }
    });
}

/**
 * Perform SNMP BULK-GET operation
 */
export async function snmpBulkGet(
    this: IExecuteFunctions,
    options: SnmpBulkGetOptions
): Promise<SnmpResponse> {
    return new Promise((resolve, reject) => {
        try {
            // Validate inputs
            const hostValidation = InputValidator.validateHost(options.host);
            if (!hostValidation.valid) {
                throw new NodeOperationError(
                    this.getNode(),
                    `Invalid host: ${hostValidation.error}`
                );
            }

            // Validate all OIDs
            for (const oid of options.oids) {
                const oidValidation = InputValidator.validateOid(oid);
                if (!oidValidation.valid) {
                    throw new NodeOperationError(
                        this.getNode(),
                        `Invalid OID ${oid}: ${oidValidation.error}`
                    );
                }
            }

            // Get credentials with defaults
            const credentials = options.credentials || {
                version: 'v2c',
                community: 'public',
                port: 161,
                timeout: 5000,
                retries: 3
            } as SnmpCredentials;

            // For v1, fall back to regular GET
            if (credentials.version === 'v1') {
                // Create session and perform regular GET
                const session = createSession(
                    options.host,
                    credentials,
                    credentials.timeout,
                    credentials.retries
                );

                session.get(options.oids, (error: Error | null, varbinds: snmp.Varbind[]) => {
                    session.close();

                    if (error) {
                        reject(new NodeOperationError(
                            this.getNode(),
                            `SNMP GET (v1) failed: ${error.message}`
                        ));
                        return;
                    }

                    // Process varbinds
                    const processedVarbinds: ProcessedVarbind[] = (varbinds || []).map(vb => {
                        if (snmp.isVarbindError(vb)) {
                            const errorStatus = snmp.varbindError(vb);
                            return {
                                oid: vb.oid,
                                type: 'Error',
                                value: errorStatus,
                                error: errorStatus,
                                raw: vb
                            };
                        }

                        return {
                            oid: vb.oid,
                            type: SnmpObjectType[mapObjectType(vb.type)],
                            value: vb.value,
                            raw: {
                                oid: vb.oid,
                                type: vb.type,
                                value: vb.value
                            }
                        };
                    });

                    resolve({
                        host: options.host,
                        operation: 'get',
                        timestamp: Date.now(),
                        sessionId: `session-${Date.now()}`,
                        varbinds: processedVarbinds,
                        cached: false
                    });
                });
            } else {
                // Use BULK-GET for v2c/v3
                const session = createSession(
                    options.host,
                    credentials,
                    credentials.timeout,
                    credentials.retries
                );

                const nonRepeaters = 0;
                const maxRepetitions = options.maxRepetitions || 10;

                session.getBulk(
                    options.oids,
                    nonRepeaters,
                    maxRepetitions,
                    (error: Error | null, varbinds: snmp.Varbind[]) => {
                        session.close();

                        if (error) {
                            reject(new NodeOperationError(
                                this.getNode(),
                                `SNMP BULK-GET failed: ${error.message}`
                            ));
                            return;
                        }

                        // Process varbinds
                        const processedVarbinds: ProcessedVarbind[] = (varbinds || []).map(vb => {
                            if (snmp.isVarbindError(vb)) {
                                const errorStatus = snmp.varbindError(vb);
                                return {
                                    oid: vb.oid,
                                    type: 'Error',
                                    value: errorStatus,
                                    error: errorStatus,
                                    raw: vb
                                };
                            }

                            return {
                                oid: vb.oid,
                                type: SnmpObjectType[mapObjectType(vb.type)],
                                value: vb.value,
                                raw: {
                                    oid: vb.oid,
                                    type: vb.type,
                                    value: vb.value
                                }
                            };
                        });

                        resolve({
                            host: options.host,
                            operation: 'bulkGet',
                            timestamp: Date.now(),
                            sessionId: `session-${Date.now()}`,
                            varbinds: processedVarbinds,
                            cached: false
                        });
                    }
                );
            }

        } catch (error) {
            reject(new NodeOperationError(
                this.getNode(),
                `SNMP BULK-GET failed: ${String(error)}`
            ));
        }
    });
}

/**
 * Active trap listeners storage
 */
const activeTrapListeners = new Map<number, TrapListener>();

/**
 * Generate unique trap ID
 */
function generateTrapId(): string {
    return `trap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if source IP is allowed
 */
function isSourceAllowed(sourceAddress: string, allowedSources: string[]): boolean {
    if (!allowedSources || allowedSources.length === 0) {
        return true; // Allow all if no restrictions
    }

    // Check for exact IP match or CIDR network match
    for (const allowed of allowedSources) {
        if (allowed.includes('/')) {
            // CIDR notation - simplified check
            const [network, prefixLength] = allowed.split('/');
            const prefix = parseInt(prefixLength, 10);
            
            // Basic CIDR matching (simplified for demonstration)
            const sourceOctets = sourceAddress.split('.').map(Number);
            const networkOctets = network.split('.').map(Number);
            
            // Check if source is in the same network (simplified)
            if (prefix >= 24) {
                const samePrefixOctets = Math.floor(prefix / 8);
                let matches = true;
                for (let i = 0; i < samePrefixOctets; i++) {
                    if (sourceOctets[i] !== networkOctets[i]) {
                        matches = false;
                        break;
                    }
                }
                if (matches) return true;
            } else {
                // For simplicity, treat as exact match for smaller prefixes
                if (sourceAddress === network) return true;
            }
        } else {
            // Exact IP match
            if (sourceAddress === allowed) return true;
        }
    }
    
    return false;
}

/**
 * Process trap PDU data
 */
function processTrapPdu(pdu: Record<string, unknown>, sourceInfo: { address: string; port: number }): SnmpTrapData {
    const varbinds: ProcessedVarbind[] = [];
    
    // Process varbinds if they exist
    if (pdu.varbinds && Array.isArray(pdu.varbinds)) {
        for (const vb of pdu.varbinds) {
            // Check for SNMP errors
            if (snmp.isVarbindError && snmp.isVarbindError(vb)) {
                const errorStatus = snmp.varbindError(vb);
                varbinds.push({
                    oid: vb.oid,
                    type: 'Error',
                    value: errorStatus,
                    error: errorStatus,
                    raw: vb
                });
            } else {
                varbinds.push({
                    oid: vb.oid,
                    type: SnmpObjectType[mapObjectType(vb.type)] || 'Unknown',
                    value: vb.value,
                    raw: {
                        oid: vb.oid,
                        type: vb.type,
                        value: vb.value
                    }
                });
            }
        }
    }

    return {
        source: sourceInfo,
        pdu: {
            type: (pdu.type as string) || 'trap',
            version: (pdu.version as number) || 1,
            community: pdu.community as string | undefined,
            enterprise: pdu.enterprise as string | undefined,
            agentAddr: pdu.agentAddr as string | undefined,
            genericTrap: pdu.genericTrap as number | undefined,
            specificTrap: pdu.specificTrap as number | undefined,
            timestamp: pdu.timestamp as number | undefined,
            uptime: pdu.uptime as number | undefined,
            varbinds
        },
        receivedAt: Date.now(),
        trapId: generateTrapId()
    };
}

/**
 * Basic SNMP message parser for trap messages
 */
function parseSnmpMessage(buffer: Buffer): Record<string, unknown> {
    try {
        // This is a simplified SNMP message parser
        // In a production implementation, you would use a proper ASN.1/BER decoder
        
        // Basic SNMP message structure validation
        if (buffer.length < 10) {
            throw new Error('Message too short for SNMP');
        }

        // Simple pattern matching for SNMP trap messages
        // This is a basic implementation that would need enhancement for production use
        
        const messageData = {
            type: 'trap',
            version: 1, // Default to v2c
            community: 'public',
            enterprise: '1.3.6.1.4.1.0',
            agentAddr: '0.0.0.0',
            genericTrap: 6,
            specificTrap: 0,
            timestamp: Date.now(),
            uptime: 0,
            varbinds: []
        };

        // Try to extract basic information from buffer
        // This is a placeholder implementation
        return messageData;
        
    } catch (error) {
        throw new Error(`Failed to parse SNMP message: ${String(error)}`);
    }
}

/**
 * Create and start SNMP trap receiver
 */
export async function snmpTrapReceiver(
    this: IExecuteFunctions,
    options: SnmpTrapListenerOptions
): Promise<SnmpTrapData[]> {
    return new Promise((resolve, reject) => {
        try {
            const port = options.port || 162;
            const bindAddress = options.bindAddress || '0.0.0.0';
            const timeout = (options.timeout || 30) * 1000; // Convert to milliseconds
            const allowedSources = options.allowedSources || [];
            
            // Validate port
            if (port < 1 || port > 65535) {
                throw new NodeOperationError(
                    this.getNode(),
                    `Invalid port number: ${port}. Must be between 1 and 65535.`
                );
            }

            // Check if port is already in use
            if (activeTrapListeners.has(port)) {
                throw new NodeOperationError(
                    this.getNode(),
                    `Port ${port} is already in use by another trap listener.`
                );
            }

            const receivedTraps: SnmpTrapData[] = [];
            let timeoutId: NodeJS.Timeout;
            let server: dgram.Socket | null = null;

            // Create trap listener record
            const trapListener: TrapListener = {
                port,
                server: null,
                isListening: false,
                allowedSources,
                createdAt: Date.now(),
                trapCount: 0
            };

            // Setup timeout
            timeoutId = setTimeout(() => {
                cleanup();
                resolve(receivedTraps);
            }, timeout);

            // Cleanup function
            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                if (server) {
                    try {
                        server.close();
                    } catch (error) {
                        // Ignore cleanup errors
                    }
                }
                
                activeTrapListeners.delete(port);
                trapListener.isListening = false;
            };

            // Create UDP server for trap reception
            try {
                server = dgram.createSocket('udp4');
                trapListener.server = server;

                server.on('error', (error) => {
                    cleanup();
                    reject(new NodeOperationError(
                        this.getNode(),
                        `Trap receiver error: ${error.message}`
                    ));
                });

                server.on('message', (msg, rinfo) => {
                    try {
                        // Get source information
                        const sourceInfo = {
                            address: rinfo.address,
                            port: rinfo.port
                        };

                        // Check if source is allowed
                        if (!isSourceAllowed(sourceInfo.address, allowedSources)) {
                            // Silently ignore unauthorized sources
                            return;
                        }

                        // Parse SNMP message
                        const pduData = parseSnmpMessage(msg);
                        
                        // Process the trap
                        const trapData = processTrapPdu(pduData, sourceInfo);
                        receivedTraps.push(trapData);
                        trapListener.trapCount++;

                        // Continue listening for more traps
                    } catch (processingError) {
                        // Log processing error but continue listening
                        // In production, you might want to use a proper logger
                        // console.warn('Error processing trap:', processingError);
                    }
                });

                server.on('listening', () => {
                    trapListener.isListening = true;
                    activeTrapListeners.set(port, trapListener);
                });

                // Bind server to address and port
                server.bind(port, bindAddress);

            } catch (error) {
                cleanup();
                throw new NodeOperationError(
                    this.getNode(),
                    `Failed to create trap receiver: ${String(error)}`
                );
            }

        } catch (error) {
            reject(new NodeOperationError(
                this.getNode(),
                `SNMP trap receiver failed: ${String(error)}`
            ));
        }
    });
}

/**
 * Stop trap receiver on specific port
 */
export async function stopTrapReceiver(targetPort: number): Promise<boolean> {
    const listener = activeTrapListeners.get(targetPort);
    if (!listener) {
        return false;
    }

    try {
        if (listener.server) {
            listener.server.close();
        }
        activeTrapListeners.delete(targetPort);
        listener.isListening = false;
        return true;
    } catch (_error) {
        return false;
    }
}

/**
 * Get active trap listeners
 */
export function getActiveTrapListeners(): Map<number, TrapListener> {
    return new Map(activeTrapListeners);
}

/**
 * Clean up SNMP resources (enhanced with trap listener cleanup)
 */
export async function cleanupSnmpResources(): Promise<void> {
    // Clean up all active trap listeners
    for (const [_port, listener] of activeTrapListeners) {
        try {
            if (listener.server) {
                listener.server.close();
            }
        } catch (_error) {
            // Ignore cleanup errors
        }
    }
    activeTrapListeners.clear();
    
    return Promise.resolve();
}