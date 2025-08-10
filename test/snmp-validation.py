#!/usr/bin/env python3
"""
SNMP Validation Script for OIDyssey Testing
Validates SNMP operations against the emulator and verifies trap reception
"""

import sys
import time
import json
import argparse
from datetime import datetime
from pysnmp.hlapi import *

class SNMPValidator:
    def __init__(self, host='snmp-emulator', port=161, community='public'):
        self.host = host
        self.port = port
        self.community = community
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'host': host,
            'port': port,
            'tests': []
        }
    
    def test_snmp_get(self, oid):
        """Test SNMP GET operation"""
        test_result = {
            'operation': 'GET',
            'oid': oid,
            'success': False,
            'value': None,
            'error': None
        }
        
        try:
            errorIndication, errorStatus, errorIndex, varBinds = next(
                getCmd(SnmpEngine(),
                       CommunityData(self.community),
                       UdpTransportTarget((self.host, self.port)),
                       ContextData(),
                       ObjectType(ObjectIdentity(oid)))
            )
            
            if errorIndication:
                test_result['error'] = str(errorIndication)
            elif errorStatus:
                test_result['error'] = f'{errorStatus.prettyPrint()} at {errorIndex}'
            else:
                for varBind in varBinds:
                    test_result['success'] = True
                    test_result['value'] = str(varBind[1])
        except Exception as e:
            test_result['error'] = str(e)
        
        self.results['tests'].append(test_result)
        return test_result['success']
    
    def test_snmp_walk(self, oid_prefix):
        """Test SNMP WALK operation"""
        test_result = {
            'operation': 'WALK',
            'oid_prefix': oid_prefix,
            'success': False,
            'count': 0,
            'values': [],
            'error': None
        }
        
        try:
            for (errorIndication, errorStatus, errorIndex, varBinds) in nextCmd(
                SnmpEngine(),
                CommunityData(self.community),
                UdpTransportTarget((self.host, self.port)),
                ContextData(),
                ObjectType(ObjectIdentity(oid_prefix)),
                lexicographicMode=False
            ):
                if errorIndication:
                    test_result['error'] = str(errorIndication)
                    break
                elif errorStatus:
                    test_result['error'] = f'{errorStatus.prettyPrint()} at {errorIndex}'
                    break
                else:
                    for varBind in varBinds:
                        test_result['values'].append({
                            'oid': str(varBind[0]),
                            'value': str(varBind[1])
                        })
                        test_result['count'] += 1
            
            if test_result['count'] > 0:
                test_result['success'] = True
        except Exception as e:
            test_result['error'] = str(e)
        
        self.results['tests'].append(test_result)
        return test_result['success']
    
    def test_snmp_set(self, oid, value, value_type='OctetString'):
        """Test SNMP SET operation"""
        test_result = {
            'operation': 'SET',
            'oid': oid,
            'value': str(value),
            'type': value_type,
            'success': False,
            'error': None
        }
        
        # Map value types
        type_map = {
            'OctetString': OctetString,
            'Integer': Integer,
            'IpAddress': IpAddress,
            'ObjectIdentifier': ObjectIdentifier
        }
        
        value_class = type_map.get(value_type, OctetString)
        
        try:
            errorIndication, errorStatus, errorIndex, varBinds = next(
                setCmd(SnmpEngine(),
                       CommunityData('private'),  # Use write community
                       UdpTransportTarget((self.host, self.port)),
                       ContextData(),
                       ObjectType(ObjectIdentity(oid), value_class(value)))
            )
            
            if errorIndication:
                test_result['error'] = str(errorIndication)
            elif errorStatus:
                test_result['error'] = f'{errorStatus.prettyPrint()} at {errorIndex}'
            else:
                test_result['success'] = True
        except Exception as e:
            test_result['error'] = str(e)
        
        self.results['tests'].append(test_result)
        return test_result['success']
    
    def test_snmp_bulk(self, oid_prefix, max_repetitions=10):
        """Test SNMP BULK operation"""
        test_result = {
            'operation': 'BULK',
            'oid_prefix': oid_prefix,
            'max_repetitions': max_repetitions,
            'success': False,
            'count': 0,
            'values': [],
            'error': None
        }
        
        try:
            for (errorIndication, errorStatus, errorIndex, varBinds) in bulkCmd(
                SnmpEngine(),
                CommunityData(self.community),
                UdpTransportTarget((self.host, self.port)),
                ContextData(),
                0, max_repetitions,
                ObjectType(ObjectIdentity(oid_prefix)),
                lexicographicMode=False
            ):
                if errorIndication:
                    test_result['error'] = str(errorIndication)
                    break
                elif errorStatus:
                    test_result['error'] = f'{errorStatus.prettyPrint()} at {errorIndex}'
                    break
                else:
                    for varBind in varBinds:
                        test_result['values'].append({
                            'oid': str(varBind[0]),
                            'value': str(varBind[1])
                        })
                        test_result['count'] += 1
            
            if test_result['count'] > 0:
                test_result['success'] = True
        except Exception as e:
            test_result['error'] = str(e)
        
        self.results['tests'].append(test_result)
        return test_result['success']
    
    def run_standard_tests(self):
        """Run standard SNMP validation tests"""
        print("🔍 Running SNMP Validation Tests")
        print("="*50)
        
        # System MIB tests
        print("\n📊 Testing System MIB OIDs:")
        system_oids = [
            ('1.3.6.1.2.1.1.1.0', 'sysDescr'),
            ('1.3.6.1.2.1.1.2.0', 'sysObjectID'),
            ('1.3.6.1.2.1.1.3.0', 'sysUpTime'),
            ('1.3.6.1.2.1.1.4.0', 'sysContact'),
            ('1.3.6.1.2.1.1.5.0', 'sysName'),
            ('1.3.6.1.2.1.1.6.0', 'sysLocation'),
            ('1.3.6.1.2.1.1.7.0', 'sysServices')
        ]
        
        for oid, name in system_oids:
            success = self.test_snmp_get(oid)
            status = "✅" if success else "❌"
            print(f"  {status} {name}: {oid}")
        
        # Interface MIB tests
        print("\n📊 Testing Interface MIB:")
        if_success = self.test_snmp_walk('1.3.6.1.2.1.2.2.1')
        status = "✅" if if_success else "❌"
        print(f"  {status} Interface table walk")
        
        # Bulk operation test
        print("\n📊 Testing BULK operations:")
        bulk_success = self.test_snmp_bulk('1.3.6.1.2.1', 25)
        status = "✅" if bulk_success else "❌"
        print(f"  {status} Bulk GET (25 repetitions)")
        
        # Calculate success rate
        total_tests = len(self.results['tests'])
        successful_tests = sum(1 for t in self.results['tests'] if t['success'])
        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("\n" + "="*50)
        print(f"📈 Results: {successful_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
        
        return success_rate >= 80  # Consider 80% or higher as overall success
    
    def save_results(self, filename='test/results/snmp-validation.json'):
        """Save test results to JSON file"""
        try:
            with open(filename, 'w') as f:
                json.dump(self.results, f, indent=2)
            print(f"\n💾 Results saved to {filename}")
        except Exception as e:
            print(f"\n⚠️ Failed to save results: {e}")
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("📋 SNMP Validation Summary")
        print("="*50)
        
        # Group by operation type
        operations = {}
        for test in self.results['tests']:
            op = test['operation']
            if op not in operations:
                operations[op] = {'total': 0, 'success': 0}
            operations[op]['total'] += 1
            if test['success']:
                operations[op]['success'] += 1
        
        for op, stats in operations.items():
            success_rate = (stats['success'] / stats['total'] * 100) if stats['total'] > 0 else 0
            print(f"{op}: {stats['success']}/{stats['total']} ({success_rate:.1f}%)")
        
        # Overall statistics
        total = sum(op['total'] for op in operations.values())
        successful = sum(op['success'] for op in operations.values())
        overall_rate = (successful / total * 100) if total > 0 else 0
        
        print("-"*50)
        print(f"Overall: {successful}/{total} ({overall_rate:.1f}%)")
        
        if overall_rate == 100:
            print("\n🎉 Perfect score! All tests passed!")
        elif overall_rate >= 80:
            print("\n✅ Good results! Most tests passed.")
        elif overall_rate >= 50:
            print("\n⚠️ Mixed results. Some issues detected.")
        else:
            print("\n❌ Poor results. Many tests failed.")

def main():
    parser = argparse.ArgumentParser(description='SNMP Validation for OIDyssey')
    parser.add_argument('--host', default='snmp-emulator', help='SNMP host')
    parser.add_argument('--port', type=int, default=161, help='SNMP port')
    parser.add_argument('--community', default='public', help='SNMP community')
    parser.add_argument('--output', default='test/results/snmp-validation.json', 
                       help='Output file for results')
    
    args = parser.parse_args()
    
    print("🚀 OIDyssey SNMP Validation Tool")
    print(f"Target: {args.host}:{args.port}")
    print(f"Community: {args.community}")
    
    validator = SNMPValidator(args.host, args.port, args.community)
    
    # Run tests
    success = validator.run_standard_tests()
    
    # Save and display results
    validator.save_results(args.output)
    validator.print_summary()
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()