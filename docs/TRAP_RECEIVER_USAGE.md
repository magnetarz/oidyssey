# 📡 SNMP Trap Receiver Usage Guide

The OIDyssey SNMP Trap Receiver allows you to listen for SNMP traps from network devices and process them in n8n workflows.

## 🚀 Quick Start

### 1. Basic Trap Receiver Setup

1. Add the **SNMP** node to your workflow
2. Select **Trap Receiver** as the resource
3. Configure the listening options:
   - **Port**: UDP port to listen on (default: 162)
   - **Timeout**: How long to wait for traps (default: 30 seconds)
   - **Allowed Sources**: Optional IP addresses/networks that can send traps

### 2. Configuration Options

#### Basic Configuration
```json
{
  "resource": "trapReceiver",
  "trapOptions": {
    "port": 162,
    "timeout": 30
  }
}
```

#### Advanced Configuration with Source Filtering
```json
{
  "resource": "trapReceiver", 
  "trapOptions": {
    "port": 162,
    "timeout": 60,
    "allowedSources": {
      "sourceList": [
        { "source": "192.168.1.0/24" },
        { "source": "10.0.0.100" },
        { "source": "172.16.0.0/16" }
      ]
    }
  }
}
```

## 📊 Output Data Structure

### When Traps are Received
```json
{
  "operation": "trapReceiver",
  "status": "received",
  "trapId": "trap-1640995200000-abc123def",
  "source": {
    "address": "192.168.1.10",
    "port": 47892
  },
  "receivedAt": 1640995200000,
  "timestamp": "2021-12-31T12:00:00.000Z",
  "pdu": {
    "type": "trap",
    "version": 1,
    "community": "public",
    "enterprise": "1.3.6.1.4.1.9",
    "agentAddr": "192.168.1.10",
    "genericTrap": 6,
    "specificTrap": 1,
    "uptime": 123456789,
    "timestamp": 1640995200000
  },
  "varbinds": [
    {
      "oid": "1.3.6.1.2.1.1.3.0",
      "type": "TimeTicks",
      "value": 123456789
    },
    {
      "oid": "1.3.6.1.6.3.1.1.4.1.0",
      "type": "OID",
      "value": "1.3.6.1.4.1.9.9.41.2.0.1"
    }
  ],
  "summary": {
    "varbindCount": 2,
    "sourceAddress": "192.168.1.10",
    "sourcePort": 47892,
    "trapType": "trap",
    "version": "v1"
  }
}
```

### When No Traps are Received (Timeout)
```json
{
  "operation": "trapReceiver",
  "status": "timeout",
  "message": "No SNMP traps received within 30 seconds",
  "port": 162,
  "timestamp": 1640995200000,
  "summary": {
    "trapsReceived": 0,
    "timeout": 30,
    "allowedSources": 2
  }
}
```

## 🔧 Common Use Cases

### 1. Network Device Monitoring
Monitor critical events from routers, switches, and servers:
- Interface up/down notifications
- High CPU/memory usage alerts
- Hardware failure notifications
- Authentication failures

### 2. Security Monitoring
Track security-related events:
- Failed login attempts
- Configuration changes
- Unauthorized access attempts
- Port security violations

### 3. Performance Alerting
Monitor performance thresholds:
- Bandwidth utilization
- Temperature alerts
- Power supply status
- Disk space warnings

## 📋 Example Workflows

### Simple Trap Logger
```json
{
  "nodes": [
    {
      "name": "SNMP Trap Listener",
      "type": "oidyssey.snmp",
      "parameters": {
        "resource": "trapReceiver",
        "trapOptions": {
          "port": 162,
          "timeout": 300
        }
      }
    },
    {
      "name": "Log Trap Details",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "console.log('Received SNMP trap:', JSON.stringify(items[0].json, null, 2));\nreturn items;"
      }
    }
  ]
}
```

### Conditional Trap Processing
```json
{
  "nodes": [
    {
      "name": "SNMP Trap Listener",
      "type": "oidyssey.snmp",
      "parameters": {
        "resource": "trapReceiver",
        "trapOptions": {
          "port": 162,
          "timeout": 120,
          "allowedSources": {
            "sourceList": [
              { "source": "192.168.1.0/24" }
            ]
          }
        }
      }
    },
    {
      "name": "Check Trap Type",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "dataType": "string",
        "value1": "={{ $json.pdu.genericTrap }}",
        "rules": {
          "rules": [
            {
              "value2": "2",
              "operation": "equal",
              "output": 0
            },
            {
              "value2": "3", 
              "operation": "equal",
              "output": 1
            }
          ]
        }
      }
    },
    {
      "name": "Handle Link Down",
      "type": "n8n-nodes-base.httpRequest"
    },
    {
      "name": "Handle Link Up",
      "type": "n8n-nodes-base.httpRequest"
    }
  ]
}
```

## 🛡️ Security Considerations

### Source IP Filtering
Always use source IP filtering in production:
```json
{
  "allowedSources": {
    "sourceList": [
      { "source": "192.168.1.0/24" },    // Management network
      { "source": "10.0.10.5" },        // Specific device
      { "source": "172.16.0.0/12" }     // Private network
    ]
  }
}
```

### Port Security
- Use non-standard ports when possible
- Ensure firewall rules allow only trusted sources
- Monitor for unauthorized trap sources

### Community String Validation
While the trap receiver doesn't require SNMP credentials, you can validate community strings in your workflow logic if needed.

## 🚨 Troubleshooting

### Common Issues

#### No Traps Received
1. **Check port binding**: Ensure port 162 (or your chosen port) is not in use
2. **Firewall rules**: Verify UDP traffic is allowed on the listening port
3. **Source filtering**: Check if allowed sources include the sending device
4. **Device configuration**: Ensure devices are configured to send traps to n8n server

#### Permission Errors
- On Linux/Unix systems, ports below 1024 require root privileges
- Consider using port 1162 instead of 162 for non-privileged operation

#### Parsing Errors
- The current implementation uses a simplified SNMP parser
- Complex trap messages may not be parsed correctly
- Monitor logs for parsing warnings

### Debug Mode
Enable detailed logging by checking the n8n execution logs:
1. Go to workflow execution history
2. Check the SNMP node output for detailed trap information
3. Look for any error messages in the execution log

## 🔄 Integration Examples

### Slack Notifications
```json
{
  "name": "Send to Slack",
  "type": "n8n-nodes-base.slack",
  "parameters": {
    "channel": "#network-alerts",
    "text": "🚨 SNMP Trap: {{ $json.pdu.type }} from {{ $json.source.address }}"
  }
}
```

### Email Alerts
```json
{
  "name": "Send Email Alert", 
  "type": "n8n-nodes-base.emailSend",
  "parameters": {
    "to": "admin@company.com",
    "subject": "SNMP Trap Alert - {{ $json.source.address }}",
    "text": "Received {{ $json.pdu.type }} trap from {{ $json.source.address }}\\n\\nDetails:\\n{{ JSON.stringify($json, null, 2) }}"
  }
}
```

### Database Logging
```json
{
  "name": "Log to Database",
  "type": "n8n-nodes-base.postgres", 
  "parameters": {
    "operation": "insert",
    "table": "snmp_traps",
    "columns": {
      "source_ip": "={{ $json.source.address }}",
      "trap_type": "={{ $json.pdu.type }}",
      "enterprise": "={{ $json.pdu.enterprise }}",
      "received_at": "={{ $json.receivedAt }}",
      "trap_data": "={{ JSON.stringify($json) }}"
    }
  }
}
```

## 📚 Additional Resources

- [SNMP Trap Types Reference](https://www.iana.org/assignments/snmp-trap-types/snmp-trap-types.xhtml)
- [n8n Workflow Documentation](https://docs.n8n.io/workflows/)
- [OIDyssey GitHub Repository](https://github.com/your-repo/oidyssey)

---

**🎯 Happy Network Monitoring with OIDyssey!** 🚀