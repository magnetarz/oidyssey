import { SnmpTrapTrigger } from '../../src/nodes/SnmpTrapTrigger/SnmpTrapTrigger.node';
import type { ITriggerFunctions, ITriggerResponse } from 'n8n-workflow';

// Mock dgram to capture bind and simulate incoming messages
const onHandlers: Record<string, Function[]> = {};
const mockSocket = {
  on: jest.fn((event: string, handler: Function) => {
    onHandlers[event] = onHandlers[event] || [];
    onHandlers[event].push(handler);
  }),
  bind: jest.fn((_port: number, _addr: string) => {
    (onHandlers['listening'] || []).forEach((fn) => fn());
  }),
  close: jest.fn((cb?: Function) => cb && cb()),
};

jest.mock('dgram', () => ({
  createSocket: jest.fn(() => mockSocket),
}));

function createTriggerFunctionsMock(params: Record<string, any>) {
  const emitted: any[] = [];
  const helpers = {
    returnJsonArray: (arr: any[]) => arr,
  } as any;
  const fn: Partial<ITriggerFunctions> = {
    getNodeParameter: (name: string) => params[name],
    getNode: () => ({} as any),
    emit: (data: any) => emitted.push(data),
    helpers,
  };
  return { ctx: fn as ITriggerFunctions, emitted };
}

function simulateMessage(msg: Buffer, rinfo: any) {
  (onHandlers['message'] || []).forEach((fn) => fn(msg, rinfo));
}

beforeEach(() => {
  // reset handlers and mocks between tests
  Object.keys(onHandlers).forEach((k) => delete onHandlers[k]);
  (mockSocket.on as jest.Mock).mockClear();
  (mockSocket.bind as jest.Mock).mockClear();
  (mockSocket.close as jest.Mock).mockClear();
});

describe('SnmpTrapTrigger (unit)', () => {
  test('binds to provided port and address (validation disabled)', async () => {
    const node = new SnmpTrapTrigger();
    const { ctx } = createTriggerFunctionsMock({ port: 5162, bindAddress: '0.0.0.0', options: { validateSource: false } });
    const resp: ITriggerResponse = await node.trigger.call(ctx);
    expect(mockSocket.bind).toHaveBeenCalledWith(5162, '0.0.0.0');
    await resp.closeFunction?.();
  });

  test('binds with validateSource enabled and safe IPv4', async () => {
    const node = new SnmpTrapTrigger();
    const { ctx } = createTriggerFunctionsMock({ port: 5163, bindAddress: '192.168.1.10', options: { validateSource: true } });
    const resp: ITriggerResponse = await node.trigger.call(ctx);
    expect(mockSocket.bind).toHaveBeenCalledWith(5163, '192.168.1.10');
    await resp.closeFunction?.();
  });

  test('emits when a message arrives and passes (no filters)', async () => {
    const node = new SnmpTrapTrigger();
    const { ctx, emitted } = createTriggerFunctionsMock({
      port: 5162,
      bindAddress: '0.0.0.0',
      options: { allowedSources: '', includeRawPdu: false, validateSource: false },
    });
    await node.trigger.call(ctx);

    // simulate incoming message from allowed source
    const msg = Buffer.from('dummy snmp trap');
    const rinfo = { address: '127.0.0.1', port: 40000, family: 'udp4', size: msg.length } as any;
    simulateMessage(msg, rinfo);

    expect(emitted.length).toBeGreaterThan(0);
  });

  test('allowedSources exact IP allows emission', async () => {
    const node = new SnmpTrapTrigger();
    const { ctx, emitted } = createTriggerFunctionsMock({
      port: 5164,
      bindAddress: '0.0.0.0',
      options: { allowedSources: '127.0.0.1', validateSource: false },
    });
    await node.trigger.call(ctx);

    const msg = Buffer.from('trap');
    simulateMessage(msg, { address: '127.0.0.1', port: 10000, family: 'udp4', size: msg.length });

    expect(emitted.length).toBe(1);
  });

  test('allowedSources CIDR allows emission', async () => {
    const node = new SnmpTrapTrigger();
    const { ctx, emitted } = createTriggerFunctionsMock({
      port: 5165,
      bindAddress: '0.0.0.0',
      options: { allowedSources: '127.0.0.0/8', validateSource: false },
    });
    await node.trigger.call(ctx);

    const msg = Buffer.from('trap');
    simulateMessage(msg, { address: '127.1.2.3', port: 10001, family: 'udp4', size: msg.length });

    expect(emitted.length).toBe(1);
  });

  test('non-allowed source is ignored', async () => {
    const node = new SnmpTrapTrigger();
    const { ctx, emitted } = createTriggerFunctionsMock({
      port: 5166,
      bindAddress: '0.0.0.0',
      options: { allowedSources: '10.0.0.0/8', validateSource: false },
    });
    await node.trigger.call(ctx);

    const msg = Buffer.from('trap');
    simulateMessage(msg, { address: '127.0.0.1', port: 10002, family: 'udp4', size: msg.length });

    expect(emitted.length).toBe(0);
  });

  test('includeRawPdu adds rawBuffer to output', async () => {
    const node = new SnmpTrapTrigger();
    const { ctx, emitted } = createTriggerFunctionsMock({
      port: 5167,
      bindAddress: '0.0.0.0',
      options: { allowedSources: '', includeRawPdu: true, validateSource: false },
    });
    await node.trigger.call(ctx);

    const msg = Buffer.from('rawPduData');
    simulateMessage(msg, { address: '127.0.0.1', port: 10003, family: 'udp4', size: msg.length });

    // emitted shape: [ [ { ...trapData } ] ]
    const first = emitted[0][0][0];
    expect(first.rawBuffer).toBeDefined();
  });

  test('filterOid suppresses emission when no matching varbinds', async () => {
    const node = new SnmpTrapTrigger();
    const { ctx, emitted } = createTriggerFunctionsMock({
      port: 5168,
      bindAddress: '0.0.0.0',
      options: { filterOid: '1.3.6.1.4.1', validateSource: false },
    });
    await node.trigger.call(ctx);

    const msg = Buffer.from('trap');
    simulateMessage(msg, { address: '127.0.0.1', port: 10004, family: 'udp4', size: msg.length });

    expect(emitted.length).toBe(0);
  });

  test('filterCommunity suppresses emission (known limitation: top-level community missing)', async () => {
    const node = new SnmpTrapTrigger();
    const { ctx, emitted } = createTriggerFunctionsMock({
      port: 5169,
      bindAddress: '0.0.0.0',
      options: { filterCommunity: 'test-community', validateSource: false },
    });
    await node.trigger.call(ctx);

    const msg = Buffer.from('trap');
    simulateMessage(msg, { address: '127.0.0.1', port: 10005, family: 'udp4', size: msg.length });

    expect(emitted.length).toBe(0);
  });

  test('closeFunction closes socket', async () => {
    const node = new SnmpTrapTrigger();
    const { ctx } = createTriggerFunctionsMock({ port: 5170, bindAddress: '0.0.0.0', options: { validateSource: false } });
    const resp: ITriggerResponse = await node.trigger.call(ctx);
    await resp.closeFunction?.();
    expect(mockSocket.close).toHaveBeenCalled();
  });
});
