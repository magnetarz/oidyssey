/**
 * SNMP Node implementation for n8n
 * Provides comprehensive SNMP operations for network device monitoring and automation
 */

import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeApiError,
    NodeConnectionType,
} from 'n8n-workflow';

import { snmpNodeDescription } from './SnmpDescription';
import { snmpGet, snmpWalk, snmpBulkGet, snmpTrapReceiver } from './GenericFunctions';
import { 
    SnmpGetOptions, 
    SnmpWalkOptions, 
    SnmpBulkGetOptions,
    SnmpTrapListenerOptions,
    SnmpTrapData,
    SnmpCredentials,
} from '../../types/SnmpTypes';

export class Snmp implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'SNMP',
        name: 'snmp',
        icon: 'file:snmp.svg',
        group: ['network'],
        version: 1,
        subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
        description: 'Interact with network devices using SNMP protocol for monitoring and automation',
        defaults: {
            name: 'SNMP'
        },
        inputs: ['main' as NodeConnectionType],
        outputs: ['main' as NodeConnectionType],
        credentials: [
            {
                name: 'snmpCommunity',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['deviceQuery', 'bulkOperations']
                    }
                }
            }
        ],
        properties: snmpNodeDescription
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        // Get node parameters
        const resource = this.getNodeParameter('resource', 0) as string;

        try {
            for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                let responseData: any;

                switch (resource) {
                    case 'deviceQuery':
                        responseData = await executeDeviceQuery.call(this, itemIndex);
                        break;
                    
                    case 'bulkOperations':
                        responseData = await executeBulkOperations.call(this, itemIndex);
                        break;
                    
                    case 'trapReceiver':
                        responseData = await executeTrapReceiver.call(this, itemIndex);
                        break;
                    
                    default:
                        throw new NodeOperationError(
                            this.getNode(),
                            `Unknown resource: ${resource}`
                        );
                }

                // Add response data to return array
                if (Array.isArray(responseData)) {
                    returnData.push(...responseData);
                } else {
                    returnData.push({
                        json: responseData,
                        pairedItem: itemIndex
                    });
                }
            }

            return [returnData];

        } catch (error) {
            // Re-throw the error with safe message
            if (error instanceof NodeApiError || error instanceof NodeOperationError) {
                throw error;
            } else {
                throw new NodeOperationError(
                    this.getNode(),
                    `SNMP operation failed: ${String(error)}`
                );
            }
        }
    }
}

/**
 * Execute single device query operations
 */
async function executeDeviceQuery(this: IExecuteFunctions, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('operation', itemIndex) as string;
    const host = this.getNodeParameter('host', itemIndex) as string;
    const credentials = await this.getCredentials('snmpCommunity', itemIndex) as SnmpCredentials;
    
    // Get additional options
    const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as any;
    const port = this.getNodeParameter('port', itemIndex, 161) as number;

    // Merge credentials with node parameters
    const fullCredentials: SnmpCredentials = {
        ...credentials,
        // normalize version into canonical 'v1' | 'v2c' | 'v3'
        version: credentials.version,
        port,
        timeout: additionalOptions.timeout || credentials.timeout || 5000,
        retries: additionalOptions.retries || credentials.retries || 3
    };

    switch (operation) {
        case 'get':
            return await executeGetOperation.call(this, itemIndex, host, fullCredentials, additionalOptions);
        
        case 'walk':
            return await executeWalkOperation.call(this, itemIndex, host, fullCredentials, additionalOptions);
        
        case 'bulkGet':
            return await executeBulkGetOperation.call(this, itemIndex, host, fullCredentials, additionalOptions);
        
        default:
            throw new NodeOperationError(
                this.getNode(),
                `Unknown operation: ${operation}`
            );
    }
}

/**
 * Execute SNMP GET operation
 */
async function executeGetOperation(
    this: IExecuteFunctions,
    itemIndex: number, 
    host: string, 
    credentials: SnmpCredentials, 
    additionalOptions: any
): Promise<any> {
    const oid = this.getNodeParameter('oid', itemIndex) as string;

    const options: SnmpGetOptions = {
        host,
        oid,
        credentials,
        useCache: additionalOptions.useCache,
        maxRetries: additionalOptions.retries
    };

    const response = await snmpGet.call(this, options);
    
    return {
        host: response.host,
        operation: response.operation,
        timestamp: response.timestamp,
        cached: response.cached || false,
        sessionId: response.sessionId,
        oid,
        data: response.varbinds[0] || null,
        summary: {
            successful: response.varbinds.length > 0 && !response.varbinds[0].error ? 1 : 0,
            errors: response.varbinds.length > 0 && response.varbinds[0].error ? 1 : 0
        }
    };
}

/**
 * Execute SNMP WALK operation
 */
async function executeWalkOperation(
    this: IExecuteFunctions,
    itemIndex: number,
    host: string,
    credentials: SnmpCredentials,
    additionalOptions: any
): Promise<any> {
    const rootOid = this.getNodeParameter('rootOid', itemIndex) as string;

    const options: SnmpWalkOptions = {
        host,
        rootOid,
        credentials,
        maxVarbinds: additionalOptions.maxVarbinds || 1000,
        useCache: additionalOptions.useCache
    };

    const response = await snmpWalk.call(this, options);

    return {
        host: response.host,
        operation: response.operation,
        timestamp: response.timestamp,
        sessionId: response.sessionId,
        rootOid,
        totalEntries: response.varbinds.length,
        data: response.varbinds,
        summary: {
            successful: response.varbinds.filter(v => !v.error).length,
            errors: response.varbinds.filter(v => v.error).length
        }
    };
}

/**
 * Execute SNMP BULK-GET operation
 */
async function executeBulkGetOperation(
    this: IExecuteFunctions,
    itemIndex: number,
    host: string,
    credentials: SnmpCredentials,
    additionalOptions: any
): Promise<any> {
    const oidsCollection = this.getNodeParameter('oids', itemIndex) as { oidList: Array<{ oid: string }> };
    const oids = oidsCollection.oidList.map(item => item.oid);

    const options: SnmpBulkGetOptions = {
        host,
        oids,
        credentials,
        maxRepetitions: additionalOptions.maxRepetitions || 10,
        useCache: additionalOptions.useCache
    };

    const response = await snmpBulkGet.call(this, options);

    return {
        host: response.host,
        operation: response.operation,
        timestamp: response.timestamp,
        sessionId: response.sessionId,
        requestedOids: oids,
        totalEntries: response.varbinds.length,
        data: response.varbinds,
        summary: {
            successful: response.varbinds.filter(v => !v.error).length,
            errors: response.varbinds.filter(v => v.error).length
        }
    };
}

/**
 * Execute bulk operations across multiple devices/OIDs
 */
async function executeBulkOperations(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
    const bulkOperation = this.getNodeParameter('bulkOperation', itemIndex) as string;
    const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as any;

    const responses: any[] = [];

    switch (bulkOperation) {
        case 'multiDevice': {
            const hostsCollection = this.getNodeParameter('hosts', itemIndex, { hostList: [] }) as any;
            const hostList: string[] = (hostsCollection.hostList || []).map((h: any) => h.host).filter((h: string) => h);
            const operation = this.getNodeParameter('operation', itemIndex) as string;
            const credentials = await this.getCredentials('snmpCommunity', itemIndex) as SnmpCredentials;
            const port = this.getNodeParameter('port', itemIndex, 161) as number;

            const fullCreds: SnmpCredentials = {
                ...credentials,
                version: credentials.version,
                port,
                timeout: additionalOptions.timeout || credentials.timeout || 5000,
                retries: additionalOptions.retries || credentials.retries || 3
            };

            for (const host of hostList) {
                if (operation === 'get') {
                    const oid = this.getNodeParameter('oid', itemIndex) as string;
                    const resp = await snmpGet.call(this, { host, oid, credentials: fullCreds, useCache: additionalOptions.useCache });
                    responses.push({ json: { host, operation: 'get', data: resp.varbinds, summary: { count: resp.varbinds.length } } });
                } else if (operation === 'walk') {
                    const rootOid = this.getNodeParameter('rootOid', itemIndex) as string;
                    const resp = await snmpWalk.call(this, { host, rootOid, credentials: fullCreds, maxVarbinds: additionalOptions.maxVarbinds });
                    responses.push({ json: { host, operation: 'walk', data: resp.varbinds, summary: { count: resp.varbinds.length } } });
                } else if (operation === 'bulkGet') {
                    const oidsCollection = this.getNodeParameter('oids', itemIndex) as { oidList: Array<{ oid: string }> };
                    const oids = oidsCollection.oidList.map(item => item.oid);
                    const resp = await snmpBulkGet.call(this, { host, oids, credentials: fullCreds, maxRepetitions: additionalOptions.maxRepetitions });
                    responses.push({ json: { host, operation: 'bulkGet', data: resp.varbinds, summary: { count: resp.varbinds.length } } });
                } else {
                    throw new NodeOperationError(this.getNode(), `Unsupported operation for multiDevice: ${operation}`);
                }
            }
            return responses;
        }

        case 'multiOid': {
            const host = this.getNodeParameter('host', itemIndex) as string;
            const oidsCollection = this.getNodeParameter('oids', itemIndex) as { oidList: Array<{ oid: string }> };
            const oids = oidsCollection.oidList.map(item => item.oid);
            const credentials = await this.getCredentials('snmpCommunity', itemIndex) as SnmpCredentials;
            const port = this.getNodeParameter('port', itemIndex, 161) as number;
            const fullCreds: SnmpCredentials = {
                ...credentials,
                version: credentials.version,
                port,
                timeout: additionalOptions.timeout || credentials.timeout || 5000,
                retries: additionalOptions.retries || credentials.retries || 3
            };
            const resp = await snmpBulkGet.call(this, { host, oids, credentials: fullCreds, maxRepetitions: additionalOptions.maxRepetitions });
            responses.push({ json: { host, operation: 'bulkGet', data: resp.varbinds, summary: { count: resp.varbinds.length } } });
            return responses;
        }

        case 'template': {
            const template = this.getNodeParameter('template', itemIndex) as string;
            const host = this.getNodeParameter('host', itemIndex) as string;
            const credentials = await this.getCredentials('snmpCommunity', itemIndex) as SnmpCredentials;
            const port = this.getNodeParameter('port', itemIndex, 161) as number;
            const fullCreds: SnmpCredentials = {
                ...credentials,
                version: credentials.version,
                port,
                timeout: additionalOptions.timeout || credentials.timeout || 5000,
                retries: additionalOptions.retries || credentials.retries || 3
            };
            const { getOidTemplates } = await import('./SnmpDescription');
            const templates = getOidTemplates();
            const selected = (templates as any)[template] as Array<{ oid: string; name: string }>; 
            const oids = (selected || []).map(t => t.oid);
            const resp = await snmpBulkGet.call(this, { host, oids, credentials: fullCreds, maxRepetitions: additionalOptions.maxRepetitions });
            responses.push({ json: { host, operation: 'template', template, data: resp.varbinds, summary: { count: resp.varbinds.length } } });
            return responses;
        }

        default:
            throw new NodeOperationError(
                this.getNode(),
                `Unknown bulk operation: ${bulkOperation}`
            );
    }
}

/**
 * Execute SNMP trap receiver
 */
async function executeTrapReceiver(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
    const trapOptions = this.getNodeParameter('trapOptions', itemIndex, {}) as any;
    
    // Extract trap listener options
    const options: SnmpTrapListenerOptions = {
        port: trapOptions.port || 162,
        timeout: trapOptions.timeout || 30,
        allowedSources: [],
        bindAddress: '0.0.0.0'
    };

    // Process allowed sources if specified
    if (trapOptions.allowedSources?.sourceList && Array.isArray(trapOptions.allowedSources.sourceList)) {
        options.allowedSources = trapOptions.allowedSources.sourceList
            .map((item: any) => item.source)
            .filter((source: string) => source && source.trim());
    }

    try {
        // Start trap receiver and wait for traps
        const receivedTraps: SnmpTrapData[] = await snmpTrapReceiver.call(this, options);
        
        // Format response data
        const responseData: any[] = [];
        
        if (receivedTraps.length === 0) {
            // No traps received within timeout
            responseData.push({
                json: {
                    operation: 'trapReceiver',
                    status: 'timeout',
                    message: `No SNMP traps received within ${options.timeout} seconds`,
                    port: options.port,
                    timestamp: Date.now(),
                    summary: {
                        trapsReceived: 0,
                        timeout: options.timeout,
                        allowedSources: options.allowedSources?.length || 0
                    }
                }
            });
        } else {
            // Process received traps
            for (const trap of receivedTraps) {
                responseData.push({
                    json: {
                        operation: 'trapReceiver',
                        status: 'received',
                        trapId: trap.trapId,
                        source: trap.source,
                        receivedAt: trap.receivedAt,
                        timestamp: new Date(trap.receivedAt).toISOString(),
                        pdu: {
                            type: trap.pdu.type,
                            version: trap.pdu.version,
                            community: trap.pdu.community,
                            enterprise: trap.pdu.enterprise,
                            agentAddr: trap.pdu.agentAddr,
                            genericTrap: trap.pdu.genericTrap,
                            specificTrap: trap.pdu.specificTrap,
                            uptime: trap.pdu.uptime,
                            timestamp: trap.pdu.timestamp
                        },
                        varbinds: trap.pdu.varbinds,
                        summary: {
                            varbindCount: trap.pdu.varbinds.length,
                            sourceAddress: trap.source.address,
                            sourcePort: trap.source.port,
                            trapType: trap.pdu.type,
                            version: `v${trap.pdu.version === 0 ? '1' : trap.pdu.version === 1 ? '2c' : '3'}`
                        }
                    }
                });
            }
            
            // Add summary if multiple traps received
            if (receivedTraps.length > 1) {
                responseData.push({
                    json: {
                        operation: 'trapReceiver',
                        status: 'summary',
                        message: `Received ${receivedTraps.length} SNMP traps`,
                        port: options.port,
                        timeout: options.timeout,
                        timestamp: Date.now(),
                        summary: {
                            totalTraps: receivedTraps.length,
                            uniqueSources: [...new Set(receivedTraps.map(t => t.source.address))].length,
                            trapTypes: [...new Set(receivedTraps.map(t => t.pdu.type))],
                            timespan: {
                                first: Math.min(...receivedTraps.map(t => t.receivedAt)),
                                last: Math.max(...receivedTraps.map(t => t.receivedAt))
                            }
                        }
                    }
                });
            }
        }

        return responseData;

    } catch (error) {
        throw new NodeOperationError(
            this.getNode(),
            `SNMP trap receiver failed: ${String(error)}`
        );
    }
}