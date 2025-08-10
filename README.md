# 🚀 OIDyssey

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Your Journey Through SNMP Networks Made Simple**

OIDyssey is a comprehensive n8n community node package providing two powerful nodes for SNMP (Simple Network Management Protocol) operations. Embark on your journey to monitor and interact with network devices, servers, and infrastructure components using SNMP v1, v2c, and v3 protocols.

![OIDyssey Logo](src/snmp.svg)

## ✨ Features

### 🎯 Dual-Node Architecture
OIDyssey provides **two specialized nodes** for complete SNMP functionality:

1. **SNMP Node** - For active network queries and operations
2. **SNMP Trap Trigger Node** - For passive trap reception (webhook-like behavior)

### Core Capabilities
- **🌐 Full SNMP Protocol Support**: v1, v2c, and v3 with authentication and privacy
- **⚡ Multiple Operations**: GET, WALK, BULK-GET operations for all your network discovery needs
- **📡 Real-time Trap Reception**: Continuous listening for SNMP traps with advanced filtering
- **🔒 Security First**: Built-in input validation, CIDR-based IP filtering, SSRF protection, and credential hygiene
- **🚀 Performance Optimized**: Caching, connection pooling, and intelligent rate limiting
- **💪 Production Ready**: Comprehensive error handling, retry logic, and timeout management
- **📝 TypeScript**: Fully typed with comprehensive type definitions for better development experience
- **🎨 Modern UI**: SVG icons for crisp display at any resolution

## 🚧 Current Status: Beta 🚧

**OIDyssey is currently in a beta state.** While the core functionality is implemented and the project is stable, it has not yet undergone the full testing regimen outlined in our `PRODUCTION_TESTING_GUIDE.md`. We are actively working on increasing test coverage and ensuring the project is robust enough for production use.

We welcome feedback and contributions to help us reach a stable v1.0 release!

## 🎯 Installation

### As a Custom Node (Current Method)

Install OIDyssey as a custom node in your n8n instance:

```bash
# Navigate to your n8n custom nodes directory
cd ~/.n8n/custom

# Clone the repository
git clone https://github.com/magnetarz/oidyssey.git

# Navigate to the OIDyssey directory
cd oidyssey

# Install dependencies
npm install

# Build the node
npm run build
```

Restart n8n to load the OIDyssey node!

## 📋 Prerequisites

- n8n version 0.220.0 or higher
- Node.js 18.10.0 or higher
- Network access to SNMP-enabled devices

## 🔧 Configuration

### Setting Up Credentials

Create SNMP credentials in n8n:

1. Navigate to **Settings** → **Credentials**
2. Create new **SNMP Community** credentials
3. Configure based on your SNMP version:

#### SNMP v1/v2c (Community-based)
```
Community String: public (or your custom community)
Version: v2c (recommended) or v1
Port: 161 (default SNMP port)
```

#### SNMP v3 (User-based Security)
```
Version: v3
Username: Your SNMP v3 username
Auth Protocol: sha, md5, sha256, sha384, or sha512
Auth Key: Your authentication key
Privacy Protocol: aes, des, or aes256
Privacy Key: Your privacy/encryption key
```

## 🗺️ Your OIDyssey Journey

OIDyssey provides two powerful nodes for complete SNMP network management:

### 🎯 SNMP Node - Active Network Operations
Perfect for scheduled monitoring, on-demand queries, and bulk data collection:
- **GET Operation**: Retrieve single OID values
- **WALK Operation**: Explore entire OID trees from a starting point
- **BULK-GET**: Efficiently collect multiple OIDs in one request
- **Multi-Device Support**: Query multiple devices in a single workflow
- **Template Support**: Use pre-defined OID templates for common metrics

### 📡 SNMP Trap Trigger Node - Passive Event Reception
Works like a webhook but for SNMP traps - perfect for real-time alerts and events:
- **Continuous Listening**: Automatically triggers workflows when SNMP traps are received
- **Real-time Processing**: Immediate response to network events and alerts
- **Advanced Filtering**: 
  - **CIDR-based IP filtering** (e.g., `192.168.1.0/24`, `10.0.0.0/8`)
  - **Community string filtering**
  - **OID pattern matching**
- **Webhook-like Behavior**: Start workflows based on network events
- **Configurable Port**: Default 162 or custom port for non-privileged operation

## 📖 Navigation Examples

### 🎯 SNMP Node Operations

#### 🏠 Basic System Information Discovery
```json
{
  "host": "192.168.1.1",
  "oid": "1.3.6.1.2.1.1.1.0",
  "credentials": "my_snmp_creds"
}
```

#### 🌊 Network Interface Exploration
```json
{
  "host": "switch.mydomain.com", 
  "rootOid": "1.3.6.1.2.1.2.2.1.2",
  "maxVarbinds": 50
}
```

#### 📦 Multiple OID Treasure Hunt
```json
{
  "host": "server.example.com",
  "oids": [
    "1.3.6.1.2.1.1.1.0",
    "1.3.6.1.2.1.1.3.0", 
    "1.3.6.1.2.1.1.5.0"
  ]
}
```

### 📡 SNMP Trap Trigger Configuration

#### 🔧 Basic Trap Listener Setup with CIDR Filtering
```json
{
  "port": 162,
  "bindAddress": "0.0.0.0",
  "options": {
    "allowedSources": "192.168.1.0/24,10.0.0.0/8",
    "filterCommunity": "public",
    "includeRawPdu": true,
    "validateSource": true
  }
}
```

#### 🎯 Advanced Filtered Trap Reception
```json
{
  "port": 1162,
  "bindAddress": "0.0.0.0",
  "options": {
    "allowedSources": "192.168.1.100,192.168.1.101,172.16.0.0/12", 
    "filterOid": "1.3.6.1.4.1.2021",
    "filterCommunity": "monitoring",
    "includeRawPdu": false
  }
}
```

#### 🌐 Multiple Network Segment Monitoring
```json
{
  "port": 162,
  "bindAddress": "0.0.0.0",
  "options": {
    "allowedSources": "10.0.1.0/24,10.0.2.0/24,192.168.0.0/16",
    "filterOid": "1.3.6.1.6.3.1.1.4",
    "validateSource": true
  }
}
```

## 🗺️ OID Treasure Map (Common Destinations)

| 🏆 Treasure | OID Coordinates |
|-------------|-----------------|
| System Description | `1.3.6.1.2.1.1.1.0` |
| System Uptime | `1.3.6.1.2.1.1.3.0` |
| System Name | `1.3.6.1.2.1.1.5.0` |
| System Location | `1.3.6.1.2.1.1.6.0` |
| Interface Table | `1.3.6.1.2.1.2.2.1` |
| CPU Usage (Linux) | `1.3.6.1.4.1.2021.11.11.0` |
| Memory Usage (Linux) | `1.3.6.1.4.1.2021.4.6.0` |
| Disk Usage (Linux) | `1.3.6.1.4.1.2021.9.1.9.1` |

## 🛡️ Security Features (Your Safety Gear)

- **🔍 Input Validation**: Comprehensive validation of hosts, OIDs, and parameters
- **🚫 SSRF Protection**: Prevents requests to internal/private networks
- **🔐 Credential Security**: Secure handling and storage of SNMP credentials  
- **⏱️ Rate Limiting**: Prevents overwhelming target devices
- **⏰ Timeout Management**: Configurable timeouts with intelligent retry logic

## 🛠️ Development & Contributing

### 🏗️ Local Development Setup

```bash
# Clone your OIDyssey
git clone https://github.com/magnetarz/oidyssey.git
cd oidyssey

# Prepare your expedition tools
npm install

# Build your compass
npm run build

# Test your equipment
npm test

# Start exploring in development mode
npm run dev
```

### 🐳 Testing with Docker

For testing SNMP operations, you can run a test SNMP agent:

```bash
# Start a test SNMP target
docker run -d --name snmp-practice -p 161:161/udp polinux/snmpd

# The node can then connect to localhost:161 for testing
```

### 🏛️ Project Architecture

```
oidyssey/
├── src/
│   ├── nodes/
│   │   ├── Snmp/                    # SNMP operations node
│   │   └── SnmpTrapTrigger/        # SNMP trap trigger node
│   ├── credentials/                 # SNMP credential definitions
│   ├── types/                      # TypeScript type definitions
│   ├── utils/
│   │   ├── security/               # Input validation & rate limiting
│   │   └── snmp/                   # SNMP helpers & caching
│   └── snmp.svg                    # Shared icon for both nodes
├── dist/                           # Compiled JavaScript output
├── scripts/
│   └── copy-assets.js             # Asset management for build
├── test/                          # Test suite (in development)
└── docs/                          # Documentation
```

## 🧪 Building and Development

```bash
# Build the TypeScript files
npm run build

# Watch mode for development
npm run dev

# Code quality check
npm run lint

# Format code
npm run format
```

> Note: A formal test suite is in progress. See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for details.

## 📚 Expedition Guide (API Reference)

### 🎯 SNMP GET Expedition

Retrieves a specific OID treasure from your target.

**Navigation Parameters:**
- `host` (string): Target device coordinates (IP/hostname)
- `oid` (string): Treasure location (e.g., "1.3.6.1.2.1.1.1.0")
- `credentials` (object): Your access credentials

**Treasure Report:**
```json
{
  "host": "192.168.1.1",
  "operation": "get", 
  "timestamp": 1699123456789,
  "varbinds": [{
    "oid": "1.3.6.1.2.1.1.1.0",
    "type": "OctetString",
    "value": "Linux server 5.4.0"
  }]
}
```

### 🌊 SNMP WALK Expedition

Explores an entire OID territory from your starting point.

**Navigation Parameters:**
- `host` (string): Target device coordinates
- `rootOid` (string): Starting exploration point
- `maxVarbinds` (number): Maximum treasures to collect
- `credentials` (object): Your access credentials

## 🚨 Expedition Troubleshooting

### Common SNMP Node Issues

#### ⏰ Connection Timeouts
- Verify network path to target device
- Check if SNMP service is active on target
- Confirm correct port (default: 161)
- Validate community string or v3 credentials

#### 🔐 Authentication Failures
- Verify community string for v1/v2c expeditions
- Check username/password for v3 journeys
- Ensure authentication protocol matches device configuration

#### 📡 No Response from Target
- Device may not support SNMP protocol
- SNMP service may be disabled or inactive
- Firewall blocking SNMP traffic (UDP 161)
- Incorrect community string or credentials

### Common SNMP Trap Trigger Issues

#### 🚫 No Traps Received
- Verify devices are configured to send traps to n8n host
- Check firewall allows UDP port 162 (or custom port)
- Ensure trap source IPs match allowed sources (CIDR notation supported)
- Verify community string matches device configuration

#### ⚠️ Port Permission Errors
- Port 162 requires root/admin privileges
- Use a port > 1024 for non-privileged operation
- Example: Use port 1162 instead of 162

#### 🔍 Filtering Not Working
- CIDR notation must be valid (e.g., `192.168.1.0/24`)
- OID filters use prefix matching
- Community string filters are case-sensitive
- Multiple filters are AND conditions (all must match)

### 🔧 Debug Mode

Enable detailed expedition logging:

```bash
export N8N_LOG_LEVEL=debug
n8n start
```

## 🤝 Join the OIDyssey Community

We welcome fellow network explorers! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on joining our expedition.

1. Fork the OIDyssey repository
2. Create your expedition branch (`git checkout -b expedition/amazing-discovery`)
3. Document your findings (`git commit -m 'Discovered amazing network treasure'`)
4. Share your route (`git push origin expedition/amazing-discovery`)
5. Request to join the main expedition (Open a Pull Request)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [net-snmp](https://github.com/markabrahams/node-net-snmp) - The foundation of our expedition tools
- [n8n](https://n8n.io/) - The platform that makes our journeys possible
- SNMP Community - The cartographers who mapped these protocols

## 📞 Expedition Support

- 🐛 **Report Issues**: [GitHub Issues](https://github.com/magnetarz/oidyssey/issues)
- 💬 **Community Discussions**: [GitHub Discussions](https://github.com/magnetarz/oidyssey/discussions)
- 📧 **Direct Contact**: Send a message to our expedition leaders

---

**🗺️ Begin Your OIDyssey Today - Every Network Has Stories to Tell! 🚀**

*Made with ❤️ for network explorers and the n8n community*