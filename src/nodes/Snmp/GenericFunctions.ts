/**
 * Generic functions for SNMP operations in n8n
 * Provides core SNMP functionality with session management, caching, and error handling
 */

import {
    IExecuteFunctions,
    NodeOperationError,
} from 'n8n-workflow';

import * as snmp from 'net-snmp';

import {
    SnmpGetOptions,
    SnmpWalkOptions, 
    SnmpBulkGetOptions,
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
 * Clean up SNMP resources (simplified for validation)
 */
export async function cleanupSnmpResources(): Promise<void> {
    // In a real implementation, this would track and close all open sessions
    return Promise.resolve();
}