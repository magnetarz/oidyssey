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
  });

  it('should expire a cache entry after its TTL', (done) => {
    const cache = new SnmpCacheManager({ staticDataTtl: 100, dynamicDataTtl: 100 });
    const host = '192.168.1.2';
    const oid = '1.3.6.1.2.1.1.1.0';
    const value = [{ oid, type: 'OctetString', value: 'Linux' }];

    cache.setCachedValue(host, oid, value, 50);
    expect(cache.getCachedValue(host, oid)).not.toBeNull();

    setTimeout(() => {
      expect(cache.getCachedValue(host, oid)).toBeNull();
      done();
    }, 100);
  });

  it('should clear the cache for a specific host', () => {
    const cache = new SnmpCacheManager();
    const host1 = '192.168.1.4';
    const host2 = '192.168.1.5';
    const oid = '1.3.6.1.2.1.1.1.0';
    const value = [{ oid, type: 'OctetString', value: 'Linux' }];

    cache.setCachedValue(host1, oid, value);
    cache.setCachedValue(host2, oid, value);
    expect(cache.getCachedValue(host1, oid)).not.toBeNull();
    expect(cache.getCachedValue(host2, oid)).not.toBeNull();

    cache.removeHostCache(host1);
    expect(cache.getCachedValue(host1, oid)).toBeNull();
    expect(cache.getCachedValue(host2, oid)).not.toBeNull();
  });

  it('should clear the entire cache', () => {
    const cache = new SnmpCacheManager();
    const host1 = '192.168.1.6';
    const host2 = '192.168.1.7';
    const oid = '1.3.6.1.2.1.1.1.0';
    const value = [{ oid, type: 'OctetString', value: 'Linux' }];

    cache.setCachedValue(host1, oid, value);
    cache.setCachedValue(host2, oid, value);
    cache.clearCache();
    expect(cache.getCachedValue(host1, oid)).toBeNull();
    expect(cache.getCachedValue(host2, oid)).toBeNull();
  });
});


