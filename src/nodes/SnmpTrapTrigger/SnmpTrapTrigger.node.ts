/**
 * SNMP Trap Trigger Node for n8n
 * Listens for SNMP traps and triggers workflows when traps are received
 */

import {
    ITriggerFunctions,
    INodeType,
    INodeTypeDescription,
    ITriggerResponse,
    NodeConnectionType,
    NodeOperationError,
} from 'n8n-workflow';

import * as dgram from 'dgram';
import { InputValidator } from '../../utils/security/inputValidator';

export class SnmpTrapTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'SNMP Trap Trigger',
        name: 'snmpTrapTrigger',
        icon: 'file:snmp-512.png',
        group: ['trigger'],
        version: 1,
        description: 'Listens for SNMP traps and triggers workflow execution',
        eventTriggerDescription: 'Triggers when an SNMP trap is received',
        defaults: {
            name: 'SNMP Trap Trigger',
            color: '#1A82e2',
        },
        inputs: [] as NodeConnectionType[],
        outputs: ['main'] as NodeConnectionType[],
        properties: [
            {
                displayName: 'Port',
                name: 'port',
                type: 'number',
                default: 162,
                required: true,
                description: 'Port to listen for SNMP traps (default: 162)',
            },
            {
                displayName: 'Bind Address',
                name: 'bindAddress',
                type: 'string',
                default: '0.0.0.0',
                required: true,
                description: 'IP address to bind the listener to (0.0.0.0 for all interfaces)',
            },
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [
                    {
                        displayName: 'Allowed Sources',
                        name: 'allowedSources',
                        type: 'string',
                        default: '',
                        description: 'Comma-separated list of allowed source IPs (leave empty to allow all)',
                    },
                    {
                        displayName: 'Filter by OID',
                        name: 'filterOid',
                        type: 'string',
                        default: '',
                        description: 'Only trigger on traps containing this OID prefix',
                    },
                    {
                        displayName: 'Filter by Community',
                        name: 'filterCommunity',
                        type: 'string',
                        default: '',
                        description: 'Only trigger on traps with this community string',
                    },
                    {
                        displayName: 'Include Raw PDU',
                        name: 'includeRawPdu',
                        type: 'boolean',
                        default: false,
                        description: 'Include the raw PDU data in the output',
                    },
                    {
                        displayName: 'Validate Source',
                        name: 'validateSource',
                        type: 'boolean',
                        default: true,
                        description: 'Validate source addresses against security rules',
                    },
                ],
            },
        ],
    };

    async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
        const port = this.getNodeParameter('port', 0) as number;
        const bindAddress = this.getNodeParameter('bindAddress', 0) as string;
        const options = this.getNodeParameter('options', 0, {}) as any;

        // Parse allowed sources
        const allowedSources: string[] = options.allowedSources
            ? options.allowedSources.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            : [];

        // Validate bind address
        if (options.validateSource !== false) {
            const result = InputValidator.validateHost(bindAddress === '0.0.0.0' ? 'localhost' : bindAddress);
            if (!result.valid) {
                throw new NodeOperationError(
                    this.getNode(),
                    `Invalid bind address: ${bindAddress}${result.error ? ` - ${result.error}` : ''}`
                );
            }
        }

        // Create UDP socket for trap reception
        const server = dgram.createSocket('udp4');
        
        // Helper to check allowed sources (supports IP or CIDR)
        const isAllowedSource = (addr: string): boolean => {
            if (allowedSources.length === 0) return true;
            const ipToLong = (ip: string): number => {
                const parts = ip.split('.').map(p => parseInt(p, 10));
                if (parts.length !== 4 || parts.some(n => isNaN(n) || n < 0 || n > 255)) return -1;
                return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
            };
            const src = ipToLong(addr);
            if (src < 0) return false;
            for (const rule of allowedSources) {
                const trimmed = rule.trim();
                if (!trimmed) continue;
                if (trimmed.includes('/')) {
                    const [base, prefixStr] = trimmed.split('/');
                    const baseLong = ipToLong(base);
                    const prefix = parseInt(prefixStr, 10);
                    if (baseLong < 0 || isNaN(prefix) || prefix < 0 || prefix > 32) continue;
                    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
                    if ((src & mask) === (baseLong & mask)) return true;
                } else if (addr === trimmed) {
                    return true;
                }
            }
            return false;
        };

        // Handle incoming messages
        server.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
            try {
                // Check if source is allowed
                if (!isAllowedSource(rinfo.address)) {
                    // Silently ignore unauthorized sources
                    return;
                }

                // Parse the trap message (simplified for now - full SNMP parsing would be needed)
                const trapData = parseTrapMessage(msg, rinfo, options);
                
                // Apply filters
                if (options.filterCommunity && trapData.community !== options.filterCommunity) {
                    return;
                }

                if (options.filterOid && trapData.varbinds) {
                    const hasMatchingOid = trapData.varbinds.some((varbind: any) =>
                        varbind.oid.startsWith(options.filterOid)
                    );
                    if (!hasMatchingOid) {
                        return;
                    }
                }

                // Emit the trap data to trigger the workflow
                this.emit([this.helpers.returnJsonArray([trapData])]);

            } catch (error) {
                // Emit error but don't stop the listener
                this.emit([this.helpers.returnJsonArray([{
                    error: true,
                    message: `Error processing trap: ${String(error)}`,
                    source: rinfo.address,
                    timestamp: new Date().toISOString(),
                }])]);
            }
        });

        // Handle server errors
        server.on('error', (error: Error) => {
            throw new NodeOperationError(
                this.getNode(),
                `SNMP trap receiver error: ${error.message}`
            );
        });

        // Handle server listening event
        server.on('listening', () => {
            // Server is now listening
        });

        // Bind server to port and address
        server.bind(port, bindAddress);

        // Cleanup function for when workflow is deactivated
        async function closeFunction() {
            return new Promise<void>((resolve) => {
                server.close(() => {
                    resolve();
                });
            });
        }

        return {
            closeFunction,
        };
    }
}

/**
 * Parse trap message from buffer
 * This is a simplified parser - a full implementation would use net-snmp's parser
 */
function parseTrapMessage(msg: Buffer, rinfo: dgram.RemoteInfo, options: any): any {
    // For now, we'll create a simplified trap data structure
    // In a full implementation, this would parse the SNMP message format
    
    const trapData: any = {
        timestamp: new Date().toISOString(),
        source: {
            address: rinfo.address,
            port: rinfo.port,
            family: rinfo.family,
        },
        trap: {
            version: 'v2c', // Default for simplified implementation
            community: 'public', // Would be parsed from message
        },
        pdu: {
            type: 'TrapV2',
            typeCode: 7,
        },
        varbinds: [],
        rawData: {
            size: msg.length,
            hex: msg.toString('hex').substring(0, 200), // First 200 chars of hex
        },
    };

    // Try to extract some basic information from the buffer
    // This is a very simplified approach - real SNMP parsing would be more complex
    try {
        // SNMP messages typically start with version info
        // This is just a placeholder for actual SNMP parsing
        if (msg.length > 10) {
            const version = msg[1];
            if (version === 0) trapData.trap.version = 'v1';
            else if (version === 1) trapData.trap.version = 'v2c';
            else if (version === 3) trapData.trap.version = 'v3';
        }
        
        // Extract community string if v1/v2c (simplified)
        // Real implementation would properly parse ASN.1 structure
        if (trapData.trap.version !== 'v3' && msg.length > 20) {
            // Look for ASCII text that might be community string
            let communityStart = -1;
            for (let i = 2; i < Math.min(msg.length - 10, 50); i++) {
                if (msg[i] >= 32 && msg[i] <= 126) { // Printable ASCII
                    if (communityStart === -1) communityStart = i;
                } else if (communityStart !== -1) {
                    const possibleCommunity = msg.toString('utf8', communityStart, i);
                    if (possibleCommunity.length > 0 && possibleCommunity.length < 20) {
                        trapData.trap.community = possibleCommunity;
                    }
                    break;
                }
            }
        }
    } catch (error) {
        // If parsing fails, continue with default values
        // Error is handled silently
    }

    // Add summary information  
    trapData.summary = {
        varbindCount: trapData.varbinds.length,
        trapType: trapData.pdu.type,
        version: trapData.trap.version,
        messageSize: msg.length,
    };

    // Include raw buffer if requested
    if (options.includeRawPdu) {
        trapData.rawBuffer = msg.toString('base64');
    }

    return trapData;
}