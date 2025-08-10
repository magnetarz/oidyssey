import { SnmpTrapTrigger } from '../../src/nodes/SnmpTrapTrigger/SnmpTrapTrigger.node';
import type { ITriggerFunctions, ITriggerResponse } from 'n8n-workflow';
import dgram from 'dgram';

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

async function sendUdpMessage(targetHost: string, targetPort: number) {
  const socket = dgram.createSocket('udp4');
  await new Promise<void>((resolve, reject) => {
    const buf = Buffer.from('integration test trap payload');
    socket.send(buf, targetPort, targetHost, (err) => {
      socket.close();
      if (err) reject(err);
      else resolve();
    });
  });
}

describe('TrapTrigger integration (UDP end-to-end)', () => {
  jest.setTimeout(15000);

  test('receives a trap sent via net-snmp', async () => {
    const port = 6162;
    const node = new SnmpTrapTrigger();
    const { ctx, emitted } = createTriggerFunctionsMock({
      port,
      bindAddress: '0.0.0.0',
      options: { includeRawPdu: true, validateSource: false },
    });

    const resp: ITriggerResponse = await node.trigger.call(ctx);

    await sendUdpMessage('127.0.0.1', port);
    // allow event loop to process
    await new Promise((r) => setTimeout(r, 250));

    expect(emitted.length).toBeGreaterThan(0);
    const first = emitted[0][0][0];
    expect(first.rawBuffer).toBeDefined();

    await resp.closeFunction?.();
  });

  test('allowedSources exact IP allows trap, non-matching blocks', async () => {
    const port = 6163;
    // Allowed
    const node1 = new SnmpTrapTrigger();
    const { ctx: ctx1, emitted: emitted1 } = createTriggerFunctionsMock({
      port,
      bindAddress: '0.0.0.0',
      options: { allowedSources: '127.0.0.1', validateSource: false },
    });
    const resp1: ITriggerResponse = await node1.trigger.call(ctx1);
    await sendUdpMessage('127.0.0.1', port);
    await new Promise((r) => setTimeout(r, 200));
    expect(emitted1.length).toBe(1);
    await resp1.closeFunction?.();

    // Disallowed
    const node2 = new SnmpTrapTrigger();
    const { ctx: ctx2, emitted: emitted2 } = createTriggerFunctionsMock({
      port,
      bindAddress: '0.0.0.0',
      options: { allowedSources: '10.0.0.0/8', validateSource: false },
    });
    const resp2: ITriggerResponse = await node2.trigger.call(ctx2);
    await sendUdpMessage('127.0.0.1', port);
    await new Promise((r) => setTimeout(r, 200));
    expect(emitted2.length).toBe(0);
    await resp2.closeFunction?.();
  });
});


