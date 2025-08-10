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

  it('should return no warnings for a strong community string', () => {
    const res = CredentialUtils.validateCommunityString('s7r0ng_c0mmun1ty');
    expect(res.valid).toBe(true);
    expect(res.warnings).toHaveLength(0);
  });

  it('should return invalid for an empty community string', () => {
    const res = CredentialUtils.validateCommunityString('');
    expect(res.valid).toBe(false);
  });

  it('should return invalid for a very short community string', () => {
    const res = CredentialUtils.validateCommunityString('a');
    expect(res.valid).toBe(false);
  });

  describe('createSafeErrorMessage', () => {
    it('should redact sensitive data from an error message', () => {
      const errorMessage = 'Error with community: public';
      const safeMessage = CredentialUtils.createSafeErrorMessage(errorMessage);
      expect(safeMessage).not.toContain('public');
      expect(safeMessage).toContain('[REDACTED]');
    });

    it('should handle context object', () => {
      const errorMessage = 'Error';
      const context = { community: 'private', host: 'localhost' };
      const safeMessage = CredentialUtils.createSafeErrorMessage(errorMessage, context);
      expect(safeMessage).not.toContain('private');
      expect(safeMessage).toContain('[REDACTED]');
      expect(safeMessage).toContain('localhost');
    });
  });

  describe('validateCredentialSecurity', () => {
    it('should identify a secure credential', () => {
      const creds = { version: 'v2c', community: 's7r0ng_c0mmun1ty' };
      // @ts-ignore
      const res = CredentialUtils.validateCredentialSecurity(creds);
      expect(res.secure).toBe(true);
    });

    it('should identify an insecure credential', () => {
      const creds = { version: 'v1', community: 'public' };
      // @ts-ignore
      const res = CredentialUtils.validateCredentialSecurity(creds);
      expect(res.secure).toBe(true); // No errors, but recommendations
      expect(res.recommendations.length).toBeGreaterThan(0);
    });

    it('should flag read-write credentials', () => {
      const creds = { version: 'v2c', community: 's7r0ng', securityOptions: { readOnly: false } };
      // @ts-ignore
      const res = CredentialUtils.validateCredentialSecurity(creds);
      expect(res.recommendations).toContain('Using read-write community strings increases security risk');
    });
  });

  describe('generateSecureCommunityString', () => {
    it('should generate a string of the specified length', () => {
      const res = CredentialUtils.generateSecureCommunityString(16);
      expect(res).toHaveLength(16);
    });
  });

  describe('normalizeCredentials', () => {
    it('should apply default values to partial credentials', () => {
      const creds = { community: 'test' };
      // @ts-ignore
      const res = CredentialUtils.normalizeCredentials(creds);
      expect(res.version).toBe('v2c');
      expect(res.port).toBe(161);
    });
  });

  describe('createSafeCredentials', () => {
    it('should remove sensitive fields from credentials', () => {
      const creds = { version: 'v2c', community: 'public', authKey: 'abc' };
      // @ts-ignore
      const res = CredentialUtils.createSafeCredentials(creds);
      expect(res.community).toBeUndefined();
      expect(res.authKey).toBeUndefined();
    });
  });

  describe('validateRequiredFields', () => {
    it('should validate that required fields are present', () => {
      const creds = { version: 'v2c', community: 'public' };
      const res = CredentialUtils.validateRequiredFields(creds);
      expect(res.valid).toBe(true);
    });

    it('should identify missing required fields', () => {
      const creds = { version: 'v2c' };
      const res = CredentialUtils.validateRequiredFields(creds);
      expect(res.valid).toBe(false);
      expect(res.missingFields).toContain('community');
    });
  });

  describe('createCredentialHash', () => {
    it('should create a hash from credentials and host', () => {
      const creds = { version: 'v2c', community: 'public' };
      // @ts-ignore
      const hash = CredentialUtils.createCredentialHash(creds, 'localhost');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });
});


