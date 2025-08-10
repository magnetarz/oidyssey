# SNMP Trap Trigger Testing Guide

## 🎯 Overview
This guide provides comprehensive testing for the OIDyssey SNMP Trap Trigger node using both manual scripts and automated test workflows.

## 📁 Test Assets

- **`test/snmp-traps/trap-sender.py`** - Python script to send various SNMP traps
- **Automated tests**
  - `test/nodes/SnmpTrapTrigger.node.test.ts`
  - `test/integration/TrapTrigger.integration.test.ts`

## 🚀 Quick Start Testing

### Step 1: Run automated tests
```bash
npm test
```
This will run both unit and integration tests, including the Trap Trigger.

### Step 2 (optional): Send Test Traps manually
```bash
# From your oidyssey directory
cd test
python trap-sender.py --port 1162 --test all
```

### Step 3: Check Results
- Watch n8n workflow executions
- Check the log file: `/tmp/snmp_traps.log` (or Windows equivalent)
- Verify trap data processing

## 🧪 Detailed Test Scenarios

### Test 1: Basic Functionality
**Send a simple trap:**
```bash
python trap-sender.py --port 1162 --test basic
```
**Expected:** Workflow triggers, basic trap data logged

### Test 2: Server Alert Simulation
**Send high-CPU alert trap:**
```bash
python trap-sender.py --port 1162 --test server
```
**Expected:** Trap with CPU usage data and server hostname

### Test 3: Interface Down Alert
**Send interface down trap:**
```bash
python trap-sender.py --port 1162 --test interface
```
**Expected:** Interface status change trap with interface details

### Test 4: Custom Enterprise Trap
**Send custom application trap:**
```bash
python trap-sender.py --port 1162 --test custom
```
**Expected:** Custom OID trap with application-specific data

### Test 5: Burst Testing
**Send multiple traps rapidly:**
```bash
python trap-sender.py --port 1162 --test burst --count 10 --interval 0.5
```
**Expected:** 10 traps received within 5 seconds

## 🔧 Advanced Testing

### Filtering Tests

#### Community String Filtering
1. **Update workflow:** Set `filterCommunity: "test-community"`
2. **Send with correct community:**
   ```bash
   python trap-sender.py --port 1162 --community "test-community"
   ```
   **Expected:** Trap received
3. **Send with wrong community:**
   ```bash
   python trap-sender.py --port 1162 --community "wrong-community"
   ```
   **Expected:** Trap ignored

#### IP Address Filtering  
1. **Update workflow:** Set `allowedSources: "127.0.0.1"`
2. **Test from localhost:** Should work
3. **Test from different IP:** Should be blocked

#### OID Filtering
1. **Update workflow:** Set `filterOid: "1.3.6.1.4.1.2021"`
2. **Send Net-SNMP trap:** Should be received
3. **Send different OID trap:** Should be ignored

### Port Configuration Tests

#### High Port Testing (Non-privileged)
```bash
python trap-sender.py --port 5162
# Update workflow to listen on port 5162
```

#### Default Port Testing (Requires admin/root)
```bash
sudo python trap-sender.py --port 162
# Update workflow to listen on port 162
```

## 📊 Test Workflow Analysis

The test workflow provides:

### 1. **Trap Reception**
- Listens on configurable port
- Supports CIDR filtering
- Includes raw PDU data

### 2. **Data Processing**
- Extracts key trap information
- Counts varbinds
- Records message size

### 3. **Conditional Logic**
- Checks trap version
- Routes based on trap type
- Applies business rules

### 4. **Output Options**
- File logging
- Email alerts (disabled by default)
- Structured data processing

## 🔍 Troubleshooting

### Common Issues

#### No Traps Received
1. **Check port binding:**
   ```bash
   netstat -an | grep 1162  # Windows
   # or
   ss -unp | grep 1162      # Linux
   ```
2. **Verify workflow is active**
3. **Check firewall settings**

#### Permission Errors (Port 162)
```bash
# Use higher port number instead
python trap-sender.py --port 1162
```

#### Python Dependencies Missing
```bash
pip install pysnmp
```

### Debugging Commands

#### Test with Python SNMP Library
```python
from pysnmp.hlapi import *

# Simple trap send test
for (errorIndication, errorStatus, errorIndex, varBinds) in sendNotification(
    SnmpEngine(),
    CommunityData('public'),
    UdpTransportTarget(('127.0.0.1', 1162)),
    ContextData(),
    'trap',
    NotificationType(ObjectIdentity('1.3.6.1.6.3.1.1.5.1'))):
    print(f"Error: {errorIndication}" if errorIndication else "Success!")
    break
```

#### Monitor Network Traffic
```bash
# Windows (requires Wireshark)
tshark -i loopback -f "udp port 1162"

# Linux
tcpdump -i lo -p udp port 1162
```

## 📈 Performance Testing

### Load Testing
```bash
# Send 100 traps with 100ms interval
python trap-sender.py --port 1162 --test burst --count 100 --interval 0.1
```

### Concurrent Sources
```bash
# Terminal 1
python trap-sender.py --port 1162 --test basic &

# Terminal 2  
python trap-sender.py --port 1162 --test server &

# Terminal 3
python trap-sender.py --port 1162 --test custom &
```

## 🎯 Validation Checklist

- [ ] Basic trap reception works
- [ ] Community string filtering works
- [ ] IP address filtering works (including CIDR)
- [ ] OID filtering works
- [ ] Multiple trap types handled correctly
- [ ] Workflow triggers properly
- [ ] Data extraction works
- [ ] File logging works
- [ ] Performance acceptable under load
- [ ] Error handling works (malformed traps)

## 📝 Test Results Template

```
SNMP Trap Trigger Test Results
=====================================
Date: [DATE]
n8n Version: [VERSION]
OIDyssey Version: [VERSION]

Basic Functionality:        [ PASS / FAIL ]
Community Filtering:        [ PASS / FAIL ]  
IP Filtering:               [ PASS / FAIL ]
OID Filtering:              [ PASS / FAIL ]
Performance (100 traps):    [ PASS / FAIL ]
Error Handling:             [ PASS / FAIL ]

Issues Found:
[LIST ANY ISSUES]

Notes:
[ADDITIONAL NOTES]
```

## 🚀 Next Steps

After testing:
1. **Production Configuration:** Set appropriate ports, filters, and security
2. **Monitoring Setup:** Configure alerts and dashboards
3. **Documentation:** Document your specific trap sources and formats
4. **Integration:** Connect to ticketing systems, monitoring tools, etc.

Your OIDyssey SNMP Trap Trigger is now ready for comprehensive testing!