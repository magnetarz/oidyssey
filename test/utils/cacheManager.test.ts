import { SnmpCacheManager } from '../../src/utils/snmp/cacheManager';

describe('SnmpCacheManager', () => {
  it('sets and gets cached values with TTL', () => {
    const cache = new SnmpCacheManager({ staticDataTtl: 1000, dynamicDataTtl: 1000 });
    const host = '192.168.1.1';
    const oid = '1.3.6.1.2.1.1.1.0';
    const value = [{ oid, type: 'OctetString', value: 'Linux' }];

    expect(cache.getCachedValue(host, oid)).toBeNull();
    cache.setCachedValue(host, oid, value, 200);
    const got = cache.getCachedValue(host, oid);
    expect(got).toBeTruthy();

    cache.shutdown();
  });
});


