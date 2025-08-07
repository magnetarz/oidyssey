#!/usr/bin/env python3
"""
Simple SNMP trap sender for testing the OIDyssey trap receiver
"""
import socket
import time
import struct

def create_simple_snmp_trap():
    """Create a basic SNMP v1 trap message"""
    # This is a simplified SNMP trap message for testing
    # In a real implementation, you'd use a proper SNMP library like pysnmp
    
    # Basic SNMP message structure (simplified)
    message = bytearray()
    
    # SNMP message header (simplified)
    message.extend(b'\x30\x82\x00\x4a')  # SEQUENCE, length
    message.extend(b'\x02\x01\x00')      # version (v1 = 0)
    message.extend(b'\x04\x06public')    # community string
    message.extend(b'\xa4\x3d')          # trap PDU
    
    # Enterprise OID (1.3.6.1.4.1.9999)
    message.extend(b'\x06\x08\x2b\x06\x01\x04\x01\xce\x0f')
    
    # Agent address (127.0.0.1)
    message.extend(b'\x40\x04\x7f\x00\x00\x01')
    
    # Generic trap (6 = enterpriseSpecific)
    message.extend(b'\x02\x01\x06')
    
    # Specific trap (1)
    message.extend(b'\x02\x01\x01')
    
    # Timestamp
    message.extend(b'\x43\x04\x12\x34\x56\x78')
    
    # Varbind list (empty for simplicity)
    message.extend(b'\x30\x00')
    
    return bytes(message)

def send_test_trap(host='127.0.0.1', port=1162):
    """Send a test SNMP trap"""
    try:
        # Create UDP socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        
        # Create trap message
        trap_message = create_simple_snmp_trap()
        
        print(f"Sending test SNMP trap to {host}:{port}")
        print(f"Message length: {len(trap_message)} bytes")
        
        # Send the trap
        sock.sendto(trap_message, (host, port))
        print(">>> Test trap sent successfully!")
        
        sock.close()
        
    except Exception as e:
        print(f"ERROR: Error sending trap: {e}")

if __name__ == "__main__":
    import sys
    
    host = sys.argv[1] if len(sys.argv) > 1 else '127.0.0.1'
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 1162
    
    print("*** SNMP Trap Sender Test ***")
    print(f"Target: {host}:{port}")
    print("-" * 40)
    
    # Send a single test trap
    send_test_trap(host, port)
    
    # Wait a moment
    time.sleep(1)
    
    # Send another trap with different content
    print("\nSending second test trap...")
    send_test_trap(host, port)
    
    print("\n*** Test completed! Check your n8n workflow for received traps. ***")