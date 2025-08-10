import { Snmp } from '../../src/nodes/Snmp/Snmp.node';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

// Mock GenericFunctions used by the node
jest.mock('../../src/nodes/Snmp/GenericFunctions', () => ({
  snmpGet: jest.fn(async function () {
    return {
      host: '192.168.1.1',
      operation: 'get',
      timestamp: Date.now(),
      sessionId: 's1',
      varbinds: [{ oid: '1.3.6.1.2.1.1.1.0', type: 'OctetString', value: 'Linux' }],
    };
  }),
  snmpWalk: jest.fn(async function () {
    return {
      host: '192.168.1.1',
      operation: 'walk',
      timestamp: Date.now(),
      sessionId: 's1',
      varbinds: [
        { oid: '1.3.6.1.2.1.1.1.0', type: 'OctetString', value: 'Linux' },
        { oid: '1.3.6.1.2.1.1.3.0', type: 'TimeTicks', value: 10 },
      ],
    };
  }),
  snmpBulkGet: jest.fn(async function () {
    return {
      host: '192.168.1.1',
      operation: 'bulkGet',
      timestamp: Date.now(),
      sessionId: 's1',
      varbinds: [
        { oid: '1.3.6.1.2.1.1.1.0', type: 'OctetString', value: 'Linux' },
        { oid: '1.3.6.1.2.1.1.3.0', type: 'TimeTicks', value: 10 },
      ],
    };
  }),
  snmpTrapReceiver: jest.fn(),
}));

function createExecuteFunctionsMock(params: Record<string, any>): IExecuteFunctions {
  const items = [{}];
  return {
    getInputData: () => items as INodeExecutionData[],
    getNodeParameter: (name: string) => params[name],
    getCredentials: async () => ({ community: 'public', version: 'v2c', port: 161, timeout: 5000, retries: 3 }),
    getNode: () => ({} as any),
  } as unknown as IExecuteFunctions;
}

describe('Snmp node (unit)', () => {
  test('deviceQuery/get returns formatted result', async () => {
    const node = new Snmp();
    const ctx = createExecuteFunctionsMock({
      resource: 'deviceQuery',
      operation: 'get',
      host: '192.168.1.1',
      oid: '1.3.6.1.2.1.1.1.0',
      additionalOptions: {},
      port: 161,
    });

    const res = await node.execute.call(ctx);
    expect(res[0][0].json.operation).toBe('get');
    expect(res[0][0].json.oid).toBe('1.3.6.1.2.1.1.1.0');
  });

  test('deviceQuery/walk returns array with summary', async () => {
    const node = new Snmp();
    const ctx = createExecuteFunctionsMock({
      resource: 'deviceQuery',
      operation: 'walk',
      host: '192.168.1.1',
      rootOid: '1.3.6.1.2.1.1',
      additionalOptions: {},
      port: 161,
    });

    const res = await node.execute.call(ctx);
    expect(res[0][0].json.operation).toBe('walk');
    expect(res[0][0].json.totalEntries).toBeGreaterThan(0);
  });

  test('deviceQuery/bulkGet returns expected structure', async () => {
    const node = new Snmp();
    const ctx = createExecuteFunctionsMock({
      resource: 'deviceQuery',
      operation: 'bulkGet',
      host: '192.168.1.1',
      oids: { oidList: [{ oid: '1.3.6.1.2.1.1.1.0' }, { oid: '1.3.6.1.2.1.1.3.0' }] },
      additionalOptions: { maxRepetitions: 10 },
      port: 161,
    });

    const res = await node.execute.call(ctx);
    const out = res[0][0].json as any;
    expect(out.operation).toBe('bulkGet');
    expect(Array.isArray(out.requestedOids)).toBe(true);
    expect(out.requestedOids).toHaveLength(2);
  });
});


