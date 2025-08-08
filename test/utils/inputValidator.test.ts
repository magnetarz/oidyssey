import { InputValidator } from '../../src/utils/security/inputValidator';

describe('InputValidator', () => {
  describe('validateOid', () => {
    it('accepts valid numeric OID', () => {
      const res = InputValidator.validateOid('1.3.6.1.2.1.1.1.0');
      expect(res.valid).toBe(true);
    });

    it('rejects non-numeric OID', () => {
      const res = InputValidator.validateOid('iso.3.6.1');
      expect(res.valid).toBe(false);
    });

    it('rejects too long OID', () => {
      const long = '1.' + '1.'.repeat(200) + '1';
      const res = InputValidator.validateOid(long);
      expect(res.valid).toBe(false);
    });
  });

  describe('validateHost', () => {
    it('accepts valid IPv4', () => {
      const res = InputValidator.validateHost('192.168.1.10');
      expect(res.valid).toBe(true);
    });

    it('accepts valid hostname', () => {
      const res = InputValidator.validateHost('router.example.com');
      expect(res.valid).toBe(true);
    });

    it('rejects malicious scheme', () => {
      const res = InputValidator.validateHost('file:///etc/passwd');
      expect(res.valid).toBe(false);
    });
  });

  describe('validatePort', () => {
    it('accepts valid port', () => {
      const res = InputValidator.validatePort(162);
      expect(res.valid).toBe(true);
    });

    it('rejects out of range port', () => {
      const res = InputValidator.validatePort(70000);
      expect(res.valid).toBe(false);
    });
  });
});


