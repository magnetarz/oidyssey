import { SnmpDataConverter } from '../../src/utils/snmp/dataConverter';
import { SnmpObjectType } from '../../src/types/SnmpTypes';

describe('SnmpDataConverter', () => {

    describe('processVarbinds', () => {
        it('should process a list of varbinds', () => {
            const varbinds = [
                { oid: '1.2.3', type: SnmpObjectType.Integer, value: 123 },
                { oid: '1.2.4', type: SnmpObjectType.OctetString, value: 'test' },
            ];
            const processed = SnmpDataConverter.processVarbinds(varbinds);
            expect(processed).toHaveLength(2);
            expect(processed[0].value).toBe(123);
            expect(processed[1].value).toBe('test');
        });

        it('should handle an empty list of varbinds', () => {
            const processed = SnmpDataConverter.processVarbinds([]);
            expect(processed).toEqual([]);
        });

        it('should handle errors in individual varbinds', () => {
            const varbinds = [
                { oid: '1.2.3', type: SnmpObjectType.Integer, value: 123 },
                { oid: '1.2.4', type: SnmpObjectType.NoSuchObject },
            ];
            const processed = SnmpDataConverter.processVarbinds(varbinds);
            expect(processed).toHaveLength(2);
            expect(processed[0].error).toBeUndefined();
            expect(processed[1].error).toBe('No such object');
        });
    });

    describe('IP Address Conversion', () => {
        it('should convert a 4-byte buffer to an IP address string', () => {
            const ipBuffer = Buffer.from([192, 168, 1, 1]);
            // @ts-ignore
            const result = SnmpDataConverter.convertIpAddress(ipBuffer);
            expect(result).toBe('192.168.1.1');
        });

        it('should return the same string if a valid IP address string is provided', () => {
            const ipString = '10.0.0.1';
            // @ts-ignore
            const result = SnmpDataConverter.convertIpAddress(ipString);
            expect(result).toBe(ipString);
        });

        it('should convert an array of 4 numbers to an IP address string', () => {
            const ipArray = [172, 16, 0, 1];
            // @ts-ignore
            const result = SnmpDataConverter.convertIpAddress(ipArray);
            expect(result).toBe('172.16.0.1');
        });

        it('should handle other data types by converting them to string', () => {
            // @ts-ignore
            const result = SnmpDataConverter.convertIpAddress(12345);
            expect(result).toBe('12345');
        });
    });

    describe('OctetString Conversion', () => {
        it('should convert a readable buffer to a UTF-8 string', () => {
            const textBuffer = Buffer.from('Hello, world!', 'utf8');
            // @ts-ignore
            const result = SnmpDataConverter.convertOctetString(textBuffer);
            expect(result).toBe('Hello, world!');
        });

        it('should convert a non-readable buffer to a hex string object', () => {
            const binaryBuffer = Buffer.from([0x01, 0x02, 0x03, 0xDE, 0xAD, 0xBE, 0xEF]);
            // @ts-ignore
            const result = SnmpDataConverter.convertOctetString(binaryBuffer);
            expect(result).toEqual({
                hex: '010203DEADBEEF',
                binary: true,
            });
        });

        it('should return a string as-is', () => {
            const text = 'This is a test string';
            // @ts-ignore
            const result = SnmpDataConverter.convertOctetString(text);
            expect(result).toBe(text);
        });

        it('should handle non-buffer values', () => {
            // @ts-ignore
            const result = SnmpDataConverter.convertOctetString(123);
            expect(result).toBe('123');
        });
    });

    describe('Integer Conversion', () => {
        it('should convert a string to an integer', () => {
            // @ts-ignore
            const result = SnmpDataConverter.convertInteger('123');
            expect(result).toBe(123);
        });

        it('should return 0 for a non-numeric string', () => {
            // @ts-ignore
            const result = SnmpDataConverter.convertInteger('abc');
            expect(result).toBe(0);
        });
    });

    describe('Boolean Conversion', () => {
        it('should convert a number to a boolean', () => {
            // @ts-ignore
            expect(SnmpDataConverter.convertBoolean(1)).toBe(true);
            // @ts-ignore
            expect(SnmpDataConverter.convertBoolean(0)).toBe(false);
        });

        it('should convert a string to a boolean', () => {
            // @ts-ignore
            expect(SnmpDataConverter.convertBoolean('true')).toBe(true);
            // @ts-ignore
            expect(SnmpDataConverter.convertBoolean('false')).toBe(false);
        });
    });

    describe('OID Conversion', () => {
        it('should convert an array of numbers to an OID string', () => {
            // @ts-ignore
            const result = SnmpDataConverter.convertOid([1, 3, 6, 1, 2, 1, 1, 1, 0]);
            expect(result).toBe('1.3.6.1.2.1.1.1.0');
        });
    });

    describe('Counter32 Conversion', () => {
        it('should convert a number to a Counter32 object', () => {
            // @ts-ignore
            const result = SnmpDataConverter.convertCounter32(12345);
            expect(result).toEqual({
                value: 12345,
                wrapped: false,
                previousValue: undefined,
            });
        });
    });

    describe('Counter64 Conversion', () => {
        it('should convert a number to a Counter64 object', () => {
            // @ts-ignore
            const result = SnmpDataConverter.convertCounter64(12345);
            expect(result).toEqual({
                value: BigInt(12345),
                wrapped: false,
                previousValue: undefined,
            });
        });

        it('should convert a string to a Counter64 object', () => {
            // @ts-ignore
            const result = SnmpDataConverter.convertCounter64('12345');
            expect(result).toEqual({
                value: BigInt(12345),
                wrapped: false,
                previousValue: undefined,
            });
        });
    });

    describe('Gauge Conversion', () => {
        it('should convert a number to a Gauge', () => {
            // @ts-ignore
            const result = SnmpDataConverter.convertGauge(123.45);
            expect(result).toBe(123);
        });
    });

    describe('TimeTicks Conversion', () => {
        it('should convert ticks to a TimeTicks object', () => {
            // @ts-ignore
            const result = SnmpDataConverter.convertTimeTicks(36313600);
            expect(result).toEqual({
                ticks: 36313600,
                milliseconds: 363136000,
                humanReadable: '4d 4h 52m 16s',
            });
        });
    });

    describe('Opaque Conversion', () => {
        it('should convert a buffer to an Opaque object', () => {
            const buffer = Buffer.from('test');
            // @ts-ignore
            const result = SnmpDataConverter.convertOpaque(buffer);
            expect(result).toEqual({
                hex: '74657374',
                opaque: true,
            });
        });
    });

    describe('convertValue', () => {
        it('should call the correct converter for each type', () => {
            // @ts-ignore
            expect(SnmpDataConverter.convertValue(true, SnmpObjectType.Boolean)).toBe(true);
            // @ts-ignore
            expect(SnmpDataConverter.convertValue(123, SnmpObjectType.Integer)).toBe(123);
            // @ts-ignore
            expect(SnmpDataConverter.convertValue('test', SnmpObjectType.OctetString)).toBe('test');
            // @ts-ignore
            expect(SnmpDataConverter.convertValue(null, SnmpObjectType.Null)).toBeNull();
            // @ts-ignore
            expect(SnmpDataConverter.convertValue('1.2.3', SnmpObjectType.OID)).toBe('1.2.3');
            // @ts-ignore
            expect(SnmpDataConverter.convertValue('127.0.0.1', SnmpObjectType.IpAddress)).toBe('127.0.0.1');
            // @ts-ignore
            expect(SnmpDataConverter.convertValue(123, SnmpObjectType.Counter32).value).toBe(123);
            // @ts-ignore
            expect(SnmpDataConverter.convertValue(123, SnmpObjectType.Gauge32)).toBe(123);
            // @ts-ignore
            expect(SnmpDataConverter.convertValue(123, SnmpObjectType.TimeTicks).ticks).toBe(123);
            // @ts-ignore
            expect(SnmpDataConverter.convertValue(Buffer.from('test'), SnmpObjectType.Opaque).opaque).toBe(true);
            // @ts-ignore
            expect(SnmpDataConverter.convertValue(123, SnmpObjectType.Counter64).value).toBe(BigInt(123));
        });

        it('should handle unknown types', () => {
            // @ts-ignore
            const result = SnmpDataConverter.convertValue('test', 999);
            expect(result).toEqual({
                rawValue: 'test',
                type: 'unknown',
                warning: 'Unsupported SNMP type: 999',
            });
        });
    });

    describe('isReadableString', () => {
        it('should return true for a readable buffer', () => {
            const buffer = Buffer.from('This is a readable string');
            // @ts-ignore
            expect(SnmpDataConverter.isReadableString(buffer)).toBe(true);
        });

        it('should return false for a non-readable buffer', () => {
            const buffer = Buffer.from([0x01, 0x02, 0x03]);
            // @ts-ignore
            expect(SnmpDataConverter.isReadableString(buffer)).toBe(false);
        });
    });

    describe('createSummary', () => {
        it('should create a summary of processed varbinds', () => {
            const varbinds = [
                { oid: '1.2.3', type: 'Integer', value: 123, raw: {} },
                { oid: '1.2.4', type: 'OctetString', value: 'test', raw: {} },
                { oid: '1.2.5', type: 'error', value: null, raw: {}, error: 'test error' },
            ];
            const summary = SnmpDataConverter.createSummary(varbinds);
            expect(summary).toEqual({
                successful: 2,
                errors: 1,
                totalSize: 186,
                types: {
                    Integer: 1,
                    OctetString: 1,
                    error: 1,
                },
            });
        });
    });

    describe('Error Handling', () => {
        it('should correctly identify an error varbind', () => {
            const errorVarbind = { oid: '1.2.3', type: SnmpObjectType.NoSuchObject };
            // @ts-ignore
            expect(SnmpDataConverter.isVarbindError(errorVarbind)).toBe(true);
        });

        it('should extract the correct error message', () => {
            const errorVarbind = { oid: '1.2.3', type: SnmpObjectType.NoSuchInstance };
            // @ts-ignore
            expect(SnmpDataConverter.getVarbindError(errorVarbind)).toBe('No such instance');
        });
    });
});
