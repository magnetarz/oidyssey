#!/usr/bin/env python3
"""
SNMP Trap Sender for Testing OIDyssey SNMP Trap Trigger Node

This script sends various types of SNMP traps to test the trigger node functionality.
"""

import sys
import time
import argparse
from pysnmp.hlapi import *

def send_basic_trap(target_host='127.0.0.1', target_port=162, community='public'):
    """Send a basic SNMP v2c trap"""
    print(f"Sending basic trap to {target_host}:{target_port}")
    
    for (errorIndication, errorStatus, errorIndex, varBinds) in sendNotification(
        SnmpEngine(),
        CommunityData(community),
        UdpTransportTarget((target_host, target_port)),
        ContextData(),
        'trap',
        NotificationType(
            ObjectIdentity('1.3.6.1.6.3.1.1.5.1')  # coldStart trap
        ).addVarBinds(
            ('1.3.6.1.2.1.1.3.0', TimeTicks(12345)),  # sysUpTime
            ('1.3.6.1.6.3.1.1.4.1.0', ObjectIdentifier('1.3.6.1.4.1.20408.4.1.1.2'))
        )
    ):
        if errorIndication:
            print(f"Error: {errorIndication}")
            return False
        elif errorStatus:
            print(f'Error: {errorStatus.prettyPrint()} at {errorIndex and varBinds[int(errorIndex) - 1][0] or "?"}')
            return False
        else:
            print("✅ Basic trap sent successfully!")
            return True

def send_server_alert_trap(target_host='127.0.0.1', target_port=162, community='public'):
    """Send a server alert trap with multiple varbinds"""
    print(f"Sending server alert trap to {target_host}:{target_port}")
    
    for (errorIndication, errorStatus, errorIndex, varBinds) in sendNotification(
        SnmpEngine(),
        CommunityData(community),
        UdpTransportTarget((target_host, target_port)),
        ContextData(),
        'trap',
        NotificationType(
            ObjectIdentity('1.3.6.1.4.1.2021')  # Net-SNMP enterprise OID
        ).addVarBinds(
            ('1.3.6.1.2.1.1.3.0', TimeTicks(456789)),  # sysUpTime
            ('1.3.6.1.6.3.1.1.4.1.0', ObjectIdentifier('1.3.6.1.4.1.2021.251.1')),  # trapOID
            ('1.3.6.1.2.1.1.5.0', OctetString('server01.company.com')),  # hostname
            ('1.3.6.1.4.1.2021.11.11.0', Integer(95)),  # CPU usage 95%
            ('1.3.6.1.4.1.2021.4.6.0', Integer(1024)),  # Available memory (MB)
            ('1.3.6.1.4.1.2021.251.1.1', OctetString('High CPU usage detected'))  # Alert message
        )
    ):
        if errorIndication:
            print(f"Error: {errorIndication}")
            return False
        elif errorStatus:
            print(f'Error: {errorStatus.prettyPrint()}')
            return False
        else:
            print("✅ Server alert trap sent successfully!")
            return True

def send_interface_down_trap(target_host='127.0.0.1', target_port=162, community='public'):
    """Send interface down trap (link down)"""
    print(f"Sending interface down trap to {target_host}:{target_port}")
    
    for (errorIndication, errorStatus, errorIndex, varBinds) in sendNotification(
        SnmpEngine(),
        CommunityData(community),
        UdpTransportTarget((target_host, target_port)),
        ContextData(),
        'trap',
        NotificationType(
            ObjectIdentity('1.3.6.1.6.3.1.1.5.3')  # linkDown trap
        ).addVarBinds(
            ('1.3.6.1.2.1.1.3.0', TimeTicks(789012)),
            ('1.3.6.1.6.3.1.1.4.1.0', ObjectIdentifier('1.3.6.1.6.3.1.1.5.3')),
            ('1.3.6.1.2.1.2.2.1.1.2', Integer(2)),  # ifIndex = 2
            ('1.3.6.1.2.1.2.2.1.2.2', OctetString('GigabitEthernet0/2')),  # ifDescr
            ('1.3.6.1.2.1.2.2.1.7.2', Integer(2)),  # ifAdminStatus = down
            ('1.3.6.1.2.1.2.2.1.8.2', Integer(2))   # ifOperStatus = down
        )
    ):
        if errorIndication:
            print(f"Error: {errorIndication}")
            return False
        elif errorStatus:
            print(f'Error: {errorStatus.prettyPrint()}')
            return False
        else:
            print("✅ Interface down trap sent successfully!")
            return True

def send_custom_enterprise_trap(target_host='127.0.0.1', target_port=162, community='public'):
    """Send custom enterprise trap"""
    print(f"Sending custom enterprise trap to {target_host}:{target_port}")
    
    for (errorIndication, errorStatus, errorIndex, varBinds) in sendNotification(
        SnmpEngine(),
        CommunityData(community),
        UdpTransportTarget((target_host, target_port)),
        ContextData(),
        'trap',
        NotificationType(
            ObjectIdentity('1.3.6.1.4.1.99999.1.1')  # Custom enterprise trap
        ).addVarBinds(
            ('1.3.6.1.2.1.1.3.0', TimeTicks(987654)),
            ('1.3.6.1.6.3.1.1.4.1.0', ObjectIdentifier('1.3.6.1.4.1.99999.1.1.1')),
            ('1.3.6.1.4.1.99999.1.1.1', OctetString('OIDyssey Test Application')),
            ('1.3.6.1.4.1.99999.1.1.2', Integer(42)),
            ('1.3.6.1.4.1.99999.1.1.3', OctetString('Test trap from OIDyssey test suite')),
            ('1.3.6.1.4.1.99999.1.1.4', IpAddress('192.168.1.100'))
        )
    ):
        if errorIndication:
            print(f"Error: {errorIndication}")
            return False
        elif errorStatus:
            print(f'Error: {errorStatus.prettyPrint()}')
            return False
        else:
            print("✅ Custom enterprise trap sent successfully!")
            return True

def send_trap_burst(target_host='127.0.0.1', target_port=162, community='public', count=5, interval=1):
    """Send multiple traps in sequence"""
    print(f"Sending {count} traps with {interval}s interval...")
    
    success_count = 0
    for i in range(count):
        print(f"Sending trap {i+1}/{count}")
        
        for (errorIndication, errorStatus, errorIndex, varBinds) in sendNotification(
            SnmpEngine(),
            CommunityData(community),
            UdpTransportTarget((target_host, target_port)),
            ContextData(),
            'trap',
            NotificationType(
                ObjectIdentifier('1.3.6.1.4.1.99999.1.2')
            ).addVarBinds(
                ('1.3.6.1.2.1.1.3.0', TimeTicks(100000 + i * 1000)),
                ('1.3.6.1.6.3.1.1.4.1.0', ObjectIdentifier('1.3.6.1.4.1.99999.1.2.1')),
                ('1.3.6.1.4.1.99999.1.2.1', OctetString(f'Burst test trap #{i+1}')),
                ('1.3.6.1.4.1.99999.1.2.2', Integer(i+1))
            )
        ):
            if errorIndication:
                print(f"Error on trap {i+1}: {errorIndication}")
            elif errorStatus:
                print(f'Error on trap {i+1}: {errorStatus.prettyPrint()}')
            else:
                success_count += 1
                print(f"✅ Trap {i+1} sent successfully!")
        
        if i < count - 1:  # Don't sleep after the last trap
            time.sleep(interval)
    
    print(f"Burst complete: {success_count}/{count} traps sent successfully")
    return success_count

def main():
    parser = argparse.ArgumentParser(description='SNMP Trap Sender for OIDyssey Testing')
    parser.add_argument('--host', default='127.0.0.1', help='Target host (default: 127.0.0.1)')
    parser.add_argument('--port', type=int, default=162, help='Target port (default: 162)')
    parser.add_argument('--community', default='public', help='Community string (default: public)')
    parser.add_argument('--test', choices=['basic', 'server', 'interface', 'custom', 'burst', 'all'],
                       default='all', help='Test type to run (default: all)')
    parser.add_argument('--count', type=int, default=5, help='Number of traps for burst test (default: 5)')
    parser.add_argument('--interval', type=float, default=1.0, help='Interval between traps in seconds (default: 1.0)')
    
    args = parser.parse_args()
    
    print("🚀 OIDyssey SNMP Trap Sender Test Suite")
    print("="*50)
    print(f"Target: {args.host}:{args.port}")
    print(f"Community: {args.community}")
    print(f"Test: {args.test}")
    print("="*50)
    
    success_count = 0
    total_tests = 0
    
    if args.test == 'basic' or args.test == 'all':
        total_tests += 1
        if send_basic_trap(args.host, args.port, args.community):
            success_count += 1
        time.sleep(1)
    
    if args.test == 'server' or args.test == 'all':
        total_tests += 1
        if send_server_alert_trap(args.host, args.port, args.community):
            success_count += 1
        time.sleep(1)
    
    if args.test == 'interface' or args.test == 'all':
        total_tests += 1
        if send_interface_down_trap(args.host, args.port, args.community):
            success_count += 1
        time.sleep(1)
    
    if args.test == 'custom' or args.test == 'all':
        total_tests += 1
        if send_custom_enterprise_trap(args.host, args.port, args.community):
            success_count += 1
        time.sleep(1)
    
    if args.test == 'burst' or args.test == 'all':
        total_tests += 1
        burst_success = send_trap_burst(args.host, args.port, args.community, args.count, args.interval)
        if burst_success > 0:
            success_count += 1
    
    print("="*50)
    print(f"📊 Test Results: {success_count}/{total_tests} test suites successful")
    
    if success_count == total_tests:
        print("🎉 All tests passed! Your SNMP Trap Trigger should have received the traps.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Check your trigger node configuration.")
        sys.exit(1)

if __name__ == '__main__':
    main()