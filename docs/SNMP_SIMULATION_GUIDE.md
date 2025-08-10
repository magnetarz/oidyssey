# SNMP Simulation Guide for OIDyssey Testing

## 📁 Simulation Files

Example `.snmprec` files (create under your `test/` directory if needed):

1. **linux-server.snmprec** - Linux server with Net-SNMP data
2. **network-switch.snmprec** - Cisco switch with interface data
3. **router-firewall.snmprec** - Router/firewall with IP statistics

## 🚀 Quick Setup

### 1. Copy files to snmpsim data directory
```powershell
# From your oidyssey directory
Copy-Item "test/*.snmprec" "e:/tools/data/"
```

### 2. Start snmpsim
```powershell
cd e:\tools
python -m snmpsim.commands.responder --data-dir=./data --agent-udpv4-endpoint=127.0.0.1:1161
```

### 3. Test different devices by changing community string:
- **Community: `linux-server`** → Linux server data
- **Community: `network-switch`** → Switch interface data  
- **Community: `router-firewall`** → Router IP statistics

## 🧪 Test Your OIDyssey Workflows

### Test 1: Linux Server System Info
**OIDyssey SNMP Node Config:**
```json
{
  "host": "127.0.0.1",
  "port": 1161,
  "operation": "get",
  "oid": "1.3.6.1.2.1.1.1.0",
  "credentials": {
    "version": "v2c",
    "community": "linux-server"
  }
}
```
**Expected:** `Linux server01 5.15.0-78-generic...`

### Test 2: Switch Interface Walk
**OIDyssey SNMP Node Config:**
```json
{
  "host": "127.0.0.1",
  "port": 1161,
  "operation": "walk",
  "rootOid": "1.3.6.1.2.1.2.2.1.2",
  "credentials": {
    "version": "v2c", 
    "community": "network-switch"
  }
}
```
**Expected:** List of `GigabitEthernet0/X` interfaces

### Test 3: Multi-Device Bulk Query
**OIDyssey SNMP Node Config:**
```json
{
  "host": "127.0.0.1",
  "port": 1161,
  "operation": "bulkGet",
  "oids": [
    "1.3.6.1.2.1.1.1.0",
    "1.3.6.1.2.1.1.5.0",
    "1.3.6.1.2.1.1.3.0"
  ],
  "credentials": {
    "version": "v2c",
    "community": "router-firewall"
  }
}
```

## 📊 Data Format Reference

Each line in `.snmprec` format:
```
OID|TYPE|VALUE
```

**Type Codes:**
- `2` = Integer
- `4` = OctetString (text)
- `6` = ObjectIdentifier
- `64` = IpAddress  
- `65` = Counter32
- `66` = Gauge32
- `67` = TimeTicks

## 🔧 Validation Commands

Test the simulator directly:
```python
# Test script
from pysnmp.hlapi import *

# Test linux-server data
for (errorIndication, errorStatus, errorIndex, varBinds) in getCmd(
    SnmpEngine(),
    CommunityData('linux-server'),  # Use specific community
    UdpTransportTarget(('127.0.0.1', 1161)),
    ContextData(),
    ObjectType(ObjectIdentity('1.3.6.1.2.1.1.1.0'))):
    if errorIndication:
        print(f"Error: {errorIndication}")
    else:
        for varBind in varBinds:
            print(f"{varBind[0]} = {varBind[1]}")
```

## 🎯 Key Test OIDs by Device Type

### Linux Server (`community: linux-server`)
- System Description: `1.3.6.1.2.1.1.1.0`
- System Name: `1.3.6.1.2.1.1.5.0`  
- CPU Load: `1.3.6.1.4.1.2021.11.11.0`
- Memory Available: `1.3.6.1.4.1.2021.4.6.0`
- Disk Usage: `1.3.6.1.4.1.2021.9.1.9.1`

### Network Switch (`community: network-switch`)
- Interface Count: `1.3.6.1.2.1.2.1.0`
- Interface Names: `1.3.6.1.2.1.2.2.1.2.X`
- Interface Status: `1.3.6.1.2.1.2.2.1.8.X`
- Interface Speed: `1.3.6.1.2.1.2.2.1.5.X`

### Router/Firewall (`community: router-firewall`)
- IP Forwarding: `1.3.6.1.2.1.4.1.0`
- IP Input Packets: `1.3.6.1.2.1.4.3.0`
- IP Output Packets: `1.3.6.1.2.1.4.10.0`
- TCP Connections: `1.3.6.1.2.1.6.5.0`

Start testing your OIDyssey nodes with these realistic SNMP simulation data!