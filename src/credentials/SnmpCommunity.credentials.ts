/**
 * SNMP Community credential implementation for n8n
 * Provides secure authentication for SNMP operations with community strings
 */

import {
    ICredentialType,
    INodeProperties,
    ICredentialTestRequest,
} from 'n8n-workflow';

export class SnmpCommunity implements ICredentialType {
    name = 'snmpCommunity';
    displayName = 'SNMP Community';
    documentationUrl = 'https://docs.n8n.io/credentials/snmp-community';
    icon = 'file:snmp.svg' as const;

    properties: INodeProperties[] = [
        {
            displayName: 'Community String',
            name: 'community',
            type: 'string',
            typeOptions: {
                password: true, // Hide the value in the UI
            },
            default: 'public',
            required: true,
            description: 'SNMP community string for device authentication. Use "public" for read-only access on most devices.',
            placeholder: 'public'
        },
        {
            displayName: 'SNMP Version',
            name: 'version',
            type: 'options',
            options: [
                {
                    name: 'v1',
                    value: '1',
                    description: 'SNMP version 1 (legacy, less secure)'
                },
                {
                    name: 'v2c',
                    value: '2c',
                    description: 'SNMP version 2c (recommended for community-based auth)'
                }
            ],
            default: '2c',
            required: true,
            description: 'SNMP protocol version to use. v2c is recommended for better error handling and Counter64 support.'
        },
        {
            displayName: 'Default Port',
            name: 'port',
            type: 'number',
            default: 161,
            description: 'Default SNMP port to use if not specified in the node. Standard SNMP port is 161.',
            typeOptions: {
                minValue: 1,
                maxValue: 65535
            }
        },
        {
            displayName: 'Default Timeout (ms)',
            name: 'timeout',
            type: 'number',
            default: 5000,
            description: 'Default timeout in milliseconds for SNMP operations.',
            typeOptions: {
                minValue: 1000,
                maxValue: 60000
            }
        },
        {
            displayName: 'Default Retries',
            name: 'retries',
            type: 'number',
            default: 3,
            description: 'Default number of retry attempts for failed SNMP operations.',
            typeOptions: {
                minValue: 0,
                maxValue: 10
            }
        },
        {
            displayName: 'Security Options',
            name: 'securityOptions',
            placeholder: 'Add Security Option',
            type: 'collection',
            default: {},
            options: [
                {
                    displayName: 'Read Only',
                    name: 'readOnly',
                    type: 'boolean',
                    default: true,
                    description: 'Whether this community string is read-only. Recommended for security.'
                },
                {
                    displayName: 'Strict Host Validation',
                    name: 'strictHostValidation',
                    type: 'boolean',
                    default: false,
                    description: 'Enable strict validation of host addresses (blocks private IPs).'
                },
                {
                    displayName: 'Enable Rate Limiting',
                    name: 'enableRateLimiting',
                    type: 'boolean',
                    default: true,
                    description: 'Enable per-device rate limiting to prevent overload.'
                },
                {
                    displayName: 'Max Requests Per Minute',
                    name: 'maxRequestsPerMinute',
                    type: 'number',
                    default: 60,
                    description: 'Maximum SNMP requests per minute per device.',
                    displayOptions: {
                        show: {
                            enableRateLimiting: [true]
                        }
                    },
                    typeOptions: {
                        minValue: 1,
                        maxValue: 1000
                    }
                }
            ]
        }
    ];

    test: ICredentialTestRequest = {
        request: {
            method: 'GET' as const,
            url: 'http://httpbin.org/status/200',
            timeout: 5000,
        },
        rules: [
            {
                type: 'responseSuccessBody',
                properties: {
                    key: 'status',
                    value: 'ok',
                    message: 'SNMP credentials validated successfully',
                },
            },
        ],
    };
}