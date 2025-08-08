import { CredentialUtils } from '../../src/utils/security/credentialUtils';

describe('CredentialUtils', () => {
  it('redacts sensitive fields in objects', () => {
    const redacted = CredentialUtils.redactSensitiveData({
      community: 'public',
      secret: 'abc',
      nested: { token: 'xyz' },
      keep: 'ok',
    });
    expect(redacted.community).toBe('[REDACTED]');
    expect(redacted.secret).toBe('[REDACTED]');
    expect(redacted.nested.token).toBe('[REDACTED]');
    expect(redacted.keep).toBe('ok');
  });

  it('validates community strength and flags common defaults', () => {
    const res = CredentialUtils.validateCommunityString('public');
    expect(res.valid).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
  });
});


