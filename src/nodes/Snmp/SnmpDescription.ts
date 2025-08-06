/**
 * SNMP Node parameter descriptions for n8n
 * Defines the user interface and parameter structure for the SNMP node
 */

import { INodeProperties } from 'n8n-workflow';
import { STANDARD_OIDS } from '../../types/SnmpTypes';

export const snmpNodeDescription: INodeProperties[] = [
    // Resource selection
    {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        options: [
            {
                name: 'Device Query',
                value: 'deviceQuery',
                description: 'Query a single network device for SNMP data'
            },
            {
                name: 'Bulk Operations',
                value: 'bulkOperations', 
                description: 'Perform bulk queries across multiple devices or OIDs'
            },
            {
                name: 'Trap Receiver',
                value: 'trapReceiver',
                description: 'Listen for SNMP traps from network devices'
            }
        ],
        default: 'deviceQuery',
        description: 'Choose the type of SNMP operation to perform'
    },

    // Operation selection for Device Query
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
            show: {
                resource: ['deviceQuery']
            }
        },
        options: [
            {
                name: 'GET',
                value: 'get',
                description: 'Query a single OID value from the device',
                action: 'Get a single SNMP value'
            },
            {
                name: 'WALK',
                value: 'walk', 
                description: 'Traverse an OID subtree to get all values',
                action: 'Walk an SNMP subtree'
            },
            {
                name: 'BULK-GET',
                value: 'bulkGet',
                description: 'Query multiple OIDs efficiently in one operation',
                action: 'Bulk get multiple SNMP values'
            }
        ],
        default: 'get',
        description: 'Select the SNMP operation to perform'
    },

    // Operation selection for Bulk Operations
    {
        displayName: 'Bulk Operation',
        name: 'bulkOperation',
        type: 'options',
        displayOptions: {
            show: {
                resource: ['bulkOperations']
            }
        },
        options: [
            {
                name: 'Multi-Device Query',
                value: 'multiDevice',
                description: 'Query the same OID(s) from multiple devices',
                action: 'Query multiple devices'
            },
            {
                name: 'Multi-OID Query', 
                value: 'multiOid',
                description: 'Query multiple OIDs from the same device',
                action: 'Query multiple OIDs'
            },
            {
                name: 'Template-Based',
                value: 'template',
                description: 'Use pre-defined MIB templates for common monitoring',
                action: 'Use monitoring template'
            }
        ],
        default: 'multiDevice',
        description: 'Select the type of bulk operation'
    },

    // Host configuration
    {
        displayName: 'Host',
        name: 'host',
        type: 'string',
        displayOptions: {
            show: {
                resource: ['deviceQuery']
            }
        },
        default: '',
        required: true,
        description: 'IP address or hostname of the SNMP device',
        placeholder: '192.168.1.1'
    },

    // Multiple hosts for bulk operations
    {
        displayName: 'Hosts',
        name: 'hosts',
        type: 'fixedCollection',
        displayOptions: {
            show: {
                resource: ['bulkOperations'],
                bulkOperation: ['multiDevice']
            }
        },
        default: {
            hostList: [
                {
                    host: ''
                }
            ]
        },
        placeholder: 'Add Host',
        typeOptions: {
            multipleValues: true,
            multipleValueButtonText: 'Add Host'
        },
        options: [
            {
                displayName: 'Host List',
                name: 'hostList',
                values: [
                    {
                        displayName: 'Host',
                        name: 'host',
                        type: 'string',
                        default: '',
                        required: true,
                        description: 'IP address or hostname of the SNMP device',
                        placeholder: '192.168.1.1'
                    }
                ]
            }
        ],
        description: 'List of hosts to query'
    },

    // Port configuration
    {
        displayName: 'Port',
        name: 'port',
        type: 'number',
        default: 161,
        description: 'SNMP port (default: 161)',
        typeOptions: {
            minValue: 1,
            maxValue: 65535
        }
    },

    // OID configuration for GET operation
    {
        displayName: 'OID',
        name: 'oid',
        type: 'string',
        displayOptions: {
            show: {
                resource: ['deviceQuery'],
                operation: ['get']
            }
        },
        default: STANDARD_OIDS.SYSTEM.DESCR,
        required: true,
        description: 'SNMP Object Identifier to query (numeric format: 1.3.6.1.2.1.1.1.0)',
        placeholder: '1.3.6.1.2.1.1.1.0'
    },

    // Root OID for WALK operation
    {
        displayName: 'Root OID',
        name: 'rootOid',
        type: 'string',
        displayOptions: {
            show: {
                resource: ['deviceQuery'],
                operation: ['walk']
            }
        },
        default: '1.3.6.1.2.1.1',
        required: true,
        description: 'Root OID to start the walk operation from',
        placeholder: '1.3.6.1.2.1.2.2.1'
    },

    // Multiple OIDs for BULK-GET
    {
        displayName: 'OIDs',
        name: 'oids',
        type: 'fixedCollection',
        displayOptions: {
            show: {
                resource: ['deviceQuery'],
                operation: ['bulkGet']
            }
        },
        default: {
            oidList: [
                {
                    oid: STANDARD_OIDS.SYSTEM.DESCR
                },
                {
                    oid: STANDARD_OIDS.SYSTEM.UPTIME
                }
            ]
        },
        placeholder: 'Add OID',
        typeOptions: {
            multipleValues: true,
            multipleValueButtonText: 'Add OID'
        },
        options: [
            {
                displayName: 'OID List',
                name: 'oidList',
                values: [
                    {
                        displayName: 'OID',
                        name: 'oid',
                        type: 'string',
                        default: '',
                        required: true,
                        description: 'SNMP Object Identifier',
                        placeholder: '1.3.6.1.2.1.1.1.0'
                    }
                ]
            }
        ],
        description: 'List of OIDs to query in bulk'
    },

    // MIB template selection
    {
        displayName: 'Template',
        name: 'template',
        type: 'options',
        displayOptions: {
            show: {
                resource: ['bulkOperations'],
                bulkOperation: ['template']
            }
        },
        options: [
            {
                name: 'System Information',
                value: 'system',
                description: 'Basic system information (sysDescr, sysName, sysLocation, etc.)'
            },
            {
                name: 'Interface Statistics',
                value: 'interfaces',
                description: 'Network interface status and statistics'
            },
            {
                name: 'CPU & Memory',
                value: 'performance',
                description: 'CPU usage and memory statistics (vendor-specific)'
            },
            {
                name: 'Custom Template',
                value: 'custom',
                description: 'Define your own set of OIDs'
            }
        ],
        default: 'system',
        description: 'Pre-defined template for common monitoring tasks'
    },

    // Custom template OIDs
    {
        displayName: 'Custom OIDs',
        name: 'customOids',
        type: 'fixedCollection',
        displayOptions: {
            show: {
                resource: ['bulkOperations'],
                bulkOperation: ['template'],
                template: ['custom']
            }
        },
        default: {
            oidList: [
                {
                    oid: '',
                    name: '',
                    description: ''
                }
            ]
        },
        placeholder: 'Add Custom OID',
        typeOptions: {
            multipleValues: true,
            multipleValueButtonText: 'Add Custom OID'
        },
        options: [
            {
                displayName: 'Custom OID List',
                name: 'oidList',
                values: [
                    {
                        displayName: 'OID',
                        name: 'oid',
                        type: 'string',
                        default: '',
                        required: true,
                        description: 'SNMP Object Identifier',
                        placeholder: '1.3.6.1.2.1.1.1.0'
                    },
                    {
                        displayName: 'Name',
                        name: 'name',
                        type: 'string',
                        default: '',
                        description: 'Human-readable name for this OID',
                        placeholder: 'System Description'
                    },
                    {
                        displayName: 'Description',
                        name: 'description',
                        type: 'string',
                        default: '',
                        description: 'Description of what this OID represents'
                    }
                ]
            }
        ],
        description: 'Define custom OIDs for monitoring'
    },

    // Advanced options
    {
        displayName: 'Additional Options',
        name: 'additionalOptions',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
            {
                displayName: 'Timeout (ms)',
                name: 'timeout',
                type: 'number',
                default: 5000,
                description: 'Request timeout in milliseconds',
                typeOptions: {
                    minValue: 1000,
                    maxValue: 60000
                }
            },
            {
                displayName: 'Retries',
                name: 'retries',
                type: 'number',
                default: 3,
                description: 'Number of retry attempts for failed requests',
                typeOptions: {
                    minValue: 0,
                    maxValue: 10
                }
            },
            {
                displayName: 'Max Varbinds (WALK)',
                name: 'maxVarbinds',
                type: 'number',
                default: 1000,
                displayOptions: {
                    show: {
                        '/operation': ['walk']
                    }
                },
                description: 'Maximum number of variables to retrieve in a WALK operation',
                typeOptions: {
                    minValue: 1,
                    maxValue: 10000
                }
            },
            {
                displayName: 'Max Repetitions (BULK-GET)',
                name: 'maxRepetitions',
                type: 'number',
                default: 10,
                displayOptions: {
                    show: {
                        '/operation': ['bulkGet']
                    }
                },
                description: 'Maximum repetitions for BULK-GET operations',
                typeOptions: {
                    minValue: 1,
                    maxValue: 100
                }
            },
            {
                displayName: 'Use Cache',
                name: 'useCache',
                type: 'boolean',
                default: true,
                description: 'Enable intelligent caching to improve performance'
            },
            {
                displayName: 'Cache Timeout (minutes)',
                name: 'cacheTimeout',
                type: 'number',
                default: 5,
                displayOptions: {
                    show: {
                        useCache: [true]
                    }
                },
                description: 'Custom cache timeout in minutes (overrides automatic TTL)',
                typeOptions: {
                    minValue: 1,
                    maxValue: 1440
                }
            },
            {
                displayName: 'Concurrent Requests',
                name: 'concurrentRequests',
                type: 'number',
                default: 5,
                displayOptions: {
                    show: {
                        '/resource': ['bulkOperations']
                    }
                },
                description: 'Maximum number of concurrent SNMP requests',
                typeOptions: {
                    minValue: 1,
                    maxValue: 20
                }
            }
        ]
    },

    // Trap receiver options
    {
        displayName: 'Trap Listener Options',
        name: 'trapOptions',
        type: 'collection',
        displayOptions: {
            show: {
                resource: ['trapReceiver']
            }
        },
        placeholder: 'Add Trap Option',
        default: {
            port: 162
        },
        options: [
            {
                displayName: 'Listen Port',
                name: 'port',
                type: 'number',
                default: 162,
                description: 'UDP port to listen for SNMP traps (default: 162)',
                typeOptions: {
                    minValue: 1,
                    maxValue: 65535
                }
            },
            {
                displayName: 'Allowed Sources',
                name: 'allowedSources',
                type: 'fixedCollection',
                default: {
                    sourceList: []
                },
                placeholder: 'Add Source',
                typeOptions: {
                    multipleValues: true,
                    multipleValueButtonText: 'Add Allowed Source'
                },
                options: [
                    {
                        displayName: 'Source List',
                        name: 'sourceList',
                        values: [
                            {
                                displayName: 'IP Address/Network',
                                name: 'source',
                                type: 'string',
                                default: '',
                                description: 'IP address or network (CIDR) allowed to send traps',
                                placeholder: '192.168.1.0/24'
                            }
                        ]
                    }
                ],
                description: 'List of IP addresses or networks allowed to send traps (leave empty to allow all)'
            },
            {
                displayName: 'Timeout (seconds)',
                name: 'timeout',
                type: 'number',
                default: 30,
                description: 'How long to wait for traps before timing out',
                typeOptions: {
                    minValue: 1,
                    maxValue: 3600
                }
            }
        ]
    }
];

/**
 * Common OID templates for quick selection
 */
export const getOidTemplates = () => {
    return {
        system: [
            { oid: STANDARD_OIDS.SYSTEM.DESCR, name: 'System Description', description: 'A textual description of the entity' },
            { oid: STANDARD_OIDS.SYSTEM.OBJECT_ID, name: 'System Object ID', description: 'The vendor\'s authoritative identification' },
            { oid: STANDARD_OIDS.SYSTEM.UPTIME, name: 'System Uptime', description: 'Time since the system was last reinitialized' },
            { oid: STANDARD_OIDS.SYSTEM.CONTACT, name: 'System Contact', description: 'Contact person for this managed node' },
            { oid: STANDARD_OIDS.SYSTEM.NAME, name: 'System Name', description: 'An administratively-assigned name' },
            { oid: STANDARD_OIDS.SYSTEM.LOCATION, name: 'System Location', description: 'Physical location of this node' }
        ],
        interfaces: [
            { oid: STANDARD_OIDS.INTERFACE.COUNT, name: 'Interface Count', description: 'Number of network interfaces' },
            { oid: STANDARD_OIDS.INTERFACE.DESCR, name: 'Interface Description', description: 'Description of interfaces (table)' },
            { oid: STANDARD_OIDS.INTERFACE.TYPE, name: 'Interface Type', description: 'Type of interfaces (table)' },
            { oid: STANDARD_OIDS.INTERFACE.ADMIN_STATUS, name: 'Admin Status', description: 'Administrative status (table)' },
            { oid: STANDARD_OIDS.INTERFACE.OPER_STATUS, name: 'Operational Status', description: 'Operational status (table)' },
            { oid: STANDARD_OIDS.INTERFACE.IN_OCTETS, name: 'Input Octets', description: 'Bytes received (table)' },
            { oid: STANDARD_OIDS.INTERFACE.OUT_OCTETS, name: 'Output Octets', description: 'Bytes transmitted (table)' }
        ],
        performance: [
            // Note: These are vendor-specific and may not work on all devices
            { oid: '1.3.6.1.4.1.9.9.109.1.1.1.1.7', name: 'Cisco CPU Usage', description: 'CPU usage percentage (Cisco)' },
            { oid: '1.3.6.1.4.1.9.9.48.1.1.1.5', name: 'Cisco Memory Used', description: 'Memory used bytes (Cisco)' },
            { oid: '1.3.6.1.4.1.9.9.48.1.1.1.6', name: 'Cisco Memory Free', description: 'Memory free bytes (Cisco)' }
        ]
    };
};